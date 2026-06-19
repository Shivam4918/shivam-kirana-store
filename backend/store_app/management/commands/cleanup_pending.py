from django.core.management.base import BaseCommand
from django.utils import timezone
from store_app.models import PendingRegistration

class Command(BaseCommand):
    help = 'Clean up expired PendingRegistration records.'

    def handle(self, *args, **options):
        now = timezone.now()
        deleted_count, _ = PendingRegistration.objects.filter(otp_expiry__lt=now).delete()
        self.stdout.write(self.style.SUCCESS(
            f'Successfully deleted {deleted_count} expired PendingRegistration records at {now}'
        ))
