"""
RealChat - FastAPI Backend
High-performance chat application with MongoDB
"""
from fastapi import FastAPI, status, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager
from config import settings
from database import db
import logging

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

# Import routes
from routes.auth import router as auth_router
from routes.messages import router as messages_router
from routes.users import router as users_router
from routes.rooms import router as rooms_router


# ============ LIFESPAN EVENTS ============

@asynccontextmanager
async def lifespan(app: FastAPI):
    """
    Startup and shutdown events
    """
    # Startup
    logger.info("🚀 Starting RealChat FastAPI server...")
    await db.connect_db()
    yield
    # Shutdown
    logger.info("🛑 Shutting down RealChat server...")
    await db.close_db()


# ============ CREATE APP ============

app = FastAPI(
    title="RealChat API",
    description="High-performance chat system with MongoDB",
    version="2.0.0",
    lifespan=lifespan
)

# ============ MIDDLEWARE ============

# Import security middleware
from middleware import RateLimitMiddleware, SecurityHeadersMiddleware

# Security middleware (add first)
app.add_middleware(SecurityHeadersMiddleware)
app.add_middleware(RateLimitMiddleware)

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ============ ROUTES ============

@app.get("/", tags=["health"])
async def root():
    """Root endpoint"""
    return {
        "message": "🎉 RealChat API v2.0 - Chào mừng!",
        "docs": "/docs",
        "endpoints": {
            "auth": "/docs#/authentication",
            "messages": "/docs#/messages",
            "users": "/docs#/users",
            "rooms": "/docs#/rooms"
        }
    }


@app.get("/health", tags=["health"])
async def health_check():
    """Health check endpoint"""
    return {
        "status": "healthy",
        "service": "RealChat API",
        "version": "2.0.0"
    }


# Include routers (auth already has /api prefix in its definition)
app.include_router(auth_router)
app.include_router(messages_router)
app.include_router(users_router)
app.include_router(rooms_router)


# ============ ERROR HANDLERS ============

@app.exception_handler(ValueError)
async def value_error_handler(request, exc):
    raise HTTPException(
        status_code=status.HTTP_400_BAD_REQUEST,
        detail=str(exc)
    )


if __name__ == "__main__":
    import uvicorn
    
    uvicorn.run(
        "main:app",
        host=settings.HOST,
        port=settings.PORT,
        reload=settings.DEBUG,
        log_level="info"
    )
