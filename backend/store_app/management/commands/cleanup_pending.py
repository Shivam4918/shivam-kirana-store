from django.core.management.base import BaseCommand
from django.utils import timezone
from store_app.models import PendingRegistration

class Command(BaseCommand):
    help = 'Clean up expired PendingRegistration records.'

    def handle(self, *args, **options):
        now = timezone.now()
        updated_count = PendingRegistration.objects.filter(status='pending', otp_expiry__lt=now).update(status='expired')
        self.stdout.write(self.style.SUCCESS(
            f'Successfully marked {updated_count} expired PendingRegistration records at {now}'
        ))
