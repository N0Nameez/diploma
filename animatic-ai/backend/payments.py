import uuid
from yookassa import Configuration, Payment
import config
import database

# Configure Yookassa
Configuration.configure(config.YOOKASSA_SHOP_ID, config.YOOKASSA_SECRET_KEY)

def create_payment(user_id: str, amount: float, credits_amount: int, plan_id: str = None, description: str = None):
    """
    Create a payment in Yookassa and record it in our DB.
    """
    idempotence_key = str(uuid.uuid4())
    
    payment_data = {
        "amount": {
            "value": str(amount),
            "currency": "RUB"
        },
        "confirmation": {
            "type": "redirect",
            "return_url": "https://animaticai.online/profile" # Redirect back after payment
        },
        "capture": True,
        "description": description or f"Пополнение баланса: {credits_amount} кредитов",
        "metadata": {
            "user_id": user_id,
            "credits_amount": credits_amount,
            "plan_id": plan_id
        }
    }

    try:
        payment = Payment.create(payment_data, idempotence_key)
        
        # Save to our DB
        with database._get_pg_connection() as conn:
            with conn.cursor() as cur:
                cur.execute("""
                    INSERT INTO public.payments (user_id, amount, payment_id, status, description)
                    VALUES (%s, %s, %s, %s, %s)
                    RETURNING id
                """, (user_id, amount, payment.id, payment.status, payment_data["description"]))
        
        return {
            "success": True,
            "payment_id": payment.id,
            "confirmation_url": payment.confirmation.confirmation_url,
            "status": payment.status
        }
    except Exception as e:
        print(f"ERROR creating payment: {e}")
        return {"success": False, "error": str(e)}

def update_payment_status(payment_id: str, status: str):
    """
    Update payment status in our DB.
    """
    with database._get_pg_connection() as conn:
        with conn.cursor() as cur:
            cur.execute("""
                UPDATE public.payments
                SET status = %s
                WHERE payment_id = %s
                RETURNING user_id, amount
            """, (status, payment_id))
            return cur.fetchone()

def process_successful_payment(payment_id: str, user_id: str, credits_to_add: int, plan_id: str = None):
    """
    Business logic for successful payment: update DB, add credits, and handle subscriptions.
    """
    # 1. Update payment status
    update_payment_status(payment_id, "succeeded")
    
    # 2. Add credits to user
    database.add_credits(user_id, credits_to_add)
    
    # 3. Handle Subscription logic
    if plan_id in ["pro", "studio"]:
        try:
            from datetime import datetime, timedelta
            end_date = datetime.now() + timedelta(days=30)
            
            with database._get_pg_connection() as conn:
                with conn.cursor() as cur:
                    # Update or Insert subscription
                    cur.execute("""
                        INSERT INTO public.subscriptions (user_id, plan_id, current_period_end, status)
                        VALUES (%s, %s, %s, 'active')
                        ON CONFLICT (user_id) DO UPDATE 
                        SET plan_id = EXCLUDED.plan_id,
                            current_period_end = EXCLUDED.current_period_end,
                            status = 'active'
                    """, (user_id, plan_id, end_date))
                    
                    # Also update user profile status and end date
                    cur.execute("""
                        UPDATE public.user_profiles
                        SET subscription_status = %s,
                            subscription_end_date = %s
                        WHERE id = %s
                    """, (plan_id, end_date, user_id))
            print(f"SUBSCRIPTION UPDATED: User {user_id} is now {plan_id} until {end_date}")
        except Exception as e:
            print(f"ERROR updating subscription: {e}")
    
    return {"success": True}
