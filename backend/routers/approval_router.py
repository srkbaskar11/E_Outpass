import uuid
from datetime import datetime, timedelta
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from sqlalchemy.orm import Session

from database import get_db
import models
import auth

router = APIRouter(prefix="/api/outpass", tags=["approval"])

class ApprovalRequest(BaseModel):
    remarks: Optional[str] = None

class StatusUpdateResponse(BaseModel):
    message: str
    id: int
    status: str

@router.post("/{id}/approve", response_model=StatusUpdateResponse)
def approve_outpass(
    id: int,
    request: ApprovalRequest,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth.require_role("warden"))
):
    outpass = db.query(models.OutpassRequest).filter(models.OutpassRequest.id == id).first()
    if not outpass:
        raise HTTPException(status_code=404, detail="Outpass request not found")
    if outpass.status != "Pending":
        raise HTTPException(status_code=400, detail="Request is not in Pending status")
    
    outpass.status = "Approved"
    # updated_at will be handled by DB trigger if defined, or we can set it here
    
    history = models.StatusHistory(
        request_id=outpass.id,
        status="Approved",
        changed_by=current_user.id,
        remarks=request.remarks
    )
    db.add(history)
    
    notification = models.Notification(
        student_id=outpass.student_id,
        request_id=outpass.id,
        message=f"Your outpass request #{outpass.id} to {outpass.destination} has been Approved."
    )
    db.add(notification)
    
    from routers.qr_router import generate_formatted_token
    qr_token = models.QRToken(
        request_id=outpass.id,
        token=generate_formatted_token(outpass.id),
        expires_at=datetime.utcnow() + timedelta(hours=72)
    )
    db.add(qr_token)
    
    db.commit()
    
    return {"message": "Request approved", "id": outpass.id, "status": "Approved"}


@router.post("/{id}/reject", response_model=StatusUpdateResponse)
def reject_outpass(
    id: int,
    request: ApprovalRequest,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth.require_role("warden"))
):
    outpass = db.query(models.OutpassRequest).filter(models.OutpassRequest.id == id).first()
    if not outpass:
        raise HTTPException(status_code=404, detail="Outpass request not found")
    if outpass.status != "Pending":
        raise HTTPException(status_code=400, detail="Request is not in Pending status")
    
    outpass.status = "Rejected"
    
    history = models.StatusHistory(
        request_id=outpass.id,
        status="Rejected",
        changed_by=current_user.id,
        remarks=request.remarks
    )
    db.add(history)
    
    remarks_text = request.remarks if request.remarks else "None"
    notification = models.Notification(
        student_id=outpass.student_id,
        request_id=outpass.id,
        message=f"Your outpass request #{outpass.id} to {outpass.destination} has been Rejected. Remarks: {remarks_text}"
    )
    db.add(notification)
    
    db.commit()
    
    return {"message": "Request rejected", "id": outpass.id, "status": "Rejected"}
