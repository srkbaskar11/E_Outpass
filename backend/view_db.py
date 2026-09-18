"""
view_db.py — Command line tool to inspect PostgreSQL database contents.
Run from terminal:
  python view_db.py
"""
import os
from dotenv import load_dotenv
from sqlalchemy import create_engine, text

load_dotenv()

DATABASE_URL = os.getenv("DATABASE_URL")
if not DATABASE_URL:
    print("ERROR: DATABASE_URL not set in .env file.")
    exit(1)

engine = create_engine(DATABASE_URL)

def print_users():
    with engine.connect() as conn:
        users = conn.execute(text("SELECT id, roll_no, name, email, phone, role, created_at FROM users ORDER BY id;")).fetchall()
        print("\n" + "="*80)
        print(" 👤 USERS TABLE")
        print("="*80)
        print(f"{'ID':<4} | {'Roll No / ID':<12} | {'Name':<20} | {'Role':<8} | {'Email':<25}")
        print("-" * 80)
        for u in users:
            print(f"{u.id:<4} | {u.roll_no:<12} | {u.name:<20} | {u.role:<8} | {u.email:<25}")
        print("="*80)

def print_outpasses():
    with engine.connect() as conn:
        reqs = conn.execute(text("""
            SELECT o.id, u.name as student_name, o.destination, o.status, o.departure_time, o.return_time 
            FROM outpass_requests o 
            JOIN users u ON o.student_id = u.id 
            ORDER BY o.id DESC;
        """)).fetchall()
        print("\n" + "="*80)
        print(" 📝 OUTPASS REQUESTS TABLE")
        print("="*80)
        print(f"{'ID':<4} | {'Student':<18} | {'Destination':<20} | {'Status':<10}")
        print("-" * 80)
        for r in reqs:
            print(f"{r.id:<4} | {r.student_name:<18} | {r.destination:<20} | {r.status:<10}")
        print("="*80)

def print_tokens():
    with engine.connect() as conn:
        tokens = conn.execute(text("""
            SELECT q.id, q.request_id, q.token, q.is_used, q.expires_at 
            FROM qr_tokens q 
            ORDER BY q.id DESC;
        """)).fetchall()
        print("\n" + "="*80)
        print(" 🎟️ QR TOKENS TABLE")
        print("="*80)
        print(f"{'ID':<4} | {'Req ID':<8} | {'Token':<25} | {'Used':<6}")
        print("-" * 80)
        for t in tokens:
            print(f"{t.id:<4} | {t.request_id:<8} | {t.token:<25} | {str(t.is_used):<6}")
        print("="*80)

if __name__ == "__main__":
    print_users()
    print_outpasses()
    print_tokens()
