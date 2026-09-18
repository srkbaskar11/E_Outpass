from datetime import datetime
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from sqlalchemy.orm import Session

from database import get_db
import models
import auth
from routers.auth_router import UserResponse

router = APIRouter(prefix="/api/outpass", tags=["outpass"])

class OutpassCreate(BaseModel):
    destination: str
    reason: str
    departure_time: datetime
    return_time: datetime
    contact_details: str

class OutpassResponse(BaseModel):
    id: int
    destination: str
    reason: str
    departure_time: datetime
    return_time: datetime
    contact_details: str
    status: str
    created_at: datetime

    class Config:
        from_attributes = True

class OutpassDetailResponse(OutpassResponse):
    student: UserResponse
    # Could also include status_history here if needed

    class Config:
        from_attributes = True

class CreateResponse(BaseModel):
    id: int
    status: str
    created_at: datetime
    message: str

@router.post("/", response_model=CreateResponse)
def create_outpass(
    request: OutpassCreate, 
    db: Session = Depends(get_db), 
    current_user: models.User = Depends(auth.require_role("student"))
):
    if request.departure_time >= request.return_time:
        raise HTTPException(status_code=422, detail="Departure time must be before return time")
    
    db_outpass = models.OutpassRequest(
        student_id=current_user.id,
        destination=request.destination,
        reason=request.reason,
        departure_time=request.departure_time,
        return_time=request.return_time,
        contact_details=request.contact_details,
        status="Pending"
    )
    db.add(db_outpass)
    db.commit()
    db.refresh(db_outpass)

    history = models.StatusHistory(
        request_id=db_outpass.id,
        status="Pending",
        changed_by=current_user.id
    )
    db.add(history)
    db.commit()

    return {
        "id": db_outpass.id,
        "status": db_outpass.status,
        "created_at": db_outpass.created_at,
        "message": f"Request submitted. Reference: #{db_outpass.id}"
    }

@router.get("/my", response_model=List[OutpassResponse])
def get_my_outpasses(
    db: Session = Depends(get_db), 
    current_user: models.User = Depends(auth.require_role("student"))
):
    return db.query(models.OutpassRequest).filter(
        models.OutpassRequest.student_id == current_user.id
    ).order_by(models.OutpassRequest.created_at.desc()).all()

@router.get("/pending", response_model=List[OutpassDetailResponse])
def get_pending_outpasses(
    db: Session = Depends(get_db), 
    current_user: models.User = Depends(auth.require_role("warden"))
):
    return db.query(models.OutpassRequest).filter(
        models.OutpassRequest.status == "Pending"
    ).order_by(models.OutpassRequest.created_at.desc()).all()

@router.get("/history", response_model=List[OutpassDetailResponse])
def get_history_outpasses(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth.require_role("warden"))
):
    """All Approved/Rejected requests — for the warden history tab."""
    return db.query(models.OutpassRequest).filter(
        models.OutpassRequest.status.in_(["Approved", "Rejected"])
    ).order_by(models.OutpassRequest.updated_at.desc()).limit(50).all()

@router.get("/{id}")
def get_outpass_detail(
    id: int, 
    db: Session = Depends(get_db), 
    current_user: models.User = Depends(auth.get_current_user)
):
    outpass = db.query(models.OutpassRequest).filter(models.OutpassRequest.id == id).first()
    if not outpass:
        raise HTTPException(status_code=404, detail="Outpass request not found")
    
    if current_user.role == "student" and outpass.student_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not authorized to view this request")

    history = db.query(models.StatusHistory).filter(models.StatusHistory.request_id == id).order_by(models.StatusHistory.changed_at.desc()).all()
    
    return {
        "outpass": outpass,
        "student": outpass.student,
        "status_history": history
    }
