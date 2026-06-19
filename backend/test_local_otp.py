import os
import sys
import time
import random
import requests
import django

# Setup Django environment to query database directly for verification code
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'store_backend.settings')
django.setup()

from django.contrib.auth import get_user_model
User = get_user_model()

BASE_URL = "http://127.0.0.1:8000/api"

def run_test():
    timestamp = int(time.time())
    username = f"testuser_{timestamp}"
    email = f"testuser_{timestamp}@example.com"
    password = "Password123!"  # Meets password complexity check
    phone_number = "9" + "".join([str(random.randint(0, 9)) for _ in range(9)]) # Valid 10-digit Indian number

    print(f"\n--- Initiating Registration Test on Localhost ({username}) ---")

    # 1. Register User via HTTP API
    reg_url = f"{BASE_URL}/auth/register/"
    reg_data = {
        "username": username,
        "email": email,
        "password": password,
        "confirm_password": password,
        "phone_number": phone_number,
        "role": "CUSTOMER"
    }

    try:
        response = requests.post(reg_url, json=reg_data)
        if response.status_code != 201:
            print(f"[-] Registration failed with status code {response.status_code}")
            print(f"[-] Details: {response.text}")
            return False
        print("[+] User registration request submitted successfully (201 Created).")
    except requests.exceptions.ConnectionError:
        print("[-] Connection failed. Is the Django development server running on http://localhost:8000?")
        return False

    # 2. Query Database directly to get the generated OTP
    time.sleep(1)  # Brief pause to ensure DB write is finalized
    try:
        user = User.objects.get(username=username)
        otp = user.otp_code
        print(f"[+] Retrieved generated OTP from Database: {otp}")
        if not otp:
            print("[-] Error: OTP was not generated in the database!")
            return False
    except User.DoesNotExist:
        print(f"[-] Error: User {username} was not found in the database!")
        return False

    # 3. Submit OTP to verification endpoint
    verify_url = f"{BASE_URL}/auth/verify-otp/"
    verify_data = {
        "username": username,
        "otp": otp
    }

    print(f"[+] Submitting OTP verification for user...")
    verify_response = requests.post(verify_url, json=verify_data)
    
    if verify_response.status_code != 200:
        print(f"[-] OTP verification failed with status code {verify_response.status_code}")
        print(f"[-] Details: {verify_response.text}")
        return False
    print("[+] OTP verification endpoint responded with 200 OK.")

    # 4. Verify User state in database
    user.refresh_from_db()
    if not user.is_active:
        print("[-] Error: User is still inactive in database after successful verification!")
        return False
    
    # Check if KhataProfile has been created
    from store_app.models import KhataProfile
    profile_exists = KhataProfile.objects.filter(user=user).exists()
    if not profile_exists:
        print("[-] Error: KhataProfile was not automatically created for verified user!")
        return False
    
    print("[+] User is successfully verified and active!")
    print("[+] KhataProfile verified successfully!")

    # 5. Clean up test user to keep DB clean
    user.delete()
    print("[+] Test user database records cleaned up successfully.")
    return True

if __name__ == "__main__":
    # If run with '--monitor' argument, run in a continuous loop to check availability
    if "--monitor" in sys.argv:
        print("[*] Monitoring mode active. Press Ctrl+C to terminate.")
        success_count = 0
        failure_count = 0
        while True:
            success = run_test()
            if success:
                success_count += 1
            else:
                failure_count += 1
            print(f"\n[*] Status: {success_count} success, {failure_count} failures.")
            time.sleep(15)
    else:
        # Run one-off test
        success = run_test()
        sys.exit(0 if success else 1)
