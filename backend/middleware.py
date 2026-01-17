"""
Security Middleware cho RealChat
"""
from fastapi import Request, HTTPException, status
from starlette.middleware.base import BaseHTTPMiddleware
from typing import Callable
import time
from collections import defaultdict
import html
import re

# Simple rate limiter
class RateLimiter:
    def __init__(self):
        self.requests = defaultdict(list)
        self.max_requests = 100  # Max requests per window
        self.window = 60  # 60 seconds
    
    def is_allowed(self, identifier: str) -> bool:
        now = time.time()
        
        # Remove old requests
        self.requests[identifier] = [
            req_time for req_time in self.requests[identifier]
            if now - req_time < self.window
        ]
        
        # Check if under limit
        if len(self.requests[identifier]) >= self.max_requests:
            return False
        
        # Add new request
        self.requests[identifier].append(now)
        return True


rate_limiter = RateLimiter()


class RateLimitMiddleware(BaseHTTPMiddleware):
    """Rate limiting middleware"""
    
    async def dispatch(self, request: Request, call_next: Callable):
        # Get client IP
        client_ip = request.client.host
        
        # Skip rate limiting for health checks
        if request.url.path in ["/health", "/", "/docs", "/openapi.json"]:
            return await call_next(request)
        
        # Check rate limit
        if not rate_limiter.is_allowed(client_ip):
            raise HTTPException(
                status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                detail="Too many requests. Please try again later."
            )
        
        response = await call_next(request)
        return response


class SecurityHeadersMiddleware(BaseHTTPMiddleware):
    """Add security headers to responses"""
    
    async def dispatch(self, request: Request, call_next: Callable):
        response = await call_next(request)
        
        # Add security headers
        response.headers["X-Content-Type-Options"] = "nosniff"
        response.headers["X-Frame-Options"] = "DENY"
        response.headers["X-XSS-Protection"] = "1; mode=block"
        response.headers["Strict-Transport-Security"] = "max-age=31536000; includeSubDomains"
        
        return response


def sanitize_html(text: str) -> str:
    """Sanitize HTML to prevent XSS"""
    if not text:
        return text
    return html.escape(text)


def sanitize_input(text: str, max_length: int = 1000) -> str:
    """
    Sanitize user input
    - Escape HTML
    - Limit length
    - Remove dangerous characters
    """
    if not text:
        return text
    
    # Limit length
    text = text[:max_length]
    
    # Escape HTML
    text = html.escape(text)
    
    # Remove null bytes
    text = text.replace('\x00', '')
    
    return text.strip()


def validate_no_sql_injection(text: str) -> bool:
    """
    Basic NoSQL injection check
    MongoDB injection usually involves special operators
    """
    if not text:
        return True
    
    # Check for MongoDB operators
    dangerous_patterns = [
        r'\$where',
        r'\$ne',
        r'\$gt',
        r'\$lt',
        r'\$regex',
        r'\$expr',
    ]
    
    for pattern in dangerous_patterns:
        if re.search(pattern, text, re.IGNORECASE):
            return False
    
    return True
