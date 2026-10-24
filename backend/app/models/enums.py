"""Shared PostgreSQL / Python enums."""

from __future__ import annotations

import enum


class MealType(str, enum.Enum):
    breakfast = "breakfast"
    lunch = "lunch"
    dinner = "dinner"
    snacks = "snacks"


class EntrySource(str, enum.Enum):
    manual = "manual"
    ai_image = "ai_image"
    pdf_import = "pdf_import"
    chat = "chat"
