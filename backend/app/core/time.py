"""Timezone helpers — a "day" always means the user's local calendar day."""

from __future__ import annotations

from datetime import UTC, date, datetime
from zoneinfo import ZoneInfo

from app.models.user import User


def to_local_date(dt: datetime, tz: str) -> date:
    """Convert a timezone-aware (or naive-UTC) timestamp to a local calendar date."""
    if dt.tzinfo is None:
        dt = dt.replace(tzinfo=UTC)
    return dt.astimezone(ZoneInfo(tz)).date()


def today_for(user: User) -> date:
    """Current local date for the user."""
    return to_local_date(datetime.now(UTC), user.timezone)


def today_in_timezone(tz: str) -> date:
    """Current local date in an IANA timezone."""
    return to_local_date(datetime.now(UTC), tz)
