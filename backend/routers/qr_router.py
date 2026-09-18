import uuid
import random
import base64
from io import BytesIO
from datetime import datetime, timedelta
import qrcode
from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from sqlalchemy.orm import Session

from database import get_db
import models
import auth

router = APIRouter(prefix="/api/qr", tags=["qr"])

class QRValidateRequest(BaseModel):
    token: str

def generate_formatted_token(request_id: int) -> str:
    """Generate a clean, readable token number like TK-101-9482"""
    rand_suffix = random.randint(1000, 9999)
    return f"TK-{request_id}-{rand_suffix}"

@router.get("/generate/{request_id}")
def generate_qr(
    request_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth.require_role("student"))
):
    outpass = db.query(models.OutpassRequest).filter(models.OutpassRequest.id == request_id).first()
    if not outpass:
        raise HTTPException(status_code=404, detail="Outpass request not found")
    if outpass.student_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not authorized")
    if outpass.status != "Approved":
        raise HTTPException(status_code=400, detail="Only approved outpasses can generate QR / Token")
    
    qr_record = db.query(models.QRToken).filter(models.QRToken.request_id == request_id).first()
    
    if not qr_record:
        qr_record = models.QRToken(
            request_id=request_id,
            token=generate_formatted_token(request_id),
            expires_at=datetime.utcnow() + timedelta(hours=72)
        )
        db.add(qr_record)
        db.commit()
        db.refresh(qr_record)
    elif qr_record.expires_at < datetime.utcnow():
        qr_record.token = generate_formatted_token(request_id)
        qr_record.expires_at = datetime.utcnow() + timedelta(hours=72)
        qr_record.is_used = False
        db.commit()
        db.refresh(qr_record)
    
    # Generate QR Code Image containing the token string
    qr = qrcode.QRCode(
        version=1,
        error_correction=qrcode.constants.ERROR_CORRECT_L,
        box_size=10,
        border=4,
    )
    qr.add_data(qr_record.token)
    qr.make(fit=True)
    img = qr.make_image(fill_color="black", back_color="white")
    
    buffer = BytesIO()
    img.save(buffer, format="PNG")
    img_str = base64.b64encode(buffer.getvalue()).decode()
    data_url = f"data:image/png;base64,{img_str}"
    
    return {
        "token": qr_record.token,
        "qr_data_url": data_url,
        "expires_at": qr_record.expires_at
    }

@router.post("/validate")
def validate_qr(
    request: QRValidateRequest,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth.require_role("gate"))
):
    token_str = request.token.strip()
    
    # Search by exact token string first
    qr_record = db.query(models.QRToken).filter(models.QRToken.token == token_str).first()
    
    # Fallback 1: case-insensitive search
    if not qr_record:
        qr_record = db.query(models.QRToken).filter(models.QRToken.token.ilike(token_str)).first()
    
    # Fallback 2: support input by Outpass Request ID (e.g. "1" or "#1")
    if not qr_record and token_str.replace("#", "").isdigit():
        req_id = int(token_str.replace("#", ""))
        qr_record = db.query(models.QRToken).filter(models.QRToken.request_id == req_id).first()

    if not qr_record:
        raise HTTPException(status_code=400, detail="Invalid Token or QR Code. Outpass not found.")
        
    if qr_record.expires_at < datetime.utcnow():
        raise HTTPException(status_code=400, detail="Outpass Token / QR Code has expired")
        
    if qr_record.is_used:
        raise HTTPException(status_code=400, detail="Outpass Token / QR Code has ALREADY been used")
    
    # Mark as used upon successful gate verification
    qr_record.is_used = True
    db.commit()
    
    outpass = qr_record.request
    student = outpass.student
    
    return {
        "valid": True,
        "token": qr_record.token,
        "student": {
            "name": student.name,
            "roll_no": student.roll_no,
            "email": student.email,
            "phone": student.phone
        },
        "request": {
            "id": outpass.id,
            "destination": outpass.destination,
            "reason": outpass.reason,
            "departure_time": outpass.departure_time,
            "return_time": outpass.return_time,
            "contact_details": outpass.contact_details,
            "student_id": student.roll_no
        }
    }
