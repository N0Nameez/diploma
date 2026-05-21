-- Добавляем колонки в public.subscriptions
ALTER TABLE public.subscriptions 
ADD COLUMN IF NOT EXISTS auto_renew BOOLEAN DEFAULT TRUE,
ADD COLUMN IF NOT EXISTS payment_method_id VARCHAR(100);

-- Добавляем колонку в public.user_profiles
ALTER TABLE public.user_profiles 
ADD COLUMN IF NOT EXISTS subscription_auto_renew BOOLEAN DEFAULT FALSE;
