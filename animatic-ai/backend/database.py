"""Database operations via Supabase Python client."""

import psycopg2
from contextlib import contextmanager
from supabase import create_client, Client
import config


def get_client() -> Client:
    """Create Supabase client with service role key (bypasses RLS)."""
    return create_client(config.SUPABASE_URL, config.SUPABASE_SERVICE_KEY)


@contextmanager
def _get_pg_connection():
    """Get direct PostgreSQL connection (bypasses PostgREST cache)."""
    if not config.SUPABASE_DB_URL:
        raise RuntimeError(
            "SUPABASE_DB_URL not set. Add it to .env (get from Supabase Dashboard -> Database -> Connection string -> Direct)"
        )
    conn = psycopg2.connect(config.SUPABASE_DB_URL)
    try:
        yield conn
        conn.commit()
    except Exception:
        conn.rollback()
        raise
    finally:
        conn.close()


# ── Generation Requests ──

def create_generation_request(user_id: str, gen_type: str = "model_photo", style: str = None) -> dict:
    """Create a new generation request in queued state."""
    client = get_client()
    data = {
        "user_id": user_id,
        "type": gen_type,
        "style_preset": style,
        "quality_level": "high",
        "enable_pbr": True,
        "enable_rig": False,
        "status": "queued",
        "progress": 0,
    }
    result = client.table("generation_requests").insert(data).execute()
    return result.data[0] if result.data else None


def update_generation_status(gen_id: str, status: str, progress: int = None, error: str = None, result_model_id: str = None) -> dict:
    """Update generation request status and progress."""
    client = get_client()
    updates = {"status": status}
    if progress is not None:
        updates["progress"] = progress
    if error is not None:
        updates["error_message"] = error
    if result_model_id is not None:
        updates["result_model_id"] = result_model_id
    result = client.table("generation_requests").update(updates).eq("id", gen_id).execute()
    return result.data[0] if result.data else None


def get_generation_request(gen_id: str) -> dict | None:
    """Get a single generation request by ID."""
    client = get_client()
    result = client.table("generation_requests").select("*").eq("id", gen_id).execute()
    return result.data[0] if result.data else None


def get_user_generations(user_id: str, limit: int = 20) -> list:
    """Get user's generation requests, newest first, using direct PostgreSQL."""
    with _get_pg_connection() as conn:
        with conn.cursor() as cur:
            cur.execute("""
                SELECT id, type, status, progress, result_model_id, error_message, created_at
                FROM public.generation_requests
                WHERE user_id = %s
                ORDER BY created_at DESC
                LIMIT %s
            """, (user_id, limit))
            rows = cur.fetchall()
            if not rows:
                return []
            cols = [desc[0] for desc in cur.description]
            return [dict(zip(cols, row)) for row in rows]


# ── Models ──

def create_model(author_id: str, name: str, description: str = None, category: str = None,
                 format: str = "GLB", file_url: str = None, preview_url: str = None,
                 source_image_url: str = None,
                 ai_generated: bool = True, status: str = "approved",
                 license: str = "view_only",
                 vertices_count: int = None, faces_count: int = None) -> dict:
    """Create a new model record using direct PostgreSQL (bypasses PostgREST cache)."""
    with _get_pg_connection() as conn:
        with conn.cursor() as cur:
            cur.execute("""
                INSERT INTO public.models (
                    author_id, name, description, category, format,
                    file_url, preview_url, source_image_url, source, ai_generated,
                    status, license, vertices_count, faces_count
                ) VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
                RETURNING id, author_id, name, description, category, format,
                          file_url, preview_url, source_image_url, source, ai_generated, status,
                          license, vertices_count, faces_count, created_at
            """, (
                author_id,
                name,
                description or "",
                category or "Персонажи",
                format,
                file_url,
                preview_url,
                source_image_url or preview_url,
                "ai_generated" if ai_generated else "user_upload",
                ai_generated,
                status,
                license,
                vertices_count,
                faces_count,
            ))
            row = cur.fetchone()
            if not row:
                return None
            # Convert to dict
            cols = [desc[0] for desc in cur.description]
            return dict(zip(cols, row))


def _row_to_dict(cur, row):
    """Convert a psycopg2 row to dict."""
    if not row:
        return None
    cols = [desc[0] for desc in cur.description]
    return dict(zip(cols, row))


def get_models(filters: dict = None, limit: int = 20, offset: int = 0, sort: str = None) -> list:
    """Get published models with optional filters and sorting using direct PostgreSQL.
    Only returns models with status='approved' and license != 'private'."""
    with _get_pg_connection() as conn:
        with conn.cursor() as cur:
            query = """
                SELECT m.*, up.username, up.display_name, up.avatar_url,
                       up.models_count, up.followers_count
                FROM public.models m
                LEFT JOIN public.user_profiles up ON m.author_id = up.id
                WHERE m.status = 'approved' AND m.license != 'private'
            """
            params = []

            if filters:
                if filters.get("categories"):
                    placeholders = ", ".join(["%s"] * len(filters["categories"]))
                    query += f" AND m.category IN ({placeholders})"
                    params.extend(filters["categories"])
                if filters.get("formats"):
                    placeholders = ", ".join(["%s"] * len(filters["formats"]))
                    query += f" AND m.format IN ({placeholders})"
                    params.extend(filters["formats"])
                if filters.get("ai_only"):
                    query += " AND m.ai_generated = %s"
                    params.append(True)
                if filters.get("search"):
                    query += " AND (m.name ILIKE %s OR m.description ILIKE %s)"
                    params.append(f"%{filters['search']}%")
                    params.append(f"%{filters['search']}%")

            # Sorting
            sort_map = {
                'По популярности': 'ORDER BY m.likes DESC',
                'Сначала новые': 'ORDER BY m.created_at DESC',
                'Высокий рейтинг': 'ORDER BY m.rating DESC',
                'Больше загрузок': 'ORDER BY m.downloads DESC',
            }
            order_clause = sort_map.get(sort, 'ORDER BY m.created_at DESC')
            query += f" {order_clause} LIMIT %s OFFSET %s"
            params.append(limit)
            params.append(offset)

            cur.execute(query, params)
            rows = cur.fetchall()
            if not rows:
                return []
            cols = [desc[0] for desc in cur.description]
            return [dict(zip(cols, row)) for row in rows]


def get_model(model_id: str) -> dict | None:
    """Get a single model by ID with author info using direct PostgreSQL.
    Returns ANY model (including private) — RLS/permission checks should be done by caller."""
    with _get_pg_connection() as conn:
        with conn.cursor() as cur:
            cur.execute("""
                SELECT m.*, up.username, up.display_name, up.avatar_url,
                       up.models_count, up.followers_count, up.following_count
                FROM public.models m
                LEFT JOIN public.user_profiles up ON m.author_id = up.id
                WHERE m.id = %s
            """, (model_id,))
            row = cur.fetchone()
            if not row:
                return None
            cols = [desc[0] for desc in cur.description]
            return dict(zip(cols, row))


def update_model(model_id: str, author_id: str, updates: dict) -> dict | None:
    """Update model fields (name, description, license). Only by author."""
    with _get_pg_connection() as conn:
        with conn.cursor() as cur:
            allowed = {}
            if "name" in updates and updates["name"]:
                allowed["name"] = updates["name"]
            if "description" in updates:
                allowed["description"] = updates["description"]
            if "license" in updates and updates["license"] in ("private", "view_only", "free_use"):
                allowed["license"] = updates["license"]

            if not allowed:
                # Just return current model
                return get_model(model_id)

            set_clause = ", ".join([f"{k} = %s" for k in allowed.keys()])
            params = list(allowed.values()) + [model_id, author_id]

            cur.execute(f"""
                UPDATE public.models SET {set_clause}
                WHERE id = %s AND author_id = %s
                RETURNING id
            """, params)

            if cur.fetchone():
                return get_model(model_id)
            return None


def get_models_by_author(author_id: str, limit: int = 20) -> list:
    """Get models by a specific author using direct PostgreSQL.
    Returns ALL models (including private) for the author themselves."""
    with _get_pg_connection() as conn:
        with conn.cursor() as cur:
            cur.execute("""
                SELECT m.*, up.username, up.display_name, up.avatar_url
                FROM public.models m
                LEFT JOIN public.user_profiles up ON m.author_id = up.id
                WHERE m.author_id = %s
                ORDER BY m.created_at DESC
                LIMIT %s
            """, (author_id, limit))
            rows = cur.fetchall()
            if not rows:
                return []
            cols = [desc[0] for desc in cur.description]
            return [dict(zip(cols, row)) for row in rows]


def increment_model_downloads(model_id: str) -> None:
    """Increment download counter for a model."""
    with _get_pg_connection() as conn:
        with conn.cursor() as cur:
            cur.execute(
                "UPDATE public.models SET downloads = downloads + 1 WHERE id = %s",
                (model_id,),
            )


def get_model_file_url(model_id: str) -> str | None:
    """Get the file URL for a model by ID."""
    with _get_pg_connection() as conn:
        with conn.cursor() as cur:
            cur.execute("SELECT file_url FROM public.models WHERE id = %s", (model_id,))
            row = cur.fetchone()
            return row[0] if row else None


def publish_model(model_id: str, user_id: str, license_type: str = "view_only") -> dict | None:
    """
    Publish a model (set status='approved') with chosen license.
    Only the author can publish their own model.
    """
    with _get_pg_connection() as conn:
        with conn.cursor() as cur:
            # Verify ownership
            cur.execute(
                "SELECT author_id FROM public.models WHERE id = %s",
                (model_id,)
            )
            row = cur.fetchone()
            if not row or row[0] != user_id:
                return None

            cur.execute("""
                UPDATE public.models
                SET status = 'approved', license = %s, published_at = NOW()
                WHERE id = %s
                RETURNING id, name, file_url, license, status, published_at
            """, (license_type, model_id))
            row = cur.fetchone()
            if not row:
                return None
            cols = [desc[0] for desc in cur.description]
            return dict(zip(cols, row))


# ── Comments ──

def get_comments(entity_id: str, entity_type: str = "model", limit: int = 50, offset: int = 0) -> list:
    """Get comments for a model or animation."""
    with _get_pg_connection() as conn:
        with conn.cursor() as cur:
            cur.execute("""
                SELECT c.*, up.username, up.display_name, up.avatar_url
                FROM public.comments c
                LEFT JOIN public.user_profiles up ON c.author_id = up.id
                WHERE c.entity_id = %s AND c.entity_type = %s AND c.status = 'active'
                ORDER BY c.created_at DESC
                LIMIT %s OFFSET %s
            """, (entity_id, entity_type, limit, offset))
            rows = cur.fetchall()
            if not rows:
                return []
            cols = [desc[0] for desc in cur.description]
            return [dict(zip(cols, row)) for row in rows]


def add_comment(entity_id: str, entity_type: str, author_id: str, content: str, parent_id: str = None) -> dict | None:
    """Add a comment and return it with author info."""
    with _get_pg_connection() as conn:
        with conn.cursor() as cur:
            cur.execute("""
                WITH inserted AS (
                    INSERT INTO public.comments (entity_id, entity_type, author_id, content, parent_id)
                    VALUES (%s, %s, %s, %s, %s)
                    RETURNING *
                )
                SELECT i.*, up.username, up.display_name, up.avatar_url
                FROM inserted i
                LEFT JOIN public.user_profiles up ON i.author_id = up.id
            """, (entity_id, entity_type, author_id, content, parent_id))
            row = cur.fetchone()
            if not row:
                return None
            cols = [desc[0] for desc in cur.description]
            return dict(zip(cols, row))


# ── Interactions (likes, favorites) ──

def toggle_interaction(user_id: str, entity_id: str, entity_type: str, interaction_type: str) -> bool:
    """
    Toggle like/favorite interaction. Returns True if added, False if removed.
    """
    with _get_pg_connection() as conn:
        with conn.cursor() as cur:
            # Check if interaction exists
            cur.execute("""
                SELECT 1 FROM public.interactions
                WHERE user_id = %s AND entity_id = %s AND entity_type = %s AND interaction_type = %s
            """, (user_id, entity_id, entity_type, interaction_type))

            if cur.fetchone():
                # Remove interaction
                cur.execute("""
                    DELETE FROM public.interactions
                    WHERE user_id = %s AND entity_id = %s AND entity_type = %s AND interaction_type = %s
                """, (user_id, entity_id, entity_type, interaction_type))
                return False
            else:
                # Add interaction
                cur.execute("""
                    INSERT INTO public.interactions (user_id, entity_id, entity_type, interaction_type)
                    VALUES (%s, %s, %s, %s)
                """, (user_id, entity_id, entity_type, interaction_type))
                return True


def has_interaction(user_id: str, entity_id: str, entity_type: str, interaction_type: str) -> bool:
    """Check if user has a specific interaction."""
    with _get_pg_connection() as conn:
        with conn.cursor() as cur:
            cur.execute("""
                SELECT 1 FROM public.interactions
                WHERE user_id = %s AND entity_id = %s AND entity_type = %s AND interaction_type = %s
            """, (user_id, entity_id, entity_type, interaction_type))
            return cur.fetchone() is not None


def get_user_favorites(user_id: str, limit: int = 20) -> list:
    """Get models favorited by user."""
    with _get_pg_connection() as conn:
        with conn.cursor() as cur:
            cur.execute("""
                SELECT m.*, up.username, up.display_name, up.avatar_url,
                       up.models_count, up.followers_count
                FROM public.models m
                JOIN public.interactions i ON m.id = i.entity_id
                LEFT JOIN public.user_profiles up ON m.author_id = up.id
                WHERE i.user_id = %s AND i.entity_type = 'model' AND i.interaction_type = 'favorite'
                  AND m.status = 'approved'
                ORDER BY i.created_at DESC
                LIMIT %s
            """, (user_id, limit))
            rows = cur.fetchall()
            if not rows:
                return []
            cols = [desc[0] for desc in cur.description]
            return [dict(zip(cols, row)) for row in rows]


def toggle_subscription(subscriber_id: str, author_id: str) -> bool:
    """Toggle subscription to an author. Returns True if subscribed, False if unsubscribed."""
    if subscriber_id == author_id:
        return False
    with _get_pg_connection() as conn:
        with conn.cursor() as cur:
            cur.execute("""
                SELECT 1 FROM public.subscriptions
                WHERE subscriber_id = %s AND author_id = %s
            """, (subscriber_id, author_id))
            if cur.fetchone():
                cur.execute("""
                    DELETE FROM public.subscriptions
                    WHERE subscriber_id = %s AND author_id = %s
                """, (subscriber_id, author_id))
                return False
            else:
                cur.execute("""
                    INSERT INTO public.subscriptions (subscriber_id, author_id)
                    VALUES (%s, %s)
                """, (subscriber_id, author_id))
                return True

def is_following(subscriber_id: str, author_id: str) -> bool:
    """Check if user is following another user."""
    if not subscriber_id:
        return False
    with _get_pg_connection() as conn:
        with conn.cursor() as cur:
            cur.execute("""
                SELECT 1 FROM public.subscriptions
                WHERE subscriber_id = %s AND author_id = %s
            """, (subscriber_id, author_id))
            return cur.fetchone() is not None

def get_user_followers(user_id: str, limit: int = 50) -> list:
    """Get followers of a user."""
    with _get_pg_connection() as conn:
        with conn.cursor() as cur:
            cur.execute("""
                SELECT up.id, up.username, up.display_name, up.avatar_url, up.bio, up.followers_count
                FROM public.user_profiles up
                JOIN public.subscriptions s ON up.id = s.subscriber_id
                WHERE s.author_id = %s
                ORDER BY s.created_at DESC
                LIMIT %s
            """, (user_id, limit))
            rows = cur.fetchall()
            cols = [desc[0] for desc in cur.description]
            return [dict(zip(cols, row)) for row in rows]


def get_user_following(user_id: str, limit: int = 50) -> list:
    """Get authors a user is following."""
    with _get_pg_connection() as conn:
        with conn.cursor() as cur:
            cur.execute("""
                SELECT up.id, up.username, up.display_name, up.avatar_url, up.bio, up.followers_count
                FROM public.user_profiles up
                JOIN public.subscriptions s ON up.id = s.author_id
                WHERE s.subscriber_id = %s
                ORDER BY s.created_at DESC
                LIMIT %s
            """, (user_id, limit))
            rows = cur.fetchall()
            cols = [desc[0] for desc in cur.description]
            return [dict(zip(cols, row)) for row in rows]
    """Update user profile fields."""
    with _get_pg_connection() as conn:
        with conn.cursor() as cur:
            allowed = {}
            if "display_name" in updates:
                allowed["display_name"] = updates["display_name"]
            if "bio" in updates:
                allowed["bio"] = updates["bio"]
            if "avatar_url" in updates:
                allowed["avatar_url"] = updates["avatar_url"]
            if "cover_url" in updates:
                allowed["cover_url"] = updates["cover_url"]
            if "cover_preset" in updates:
                allowed["cover_preset"] = updates["cover_preset"]

            if not allowed:
                return get_user_profile(user_id)

            set_clause = ", ".join([f"{k} = %s" for k in allowed.keys()])
            params = list(allowed.values()) + [user_id]

            cur.execute(f"""
                UPDATE public.user_profiles SET {set_clause}
                WHERE id = %s
                RETURNING id
            """, params)

            if cur.fetchone():
                return get_user_profile(user_id)
            return None


def get_user_activity(user_id: str, days: int = 90) -> dict:
    """Get user activity heatmap and recent feed."""
    with _get_pg_connection() as conn:
        with conn.cursor() as cur:
            # Heatmap: count actions per day
            cur.execute("""
                SELECT DATE(m.created_at) as action_date, COUNT(*) as count
                FROM public.models m
                WHERE m.author_id = %s AND m.created_at >= CURRENT_DATE - INTERVAL '%s days'
                GROUP BY DATE(m.created_at)
                ORDER BY action_date
            """, (user_id, days))
            model_rows = cur.fetchall()

            cur.execute("""
                SELECT DATE(i.created_at) as action_date, COUNT(*) as count
                FROM public.interactions i
                WHERE i.user_id = %s AND i.created_at >= CURRENT_DATE - INTERVAL '%s days'
                  AND i.interaction_type IN ('like', 'favorite', 'download')
                GROUP BY DATE(i.created_at)
                ORDER BY action_date
            """, (user_id, days))
            interaction_rows = cur.fetchall()

            # Merge counts
            date_counts = {}
            for row in model_rows:
                date_counts[str(row[0])] = date_counts.get(str(row[0]), 0) + row[1]
            for row in interaction_rows:
                date_counts[str(row[0])] = date_counts.get(str(row[0]), 0) + row[1]

            heatmap = [{"date": d, "count": c} for d, c in sorted(date_counts.items())]

            # Recent activity feed
            cur.execute("""
                (
                    SELECT 'model_created' as type, m.name as entity_name, m.id as entity_id,
                           m.created_at as created_at, NULL as other_user
                    FROM public.models m
                    WHERE m.author_id = %s
                    ORDER BY m.created_at DESC LIMIT 3
                )
                UNION ALL
                (
                    SELECT 'model_liked' as type, m.name as entity_name, m.id as entity_id,
                           i.created_at as created_at, i.user_id as other_user
                    FROM public.interactions i
                    JOIN public.models m ON m.id = i.entity_id
                    WHERE i.entity_type = 'model' AND i.interaction_type = 'like' AND m.author_id = %s
                    ORDER BY i.created_at DESC LIMIT 2
                )
                UNION ALL
                (
                    SELECT 'model_downloaded' as type, m.name as entity_name, m.id as entity_id,
                           i.created_at as created_at, i.user_id as other_user
                    FROM public.interactions i
                    JOIN public.models m ON m.id = i.entity_id
                    WHERE i.entity_type = 'model' AND i.interaction_type = 'download' AND m.author_id = %s
                    ORDER BY i.created_at DESC LIMIT 2
                )
                ORDER BY created_at DESC
                LIMIT 8
            """, (user_id, user_id, user_id))
            feed_rows = cur.fetchall()

            feed = []
            for row in feed_rows:
                item = {
                    "type": row[0],
                    "entity_name": row[1],
                    "entity_id": str(row[2]),
                    "created_at": row[3].isoformat() if row[3] else None,
                    "other_user": str(row[4]) if row[4] else None,
                }
                feed.append(item)

            return {"heatmap": heatmap, "feed": feed}


# ── Animations ──

def get_animations(filters: dict = None, limit: int = 20, offset: int = 0) -> list:
    """Get approved animations using direct PostgreSQL."""
    with _get_pg_connection() as conn:
        with conn.cursor() as cur:
            query = """
                SELECT a.*, up.username, up.display_name, up.avatar_url
                FROM public.animations a
                LEFT JOIN public.user_profiles up ON a.author_id = up.id
                WHERE a.status = 'approved' AND a.license != 'private'
            """
            params = []

            if filters:
                if filters.get("search"):
                    query += " AND (a.name ILIKE %s OR a.description ILIKE %s)"
                    params.append(f"%{filters['search']}%")
                    params.append(f"%{filters['search']}%")

            query += " ORDER BY a.created_at DESC LIMIT %s OFFSET %s"
            params.append(limit)
            params.append(offset)

            cur.execute(query, params)
            rows = cur.fetchall()
            if not rows:
                return []
            cols = [desc[0] for desc in cur.description]
            return [dict(zip(cols, row)) for row in rows]


def get_animation(anim_id: str) -> dict | None:
    """Get a single animation by ID."""
    client = get_client()
    result = (
        client.table("animations")
        .select("*, user_profiles(username, display_name, avatar_url)")
        .eq("id", anim_id)
        .execute()
    )
    return result.data[0] if result.data else None


# ── User Profiles ──

def get_user_profile(user_id: str) -> dict | None:
    """Get user profile by ID using direct PostgreSQL."""
    with _get_pg_connection() as conn:
        with conn.cursor() as cur:
            cur.execute("SELECT * FROM public.user_profiles WHERE id = %s", (user_id,))
            row = cur.fetchone()
            if not row:
                return None
            cols = [desc[0] for desc in cur.description]
            return dict(zip(cols, row))


def get_user_models_count(author_id: str) -> int:
    """Count approved models for a user using direct PostgreSQL."""
    with _get_pg_connection() as conn:
        with conn.cursor() as cur:
            cur.execute(
                "SELECT COUNT(*) FROM public.models WHERE author_id = %s AND status = 'approved'",
                (author_id,),
            )
            row = cur.fetchone()
            return row[0] if row else 0


# ── Credits ──

def get_or_reset_credits(user_id: str) -> dict:
    """
    Get user credits. If credits_reset_date has passed, reset to 15.
    Returns {credits: int, reset_date: str}.
    """
    with _get_pg_connection() as conn:
        with conn.cursor() as cur:
            cur.execute("""
                SELECT credits, credits_reset_date < NOW() as needs_reset, credits_reset_date
                FROM public.user_profiles
                WHERE id = %s
            """, (user_id,))
            row = cur.fetchone()
            if not row:
                return {"credits": 0, "reset_date": None}

            credits, needs_reset, reset_date = row[0], row[1], row[2]

            if needs_reset:
                cur.execute("""
                    UPDATE public.user_profiles
                    SET credits = 15, credits_reset_date = NOW() + INTERVAL '30 days'
                    WHERE id = %s
                    RETURNING credits, credits_reset_date
                """, (user_id,))
                result = cur.fetchone()
                return {"credits": result[0], "reset_date": result[1].isoformat() if result[1] else None}

            return {"credits": credits, "reset_date": reset_date.isoformat() if reset_date else None}


def deduct_credits(user_id: str, amount: int = 3) -> dict:
    """
    Deduct credits from user. Returns {success: bool, credits: int, error: str}.
    """
    with _get_pg_connection() as conn:
        with conn.cursor() as cur:
            # Get current credits
            cur.execute("SELECT credits FROM public.user_profiles WHERE id = %s", (user_id,))
            row = cur.fetchone()
            if not row:
                return {"success": False, "credits": 0, "error": "User not found"}

            current = row[0]
            if current < amount:
                return {
                    "success": False,
                    "credits": current,
                    "error": f"Недостаточно кредитов. Нужно: {amount}, есть: {current}"
                }

            # Deduct
            cur.execute("""
                UPDATE public.user_profiles
                SET credits = credits - %s
                WHERE id = %s
                RETURNING credits
            """, (amount, user_id))
            result = cur.fetchone()
            return {"success": True, "credits": result[0], "error": None}


def refund_credits(user_id: str, amount: int = 3) -> dict:
    """
    Refund credits to user (on failed generation).
    """
    with _get_pg_connection() as conn:
        with conn.cursor() as cur:
            cur.execute("""
                UPDATE public.user_profiles
                SET credits = credits + %s
                WHERE id = %s
                RETURNING credits
            """, (amount, user_id))
            result = cur.fetchone()
            if result:
                return {"success": True, "credits": result[0]}
            return {"success": False, "credits": 0}


def add_credits(user_id: str, amount: int) -> dict:
    """
    Add credits to user profile (on successful payment).
    """
    with _get_pg_connection() as conn:
        with conn.cursor() as cur:
            cur.execute("""
                UPDATE public.user_profiles
                SET credits = credits + %s
                WHERE id = %s
                RETURNING credits
            """, (amount, user_id))
            result = cur.fetchone()
            if result:
                return {"success": True, "credits": result[0]}
            return {"success": False, "credits": 0}


def record_download(model_id: str, user_id: str) -> bool:
    """
    Record a download. Returns True if download was counted (new),
    False if user already downloaded this model before.
    """
    with _get_pg_connection() as conn:
        with conn.cursor() as cur:
            cur.execute("""
                SELECT 1 FROM public.interactions
                WHERE user_id = %s AND entity_id = %s AND entity_type = 'model' AND interaction_type = 'download'
            """, (user_id, model_id))

            if cur.fetchone():
                return False

            cur.execute("""
                INSERT INTO public.interactions (user_id, entity_id, entity_type, interaction_type)
                VALUES (%s, %s, 'model', 'download')
                ON CONFLICT DO NOTHING
            """, (user_id, model_id))

            cur.execute("UPDATE public.models SET downloads = downloads + 1 WHERE id = %s", (model_id,))
            return True

def get_platform_stats() -> dict:
    """
    Get platform-wide stats for homepage.
    """
    with _get_pg_connection() as conn:
        with conn.cursor() as cur:
            cur.execute("""
                SELECT COUNT(*) FROM public.models
                WHERE status = 'approved'
            """)
            models_count = cur.fetchone()[0] or 0

            return {
                "models": models_count,
            }