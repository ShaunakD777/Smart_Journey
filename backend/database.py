"""
Async SQLAlchemy engine + session factory + Weaviate client setup.
"""

from sqlalchemy.ext.asyncio import create_async_engine, async_sessionmaker, AsyncSession
import weaviate
import weaviate.classes as wvc
from config import settings
from models.db_models import Base
import logging

logger = logging.getLogger(__name__)

# ── PostgreSQL ────────────────────────────────────────────────────────────────

engine = create_async_engine(
    settings.database_url,
    echo=False,
    pool_size=10,
    max_overflow=20,
)

AsyncSessionLocal = async_sessionmaker(
    bind=engine,
    class_=AsyncSession,
    expire_on_commit=False,
)


async def init_db():
    """Create all tables if they don't exist."""
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    logger.info("PostgreSQL tables initialised.")


async def get_db():
    """FastAPI dependency — yields an async DB session."""
    async with AsyncSessionLocal() as session:
        try:
            yield session
            await session.commit()
        except Exception:
            await session.rollback()
            raise
        finally:
            await session.close()


# ── Weaviate ──────────────────────────────────────────────────────────────────

_weaviate_client: weaviate.WeaviateClient | None = None


def get_weaviate_client() -> weaviate.WeaviateClient:
    global _weaviate_client
    if _weaviate_client is None:
        connect_kwargs = {}
        if settings.weaviate_api_key:
            connect_kwargs["auth_credentials"] = weaviate.auth.AuthApiKey(settings.weaviate_api_key)

        _weaviate_client = weaviate.connect_to_local(
            host=settings.weaviate_url.replace("http://", "").split(":")[0],
            port=int(settings.weaviate_url.split(":")[-1]) if ":" in settings.weaviate_url else 8080,
            **connect_kwargs,
        )
        logger.info("Weaviate client connected.")
    return _weaviate_client


def close_weaviate_client():
    global _weaviate_client
    if _weaviate_client is not None:
        _weaviate_client.close()
        _weaviate_client = None


def init_weaviate_schema():
    """
    Create the Weaviate collection for storing trip memories.
    Called once at app startup; safe to call if the collection already exists.
    """
    client = get_weaviate_client()

    # Collection: TripMemory — stores past plans as embeddings for similarity search
    if not client.collections.exists("TripMemory"):
        client.collections.create(
            name="TripMemory",
            description="Stores trip plans as vector embeddings for semantic retrieval",
            properties=[
                wvc.config.Property(name="session_id", data_type=wvc.config.DataType.TEXT),
                wvc.config.Property(name="destination", data_type=wvc.config.DataType.TEXT),
                wvc.config.Property(name="travel_month", data_type=wvc.config.DataType.TEXT),
                wvc.config.Property(name="interests", data_type=wvc.config.DataType.TEXT),
                wvc.config.Property(name="duration_days", data_type=wvc.config.DataType.INT),
                wvc.config.Property(name="budget_inr", data_type=wvc.config.DataType.NUMBER),
                wvc.config.Property(name="plan_summary", data_type=wvc.config.DataType.TEXT),
                wvc.config.Property(name="full_plan_json", data_type=wvc.config.DataType.TEXT),
            ],
            vectorizer_config=wvc.config.Configure.Vectorizer.text2vec_transformers(),
        )
        logger.info("Weaviate 'TripMemory' collection created.")
