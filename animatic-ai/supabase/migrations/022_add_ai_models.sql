-- ============================================
-- MIGRATION 022: Таблица конфигурации AI моделей
-- ============================================

CREATE TABLE IF NOT EXISTS public.ai_models (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    model_key TEXT UNIQUE NOT NULL,
    base_cost INTEGER DEFAULT 2,
    quality_settings JSONB DEFAULT '{}',
    description TEXT,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Настройка RLS
ALTER TABLE public.ai_models ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow public read access on ai_models" 
ON public.ai_models FOR SELECT USING (is_active = TRUE);

-- Сидинг базовых моделей
INSERT INTO public.ai_models (name, model_key, base_cost, description)
VALUES 
    ('Hunyuan3D-1', 'Hunyuan3D-1', 2, 'Быстрая генерация моделей базового качества'),
    ('Hunyuan3D-2', 'Hunyuan3D-2', 3, 'Высококачественная генерация с поддержкой PBR текстур'),
    ('TRELLIS 2.0', 'TRELLIS2', 4, 'Ультра-реалистичная генерация сложных объектов')
ON CONFLICT (model_key) DO NOTHING;

-- Скрываем от GraphQL (по аналогии с прошлыми фиксами)
COMMENT ON TABLE public.ai_models IS '@graphql({"exposed": false})';
