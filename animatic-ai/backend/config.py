"""Backend configuration - environment variables and settings."""

import os
from pathlib import Path
from dotenv import load_dotenv

# Load .env from parent directory (animatic-ai/.env)
load_dotenv(Path(__file__).parent.parent / ".env")

# -- Paths --
BACKEND_DIR = Path(__file__).parent
PROJECT_DIR = BACKEND_DIR.parent
GENERATION_DIR = BACKEND_DIR / "generation"

# -- Supabase --
SUPABASE_URL = os.environ.get("SUPABASE_URL") or os.environ.get("VITE_SUPABASE_URL")
SUPABASE_ANON_KEY = os.environ.get("SUPABASE_ANON_KEY") or os.environ.get("VITE_SUPABASE_ANON_KEY")
SUPABASE_SERVICE_KEY = os.environ.get("SUPABASE_SERVICE_KEY")

# Direct PostgreSQL connection string (bypasses PostgREST cache)
# Get from Supabase Dashboard -> Project Settings -> Database -> Connection string -> Direct
# Format: postgresql://postgres.azxbjkcnznoikmxhfvuu:[password]@aws-0-eu-central-1.pooler.supabase.com:6543/postgres
SUPABASE_DB_URL = os.environ.get("SUPABASE_DB_URL")

if not SUPABASE_URL or not SUPABASE_SERVICE_KEY:
    raise RuntimeError(
        "Missing Supabase credentials. Set SUPABASE_URL and SUPABASE_SERVICE_KEY in .env"
    )

# -- Redis (ARQ Queue) --
REDIS_URL = os.environ.get("REDIS_URL", "redis://localhost:6379")

# -- Storage buckets --
BUCKET_MODELS = "models"
BUCKET_PREVIEWS = "previews"
BUCKET_GENERATION_INPUTS = "generation-inputs"
BUCKET_AVATARS = "avatars"

# -- Server --
HOST = os.environ.get("HOST", "0.0.0.0")
PORT = int(os.environ.get("PORT", "8001"))

# -- Generation --
GENERATION_PYTHON = os.environ.get("GENERATION_PYTHON", "python")

# -- Yookassa --
YOOKASSA_SHOP_ID = os.environ.get("YOOKASSA_SHOP_ID")
YOOKASSA_SECRET_KEY = os.environ.get("YOOKASSA_SECRET_KEY")
# If True, recurrent payments will succeed even if the API call fails (for demo/test purposes)
SIMULATE_RECURRENTS = os.environ.get("SIMULATE_RECURRENTS", "true").lower() == "true"

# -- SMTP --
SMTP_HOST = os.environ.get("SMTP_HOST", "smtp.yandex.ru")
SMTP_PORT = int(os.environ.get("SMTP_PORT", "465"))
SMTP_USER = os.environ.get("SMTP_USER")
SMTP_PASSWORD = os.environ.get("SMTP_PASSWORD")
