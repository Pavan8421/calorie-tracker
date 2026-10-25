"""arq worker settings — start with: arq app.workers.main.WorkerSettings"""

from __future__ import annotations

from arq.connections import RedisSettings

from app.core.config import get_settings
from app.workers.import_tasks import process_pdf_import


def _redis_settings() -> RedisSettings:
    return RedisSettings.from_dsn(get_settings().redis_url)


class WorkerSettings:
    functions = [process_pdf_import]
    redis_settings = _redis_settings()
    max_jobs = 5
    job_timeout = 300
