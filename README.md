# 🏫 Hostel Outpass Management System

A complete digital outpass management system for hostels/colleges, replacing manual paper-based processes with a streamlined digital workflow.

---

## 📋 Features

| Feature | Description |
|---------|-------------|
| **Student Portal** | Submit outpass requests, track status, view history |
| **Warden Portal** | Review pending requests, approve or reject with remarks |
| **In-App Notifications** | Real-time status-change alerts for students |
| **Status History** | Append-only audit trail of all status changes |
| **QR Code Verification** | Gate staff can scan and validate approved outpasses |

---

## 🏗️ Tech Stack

| Layer | Technology |
|-------|-----------|
| **Frontend** | Vanilla JS, HTML5, CSS3 (Glassmorphism) |
| **Backend** | Python 3.11+, FastAPI |
| **Database** | PostgreSQL 15+ |
| **Auth** | JWT (HS256) via python-jose |

---

## 📁 Project Structure

```
IOC new/
├── db/
│   ├── schema.sql          # Database tables and triggers
│   └── seed.sql            # Sample data for testing
├── backend/
│   ├── main.py             # FastAPI app entry point
│   ├── database.py         # SQLAlchemy engine + session
│   ├── models.py           # ORM models
│   ├── auth.py             # JWT + password hashing
│   ├── requirements.txt    # Python dependencies
│   ├── .env.example        # Environment variables template
│   └── routers/
│       ├── auth_router.py       # Login, /me
│       ├── outpass_router.py    # Submit, list, detail
│       ├── approval_router.py   # Approve, reject
│       ├── notification_router.py # In-app notifications
│       └── qr_router.py        # QR generate + validate
└── frontend/
    ├── index.html              # Login page (all roles)
    ├── css/
    │   └── style.css           # Shared design system
    ├── js/
    │   ├── api.js              # Centralized API client
    │   ├── auth.js             # Auth helpers + guards
    │   ├── student.js          # Student page logic
    │   ├── warden.js           # Warden page logic
    │   └── gate.js             # Gate staff page logic
    ├── student/
    │   └── index.html          # Student dashboard
    ├── warden/
    │   └── index.html          # Warden dashboard
    └── gate/
        └── index.html          # Gate verification UI
```

---

## ⚙️ Setup Instructions

### 1. Database Setup (PostgreSQL)

```bash
# Create the database
psql -U postgres -c "CREATE DATABASE outpass_db;"

# Run schema
psql -U postgres -d outpass_db -f db/schema.sql

# Seed sample data
psql -U postgres -d outpass_db -f db/seed.sql
```

### 2. Backend Setup

```bash
cd backend

# Copy environment variables
copy .env.example .env
# Edit .env and set your DATABASE_URL and SECRET_KEY

# Create virtual environment
python -m venv venv
venv\Scripts\activate        # Windows

# Install dependencies
pip install -r requirements.txt

# Start the server
uvicorn main:app --reload --host 0.0.0.0 --port 8000
```

The API will be available at: **http://localhost:8000**

Interactive API docs: **http://localhost:8000/docs**

### 3. Frontend Setup

No build step needed — open directly in browser or serve with any static server.

**Option A: Direct file open**
Open `frontend/index.html` in your browser.

**Option B: Local static server (recommended)**
```bash
# Using Python
python -m http.server 3000 --directory frontend

# Then open http://localhost:3000
```

---

## 🔑 Demo Credentials

| Role | Roll No | Password |
|------|---------|----------|
| Student (Alice) | S001 | password123 |
| Student (Bob) | S002 | password123 |
| Student (Charlie) | S003 | password123 |
| Warden | W001 | password123 |
| Gate Staff | G001 | password123 |

---

## 📡 API Endpoints

### Auth
| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| POST | `/api/auth/login` | ❌ | Login, returns JWT |
| GET | `/api/auth/me` | ✅ | Get current user |

### Outpass Requests
| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| POST | `/api/outpass/` | Student | Submit new request |
| GET | `/api/outpass/my` | Student | My requests (most recent first) |
| GET | `/api/outpass/pending` | Warden | All pending requests |
| GET | `/api/outpass/{id}` | Any | Request detail + history |

### Approval
| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| POST | `/api/outpass/{id}/approve` | Warden | Approve a pending request |
| POST | `/api/outpass/{id}/reject` | Warden | Reject a pending request |

### Notifications
| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/api/notifications/` | Student | Get all notifications |
| POST | `/api/notifications/read/{id}` | Student | Mark one as read |
| POST | `/api/notifications/read-all` | Student | Mark all as read |

### QR Code
| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/api/qr/generate/{request_id}` | Student | Generate QR for approved request |
| POST | `/api/qr/validate` | Gate | Validate a QR token |

---

## 🔄 Business Flow

```
Student submits request
        ↓
  Status: Pending
        ↓
Warden reviews in queue
        ↓
  Approve / Reject
        ↓
Status history recorded
Notification created
QR token generated (if Approved)
        ↓
Student sees updated status
Student sees notification
        ↓
Gate staff scans QR → Verified ✅
```

---

## 🧩 Feature Map

| SCRUM ID | Feature | Status |
|----------|---------|--------|
| SCRUM06B-F001 | Student outpass submission | ✅ Implemented |
| SCRUM06B-F002 | Warden review & approval | ✅ Implemented |
| SCRUM06B-F003 | Student history & status view | ✅ Implemented |
| SCRUM06B-F004 | In-app notifications | ✅ Implemented |
| SCRUM06B-F005 | QR code verification | ✅ Stub implemented (Future scope) |

---

## ⚠️ Environment Variables

```env
DATABASE_URL=postgresql://postgres:password@localhost:5432/outpass_db
SECRET_KEY=your-super-secret-key-change-in-production
ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=480
```

> **Security Note**: Never commit your `.env` file. The `.env.example` is safe to commit.

---

## 🚀 Running Tests

```bash
cd backend
pytest tests/ -v
```

---

*Built for SCRUM06B — Hostel Outpass Management System*
