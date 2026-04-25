import { useState, useEffect, useRef, createContext, useContext } from "react";
import { useNavigate } from "react-router-dom";
import { fetchModels, fetchAnimations } from "../services/api";
import { Search, X } from "lucide-react";

/* ── Context ── */
interface SearchContextValue {
  query: string;
  setQuery: (q: string) => void;
}
const SearchContext = createContext<SearchContextValue>({
  query: "",
  setQuery: () => {},
});
export const useSearchContext = () => useContext(SearchContext);

export interface SearchResult {
  id: string;
  name: string;
  type: "model" | "animation";
  preview_url?: string | null;
  category?: string;
  author_name?: string;
}

/* ── SearchInput — текстовое поле в Navbar ── */
export function SearchInput() {
  const { query, setQuery } = useSearchContext();

  return (
    <div className="relative w-full max-w-xs">
      <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-secondary pointer-events-none" />
      <input
        type="text"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Поиск моделей..."
        className="w-full pl-9 pr-4 py-2 bg-surface2 border border-border rounded-xl text-text text-sm outline-none focus:border-accent transition-all duration-200 placeholder:text-text-secondary"
      />
    </div>
  );
}

/* ── SearchModal — только результаты, поверх всего кроме navbar ── */
export function SearchModal() {
  const navigate = useNavigate();
  const { query, setQuery } = useSearchContext();
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const debounceRef = useRef<number | null>(null);
  const [isOpen, setIsOpen] = useState(false);

  // Определяем открытость по наличию query
  useEffect(() => {
    setIsOpen(query.trim().length > 0);
  }, [query]);

  // Debounced search
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);

    if (!query.trim()) {
      setResults([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    debounceRef.current = window.setTimeout(async () => {
      try {
        const [modelsRes, animsRes] = await Promise.allSettled([
          fetchModels({ search: query, limit: 12 }),
          fetchAnimations({ search: query, limit: 12 }),
        ]);

        const items: SearchResult[] = [];
        if (modelsRes.status === "fulfilled") {
          items.push(
            ...modelsRes.value.items.map((m) => ({
              id: m.id,
              name: m.name,
              type: "model" as const,
              preview_url: m.preview_url,
              category: m.category,
              author_name:
                m.user_profiles?.display_name || m.user_profiles?.username,
            })),
          );
        }
        if (animsRes.status === "fulfilled") {
          items.push(
            ...animsRes.value.items.map((a) => ({
              id: a.id,
              name: a.name,
              type: "animation" as const,
              preview_url: a.preview_url,
              category: undefined,
              author_name:
                a.user_profiles?.display_name || a.user_profiles?.username,
            })),
          );
        }
        setResults(items);
      } catch {
        setResults([]);
      } finally {
        setLoading(false);
      }
    }, 300);

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [query]);

  const handleResultClick = (result: SearchResult) => {
    setQuery("");
    navigate(
      result.type === "model"
        ? `/models/${result.id}`
        : `/animations/${result.id}`,
    );
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed top-16 left-0 right-0 bottom-0 bg-black/60 z-[60] flex items-start justify-center pt-12 px-8"
      onClick={() => setQuery("")}
    >
      <div
        className="w-full max-w-4xl bg-surface border border-border rounded-2xl shadow-2xl overflow-hidden max-h-[75vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Заголовок */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-border bg-surface2/50">
          <div>
            <p className="text-sm font-semibold text-text">
              Результаты поиска: «{query}»
            </p>
            <p className="text-[11px] text-text-secondary mt-0.5">
              {loading ? "Ищем..." : `Найдено: ${results.length}`}
            </p>
          </div>
          <button
            onClick={() => setQuery("")}
            className="w-8 h-8 rounded-lg bg-surface2 border border-border flex items-center justify-center text-textSecondary hover:text-text transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Results */}
        <div className="flex-1 overflow-y-auto p-6">
          {loading ? (
            <div className="grid gap-4 grid-cols-2 sm:grid-cols-3 md:grid-cols-4">
              {Array.from({ length: 8 }).map((_, i) => (
                <div
                  key={i}
                  className="bg-surface2 rounded-xl overflow-hidden animate-pulse"
                >
                  <div className="aspect-square bg-surface" />
                  <div className="p-3">
                    <div className="h-3 bg-surface2 rounded w-3/4 mb-2" />
                    <div className="h-2.5 bg-surface2 rounded w-1/2" />
                  </div>
                </div>
              ))}
            </div>
          ) : results.length > 0 ? (
            <div className="grid gap-4 grid-cols-2 sm:grid-cols-3 md:grid-cols-4">
              {results.map((item) => (
                <button
                  key={item.id}
                  onClick={() => handleResultClick(item)}
                  className="group bg-surface2 border border-border rounded-xl overflow-hidden hover:border-accent/50 transition-all duration-200 text-left"
                >
                  <div className="aspect-square bg-surface relative overflow-hidden">
                    {item.preview_url ? (
                      <img
                        src={item.preview_url}
                        alt={item.name}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                        loading="lazy"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-textSecondary/30">
                        <svg
                          width="48"
                          height="48"
                          fill="currentColor"
                          viewBox="0 0 16 16"
                        >
                          <path d="M8 1a6 6 0 1 0 0 12A6 6 0 0 0 8 1zm0 1a5 5 0 1 1 0 10A5 5 0 0 1 8 2zm-.5 3.5a.5.5 0 0 1 1 0V7h2a.5.5 0 0 1 0 1h-2v2.5a.5.5 0 0 1-1 0V8H5.5a.5.5 0 0 1 0-1H7V5.5z" />
                        </svg>
                      </div>
                    )}
                    <span className="absolute top-2 right-2 px-2 py-0.5 bg-black/60 backdrop-blur-sm rounded text-[10px] font-semibold text-white">
                      {item.type === "model" ? "3D" : "Аним."}
                    </span>
                  </div>
                  <div className="p-3">
                    <p className="text-sm font-medium text-text truncate group-hover:text-accent transition-colors">
                      {item.name}
                    </p>
                    {item.category && (
                      <p className="text-[11px] text-text-secondary mt-0.5">
                        {item.category}
                      </p>
                    )}
                    {item.author_name && (
                      <p className="text-[10px] text-text-secondary/60 mt-1 truncate">
                        {item.author_name}
                      </p>
                    )}
                  </div>
                </button>
              ))}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <div className="w-16 h-16 rounded-full bg-surface2 flex items-center justify-center mb-4">
                <Search className="w-6 h-6 text-textSecondary/50" />
              </div>
              <p className="text-sm font-medium text-text">Ничего не найдено</p>
              <p className="text-[11px] text-text-secondary mt-1">
                Попробуйте другой запрос
              </p>
            </div>
          )}
        </div>

        {/* Footer */}
        {results.length > 0 && (
          <div className="px-6 py-3 border-t border-border bg-surface2/30">
            <button
              onClick={() => {
                setQuery("");
                navigate(`/models?search=${encodeURIComponent(query)}`);
              }}
              className="text-xs text-accent hover:underline font-medium"
            >
              Все результаты для «{query}» →
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

/* ── Provider ── */
export function SearchProvider({ children }: { children: React.ReactNode }) {
  const [query, setQuery] = useState("");

  return (
    <SearchContext.Provider value={{ query, setQuery }}>
      {children}
    </SearchContext.Provider>
  );
}
