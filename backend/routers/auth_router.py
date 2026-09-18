from datetime import timedelta
from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, EmailStr
from sqlalchemy.orm import Session
from typing import Optional

from database import get_db
import models
import auth

router = APIRouter(prefix="/api/auth", tags=["auth"])

class LoginRequest(BaseModel):
    roll_no: str
    password: str

class RegisterRequest(BaseModel):
    name: str
    roll_no: str
    email: str
    password: str
    phone: Optional[str] = None
    role: Optional[str] = "student"

class UserResponse(BaseModel):
    id: int
    name: str
    roll_no: str
    email: str
    phone: Optional[str]
    role: str

    class Config:
        from_attributes = True

class TokenResponse(BaseModel):
    access_token: str
    token_type: str
    user: UserResponse

@router.post("/login", response_model=TokenResponse)
def login(request: LoginRequest, db: Session = Depends(get_db)):
    user = db.query(models.User).filter(models.User.roll_no == request.roll_no).first()
    if not user or not auth.verify_password(request.password, user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect roll_no or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    access_token_expires = timedelta(minutes=auth.ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = auth.create_access_token(
        data={"sub": str(user.id)}, expires_delta=access_token_expires
    )
    
    return {
        "access_token": access_token,
        "token_type": "bearer",
        "user": user
    }

@router.post("/register", response_model=TokenResponse, status_code=status.HTTP_201_CREATED)
def register(request: RegisterRequest, db: Session = Depends(get_db)):
    # Validate role
    role = request.role.lower() if request.role else "student"
    if role not in ["student", "warden", "gate"]:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid role. Must be 'student', 'warden', or 'gate'"
        )

    # Check existing roll_no or email
    existing_roll = db.query(models.User).filter(models.User.roll_no == request.roll_no).first()
    if existing_roll:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"User with Roll No / ID '{request.roll_no}' already exists"
        )
    
    existing_email = db.query(models.User).filter(models.User.email == request.email).first()
    if existing_email:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"User with Email '{request.email}' already exists"
        )

    hashed_pwd = auth.get_password_hash(request.password)
    new_user = models.User(
        name=request.name,
        roll_no=request.roll_no,
        email=request.email,
        phone=request.phone,
        role=role,
        password_hash=hashed_pwd
    )
    db.add(new_user)
    db.commit()
    db.refresh(new_user)

    access_token_expires = timedelta(minutes=auth.ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = auth.create_access_token(
        data={"sub": str(new_user.id)}, expires_delta=access_token_expires
    )

    return {
        "access_token": access_token,
        "token_type": "bearer",
        "user": new_user
    }

@router.get("/me", response_model=UserResponse)
def get_me(current_user: models.User = Depends(auth.get_current_user)):
    return current_user
