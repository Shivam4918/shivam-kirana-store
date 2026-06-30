import hmac
import hashlib
import requests
from django.conf import settings
import logging

logger = logging.getLogger(__name__)

def verify_razorpay_signature(payload_bytes, signature, secret=None):
    """
    Verifies that the webhook payload is signed correctly by Razorpay.
    """
    if not secret:
        secret = settings.RAZORPAY_WEBHOOK_SECRET
    
    if not signature:
        return False
        
    try:
        computed = hmac.new(
            secret.encode('utf-8'),
            payload_bytes,
            hashlib.sha256
        ).hexdigest()
        return hmac.compare_digest(computed, signature)
    except Exception as e:
        logger.error(f"Error verifying signature: {str(e)}")
        return False

def create_razorpay_payment_link(amount_decimal, customer_name, customer_email, customer_phone, callback_url=None):
    """
    Calls Razorpay REST API to create a payment link.
    If default dummy credentials are used or API fails, returns mock details.
    """
    # If keys are default dummy ones, go straight to mock
    if settings.RAZORPAY_KEY_ID == 'rzp_test_dummy_id' or settings.RAZORPAY_KEY_SECRET == 'rzp_test_dummy_secret':
        logger.info("Using dummy credentials, generating mock link details.")
        import uuid
        mock_id = f"plink_{uuid.uuid4().hex[:12]}"
        base_url = callback_url if callback_url else "http://localhost:5174/dashboard/khata"
        if "/dashboard/khata" in base_url:
            base_url = base_url.replace("/dashboard/khata", "/mock-payment")
        elif not base_url.endswith("/mock-payment"):
            base_url = base_url.rstrip("/") + "/mock-payment"
            
        sep = "&" if "?" in base_url else "?"
        mock_url = f"{base_url}{sep}link_id={mock_id}&amount={float(amount_decimal)}"
        return {
            'id': mock_id,
            'short_url': mock_url,
            'is_mock': True
        }

    # Convert amount to paise
    amount_paise = int(amount_decimal * 100)
    
    url = "https://api.razorpay.com/v1/payment_links"
    headers = {
        "Content-Type": "application/json"
    }
    
    payload = {
        "amount": amount_paise,
        "currency": "INR",
        "accept_partial": False,
        "description": f"Ledger settlement for Shivam Kirana Store",
        "customer": {
            "name": customer_name or "Valued Customer",
            "email": customer_email or "customer@shivam.com",
            "contact": customer_phone or "+919999999999"
        },
        "notify": {
            "sms": False,
            "email": False
        },
        "reminder_enable": False
    }

    if callback_url:
        payload["callback_url"] = callback_url
        payload["callback_method"] = "get"
        
    try:
        response = requests.post(
            url,
            headers=headers,
            json=payload,
            auth=(settings.RAZORPAY_KEY_ID, settings.RAZORPAY_KEY_SECRET),
            timeout=10
        )
        if response.status_code in [200, 201]:
            data = response.json()
            return {
                'id': data.get('id'),
                'short_url': data.get('short_url'),
                'is_mock': False
            }
        else:
            logger.error(f"Razorpay link creation failed with status {response.status_code}: {response.text}")
            raise Exception("Razorpay link creation failed")
    except Exception as e:
        logger.exception("Error calling Razorpay API, falling back to mock payment details")
        import uuid
        mock_id = f"plink_{uuid.uuid4().hex[:12]}"
        base_url = callback_url if callback_url else "http://localhost:5174/dashboard/khata"
        if "/dashboard/khata" in base_url:
            base_url = base_url.replace("/dashboard/khata", "/mock-payment")
        elif not base_url.endswith("/mock-payment"):
            base_url = base_url.rstrip("/") + "/mock-payment"
            
        sep = "&" if "?" in base_url else "?"
        mock_url = f"{base_url}{sep}link_id={mock_id}&amount={float(amount_decimal)}"
        return {
            'id': mock_id,
            'short_url': mock_url,
            'is_mock': True
        }
