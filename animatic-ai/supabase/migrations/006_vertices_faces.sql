-- ============================================
-- MIGRATION 006: Вершины и полигоны
-- ============================================
ALTER TABLE public.models ADD COLUMN IF NOT EXISTS vertices_count INTEGER DEFAULT 0;
ALTER TABLE public.models ADD COLUMN IF NOT EXISTS faces_count INTEGER DEFAULT 0;

COMMENT ON COLUMN public.models.vertices_count IS 'Количество вершин в меши';
COMMENT ON COLUMN public.models.faces_count IS 'Количество граней (полигонов) в меши';
