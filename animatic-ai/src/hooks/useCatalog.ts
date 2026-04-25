import { useState, useEffect, useCallback } from "react";
import {
  fetchModels,
  fetchAnimations,
  type ApiModel,
  type ApiAnimation,
} from "../services/api";

/* Catalog filters */
export interface CatalogFilters {
  contentType: "3d" | "animation";
  categories: string[];
  formats: string[];
  onlyAI: boolean;
  search: string;
  sort: string;
}

/* Merged item type for the catalog */
export type CatalogItem = ApiModel | ApiAnimation;

/* Metadata — static for now, will be fetched from backend later */
const CATEGORIES = [
  "Персонажи",
  "Архитектура",
  "Природа",
  "Транспорт",
  "Оружие",
  "Животные",
  "Интерьер",
];
const FORMATS = ["GLB", "FBX", "OBJ"];
const SORT_OPTIONS = [
  "По популярности",
  "Сначала новые",
  "Высокий рейтинг",
  "Больше загрузок",
];

export function useCatalog() {
  const [filters, setFilters] = useState<CatalogFilters>({
    contentType: "3d",
    categories: [],
    formats: [],
    onlyAI: false,
    search: "",
    sort: "По популярности",
  });

  const [items, setItems] = useState<CatalogItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadItems = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      if (filters.contentType === "3d") {
        const res = await fetchModels({
          categories:
            filters.categories.length > 0 ? filters.categories : undefined,
          formats: filters.formats.length > 0 ? filters.formats : undefined,
          search: filters.search || undefined,
          sort: filters.sort || undefined,
          ai_only: filters.onlyAI || undefined,
          limit: 50,
        });
        setItems(res.items as CatalogItem[]);
      } else {
        const res = await fetchAnimations({ limit: 50 });
        setItems(res.items as CatalogItem[]);
      }
    } catch (err: any) {
      setError(err.message);
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, [filters]);

  useEffect(() => {
    loadItems();
  }, [loadItems]);

  const updateFilter = <K extends keyof CatalogFilters>(
    key: K,
    value: CatalogFilters[K],
  ) => {
    setFilters((prev) => ({ ...prev, [key]: value }));
  };

  const resetFilters = () => {
    setFilters((prev) => ({
      contentType: prev.contentType,
      categories: [],
      formats: [],
      onlyAI: false,
      search: prev.search,
      sort: "По популярности",
    }));
  };

  return {
    items,
    loading,
    error,
    filters,
    meta: {
      categories: CATEGORIES,
      formats: FORMATS,
      sortOptions: SORT_OPTIONS,
    },
    updateFilter,
    resetFilters,
    totalCount: items.length,
  };
}
