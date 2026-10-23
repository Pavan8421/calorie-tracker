"""Aggregate all v1 endpoint routers."""

from fastapi import APIRouter

api_router = APIRouter()

# Endpoint routers are included here as features are implemented.
# Example (phase 1+):
# from app.api.v1.endpoints import auth, users
# api_router.include_router(auth.router, prefix="/auth", tags=["auth"])
