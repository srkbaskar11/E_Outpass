from sqlalchemy import Column, Integer, String, Text, DateTime, ForeignKey, Boolean, CheckConstraint, func
from sqlalchemy.orm import relationship
from database import Base

class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(100))
    roll_no = Column(String(50), unique=True, index=True)
    email = Column(String(150), unique=True, index=True)
    phone = Column(String(20))
    role = Column(String(20))
    password_hash = Column(String(255))
    created_at = Column(DateTime, server_default=func.now())

    __table_args__ = (
        CheckConstraint("role IN ('student', 'warden', 'gate')", name="ck_users_role"),
    )

class OutpassRequest(Base):
    __tablename__ = "outpass_requests"

    id = Column(Integer, primary_key=True, index=True)
    student_id = Column(Integer, ForeignKey("users.id"))
    destination = Column(String(255), nullable=False)
    reason = Column(Text, nullable=False)
    departure_time = Column(DateTime, nullable=False)
    return_time = Column(DateTime, nullable=False)
    contact_details = Column(String(100), nullable=False)
    status = Column(String(20), server_default="Pending")
    created_at = Column(DateTime, server_default=func.now())
    updated_at = Column(DateTime, server_default=func.now(), onupdate=func.now())

    student = relationship("User")
    status_history = relationship("StatusHistory", back_populates="request")

    __table_args__ = (
        CheckConstraint("status IN ('Pending', 'Approved', 'Rejected')", name="ck_outpass_status"),
    )

class StatusHistory(Base):
    __tablename__ = "status_history"

    id = Column(Integer, primary_key=True, index=True)
    request_id = Column(Integer, ForeignKey("outpass_requests.id"))
    status = Column(String(20), nullable=False)
    changed_by = Column(Integer, ForeignKey("users.id"))
    changed_at = Column(DateTime, server_default=func.now())
    remarks = Column(Text)

    request = relationship("OutpassRequest", back_populates="status_history")
    changer = relationship("User")

class Notification(Base):
    __tablename__ = "notifications"

    id = Column(Integer, primary_key=True, index=True)
    student_id = Column(Integer, ForeignKey("users.id"))
    request_id = Column(Integer, ForeignKey("outpass_requests.id"))
    message = Column(Text, nullable=False)
    is_read = Column(Boolean, default=False)
    created_at = Column(DateTime, server_default=func.now())

    student = relationship("User")
    request = relationship("OutpassRequest")

class QRToken(Base):
    __tablename__ = "qr_tokens"

    id = Column(Integer, primary_key=True, index=True)
    request_id = Column(Integer, ForeignKey("outpass_requests.id"), unique=True)
    token = Column(String(255), unique=True, nullable=False)
    is_used = Column(Boolean, default=False)
    expires_at = Column(DateTime, nullable=False)
    created_at = Column(DateTime, server_default=func.now())

    request = relationship("OutpassRequest")
