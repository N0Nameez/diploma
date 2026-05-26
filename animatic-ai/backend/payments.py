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
        "save_payment_method": True if plan_id else False,
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
            from datetime import datetime, timedelta, timezone
            
            # Check existing subscription end date
            current_end = None
            with database._get_pg_connection() as conn:
                with conn.cursor() as cur:
                    cur.execute("SELECT current_period_end FROM public.subscriptions WHERE user_id = %s", (user_id,))
                    row = cur.fetchone()
                    if row:
                        current_end = row[0]
            
            # If sub is still active, extend it. Otherwise, start from now.
            now = datetime.now(timezone.utc)
            if current_end:
                # Ensure current_end is aware if it's not
                if current_end.tzinfo is None:
                    current_end = current_end.replace(tzinfo=timezone.utc)
                
                if current_end > now:
                    end_date = current_end + timedelta(days=30)
                else:
                    end_date = now + timedelta(days=30)
            else:
                end_date = now + timedelta(days=30)
            
            with database._get_pg_connection() as conn:
                with conn.cursor() as cur:
                    # Update or Insert subscription
                    cur.execute("""
                        INSERT INTO public.subscriptions (user_id, plan_id, current_period_end, status, auto_renew)
                        VALUES (%s, %s, %s, 'active', true)
                        ON CONFLICT (user_id) DO UPDATE 
                        SET plan_id = EXCLUDED.plan_id,
                            current_period_end = EXCLUDED.current_period_end,
                            status = 'active',
                            auto_renew = true
                    """, (user_id, plan_id, end_date))
                    
                    # Also update user profile status and end date
                    cur.execute("""
                        UPDATE public.user_profiles
                        SET subscription_status = %s,
                            subscription_end_date = %s,
                            subscription_auto_renew = true
                        WHERE id = %s
                    """, (plan_id, end_date, user_id))
            print(f"SUBSCRIPTION UPDATED/EXTENDED: User {user_id} is now {plan_id} until {end_date}")
        except Exception as e:
            print(f"ERROR updating subscription: {e}")
    
    return {"success": True}

def create_recurrent_payment(user_id: str, amount: float, payment_method_id: str, plan_id: str, description: str = None):
    """
    Create a recurrent payment using a previously saved payment method.
    """
    idempotence_key = str(uuid.uuid4())
    
    payment_data = {
        "amount": {
            "value": str(amount),
            "currency": "RUB"
        },
        "capture": True,
        "payment_method_id": payment_method_id,
        "description": description or f"Автопродление подписки: {plan_id}",
        "metadata": {
            "user_id": user_id,
            "plan_id": plan_id,
            "recurrent": True
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
                """, (user_id, amount, payment.id, payment.status, payment_data["description"]))
        
        return {
            "success": True,
            "payment_id": payment.id,
            "status": payment.status
        }
    except Exception as e:
        print(f"ERROR creating recurrent payment for user {user_id}: {e}")
        
        # If simulation is enabled, we return success anyway for demo purposes
        if config.SIMULATE_RECURRENTS:
            print(f"SIMULATION: Treating failed recurrent payment as SUCCESS for demo (User {user_id})")
            return {
                "success": True,
                "payment_id": f"sim_{uuid.uuid4().hex[:8]}",
                "status": "succeeded",
                "simulated": True
            }
            
        return {"success": False, "error": str(e)}
