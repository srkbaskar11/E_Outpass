from datetime import datetime
from typing import List
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.orm import Session

from database import get_db
import models
import auth

router = APIRouter(prefix="/api/notifications", tags=["notifications"])

class NotificationResponse(BaseModel):
    id: int
    message: str
    request_id: int
    is_read: bool
    created_at: datetime

    class Config:
        from_attributes = True

class NotificationsListResponse(BaseModel):
    notifications: List[NotificationResponse]
    unread_count: int

@router.get("/", response_model=NotificationsListResponse)
def get_notifications(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth.require_role("student"))
):
    notifications = db.query(models.Notification).filter(
        models.Notification.student_id == current_user.id
    ).order_by(models.Notification.created_at.desc()).all()
    
    unread_count = sum(1 for n in notifications if not n.is_read)
    
    return {
        "notifications": notifications,
        "unread_count": unread_count
    }

@router.post("/read/{notification_id}")
def read_notification(
    notification_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth.require_role("student"))
):
    notif = db.query(models.Notification).filter(models.Notification.id == notification_id).first()
    if not notif:
        raise HTTPException(status_code=404, detail="Notification not found")
    if notif.student_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not authorized")
    
    notif.is_read = True
    db.commit()
    return {"message": "Marked as read"}

@router.post("/read-all")
def read_all_notifications(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth.require_role("student"))
):
    db.query(models.Notification).filter(
        models.Notification.student_id == current_user.id,
        models.Notification.is_read == False
    ).update({"is_read": True})
    db.commit()
    return {"message": "All marked as read"}
