-- Create subscription_plans table
CREATE TABLE IF NOT EXISTS public.subscription_plans (
    id VARCHAR(50) PRIMARY KEY,
    name TEXT NOT NULL,
    price_monthly DECIMAL(10, 2) NOT NULL,
    credits_per_month INTEGER NOT NULL,
    features JSONB DEFAULT '[]',
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create file_formats table
CREATE TABLE IF NOT EXISTS public.file_formats (
    id SERIAL PRIMARY KEY,
    name TEXT UNIQUE NOT NULL,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.subscription_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.file_formats ENABLE ROW LEVEL SECURITY;

-- Add read policies
CREATE POLICY "Allow public read access on subscription_plans" ON public.subscription_plans FOR SELECT USING (true);
CREATE POLICY "Allow public read access on file_formats" ON public.file_formats FOR SELECT USING (true);
