import requests
import logging
from django.conf import settings

logger = logging.getLogger(__name__)

def format_whatsapp_phone(phone_str):
    """
    Cleans phone number string and ensures it has a leading '+' and country code.
    Defaults to +91 (India) if no country code prefix exists.
    """
    if not phone_str:
        return ""
    
    # Strip non-numeric characters (keep leading + if present)
    cleaned = "".join(c for c in phone_str if c.isdigit() or c == '+')
    
    if not cleaned:
        return ""
        
    if cleaned.startswith('+'):
        return cleaned
    
    # If 10 digits without country code, default to +91
    if len(cleaned) == 10:
        return f"+91{cleaned}"
        
    # If starts with 91 but no '+', prepend '+'
    if cleaned.startswith('91') and len(cleaned) == 12:
        return f"+{cleaned}"
        
    return f"+{cleaned}"

def send_whatsapp_message(to_phone, body):
    """
    Sends a WhatsApp message via Twilio REST API.
    If Twilio credentials are not set in settings, logs the message and returns success (mock).
    Returns a tuple (success: bool, error_message: str or None).
    """
    formatted_phone = format_whatsapp_phone(to_phone)
    if not formatted_phone:
        return False, "Invalid target phone number format"
        
    # Check if credentials are not configured
    if not settings.TWILIO_ACCOUNT_SID or not settings.TWILIO_AUTH_TOKEN:
        logger.info(
            f"[MOCK WHATSAPP SANDBOX] Sending message to {formatted_phone} via "
            f"sender {settings.TWILIO_WHATSAPP_NUMBER}:\n{body}"
        )
        safe_body = body.replace("₹", "Rs. ")
        try:
            print(
                f"--- [MOCK WHATSAPP SANDBOX] ---\n"
                f"To: {formatted_phone}\n"
                f"From: {settings.TWILIO_WHATSAPP_NUMBER}\n"
                f"Message: {safe_body}\n"
                f"--------------------------------"
            )
        except UnicodeEncodeError:
            print(
                f"--- [MOCK WHATSAPP SANDBOX] ---\n"
                f"To: {formatted_phone}\n"
                f"From: {settings.TWILIO_WHATSAPP_NUMBER}\n"
                f"Message: {safe_body.encode('ascii', errors='replace').decode('ascii')}\n"
                f"--------------------------------"
            )
        return True, None

    url = f"https://api.twilio.com/2010-04-01/Accounts/{settings.TWILIO_ACCOUNT_SID}/Messages.json"
    
    # Ensure receiver is prepended with whatsapp:
    to_field = f"whatsapp:{formatted_phone}"
    
    # Ensure sender is prepended with whatsapp: if not already
    from_field = settings.TWILIO_WHATSAPP_NUMBER
    if not from_field.startswith('whatsapp:'):
        from_field = f"whatsapp:{from_field}"
        
    payload = {
        'From': from_field,
        'To': to_field,
        'Body': body
    }
    
    try:
        response = requests.post(
            url,
            data=payload,
            auth=(settings.TWILIO_ACCOUNT_SID, settings.TWILIO_AUTH_TOKEN),
            timeout=10
        )
        if response.status_code in [200, 201]:
            logger.info(f"WhatsApp message successfully queued via Twilio to {formatted_phone}")
            return True, None
        else:
            error_text = f"Twilio API error {response.status_code}: {response.text}"
            logger.error(error_text)
            return False, error_text
    except Exception as e:
        error_text = f"HTTP request to Twilio failed: {str(e)}"
        logger.exception("Error calling Twilio API")
        return False, error_text


def dispatch_whatsapp_task(profile_id, message_type, context_data=None):
    """
    Attempts to dispatch the WhatsApp notification Celery task asynchronously.
    If the Celery broker (Redis) is unavailable or throws a connection error,
    it falls back to running the task synchronously to prevent 500 crashes and
    ensure alerts still execute (in mock sandbox mode or otherwise) locally.
    """
    from store_app.tasks import send_whatsapp_notification_task
    import logging
    logger = logging.getLogger(__name__)
    
    try:
        send_whatsapp_notification_task.delay(profile_id, message_type, context_data)
        logger.info(f"Asynchronously queued WhatsApp task ({message_type}) for profile {profile_id}.")
    except Exception as e:
        logger.warning(
            f"Celery queue connection failed ({str(e)}). "
            f"Falling back to synchronous dispatch for WhatsApp task ({message_type}) for profile {profile_id}."
        )
        try:
            send_whatsapp_notification_task(profile_id, message_type, context_data)
        except Exception as sync_err:
            logger.error(f"Synchronous fallback dispatch failed: {str(sync_err)}")

