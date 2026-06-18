from django.db import close_old_connections
from django.conf import settings
import threading
import logging

logger = logging.getLogger(__name__)

def run_task_async_or_sync(task_func, *args, **kwargs):
    """
    Runs a task asynchronously in a daemon thread in production,
    or synchronously in test environments (when CELERY_TASK_ALWAYS_EAGER is True)
    to prevent SQLite database locks.
    """
    def wrapper():
        try:
            close_old_connections()
            task_func(*args, **kwargs)
        except Exception as e:
            logger.error(f"Error executing background task {task_func.__name__}: {str(e)}")
        finally:
            close_old_connections()

    if getattr(settings, 'CELERY_TASK_ALWAYS_EAGER', False):
        wrapper()
    else:
        threading.Thread(target=wrapper, daemon=True).start()

