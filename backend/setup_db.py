"""
setup_db.py — One-time database setup script.

Run this AFTER applying db/schema.sql to:
  1. Auto-create all SQLAlchemy tables (if not using schema.sql)
  2. Seed demo users with correctly hashed passwords
  3. Insert sample outpass requests, history, notifications, and QR token

Usage:
    python setup_db.py
"""

import sys
import os
from datetime import datetime, timedelta

# Ensure we can import project modules
sys.path.insert(0, os.path.dirname(__file__))

from dotenv import load_dotenv
load_dotenv()

from database import engine, SessionLocal, Base
import models
from auth import get_password_hash

def setup():
    print("🔧 Creating all tables...")
    Base.metadata.create_all(bind=engine)
    print("   ✅ Tables created.")

    db = SessionLocal()
    try:
        # Check if already seeded
        if db.query(models.User).count() > 0:
            print("⚠️  Database already has users — skipping seed to avoid duplicates.")
            print("   (Drop tables and re-run schema.sql if you want a fresh seed.)")
            return

        print("🌱 Seeding users...")
        password_hash = get_password_hash("password123")

        users = [
            models.User(name="Alice",        roll_no="S001", email="alice@example.com",  phone="9876543210", role="student", password_hash=password_hash),
            models.User(name="Bob",          roll_no="S002", email="bob@example.com",    phone="9876543211", role="student", password_hash=password_hash),
            models.User(name="Charlie",      roll_no="S003", email="charlie@example.com",phone="9876543212", role="student", password_hash=password_hash),
            models.User(name="Dr. Smith",    roll_no="W001", email="smith@example.com",  phone="9876543213", role="warden",  password_hash=password_hash),
            models.User(name="Gate Officer", roll_no="G001", email="gate@example.com",   phone="9876543214", role="gate",    password_hash=password_hash),
        ]
        db.add_all(users)
        db.commit()
        for u in users:
            db.refresh(u)
        print(f"   ✅ {len(users)} users created.")

        alice, bob, charlie, warden, gate = users

        print("🌱 Seeding outpass requests...")
        now = datetime.utcnow()
        requests = [
            models.OutpassRequest(
                student_id=alice.id,
                destination="Home",
                reason="Family Function",
                departure_time=now + timedelta(days=1),
                return_time=now + timedelta(days=3),
                contact_details="9876543210",
                status="Approved",
            ),
            models.OutpassRequest(
                student_id=bob.id,
                destination="City Mall",
                reason="Shopping",
                departure_time=now + timedelta(days=1),
                return_time=now + timedelta(days=2),
                contact_details="9876543211",
                status="Rejected",
            ),
            models.OutpassRequest(
                student_id=charlie.id,
                destination="District Hospital",
                reason="Medical Checkup",
                departure_time=now + timedelta(hours=5),
                return_time=now + timedelta(hours=10),
                contact_details="9876543212",
                status="Pending",
            ),
        ]
        db.add_all(requests)
        db.commit()
        for r in requests:
            db.refresh(r)
        print(f"   ✅ {len(requests)} outpass requests created.")

        alice_req, bob_req, charlie_req = requests

        print("🌱 Seeding status history...")
        history = [
            models.StatusHistory(request_id=alice_req.id,   status="Pending",  changed_by=alice.id,   remarks=None),
            models.StatusHistory(request_id=alice_req.id,   status="Approved", changed_by=warden.id,  remarks="Allowed for family function"),
            models.StatusHistory(request_id=bob_req.id,     status="Pending",  changed_by=bob.id,     remarks=None),
            models.StatusHistory(request_id=bob_req.id,     status="Rejected", changed_by=warden.id,  remarks="Denied due to upcoming exams"),
            models.StatusHistory(request_id=charlie_req.id, status="Pending",  changed_by=charlie.id, remarks=None),
        ]
        db.add_all(history)
        db.commit()
        print(f"   ✅ {len(history)} status history entries created.")

        print("🌱 Seeding notifications...")
        notifications = [
            models.Notification(
                student_id=alice.id,
                request_id=alice_req.id,
                message=f"Your outpass request #{alice_req.id} to Home has been Approved.",
                is_read=False,
            ),
            models.Notification(
                student_id=bob.id,
                request_id=bob_req.id,
                message=f"Your outpass request #{bob_req.id} to City Mall has been Rejected. Remarks: Denied due to upcoming exams",
                is_read=False,
            ),
        ]
        db.add_all(notifications)
        db.commit()
        print(f"   ✅ {len(notifications)} notifications created.")

        print("🌱 Seeding QR token for Alice's approved request...")
        qr_token = models.QRToken(
            request_id=alice_req.id,
            token="TEST-QR-ALICE-001",
            is_used=False,
            expires_at=now + timedelta(days=30),
        )
        db.add(qr_token)
        db.commit()
        print("   ✅ QR token created.")

        print()
        print("=" * 50)
        print("✅  DATABASE SETUP COMPLETE!")
        print("=" * 50)
        print()
        print("Demo credentials (password: password123):")
        print("  Student  → S001, S002, S003")
        print("  Warden   → W001")
        print("  Gate     → G001")
        print()

    except Exception as e:
        db.rollback()
        print(f"❌ Error during setup: {e}")
        raise
    finally:
        db.close()

if __name__ == "__main__":
    setup()
