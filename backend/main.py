from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv

from database import Base, engine
from routers import auth_router, outpass_router, approval_router, notification_router, qr_router

load_dotenv()

# Auto-create tables on startup (requires valid DATABASE_URL in .env)
try:
    Base.metadata.create_all(bind=engine)
    print("[OK] Database tables ready.")
except Exception as e:
    print(f"[WARN] Could not connect to database: {e}")
    print("   Please check your DATABASE_URL in backend/.env")

app = FastAPI(title="Outpass Management System", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth_router.router)
app.include_router(outpass_router.router)
app.include_router(approval_router.router)
app.include_router(notification_router.router)
app.include_router(qr_router.router)

@app.on_event("startup")
async def startup_event():
    print("Server running")

@app.get("/")
def health_check():
    return {"status": "ok", "service": "Outpass Management API"}
