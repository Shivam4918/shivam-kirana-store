from django.conf import settings
import threading

def run_task_async_or_sync(task_func, *args, **kwargs):
    """
    Runs a task asynchronously in a daemon thread in production,
    or synchronously in test environments (when CELERY_TASK_ALWAYS_EAGER is True)
    to prevent SQLite database locks.
    """
    if getattr(settings, 'CELERY_TASK_ALWAYS_EAGER', False):
        task_func(*args, **kwargs)
    else:
        threading.Thread(target=task_func, args=args, kwargs=kwargs, daemon=True).start()
