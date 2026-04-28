import { useState, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import Section from "../components/Section";
import { Button } from "@/components/Button";
import FilterSidebar from "../components/catalog/FilterSidebar";
import ModelCard from "../components/ModelCard";
import ModelListItem from "../components/catalog/ModelListItem";
import EmptyState from "../components/catalog/EmptyState";
import Pagination from "../components/catalog/Pagination";
import { useCatalog } from "../hooks/useCatalog";

const ITEMS_PER_PAGE = 24;

/**
 * Catalog page displaying a searchable and filterable list of 3D models and animations.
 */
export function CatalogPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const {
    items,
    loading,
    filters,
    meta,
    updateFilter,
    resetFilters,
    totalCount,
  } = useCatalog();
  const [isSidebarOpen, setIsSidebarOpen] = useState(() => {
    const saved = localStorage.getItem("sidebarOpen");
    return saved !== null ? JSON.parse(saved) : true;
  });
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [currentPage, setCurrentPage] = useState(1);

  // Sync URL params with filters
  useEffect(() => {
    const content = searchParams.get("content");
    if (content === "animation") {
      updateFilter("contentType", "animation");
    } else {
      updateFilter("contentType", "3d");
    }
  }, []);

  // Sync search from navbar
  useEffect(() => {
    const search = searchParams.get("search");
    if (search) {
      updateFilter("search", search);
    }
  }, [searchParams.get("search")]);

  useEffect(() => {
    localStorage.setItem("sidebarOpen", JSON.stringify(isSidebarOpen));
  }, [isSidebarOpen]);

  useEffect(() => {
    setCurrentPage(1);
  }, [
    filters.categories,
    filters.formats,
    filters.onlyAI,
    filters.contentType,
    filters.search,
  ]);

  const totalPages = Math.ceil(totalCount / ITEMS_PER_PAGE);
  const paginatedData = items.slice(
    (currentPage - 1) * ITEMS_PER_PAGE,
    currentPage * ITEMS_PER_PAGE,
  );

  return (
    <div className="flex pt-16 min-h-screen">
      <FilterSidebar
        isOpen={isSidebarOpen}
        onClose={() => setIsSidebarOpen(false)}
        onToggle={() => setIsSidebarOpen(!isSidebarOpen)}
        contentType={filters.contentType}
        onContentTypeChange={(type) => updateFilter("contentType", type)}
        selectedCats={filters.categories}
        onCatsChange={(cats) => updateFilter("categories", cats)}
        selectedFormats={filters.formats}
        onFormatsChange={(formats) => updateFilter("formats", formats)}
        onlyAI={filters.onlyAI}
        onAIChange={(value) => updateFilter("onlyAI", value)}
      />

      <main
        className={`flex-1 px-8 py-7 min-w-0 transition-all duration-200 ${isSidebarOpen ? "lg:ml-[260px]" : ""}`}
      >
        {/* Header */}
        <div className="flex items-start justify-between mb-5 flex-wrap gap-3">
          <Section
            label="Каталог"
            title={filters.contentType === "3d" ? "3D-модели" : "Анимации"}
            sub={`Найдено ${totalCount} ${filters.contentType === "3d" ? "моделей" : "анимаций"}`}
          />

          <div className="flex items-center gap-2.5">
            <Button
              variant="filter-toggle"
              label={isSidebarOpen ? "Скрыть фильтры" : "Фильтры"}
              icon={
                <svg
                  width="16"
                  height="16"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  viewBox="0 0 24 24"
                >
                  <path d="M3 4h18M3 12h12M3 20h6" />
                </svg>
              }
              onClick={() => setIsSidebarOpen(!isSidebarOpen)}
              className="lg:flex hidden"
            />
            <Button
              variant="filter-toggle"
              label={isSidebarOpen ? "Скрыть фильтры" : "Фильтры"}
              icon={
                <svg
                  width="16"
                  height="16"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  viewBox="0 0 24 24"
                >
                  <path d="M3 4h18M3 12h12M3 20h6" />
                </svg>
              }
              onClick={() => setIsSidebarOpen(!isSidebarOpen)}
              className="lg:hidden"
            />

            <div className="flex items-center gap-2.5">
              <select
                value={filters.sort}
                onChange={(e) => updateFilter("sort", e.target.value)}
                className="px-3.5 py-2 bg-background-secondary border border-border rounded-[10px]
                           text-text-primary text-sm outline-none cursor-pointer transition-colors duration-200"
              >
                {meta.sortOptions.map((o) => (
                  <option key={o}>{o}</option>
                ))}
              </select>
              <div className="flex bg-background-secondary border border-border rounded-[10px] overflow-hidden">
                <button
                  onClick={() => setViewMode("grid")}
                  className={`w-9 h-9 flex items-center justify-center transition-all duration-200
                    ${viewMode === "grid" ? "bg-accent text-white" : "text-text-secondary hover:text-text-primary"}`}
                >
                  <svg
                    width="14"
                    height="14"
                    fill="currentColor"
                    viewBox="0 0 16 16"
                  >
                    <path d="M1 2.5A1.5 1.5 0 0 1 2.5 1h3A1.5 1.5 0 0 1 7 2.5v3A1.5 1.5 0 0 1 5.5 7h-3A1.5 1.5 0 0 1 1 5.5v-3zm8 0A1.5 1.5 0 0 1 10.5 1h3A1.5 1.5 0 0 1 15 2.5v3A1.5 1.5 0 0 1 13.5 7h-3A1.5 1.5 0 0 1 9 5.5v-3zm-8 8A1.5 1.5 0 0 1 2.5 9h3A1.5 1.5 0 0 1 7 10.5v3A1.5 1.5 0 0 1 5.5 15h-3A1.5 1.5 0 0 1 1 13.5v-3zm8 0A1.5 1.5 0 0 1 10.5 9h3a1.5 1.5 0 0 1 1.5 1.5v3a1.5 1.5 0 0 1-1.5 1.5h-3A1.5 1.5 0 0 1 9 13.5v-3z" />
                  </svg>
                </button>
                <button
                  onClick={() => setViewMode("list")}
                  className={`w-9 h-9 flex items-center justify-center transition-all duration-200
                    ${viewMode === "list" ? "bg-accent text-white" : "text-text-secondary hover:text-text-primary"}`}
                >
                  <svg
                    width="14"
                    height="14"
                    fill="currentColor"
                    viewBox="0 0 16 16"
                  >
                    <path
                      fillRule="evenodd"
                      d="M2.5 12a.5.5 0 0 1 .5-.5h10a.5.5 0 0 1 0 1H3a.5.5 0 0 1-.5-.5zm0-4a.5.5 0 0 1 .5-.5h10a.5.5 0 0 1 0 1H3a.5.5 0 0 1-.5-.5zm0-4a.5.5 0 0 1 .5-.5h10a.5.5 0 0 1 0 1H3a.5.5 0 0 1-.5-.5z"
                    />
                  </svg>
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Search indicator */}
        {filters.search && (
          <div className="mb-4 flex items-center gap-2">
            <span className="text-sm text-text-secondary">
              Результаты поиска:
            </span>
            <span className="px-3 py-1 rounded-full bg-tag-bg border border-accent/25 text-accent text-xs font-semibold">
              "{filters.search}"
            </span>
            <button
              onClick={() => {
                updateFilter("search", "");
                setSearchParams((prev) => {
                  prev.delete("search");
                  return prev;
                });
              }}
              className="text-text-secondary hover:text-text-primary text-sm ml-1"
            >
              ✕
            </button>
          </div>
        )}

        {/* Active filters */}
        {(filters.categories.length > 0 ||
          filters.formats.length > 0 ||
          filters.onlyAI) && (
          <div className="flex gap-2 flex-wrap mb-5">
            {filters.categories.map((cat) => (
              <span
                key={cat}
                className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-tag-bg border border-accent/25 text-accent text-xs font-medium"
              >
                {cat}
                <button
                  onClick={() =>
                    updateFilter(
                      "categories",
                      filters.categories.filter((c) => c !== cat),
                    )
                  }
                  className="hover:text-text"
                >
                  ×
                </button>
              </span>
            ))}
            {filters.formats.map((fmt) => (
              <span
                key={fmt}
                className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-tag-bg border border-accent/25 text-accent text-xs font-medium"
              >
                {fmt}
                <button
                  onClick={() =>
                    updateFilter(
                      "formats",
                      filters.formats.filter((f) => f !== fmt),
                    )
                  }
                  className="hover:text-text"
                >
                  ×
                </button>
              </span>
            ))}
            {filters.onlyAI && (
              <span className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-tag-bg border border-accent/25 text-accent text-xs font-medium">
                ✦ ИИ
                <button
                  onClick={() => updateFilter("onlyAI", false)}
                  className="hover:text-text"
                >
                  ×
                </button>
              </span>
            )}
            <button
              onClick={resetFilters}
              className="text-xs text-text-secondary hover:text-accent ml-2"
            >
              Сбросить все
            </button>
          </div>
        )}

        {/* Grid */}
        {loading ? (
          <div
            className="grid gap-[18px]"
            style={{
              gridTemplateColumns: "repeat(auto-fill,minmax(220px,1fr))",
            }}
          >
            {Array.from({ length: 8 }).map((_, i) => (
              <div
                key={i}
                className="bg-surface border border-border rounded-2xl overflow-hidden animate-pulse"
              >
                <div className="aspect-square bg-surface2" />
                <div className="p-3.5">
                  <div className="h-4 bg-surface2 rounded w-3/4 mb-2" />
                  <div className="h-3 bg-surface2 rounded w-1/2" />
                </div>
              </div>
            ))}
          </div>
        ) : paginatedData.length > 0 ? (
          <>
            {viewMode === "grid" ? (
              <div
                className="grid gap-[18px]"
                style={{
                  gridTemplateColumns: "repeat(auto-fill,minmax(220px,1fr))",
                }}
              >
                {paginatedData.map((m) => (
                  <ModelCard key={m.id} model={m as any} />
                ))}
              </div>
            ) : (
              <div className="flex flex-col gap-3">
                {paginatedData.map((m) => (
                  <ModelListItem key={m.id} model={m as any} />
                ))}
              </div>
            )}

            <Pagination
              currentPage={currentPage}
              totalPages={totalPages}
              onPageChange={setCurrentPage}
            />
          </>
        ) : (
          <EmptyState />
        )}
      </main>
    </div>
  );
}

