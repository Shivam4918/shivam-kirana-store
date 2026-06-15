import os
from celery import Celery

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'store_backend.settings')

app = Celery('store_backend')

# Load task sources from all registered Django app configs.
app.config_from_object('django.conf:settings', namespace='CELERY')

# Discover tasks in store_app/tasks.py
app.autodiscover_tasks()

@app.task(bind=True)
def debug_task(self):
    print(f'Request: {self.request!r}')
