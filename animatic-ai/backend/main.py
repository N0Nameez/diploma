"""FastAPI backend for AnimaticAI — 3D generation, catalog, and user management."""

import os
import sys
import uuid
import shutil
import tempfile
import asyncio
from pathlib import Path
from datetime import datetime, timezone, timedelta
from contextlib import asynccontextmanager

from fastapi import FastAPI, UploadFile, File, Form, HTTPException, Request, BackgroundTasks
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import smtplib
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText
import email_templates

class UserProfileUpdate(BaseModel):
    display_name: str | None = None
    bio: str | None = None
    avatar_url: str | None = None
    cover_url: str | None = None
    cover_preset: str | None = None

# ── Add generation directory to path so we can import ML modules ──
GENERATION_DIR = Path(__file__).parent / "generation"
HUNYUAN_DIR = GENERATION_DIR / "models" / "Hunyuan3D-2"
sys.path.insert(0, str(GENERATION_DIR))
sys.path.insert(0, str(HUNYUAN_DIR))

# custom_rasterizer — needs root dir on sys.path so both `import custom_rasterizer`
# (the package) and `import custom_rasterizer_kernel` (the .pyd) are found
sys.path.insert(0, str(HUNYUAN_DIR / "hy3dgen" / "texgen" / "custom_rasterizer"))

import config
import database
import storage
import payments
from yookassa.domain.notification import WebhookNotificationFactory

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Start the expiration checker in the background
    sub_task = asyncio.create_task(check_expiring_subscriptions_loop())
    # Start the credit reset checker in the background
    credit_task = asyncio.create_task(check_pending_credit_resets_loop())
    yield
    # Cleanup
    sub_task.cancel()
    credit_task.cancel()

# ── App ──
app = FastAPI(
    title="AnimaticAI API", 
    version="0.1.0",
    lifespan=lifespan
)

from fastapi import Request
import time

@app.middleware("http")
async def log_requests(request: Request, call_next):
    try:
        response = await call_next(request)
        return response
    except Exception as e:
        raise

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "https://animaticai.online",
        "https://www.animaticai.online",
        "https://animaticai.ru",
        "https://www.animaticai.ru",
        "http://localhost:5173",
        "http://localhost:3000",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/")
def read_root():
    return {"message": "AnimaticAI API is running", "timestamp": datetime.utcnow().isoformat()}

# ── Pydantic models ──

class GenerateRequest(BaseModel):
    style: str = "realism"
    quality: str = "high"
    octree_resolution: int = 256
    num_steps: int = 50
    guidance_scale: float = 5.5

class GenerationStatus(BaseModel):
    id: str
    status: str
    progress: int
    result_model_id: str | None = None
    error_message: str | None = None
    created_at: str | None = None
    completed_at: str | None = None
    queue_position: int | None = None
    queue_length: int | None = None
    source_image_url: str | None = None
    total_duration_ms: int | None = None


class PaymentCreateRequest(BaseModel):
    user_id: str
    amount: float
    credits_amount: int
    plan_id: str | None = None
    description: str | None = None

class SubscriptionCancelRequest(BaseModel):
    user_id: str

class SubscriptionAutoRenewRequest(BaseModel):
    user_id: str
    auto_renew: bool

class ContactRequest(BaseModel):
    user_id: str | None = None
    email: str
    message: str
    plan_id: str = "studio"


# ── Endpoints ──

@app.get("/api/health")
def health_check():
    return {"status": "ok", "timestamp": datetime.utcnow().isoformat()}


@app.get("/api/stats/catalog")
def get_catalog_stats():
    """Get detailed statistics for catalog filters (tags, formats, AI counts)."""
    try:
        stats = database.get_catalog_stats()
        return stats
    except Exception as e:
        print(f"CATALOG STATS ERROR: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/api/tags")
def list_tags(tag_type: str | None = None):
    """Get list of tags, optionally filtered by type."""
    try:
        tags = database.get_tags(tag_type)
        return tags
    except Exception as e:
        print(f"TAGS ERROR: {e}")
        raise HTTPException(status_code=500, detail=str(e))


def send_purchase_confirmation(email: str, item_name: str, credits_amount: int = None):
    """Send a confirmation email to the user after purchase."""
    if not config.SMTP_USER or not config.SMTP_PASSWORD:
        return

    try:
        msg = MIMEMultipart()
        msg['From'] = f"AnimaticAI <{config.SMTP_USER}>"
        msg['To'] = email
        
        if credits_amount is not None:
            msg['Subject'] = "Баланс пополнен - AnimaticAI"
            html = email_templates.get_credits_confirmation_html(credits_amount)
        else:
            msg['Subject'] = "Подписка активирована - AnimaticAI"
            html = email_templates.get_subscription_confirmation_html(item_name)

        msg.attach(MIMEText(html, 'html'))
        server = smtplib.SMTP_SSL(config.SMTP_HOST, config.SMTP_PORT)
        server.login(config.SMTP_USER, config.SMTP_PASSWORD)
        server.send_message(msg)
        server.quit()
    except Exception as e:
        print(f"CONFIRMATION EMAIL ERROR: {e}")


def send_expiration_warning(email: str, days_left: int):
    """Send a warning email when subscription is about to expire."""
    if not config.SMTP_USER or not config.SMTP_PASSWORD:
        return

    try:
        msg = MIMEMultipart()
        msg['From'] = f"AnimaticAI <{config.SMTP_USER}>"
        msg['To'] = email
        msg['Subject'] = "Ваша подписка AnimaticAI скоро истекает"

        html = email_templates.get_expiration_warning_html(days_left)
        
        msg.attach(MIMEText(html, 'html'))
        server = smtplib.SMTP_SSL(config.SMTP_HOST, config.SMTP_PORT)
        server.login(config.SMTP_USER, config.SMTP_PASSWORD)
        server.send_message(msg)
        server.quit()
        print(f"EXPIRATION WARNING SENT to {email}")
    except Exception as e:
        print(f"EXPIRATION EMAIL ERROR: {e}")


def send_renewal_confirmation(email: str, plan_name: str):
    """Send a confirmation email when subscription is automatically renewed."""
    if not config.SMTP_USER or not config.SMTP_PASSWORD:
        return

    try:
        msg = MIMEMultipart()
        msg['From'] = f"AnimaticAI <{config.SMTP_USER}>"
        msg['To'] = email
        msg['Subject'] = "Подписка успешно продлена - AnimaticAI"

        html = email_templates.get_subscription_renewal_html(plan_name)
        
        msg.attach(MIMEText(html, 'html'))
        server = smtplib.SMTP_SSL(config.SMTP_HOST, config.SMTP_PORT)
        server.login(config.SMTP_USER, config.SMTP_PASSWORD)
        server.send_message(msg)
        server.quit()
        print(f"RENEWAL EMAIL SENT to {email}")
    except Exception as e:
        print(f"RENEWAL EMAIL ERROR: {e}")


async def check_expiring_subscriptions_loop():
    """Background loop that checks for expiring subscriptions every hour."""
    while True:
        print("CRON: Checking for expiring subscriptions...", flush=True)
        try:
            # 1. Process actual expirations and renewals
            res = database.expire_subscriptions()
            renewed_list = res.get("renewed", [])
            expired_list = res.get("expired", [])
            
            if renewed_list:
                print(f"CRON: Processing {len(renewed_list)} renewals", flush=True)
                for r in renewed_list:
                    # 1. Check if we have a payment method for recurrent billing
                    pm_id = r.get("payment_method_id")
                    user_id = r["user_id"]
                    plan_id = r["plan_id"]
                    
                    if pm_id:
                        # Map plan_id to price
                        price = 990.0 if plan_id == 'pro' else 2990.0
                        
                        print(f"CRON: Attempting recurrent payment for user {user_id} ({plan_id})", flush=True)
                        pay_res = payments.create_recurrent_payment(user_id, price, pm_id, plan_id)
                        
                        if not pay_res["success"]:
                            print(f"CRON: Recurrent payment FAILED for {user_id}. Revoking subscription.", flush=True)
                            database.cancel_subscription_on_payment_failure(user_id)
                            # TODO: Send email about payment failure
                            continue
                        else:
                            status_msg = f"SIMULATED SUCCESS" if pay_res.get("simulated") else pay_res['status']
                            print(f"CRON: Recurrent payment {status_msg} for {user_id}", flush=True)
                    
                    # 2. Send renewal confirmation email
                    send_renewal_confirmation(r["email"], r["plan_id"])
            
            if expired_list:
                print(f"CRON: Expired {len(expired_list)} subscriptions", flush=True)

            # 2. Send warnings for upcoming expirations
            with database._get_pg_connection() as conn:
                with conn.cursor() as cur:
                    # Find active subscriptions ending in 1 or 3 days
                    cur.execute("""
                        SELECT s.user_id, u.email, s.current_period_end 
                        FROM public.subscriptions s
                        JOIN auth.users u ON s.user_id = u.id
                        WHERE s.status = 'active' 
                        AND s.current_period_end > now()
                        AND s.current_period_end < now() + interval '3 days'
                    """)
                    expiring = cur.fetchall()
                    
                    for user_id, email, end_date in expiring:
                        days_left = (end_date - datetime.now(timezone.utc)).days
                        if email:
                            send_expiration_warning(email, days_left + 1)
                            
        except Exception as e:
            print(f"CRON SUB ERROR: {e}", flush=True)
            
        # Wait 1 hour
        await asyncio.sleep(60 * 60)


async def check_pending_credit_resets_loop():
    """Background loop that checks for credit resets every hour."""
    while True:
        print("CRON: Checking for pending credit resets...", flush=True)
        try:
            count = database.reset_all_pending_credits()
            if count > 0:
                print(f"CRON: Automatically reset credits for {count} users.", flush=True)
        except Exception as e:
            print(f"CRON CREDIT RESET ERROR: {e}", flush=True)
            
        # Wait 1 hour
        await asyncio.sleep(60 * 60)




@app.get("/api/users/{user_id}/credits")
def get_user_credits(user_id: str):
    """Get user credits and check subscription status."""
    result = database.get_or_reset_credits(user_id)
    
    # Check for expiration
    try:
        with database._get_pg_connection() as conn:
            with conn.cursor() as cur:
                cur.execute("SELECT current_period_end, auto_renew FROM public.subscriptions WHERE user_id = %s AND status IN ('active', 'canceled')", (user_id,))
                sub = cur.fetchone()
                if sub:
                    from datetime import datetime, timezone
                    end_date = sub[0]
                    auto_renew = sub[1]
                    days_left = (end_date - datetime.now(timezone.utc)).days
                    result["subscription_days_left"] = days_left
                    result["subscription_auto_renew"] = auto_renew
                    if 0 <= days_left <= 1:
                        result["expiring_soon"] = True
    except:
        pass
        
    return result


@app.post("/api/payments/create")
def create_user_payment(req: PaymentCreateRequest):
    """Create a new payment with Yookassa."""
    result = payments.create_payment(
        user_id=req.user_id,
        amount=req.amount,
        credits_amount=req.credits_amount,
        plan_id=req.plan_id,
        description=req.description or f"Пополнение баланса: {req.credits_amount} кредитов (AnimaticAI)"
    )
    if not result["success"]:
        raise HTTPException(status_code=400, detail=result.get("error"))
    return result


def send_contact_email(email: str, plan_id: str, message: str):
    """Send an email notification using Yandex SMTP."""
    if not config.SMTP_USER or not config.SMTP_PASSWORD:
        print("SMTP credentials not set, skipping email")
        return

    try:
        msg = MIMEMultipart()
        msg['From'] = config.SMTP_USER
        msg['To'] = "fedenev.vladis@yandex.com"
        msg['Subject'] = f"Новая заявка на план {plan_id} - AnimaticAI"

        body = f"Пользователь: {email}\nПлан: {plan_id}\n\nСообщение:\n{message}"
        msg.attach(MIMEText(body, 'plain'))

        server = smtplib.SMTP_SSL(config.SMTP_HOST, config.SMTP_PORT)
        server.login(config.SMTP_USER, config.SMTP_PASSWORD)
        server.send_message(msg)
        server.quit()
        print(f"EMAIL SENT to fedenev.vladis@yandex.com from {email}")
    except Exception as e:
        print(f"EMAIL ERROR: {e}")


@app.post("/api/contact")
async def contact_form(req: ContactRequest, background_tasks: BackgroundTasks):
    """Handle contact/studio requests."""
    try:
        with database._get_pg_connection() as conn:
            with conn.cursor() as cur:
                cur.execute("""
                    INSERT INTO public.contact_requests (user_id, email, message, plan_id)
                    VALUES (%s, %s, %s, %s)
                """, (req.user_id, req.email, req.message, req.plan_id))
        
        # Send email in background
        background_tasks.add_task(send_contact_email, req.email, req.plan_id, req.message)
        
        return {"status": "ok", "message": "Request saved and email queued"}
    except Exception as e:
        print(f"CONTACT ERROR: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/api/payments/webhook")
async def yookassa_webhook(request: Request, background_tasks: BackgroundTasks):
    """Handle Yookassa payment notifications."""
    ip = request.client.host
    # TODO: Verify Yookassa IP ranges for security in production
    
    try:
        event_json = await request.json()
        notification = WebhookNotificationFactory().create(event_json)
        payment = notification.object
        
        if notification.event == "payment.succeeded":
            user_id = payment.metadata.get("user_id")
            credits_amount = int(payment.metadata.get("credits_amount", 0))
            
            if user_id and credits_amount > 0:
                plan_id = payment.metadata.get("plan_id")
                print(f"PAYMENT SUCCESS: User {user_id} bought {credits_amount} credits (Plan: {plan_id})")
                payments.process_successful_payment(payment.id, user_id, credits_amount, plan_id)
                
                # Save payment method ID for recurrent payments if it's a subscription
                if plan_id and payment.payment_method:
                    pm_id = payment.payment_method.id
                    try:
                        with database._get_pg_connection() as conn:
                            with conn.cursor() as cur:
                                cur.execute("""
                                    UPDATE public.subscriptions 
                                    SET payment_method_id = %s 
                                    WHERE user_id = %s
                                """, (pm_id, user_id))
                                conn.commit()
                                print(f"SAVED PAYMENT METHOD {pm_id} for user {user_id}")
                    except Exception as e:
                        print(f"ERROR saving payment method: {e}")
                
                # Get user email for confirmation
                try:
                    with database._get_pg_connection() as conn:
                        with conn.cursor() as cur:
                            cur.execute("SELECT email FROM auth.users WHERE id = %s", (user_id,))
                            row = cur.fetchone()
                            if row:
                                # Subscriptions are 'pro' and 'studio'. Everything else is credits.
                                is_sub = plan_id in ["pro", "studio"]
                                background_tasks.add_task(
                                    send_purchase_confirmation, 
                                    email=row[0], 
                                    item_name=plan_id or "Кредиты", 
                                    credits_amount=(credits_amount if not is_sub else None)
                                )
                except Exception as e:
                    print(f"WEBHOOK EMAIL NOTIFY ERROR: {e}")
                    pass
                    
                return {"status": "ok"}
                
        elif notification.event == "payment.canceled":
            payments.update_payment_status(payment.id, "canceled")
            print(f"PAYMENT CANCELED: {payment.id}")
            
        return {"status": "ok"}
    except Exception as e:
        print(f"WEBHOOK ERROR: {e}")
        return {"status": "error", "message": str(e)}


@app.post("/api/users/{user_id}/credits/deduct")
def deduct_user_credits(user_id: str, amount: int = 3):
    """Deduct credits from user. Returns error if insufficient."""
    result = database.deduct_credits(user_id, amount)
    if not result["success"]:
        raise HTTPException(status_code=402, detail=result["error"])
    return {"credits": result["credits"]}


@app.post("/api/generate")
async def generate_model(
    image: UploadFile = File(...),
    style: str = Form("realism"),
    user_id: str = Form(...),
    name: str = Form(""),
    octree_resolution: int = Form(256),
    num_steps: int = Form(30),
    guidance_scale: float = Form(5.5),
    enable_pbr: bool = Form(True),
    poly_count: str = Form("50k"),
    ai_model: str = Form("Hunyuan3D-1"),
    quality_level: str = Form("high"),
    category: str = Form("Персонажи"),
):
    """
    Start 3D model generation from a photo via ARQ queue.
    Returns immediately with a generation ID — poll /api/generate/{id} for status.
    """
    import queue_manager

    # Fetch model config from DB
    model_cfg = database.get_ai_model_config(ai_model)
    if not model_cfg:
        raise HTTPException(status_code=400, detail=f"Unknown AI model: {ai_model}")

    # Calculate credits based on base_cost and quality
    cost = model_cfg.get("base_cost", 2)
    if quality_level == "ultra":
        cost += 2
    elif quality_level == "high":
        cost += 1

    # Require Pro/Studio for premium models
    if ai_model in ["Hunyuan3D-2", "TRELLIS2"]:
        profile = database.get_user_profile(user_id)
        tier = profile.get('subscription_status') if profile else None
        if tier not in ['pro', 'studio']:
            raise HTTPException(status_code=403, detail=f"Model {ai_model} requires Pro or Studio subscription.")

    # Check and deduct credits
    credit_result = database.deduct_credits(user_id, amount=cost)
    if not credit_result["success"]:
        raise HTTPException(status_code=402, detail=credit_result["error"])

    # Save uploaded image to temp file
    temp_dir = tempfile.mkdtemp()
    image_path = os.path.join(temp_dir, "input.png")

    with open(image_path, "wb") as f:
        content = await image.read()
        f.write(content)

    # Create generation request in DB
    gen = database.create_generation_request(user_id, "model_photo", style)
    if not gen:
        return {"error": "Failed to create generation request"}

    gen_id = gen["id"]

    # Submit to ARQ queue
    try:
        await queue_manager.submit_generation_job(
            gen_id=gen_id,
            user_id=user_id,
            image_path=image_path,
            style=style,
            model_name=name,
            octree_resolution=octree_resolution,
            num_steps=num_steps,
            guidance_scale=guidance_scale,
            enable_pbr=enable_pbr,
            enable_rig=False,
            poly_count=poly_count,
            ai_model=ai_model,
            category=category,
            quality_level=quality_level,
            quality_settings=model_cfg.get("quality_settings"),
        )
        print(f"[API] Submitted generation job {gen_id} to queue", flush=True)
    except Exception as e:
        print(f"[API] Failed to submit job: {e}", flush=True)
        database.update_generation_status(gen_id, "failed", 0, error=str(e))
        raise HTTPException(status_code=500, detail=f"Failed to queue generation: {str(e)}")

    return {"generation_id": gen_id, "status": "queued"}


@app.get("/api/generate/{gen_id}", response_model=GenerationStatus)
def get_generation_status(gen_id: str):
    """Check the status of a generation request."""
    gen = database.get_generation_request(gen_id)
    if not gen:
        raise HTTPException(status_code=404, detail="Generation not found")

    # If queued, check queue position (sync Redis)
    queue_position = None
    queue_length = 0
    if gen.get("status") == "queued":
        try:
            import redis
            import json
            r = redis.Redis(host=os.getenv("REDIS_HOST", "localhost"), port=int(os.getenv("REDIS_PORT", 6379)), decode_responses=True)
            queue_jobs = r.lrange("arq:queue", 0, -1)
            queue_length = len(queue_jobs)
            for i, job_bytes in enumerate(queue_jobs):
                try:
                    job_data = json.loads(job_bytes)
                    if job_data.get("job_id") == gen_id:
                        queue_position = i + 1
                        break
                except:
                    pass
            r.close()
        except:
            pass

    # Calculate total duration if completed
    total_duration_ms = None
    if gen.get("completed_at") and gen.get("created_at"):
        try:
            from dateutil import parser
            created = parser.parse(gen["created_at"]) if isinstance(gen["created_at"], str) else gen["created_at"]
            completed = parser.parse(gen["completed_at"]) if isinstance(gen["completed_at"], str) else gen["completed_at"]
            total_duration_ms = int((completed - created).total_seconds() * 1000)
        except Exception as e:
            print(f"DURATION CALC ERROR: {e}")

    return GenerationStatus(
        id=gen["id"],
        status=gen["status"],
        progress=gen.get("progress", 0),
        result_model_id=gen.get("result_model_id"),
        error_message=gen.get("error_message"),
        created_at=str(gen.get("created_at")) if gen.get("created_at") else None,
        completed_at=str(gen.get("completed_at")) if gen.get("completed_at") else None,
        queue_position=queue_position,
        queue_length=queue_length,
        source_image_url=gen.get("source_image_url"),
        total_duration_ms=total_duration_ms,
    )


@app.get("/api/generate/{gen_id}/logs")
def get_generation_logs(gen_id: str):
    """Get performance metrics for each stage of generation."""
    try:
        logs = database.get_generation_logs(gen_id)
        return logs
    except Exception as e:
        print(f"GET LOGS ERROR: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/api/config/ai-models")
def get_ai_models_config():
    """Get all available AI models for generation UI."""
    return database.get_ai_models()


@app.get("/api/config/subscription-plans")
def get_subscription_plans_config():
    """Get all subscription plans for pricing page."""
    return database.get_subscription_plans()


@app.get("/api/config/file-formats")
def get_file_formats_config():
    """Get all file formats for catalog filtering."""
    return database.get_file_formats()


@app.get("/api/models")
def list_models(
    categories: str | None = None,
    formats: str | None = None,
    search: str | None = None,
    sort: str | None = None,
    ai_only: bool = False,
    limit: int = 20,
    offset: int = 0,
):
    """Get catalog of approved models."""
    filters = {}
    if categories:
        filters["categories"] = [c.strip() for c in categories.split(",")]
    if formats:
        filters["formats"] = [f.strip() for f in formats.split(",")]
    if search:
        filters["search"] = search
    if ai_only:
        filters["ai_only"] = True

    models = database.get_models(filters, limit=limit, offset=offset, sort=sort)
    return {"items": models, "total": len(models)}


@app.get("/api/models/{model_id}")
def get_model(model_id: str):
    """Get a single model by ID."""
    model = database.get_model(model_id)
    if not model:
        raise HTTPException(status_code=404, detail="Model not found")
    return model


@app.put("/api/models/{model_id}")
def update_model(model_id: str, name: str = None, description: str = None, category: str = None, license: str = None, author_id: str = None):
    """Update model fields. Only author can edit."""
    model = database.get_model(model_id)
    if not model:
        raise HTTPException(status_code=404, detail="Model not found")
    if author_id and model["author_id"] != author_id:
        raise HTTPException(status_code=403, detail="Only the author can edit this model")

    updates = {}
    if name is not None:
        updates["name"] = name
    if description is not None:
        updates["description"] = description
    if category is not None:
        updates["category"] = category
    if license is not None:
        updates["license"] = license

    updated = database.update_model(model_id, model["author_id"], updates)
    if not updated:
        raise HTTPException(status_code=404, detail="Failed to update model")
    return updated


@app.get("/api/models/{model_id}/comments")
def get_model_comments(model_id: str, limit: int = 50, offset: int = 0):
    """Get comments for a model."""
    comments = database.get_comments(model_id, "model", limit, offset)
    return {"items": comments, "total": len(comments)}


@app.post("/api/models/{model_id}/comments")
def add_model_comment(model_id: str, author_id: str = Form(...), content: str = Form(...), parent_id: str = Form(None)):
    """Add a comment to a model."""
    comment = database.add_comment(model_id, "model", author_id, content, parent_id if parent_id != "null" else None)
    if not comment:
        raise HTTPException(status_code=500, detail="Failed to add comment")
    return comment


@app.post("/api/models/{model_id}/interact")
def toggle_model_interaction(model_id: str, user_id: str = Form(...), type: str = Form(...)):
    """Toggle like/favorite on a model."""
    if type not in ("like", "favorite"):
        raise HTTPException(status_code=400, detail="Invalid interaction type")
    is_added = database.toggle_interaction(user_id, model_id, "model", type)
    has_it = database.has_interaction(user_id, model_id, "model", type)
    return {"is_active": has_it, "added": is_added}


@app.get("/api/models/{model_id}/interactions")
def get_model_interactions(model_id: str, user_id: str = None):
    """Check if user has liked/favorited a model."""
    if not user_id:
        return {"is_liked": False, "is_favorited": False}
    return {
        "is_liked": database.has_interaction(user_id, model_id, "model", "like"),
        "is_favorited": database.has_interaction(user_id, model_id, "model", "favorite"),
    }


@app.post("/api/models/{model_id}/download")
def download_model(model_id: str, user_id: str = Form(None)):
    """Increment download counter and return file URL for direct download.
    Each user can only download once (counter increments on first download only)."""
    model = database.get_model(model_id)
    if not model:
        raise HTTPException(status_code=404, detail="Model not found")
    if not model.get("file_url"):
        raise HTTPException(status_code=404, detail="Model file not available")

    # Record download (only counts if first time for this user)
    if user_id:
        database.record_download(model_id, user_id)

    return {"file_url": model["file_url"], "name": model["name"], "format": model.get("format", "GLB")}


@app.get("/api/users/{user_id}/models")
def get_user_models(user_id: str, limit: int = 20):
    """Get models by a specific user (includes private models for the user themselves)."""
    models = database.get_models_by_author(user_id, limit=limit)
    return {"items": models, "total": len(models)}


@app.post("/api/models/{model_id}/publish")
def publish_model_endpoint(model_id: str, user_id: str = Form(...), license_type: str = Form("view_only")):
    """Publish a model with chosen license. Only the author can do this."""
    result = database.publish_model(model_id, user_id, license_type)
    if not result:
        raise HTTPException(status_code=403, detail="Not authorized or model not found")
    return result


@app.get("/api/animations")
def list_animations(
    search: str | None = None,
    limit: int = 20,
    offset: int = 0,
):
    """Get catalog of approved animations."""
    filters = {}
    if search:
        filters["search"] = search
    animations = database.get_animations(filters=filters or None, limit=limit, offset=offset)
    return {"items": animations, "total": len(animations)}


@app.post("/api/models/{model_id}/convert")
async def convert_model(model_id: str, format: str = Form(...)):
    """Convert GLB model to another format (OBJ, STL). Returns download URL."""
    import httpx
    import trimesh
    import io

    model = database.get_model(model_id)
    if not model:
        raise HTTPException(status_code=404, detail="Model not found")
    if not model.get("file_url"):
        raise HTTPException(status_code=404, detail="Model file not available")

    fmt = format.lower()
    if fmt not in ("obj", "stl"):
        raise HTTPException(status_code=400, detail="Unsupported format. Use: obj, stl")

    try:
        # Download GLB
        print(f"[Convert] Downloading GLB from {model['file_url']}", flush=True)
        async with httpx.AsyncClient() as client:
            resp = await client.get(model["file_url"])
            if resp.status_code != 200:
                raise HTTPException(status_code=500, detail=f"Failed to download: {resp.status_code}")
            glb_data = resp.content

        # Load with trimesh
        print(f"[Convert] Loading GLB ({len(glb_data)} bytes)", flush=True)
        scene = trimesh.load(io.BytesIO(glb_data), file_type='glb')

        if isinstance(scene, trimesh.Trimesh):
            mesh = scene
        elif hasattr(scene, 'geometry') and scene.geometry:
            mesh = list(scene.geometry.values())[0]
        else:
            raise HTTPException(status_code=500, detail="Failed to parse GLB")

        print(f"[Convert] Mesh loaded: {len(mesh.vertices)} vertices, {len(mesh.faces)} faces", flush=True)

        # Export to requested format via BytesIO or tempfile
        print(f"[Convert] Exporting to {fmt}", flush=True)
        try:
            buffer = io.BytesIO()
            result = mesh.export(buffer, file_type=fmt)
            buffer.seek(0)
            converted_data = buffer.getvalue()
            if not converted_data:
                raise ValueError("Empty export")
        except Exception as export_err:
            # Fallback: export to temp file
            print(f"[Convert] BytesIO export failed, trying temp file: {export_err}", flush=True)
            import tempfile
            with tempfile.NamedTemporaryFile(suffix=f'.{fmt}', delete=False) as tmp:
                tmp_path = tmp.name
            mesh.export(tmp_path, file_type=fmt)
            with open(tmp_path, 'rb') as f:
                converted_data = f.read()
            import os
            os.unlink(tmp_path)

        if not converted_data:
            raise HTTPException(status_code=500, detail=f"Export to {fmt} produced empty data")

        print(f"[Convert] Exported {len(converted_data)} bytes", flush=True)

        # Upload with timestamp to avoid duplicates
        import time
        ts = int(time.time() * 1000)
        content_type = "model/stl" if fmt == "stl" else "application/octet-stream"
        converted_url = storage.upload_bytes(
            config.BUCKET_MODELS, converted_data, f"{model_id}/model_{ts}.{fmt}", content_type=content_type
        )

        if not converted_url:
            raise HTTPException(status_code=500, detail="Failed to upload converted file")

        print(f"[Convert] Uploaded to {converted_url}", flush=True)
        return {"file_url": converted_url, "format": fmt.upper(), "name": model["name"]}

    except HTTPException:
        raise
    except Exception as e:
        print(f"[Convert] ERROR: {e}", flush=True)
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Conversion failed: {str(e)}")


def prepare_profile_response(profile: dict) -> dict:
    """Add calculated fields to profile response."""
    profile["subscription_days_left"] = 0
    
    if profile.get("subscription_end_date"):
        try:
            from datetime import datetime, timezone
            end_date = profile["subscription_end_date"]
            
            if isinstance(end_date, str):
                # Handle ISO format from Supabase (e.g. 2024-01-01T00:00:00Z)
                end_date = datetime.fromisoformat(end_date.replace('Z', '+00:00'))
            
            # Ensure aware
            if end_date.tzinfo is None:
                end_date = end_date.replace(tzinfo=timezone.utc)
                
            now = datetime.now(timezone.utc)
            
            # Calculate days left
            if end_date > now:
                days_left = (end_date - now).days
                profile["subscription_days_left"] = max(0, days_left)
                
        except Exception as e:
            print(f"Error calculating days left: {e}")
            
    return profile


@app.get("/api/users/{user_id}")
def get_user_profile(user_id: str):
    """Get user profile."""
    profile = database.get_user_profile(user_id)
    if not profile:
        raise HTTPException(status_code=404, detail="User not found")
    
    return prepare_profile_response(profile)


@app.get("/api/users/{user_id}/generations")
def get_user_generations(user_id: str, limit: int = 20):
    """Get user's generation history."""
    generations = database.get_user_generations(user_id, limit)
    return {"items": generations, "total": len(generations)}


@app.get("/api/users/{user_id}/favorites")
def get_user_favorites(user_id: str, limit: int = 20):
    """Get models favorited by user."""
    favorites = database.get_user_favorites(user_id, limit=limit)
    return {"items": favorites, "total": len(favorites)}


@app.get("/api/users/{user_id}/liked")
def get_user_liked(user_id: str, limit: int = 20):
    """Get models liked by user."""
    liked = database.get_user_liked_models(user_id, limit=limit)
    return {"items": liked, "total": len(liked)}


@app.get("/api/users/{user_id}/followers")
def get_user_followers(user_id: str, limit: int = 50):
    """Get user followers."""
    followers = database.get_user_followers(user_id, limit=limit)
    return {"items": followers, "total": len(followers)}


@app.get("/api/users/{user_id}/following")
def get_user_following(user_id: str, limit: int = 50):
    """Get authors followed by user."""
    following = database.get_user_following(user_id, limit=limit)
    return {"items": following, "total": len(following)}


@app.post("/api/users/{author_id}/follow")
def toggle_subscription(author_id: str, subscriber_id: str = Form(...)):
    """Follow or unfollow an author."""
    is_subscribed, count = database.toggle_subscription(subscriber_id, author_id)
    return {"is_subscribed": is_subscribed, "subscribers_count": count}


@app.get("/api/users/{author_id}/is_following")
def check_subscription(author_id: str, subscriber_id: str):
    """Check if user is following author."""
    following = database.is_following(subscriber_id, author_id)
    return {"is_following": following}


@app.put("/api/users/{user_id}")
def update_user(user_id: str, data: UserProfileUpdate):
    """Update user profile fields."""
    profile = database.get_user_profile(user_id)
    if not profile:
        raise HTTPException(status_code=404, detail="User not found")

    updates = data.model_dump(exclude_unset=True)
    if not updates:
        return profile

    updated = database.update_user_profile(user_id, updates)
    if not updated:
        raise HTTPException(status_code=400, detail="Failed to update profile")
    
    return prepare_profile_response(updated)


@app.get("/api/users/{user_id}/activity")
def get_user_activity(user_id: str, days: int = 90):
    """Get user activity heatmap and recent feed."""
    profile = database.get_user_profile(user_id)
    if not profile:
        raise HTTPException(status_code=404, detail="User not found")
    return database.get_user_activity(user_id, days=days)

@app.get("/api/stats")
def get_platform_stats():
    """Get platform-wide statistics for dashboard."""
    return database.get_platform_stats()


# ── Background task: run the full ML pipeline ──

def _run_generation(gen_id: str, user_id: str, image_path: str, style: str, temp_dir: str,
                    model_name: str = "", octree_resolution: int = 256, num_steps: int = 30, guidance_scale: float = 5.5,
                    enable_pbr: bool = True, poly_count: str = "50k"):
    """
    Run the full Hunyuan3D-2 pipeline in a background thread.
    Updates generation status in the database as it progresses.
    """
    try:
        print(f"[Gen {gen_id[:8]}] Starting generation", flush=True)
        print(f"[Gen {gen_id[:8]}] Params: res={octree_resolution}, steps={num_steps}, "
              f"guidance={guidance_scale}, pbr={enable_pbr}, poly={poly_count}", flush=True)

        database.update_generation_status(gen_id, "processing", progress=5)

        # ── Step 1: Preprocess image ──
        print(f"[Gen {gen_id[:8]}] Step 1: Preprocessing image...", flush=True)
        database.update_generation_status(gen_id, "processing", progress=10)

        from image_preprocess import PreprocessPipeline
        from PIL import Image

        img = Image.open(image_path).convert("RGBA")
        preprocess = PreprocessPipeline()
        processed_path = preprocess.process(img, output_dir=temp_dir)
        print(f"[Gen {gen_id[:8]}] Preprocessing done", flush=True)

        database.update_generation_status(gen_id, "processing", progress=20)

        # ── Step 2: Generate geometry ──
        print(f"[Gen {gen_id[:8]}] Step 2: Generating geometry (res={octree_resolution}, steps={num_steps})...", flush=True)
        database.update_generation_status(gen_id, "processing", progress=25)

        os.environ["PYTORCH_CUDA_ALLOC_CONF"] = "expandable_segments:True"
        os.environ["HF_HUB_DISABLE_XET"] = "1"

        import torch
        import trimesh
        from hy3dgen.shapegen.pipelines import Hunyuan3DDiTFlowMatchingPipeline

        pipe = Hunyuan3DDiTFlowMatchingPipeline.from_pretrained("tencent/Hunyuan3D-2")
        result = pipe(
            image=processed_path,
            octree_resolution=octree_resolution,
            num_inference_steps=num_steps,
            guidance_scale=guidance_scale,
            remove_bg=False,
            mc_algo="mc",
        )
        mesh = result if not isinstance(result, list) else result[0]
        print(f"[Gen {gen_id[:8]}] Geometry done: {len(mesh.vertices)} vertices, {len(mesh.faces)} faces", flush=True)

        database.update_generation_status(gen_id, "processing", progress=45)

        # ── Step 2.5: Simplify mesh if needed (poly_count) ──
        poly_map = {"5k": 5000, "25k": 25000, "50k": 50000, "75k": 75000, "100k+": 100000}
        target_faces = poly_map.get(poly_count.lower(), 50000)

        if len(mesh.faces) > target_faces:
            try:
                mesh = mesh.simplify_quadric_decimation(face_count=target_faces)
                print(f"[Gen {gen_id[:8]}] Mesh simplified to {len(mesh.faces)} faces", flush=True)
            except Exception as e:
                print(f"[Gen {gen_id[:8]}] WARN: Simplify failed: {e}, using original mesh", flush=True)

        database.update_generation_status(gen_id, "processing", progress=55)

        # Save geometry
        geometry_path = os.path.join(temp_dir, "geometry.glb")
        trimesh.Scene(geometry=mesh).export(geometry_path, file_type="glb")
        print(f"[Gen {gen_id[:8]}] Geometry saved: {geometry_path}", flush=True)

        # ── Step 2.5: Generate preview image (screenshot of the actual 3D model) ──
        preview_url = None
        print(f"[Gen {gen_id[:8]}] Step 2.5: Generating preview from 3D mesh...", flush=True)
        try:
            from PIL import Image as PILImage
            import pyrender
            import numpy as np

            scene_mesh = trimesh.Scene(geometry=mesh)

            # Compute bounding box for auto-framing
            bounds = scene_mesh.bounds  # [[min_x, min_y, min_z], [max_x, max_y, max_z]]
            center = scene_mesh.centroid
            size = bounds[1] - bounds[0]
            max_dim = max(size.max(), 0.1)  # Avoid division by zero

            # Camera distance: enough to fit the model with padding
            cam_distance = max_dim * 2.5
            cam_position = center + np.array([0, size[1] * 0.3, cam_distance])
            cam_target = center

            # Create pyrender scene with gray background
            pr_scene = pyrender.Scene(
                ambient_light=np.array([0.5, 0.5, 0.5, 1.0]),
                bg_color=np.array([0.15, 0.15, 0.2, 1.0])
            )

            # Add mesh
            mesh_data = pyrender.Mesh.from_trimesh(scene_mesh.dump(concatenate=True))
            pr_scene.add(mesh_data, 'mesh')

            # Camera
            camera = pyrender.PerspectiveCamera(yfov=np.pi / 4.0)
            camera_node = pr_scene.add(camera, name='camera', pose=np.array([
                [1, 0, 0, cam_position[0]],
                [0, 1, 0, cam_position[1]],
                [0, 0, 1, cam_position[2]],
                [0, 0, 0, 1]
            ]))

            # Point camera at model center
            camera_node.matrix[:3, 3] = cam_position

            # Multiple lights for even illumination
            lights = [
                {'pos': cam_position + [0, max_dim, max_dim], 'intensity': 3.0},
                {'pos': cam_position + [max_dim, 0, max_dim * 0.5], 'intensity': 2.0},
                {'pos': cam_position + [-max_dim, 0, max_dim * 0.5], 'intensity': 2.0},
                {'pos': cam_position + [0, -max_dim, max_dim * 0.5], 'intensity': 1.5},
            ]
            for l in lights:
                light = pyrender.DirectionalLight(color=np.array([1.0, 1.0, 1.0]), intensity=l['intensity'])
                light_node = pyrender.Node(light=light, matrix=np.eye(4))
                light_node.matrix[:3, 3] = l['pos']
                pr_scene.add_node(light_node)

            # Offscreen renderer
            r = pyrender.OffscreenRenderer(512, 512)
            color, _ = r.render(pr_scene)
            r.delete()

            # Convert to PIL image and save
            img = PILImage.fromarray(color)
            preview_path = os.path.join(temp_dir, "preview.png")
            img.save(preview_path)

            # Upload preview (use timestamp to avoid conflicts on regeneration)
            import time
            ts = int(time.time() * 1000)
            preview_url = storage.upload_file(
                config.BUCKET_PREVIEWS, preview_path, f"{gen_id}/preview_{ts}.png"
            )
            print(f"[Gen {gen_id[:8]}] Preview uploaded: {preview_url}", flush=True)

        except Exception as e:
            print(f"[Gen {gen_id[:8]}] WARN: Preview generation failed: {e}, using fallback", flush=True)
            # Fallback: gradient image
            try:
                from PIL import Image as PILImage
                import numpy as np
                vertex_count = len(mesh.vertices)
                face_count = len(mesh.faces)
                color_seed = (vertex_count * 7 + face_count * 13) % 360
                h = color_seed / 360.0
                s, v = 0.6, 0.7
                i = int(h * 6)
                f = h * 6 - i
                p = v * (1 - s)
                q = v * (1 - f * s)
                t = v * (1 - (1 - f) * s)
                r, g, b = {
                    0: (v, t, p), 1: (q, v, p), 2: (p, v, t),
                    3: (p, q, v), 4: (t, p, v), 5: (v, p, q),
                }[i % 6]
                img = PILImage.new('RGB', (400, 300))
                pixels = img.load()
                for x in range(400):
                    for y in range(300):
                        dx = x / 400.0
                        dy = y / 300.0
                        cr = max(0, min(255, int(255 * (r * (0.7 + 0.3 * dx) + 0.1 * dy))))
                        cg = max(0, min(255, int(255 * (g * (0.7 + 0.3 * dy) + 0.1 * dx))))
                        cb = max(0, min(255, int(255 * (b * (0.7 + 0.3 * (dx + dy) / 2) + 0.1))))
                        pixels[x, y] = (cr, cg, cb)
                preview_path = os.path.join(temp_dir, "preview.png")
                img.save(preview_path)
                preview_url = storage.upload_file(
                    config.BUCKET_PREVIEWS, preview_path, f"{gen_id}/preview.png"
                )
            except Exception as e2:
                print(f"[Gen {gen_id[:8]}] WARN: Fallback preview also failed: {e2}", flush=True)
                preview_url = None

        # ── Step 3: Generate textures (only if PBR enabled) ──
        if enable_pbr:
            print(f"[Gen {gen_id[:8]}] Step 3: Generating PBR textures...", flush=True)
            database.update_generation_status(gen_id, "processing", progress=60)

            from hy3dgen.texgen.pipelines import Hunyuan3DPaintPipeline

            pipe_tex = Hunyuan3DPaintPipeline.from_pretrained(
                "tencent/Hunyuan3D-2",
                subfolder="hunyuan3d-paint-v2-0-turbo",
            )

            torch.cuda.empty_cache()
            import gc
            gc.collect()

            textured = pipe_tex(mesh, processed_path)
            print(f"[Gen {gen_id[:8]}] Textures done", flush=True)

            database.update_generation_status(gen_id, "processing", progress=80)

            # Save textured model
            final_path = os.path.join(temp_dir, "final_pbr.glb")
            trimesh.Scene(geometry=textured).export(final_path, file_type="glb")
            upload_path = final_path
        else:
            print(f"[Gen {gen_id[:8]}] Step 3: PBR disabled, using geometry-only", flush=True)
            database.update_generation_status(gen_id, "processing", progress=80)
            final_path = geometry_path
            upload_path = geometry_path

        # ── Step 4: Upload to Supabase Storage ──
        print(f"[Gen {gen_id[:8]}] Step 4: Uploading to Supabase Storage...", flush=True)
        database.update_generation_status(gen_id, "processing", progress=85)

        model_url = storage.upload_model(upload_path, gen_id)
        if not model_url:
            raise Exception("Failed to upload model to storage")
        print(f"[Gen {gen_id[:8]}] Upload done: {model_url}", flush=True)

        database.update_generation_status(gen_id, "processing", progress=95)

        # Create model record in DB — status=pending until user chooses license
        model = database.create_model(
            author_id=user_id,
            name=model_name.strip() or f"Generated Model {gen_id[:8]}",
            description=f"AI-generated 3D model (style: {style})",
            category="Персонажи",
            format="GLB",
            file_url=model_url,
            preview_url=preview_url,
            ai_generated=True,
            status="pending",
            license="private",
            vertices_count=len(mesh.vertices),
            faces_count=len(mesh.faces),
        )
        print(f"[Gen {gen_id[:8]}] Model created in DB: {model['id']}", flush=True)

        database.update_generation_status(
            gen_id,
            "completed",
            progress=100,
            result_model_id=model["id"],
        )
        print(f"[Gen {gen_id[:8]}] Generation COMPLETE!", flush=True)

    except Exception as e:
        print(f"Generation failed: {e}")
        import traceback
        traceback.print_exc()
        database.update_generation_status(
            gen_id, "failed", error=str(e), progress=0
        )
    finally:
        # Cleanup temp directory
        try:
            shutil.rmtree(temp_dir, ignore_errors=True)
        except Exception:
            pass


@app.post("/api/users/{user_id}/avatar")
async def upload_avatar(user_id: str, file: UploadFile = File(...)):
    """Upload user avatar and update profile."""
    temp_dir = tempfile.mkdtemp()
    try:
        ext = os.path.splitext(file.filename)[1]
        temp_path = os.path.join(temp_dir, f"avatar_{uuid.uuid4()}{ext}")
        with open(temp_path, "wb") as f:
            f.write(await file.read())
        
        # Upload to Supabase
        destination = f"{user_id}/avatar{ext}"
        public_url = storage.upload_file(config.BUCKET_AVATARS, temp_path, destination)
        
        if not public_url:
            raise HTTPException(status_code=500, detail="Failed to upload avatar to storage")
            
        # Update DB
        updated = database.update_user_profile(user_id, {"avatar_url": public_url})
        return updated
    finally:
        shutil.rmtree(temp_dir, ignore_errors=True)


@app.post("/api/users/{user_id}/cover")
async def upload_cover(user_id: str, file: UploadFile = File(...)):
    """Upload user cover and update profile."""
    temp_dir = tempfile.mkdtemp()
    try:
        ext = os.path.splitext(file.filename)[1]
        temp_path = os.path.join(temp_dir, f"cover_{uuid.uuid4()}{ext}")
        with open(temp_path, "wb") as f:
            f.write(await file.read())
        
        # Upload to Supabase (using same avatars bucket or separate)
        destination = f"{user_id}/cover{ext}"
        public_url = storage.upload_file(config.BUCKET_AVATARS, temp_path, destination)
        
        if not public_url:
            raise HTTPException(status_code=500, detail="Failed to upload cover to storage")
            
        # Update DB
        updated = database.update_user_profile(user_id, {"cover_url": public_url})
        return updated
    finally:
        shutil.rmtree(temp_dir, ignore_errors=True)


@app.post("/api/subscriptions/cancel")
async def cancel_subscription(req: SubscriptionCancelRequest):
    """Cancel subscription (set status to canceled)."""
    try:
        with database._get_pg_connection() as conn:
            with conn.cursor() as cur:
                # Update subscriptions table
                cur.execute("""
                    UPDATE public.subscriptions 
                    SET status = 'canceled', auto_renew = false
                    WHERE user_id = %s
                """, (req.user_id,))
                
                # Update user profile auto_renew flag
                cur.execute("""
                    UPDATE public.user_profiles 
                    SET subscription_auto_renew = false
                    WHERE id = %s
                """, (req.user_id,))
        return {"status": "ok", "message": "Subscription canceled"}
    except Exception as e:
        print(f"CANCEL SUB ERROR: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/api/subscriptions/toggle-auto-renew")
async def toggle_auto_renew(req: SubscriptionAutoRenewRequest):
    """Toggle auto-renewal flag."""
    try:
        with database._get_pg_connection() as conn:
            with conn.cursor() as cur:
                cur.execute("""
                    UPDATE public.subscriptions 
                    SET auto_renew = %s
                    WHERE user_id = %s
                """, (req.auto_renew, req.user_id))
                
                cur.execute("""
                    UPDATE public.user_profiles 
                    SET subscription_auto_renew = %s
                    WHERE id = %s
                """, (req.auto_renew, req.user_id))
        return {"status": "ok", "auto_renew": req.auto_renew}
    except Exception as e:
        print(f"TOGGLE AUTO-RENEW ERROR: {e}")
        raise HTTPException(status_code=500, detail=str(e))


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host=config.HOST, port=config.PORT)
