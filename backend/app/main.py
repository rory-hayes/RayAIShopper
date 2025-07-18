from fastapi import FastAPI, Request, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
import time
import uuid
import asyncio
from app.config import settings
from app.utils.logging import setup_logging, get_logger
from app.models.responses import ErrorResponse

# Setup logging
setup_logging()
logger = get_logger(__name__)

# Global service instance
recommendation_service = None
_service_lock = asyncio.Lock()

async def get_or_create_recommendation_service():
    """Lazy initialization of recommendation service"""
    global recommendation_service
    
    if recommendation_service is not None:
        return recommendation_service
    
    async with _service_lock:
        # Double-check pattern
        if recommendation_service is not None:
            return recommendation_service
        
        logger.info("Initializing recommendation service (lazy)...")
        try:
            from app.services.recommendation_service import RecommendationService
            service = RecommendationService()
            
            # Initialize the service
            success = await service.initialize()
            if not success:
                logger.error("Failed to initialize recommendation service")
                return None
            else:
                logger.info("Recommendation service initialized successfully")
                # Log service status
                status = service.get_service_status()
                logger.info(f"Service status: {status}")
                
                recommendation_service = service
                return recommendation_service
                
        except Exception as e:
            logger.error(f"Error initializing recommendation service: {e}")
            import traceback
            logger.error(f"Traceback: {traceback.format_exc()}")
            return None

# Create FastAPI app
app = FastAPI(
    title="Ray AI Shopper Backend",
    description="AI-powered fashion recommendation service using GPT-4o mini and RAG",
    version="1.0.0",
    docs_url="/docs",
    redoc_url="/redoc"
)

# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Request logging middleware
@app.middleware("http")
async def log_requests(request: Request, call_next):
    """Log all incoming requests"""
    request_id = str(uuid.uuid4())
    start_time = time.time()
    
    logger.info(
        f"Request {request_id}: {request.method} {request.url.path} "
        f"from {request.client.host if request.client else 'unknown'}"
    )
    
    # Add request ID to request state
    request.state.request_id = request_id
    
    try:
        response = await call_next(request)
        process_time = time.time() - start_time
        
        logger.info(
            f"Request {request_id} completed in {process_time:.3f}s "
            f"with status {response.status_code}"
        )
        
        # Add request ID to response headers for debugging
        response.headers["X-Request-ID"] = request_id
        return response
        
    except Exception as e:
        process_time = time.time() - start_time
        logger.error(
            f"Request {request_id} failed after {process_time:.3f}s: {str(e)}"
        )
        raise

# Global exception handler
@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    """Handle all unhandled exceptions"""
    request_id = getattr(request.state, 'request_id', 'unknown')
    
    logger.error(f"Unhandled exception in request {request_id}: {str(exc)}")
    
    # Don't expose internal errors in production
    if settings.environment == "production":
        error_message = "An internal server error occurred"
        error_details = None
    else:
        error_message = str(exc)
        error_details = {"type": type(exc).__name__}
    
    return JSONResponse(
        status_code=500,
        content=ErrorResponse(
            error="internal_server_error",
            message=error_message,
            details=error_details,
            request_id=request_id
        ).dict()
    )

# HTTP exception handler
@app.exception_handler(HTTPException)
async def http_exception_handler(request: Request, exc: HTTPException):
    """Handle HTTP exceptions with consistent error format"""
    request_id = getattr(request.state, 'request_id', 'unknown')
    
    return JSONResponse(
        status_code=exc.status_code,
        content=ErrorResponse(
            error="http_error",
            message=exc.detail,
            details={"status_code": exc.status_code},
            request_id=request_id
        ).dict()
    )

# Include API routes
try:
    from app.api.routes import router
    app.include_router(router, prefix=settings.api_prefix)
    logger.info("Included main API router")
except Exception as e:
    logger.error(f"Error including main API router: {e}")

# Root endpoint
@app.get("/")
async def root():
    """Root endpoint with service information"""
    return {
        "service": "Ray AI Shopper Backend",
        "version": "1.0.0",
        "status": "running",
        "docs": "/docs",
        "api_prefix": settings.api_prefix
    }

# Debug endpoint to test service availability
@app.get("/debug/service")
async def debug_service():
    """Debug endpoint to check service status"""
    service = await get_or_create_recommendation_service()
    return {
        "service_exists": service is not None,
        "service_type": str(type(service)) if service else None,
        "service_status": service.get_service_status() if service else None
    }

# Make recommendation service available to routers
def get_recommendation_service():
    """Synchronous wrapper - for compatibility, but should use async version"""
    global recommendation_service
    logger.info(f"get_recommendation_service called, service is: {recommendation_service}")
    return recommendation_service

async def get_recommendation_service_async():
    """Async version that creates service if needed"""
    return await get_or_create_recommendation_service()

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(
        "app.main:app",
        host="0.0.0.0",
        port=8000,
        reload=settings.environment == "development",
        log_level=settings.log_level.lower()
    ) 