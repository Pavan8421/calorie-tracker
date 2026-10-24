"""Aggregate all v1 endpoint routers."""

from fastapi import APIRouter

from app.api.v1.endpoints import auth, goals, users, weight_logs

api_router = APIRouter()
api_router.include_router(auth.router, prefix="/auth", tags=["auth"])
api_router.include_router(users.router, prefix="/users", tags=["users"])
api_router.include_router(goals.router, prefix="/goals", tags=["goals"])
api_router.include_router(weight_logs.router, prefix="/weight-logs", tags=["weight-logs"])
