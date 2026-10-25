"""Aggregate all v1 endpoint routers."""

from fastapi import APIRouter

from app.api.v1.endpoints import ai, auth, entries, goals, meta, reports, users, weight_logs

api_router = APIRouter()
api_router.include_router(auth.router, prefix="/auth", tags=["auth"])
api_router.include_router(users.router, prefix="/users", tags=["users"])
api_router.include_router(goals.router, prefix="/goals", tags=["goals"])
api_router.include_router(weight_logs.router, prefix="/weight-logs", tags=["weight-logs"])
api_router.include_router(entries.router, prefix="/entries", tags=["entries"])
api_router.include_router(reports.router, prefix="/reports", tags=["reports"])
api_router.include_router(ai.router, prefix="/ai", tags=["ai"])
api_router.include_router(meta.router, tags=["meta"])
