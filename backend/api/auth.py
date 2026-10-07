from fastapi import APIRouter, Depends, HTTPException, status, Request
from pydantic import BaseModel, Field
from fastapi.security import OAuth2PasswordBearer
from jose import JWTError, jwt
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from typing import Annotated, Optional
import uuid

from config import settings
from database import get_db
from models.db_models import User
from models.schemas import UserCreate, UserLogin, UserOut, Token, PASSWORD_MIN_LENGTH
from utils.auth_utils import ALGORITHM, verify_password, get_password_hash, create_access_token
from utils.limiter import limiter

router = APIRouter(prefix="/api/auth", tags=["Authentication"])
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/auth/login")
optional_oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/auth/login", auto_error=False)


async def _user_from_token(token: str, db: AsyncSession) -> Optional[User]:
    """Return the user a JWT belongs to, or None if the token is invalid."""
    try:
        payload = jwt.decode(token, settings.secret_key, algorithms=[ALGORITHM])
        uid = uuid.UUID(payload.get("sub") or "")
    except (JWTError, ValueError):
        return None
    return await db.get(User, uid)


async def get_current_user(token: Annotated[str, Depends(oauth2_scheme)], db: AsyncSession = Depends(get_db)) -> User:
    user = await _user_from_token(token, db)
    if user is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Could not validate credentials",
            headers={"WWW-Authenticate": "Bearer"},
        )
    return user


async def get_optional_user(token: Annotated[Optional[str], Depends(optional_oauth2_scheme)], db: AsyncSession = Depends(get_db)) -> Optional[User]:
    """Like get_current_user, but returns None instead of failing for anonymous requests."""
    return await _user_from_token(token, db) if token else None


@router.post("/signup", response_model=UserOut)
@limiter.limit("5/minute")
async def signup(request: Request, user: UserCreate, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(User).where(User.email == user.email))
    if result.scalar_one_or_none():
        raise HTTPException(status_code=400, detail="Email already registered")
    
    hashed_password = get_password_hash(user.password)
    db_user = User(email=user.email, hashed_password=hashed_password)
    db.add(db_user)
    await db.commit()
    await db.refresh(db_user)
    return db_user

@router.post("/login", response_model=Token)
@limiter.limit("10/minute")
async def login(request: Request, user_credentials: UserLogin, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(User).where(User.email == user_credentials.email))
    user = result.scalar_one_or_none()
    
    if not user or not verify_password(user_credentials.password, user.hashed_password):
        raise HTTPException(status_code=401, detail="Invalid email or password")
    
    access_token = create_access_token(data={"sub": str(user.id)})
    return {"access_token": access_token, "token_type": "bearer"}

@router.get("/me", response_model=UserOut)
async def read_users_me(current_user: Annotated[User, Depends(get_current_user)]):
    return current_user


class UserSettings(BaseModel):
    default_origin: str | None = Field(default=None, max_length=100)
    preferred_currency: str | None = Field(default=None, max_length=10)
    dietary_preferences: list[str] | None = Field(default=None, max_length=20)
    ai_model: str | None = Field(default=None, max_length=50)


class SettingsUpdate(BaseModel):
    settings: UserSettings

@router.put("/settings", response_model=UserOut)
async def update_settings(
    body: SettingsUpdate,
    current_user: Annotated[User, Depends(get_current_user)],
    db: AsyncSession = Depends(get_db)
):
    user = await db.get(User, current_user.id)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    # Merge so fields the client didn't send (e.g. ai_model) are kept
    user.settings = {**(user.settings or {}), **body.settings.model_dump(exclude_unset=True)}
    db.add(user)
    await db.commit()
    await db.refresh(user)
    return user


class PasswordChangeRequest(BaseModel):
    old_password: str
    new_password: str = Field(..., max_length=128)

@router.put("/change-password")
async def change_password(
    body: PasswordChangeRequest,
    current_user: Annotated[User, Depends(get_current_user)],
    db: AsyncSession = Depends(get_db)
):
    user = await db.get(User, current_user.id)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    if not verify_password(body.old_password, user.hashed_password):
        raise HTTPException(status_code=400, detail="Incorrect old password")
        
    if len(body.new_password) < PASSWORD_MIN_LENGTH:
        raise HTTPException(status_code=400, detail=f"New password must be at least {PASSWORD_MIN_LENGTH} characters long")
        
    user.hashed_password = get_password_hash(body.new_password)
    db.add(user)
    await db.commit()
    return {"message": "Password updated successfully"}
