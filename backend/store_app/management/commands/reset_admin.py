from django.core.management.base import BaseCommand
from django.contrib.auth import get_user_model


class Command(BaseCommand):
    help = 'Force-reset the admin user to shivam1121@ with the correct password'

    def handle(self, *args, **options):
        User = get_user_model()

        # Delete ALL admin-role users to start clean
        deleted_count, _ = User.objects.filter(role='ADMIN').delete()
        self.stdout.write(f"Deleted {deleted_count} existing admin user(s)")

        # Also delete any leftover testuser or admin accounts
        deleted_count2, _ = User.objects.filter(
            username__in=['admin', 'testuser', 'shivam1121@']
        ).delete()
        self.stdout.write(f"Deleted {deleted_count2} additional leftover user(s)")

        # Create new admin from scratch
        new_admin = User(
            username='shivam1121@',
            email='admin@shivam.com',
            phone_number='9876543210',
            role='ADMIN',
            is_staff=True,
            is_superuser=True,
            is_active=True,
        )
        new_admin.set_password('Prajapatiadmin2005#$@')
        new_admin.save()

        # Verify
        check = new_admin.check_password('Prajapatiadmin2005#$@')
        self.stdout.write(self.style.SUCCESS(
            f"Admin user created: username='{new_admin.username}', "
            f"is_staff={new_admin.is_staff}, is_superuser={new_admin.is_superuser}, "
            f"is_active={new_admin.is_active}, password_check={check}"
        ))
