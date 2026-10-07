"""
SQLAlchemy ORM models — mapped to PostgreSQL tables.
"""

from datetime import datetime
from sqlalchemy import (
    Column, String, Integer, Float,
    DateTime, Text, JSON, ForeignKey
)
from sqlalchemy.orm import DeclarativeBase, relationship
from sqlalchemy.dialects.postgresql import UUID
import uuid


class Base(DeclarativeBase):
    pass


class User(Base):
    """User account."""
    __tablename__ = "users"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    email = Column(String(150), unique=True, index=True, nullable=False)
    hashed_password = Column(String(200), nullable=False)
    settings = Column(JSON, default=dict)
    created_at = Column(DateTime, default=datetime.utcnow)

    # Relationships
    sessions = relationship("TripSession", back_populates="user", cascade="all, delete-orphan")


class TripSession(Base):
    """One planning session per user query."""
    __tablename__ = "trip_sessions"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    raw_query = Column(Text, nullable=False)
    destination = Column(String(200))
    origin = Column(String(200))
    duration_days = Column(Integer)
    travel_month = Column(String(50))
    num_travelers = Column(Integer)
    budget_inr = Column(Float)
    interests = Column(JSON, default=list)
    avoid = Column(JSON, default=list)
    status = Column(String(50), default="pending")   # pending | running | done | error
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=True)

    # Relationships
    user = relationship("User", back_populates="sessions")
    plan = relationship("TripPlan", back_populates="session", uselist=False, cascade="all, delete-orphan")
    agent_logs = relationship("AgentLog", back_populates="session", cascade="all, delete-orphan")


class TripPlan(Base):
    """Final assembled plan returned to the user."""
    __tablename__ = "trip_plans"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    session_id = Column(UUID(as_uuid=True), ForeignKey("trip_sessions.id"), nullable=False)

    # Each agent's output stored as JSON for flexibility
    flights = Column(JSON, default=dict)
    hotels = Column(JSON, default=dict)
    weather = Column(JSON, default=dict)
    food = Column(JSON, default=dict)
    itinerary = Column(JSON, default=dict)
    route = Column(JSON, default=dict)
    budget = Column(JSON, default=dict)
    currency = Column(JSON, default=dict)
    visa = Column(JSON, default=dict)
    packing_list = Column(JSON, default=list)
    tourist_attractions = Column(JSON, default=list)
    full_plan_json = Column(JSON, default=dict)

    created_at = Column(DateTime, default=datetime.utcnow)

    session = relationship("TripSession", back_populates="plan")


class AgentLog(Base):
    """Per-agent execution log for debugging and audit."""
    __tablename__ = "agent_logs"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    session_id = Column(UUID(as_uuid=True), ForeignKey("trip_sessions.id"), nullable=False)
    agent_name = Column(String(100), nullable=False)
    status = Column(String(50), default="pending")   # pending | running | done | error
    input_data = Column(JSON, default=dict)
    output_data = Column(JSON, default=dict)
    error_message = Column(Text, nullable=True)
    duration_ms = Column(Integer, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    session = relationship("TripSession", back_populates="agent_logs")
