"""
FastAPI application entry point.
"""

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager
from slowapi import _rate_limit_exceeded_handler
from slowapi.errors import RateLimitExceeded
import logging

from config import settings
from database import init_db, init_weaviate_schema, close_weaviate_client
from api.routes import router
from api.auth import router as auth_router
from utils.limiter import limiter

# ── Logging ──────────────────────────────────────────────────────────────────
logging.basicConfig(
    level=logging.DEBUG if settings.app_env == "development" else logging.WARNING,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
)
# Suppress noisy low-level loggers so agent output stays readable
logging.getLogger("sqlalchemy.engine").setLevel(logging.WARNING)
logging.getLogger("httpx").setLevel(logging.WARNING)
logging.getLogger("httpcore").setLevel(logging.WARNING)
logging.getLogger("urllib3").setLevel(logging.WARNING)
logger = logging.getLogger(__name__)


# ── Startup / Shutdown ────────────────────────────────────────────────────────
@asynccontextmanager
async def lifespan(app: FastAPI):
    logger.info("Starting Smart Journey API...")

    # Init PostgreSQL tables
    await init_db()
    logger.info("PostgreSQL ready.")

    # Init Weaviate schema (non-blocking — warn on failure)
    try:
        init_weaviate_schema()
        logger.info("Weaviate ready.")
    except Exception as e:
        logger.warning(f"Weaviate not available (vector memory disabled): {e}")

    yield

    close_weaviate_client()
    logger.info("Shutting down Smart Journey API.")


# ── App ───────────────────────────────────────────────────────────────────────
app = FastAPI(
    title="Smart Journey API",
    description="AI-powered travel planner using Gemini + LangGraph",
    version="1.0.0",
    lifespan=lifespan,
)

# CORS — allow React frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Rate limiting
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

# Register routes
app.include_router(router)
app.include_router(auth_router)


# ── Dev entry point ───────────────────────────────────────────────────────────
if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
