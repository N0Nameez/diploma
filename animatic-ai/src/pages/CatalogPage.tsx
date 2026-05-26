import { useState, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/Button";
import FilterSidebar from "../components/catalog/FilterSidebar";
import ModelCard from "../components/ModelCard";
import ModelListItem from "../components/catalog/ModelListItem";
import EmptyState from "../components/catalog/EmptyState";
import Pagination from "../components/catalog/Pagination";
import { useCatalog } from "../hooks/useCatalog";
import { Search, Grid, List, X, Filter as FilterIcon } from "lucide-react";

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
    stats,
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
  const [searchTerm, setSearchTerm] = useState(filters.search);

  // Sync searchTerm with filters.search (e.g. when cleared from indicator)
  useEffect(() => {
    setSearchTerm(filters.search);
  }, [filters.search]);

  // Debounced search update
  useEffect(() => {
    const timer = setTimeout(() => {
      if (searchTerm !== filters.search) {
        updateFilter("search", searchTerm);
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [searchTerm, updateFilter, filters.search]);

  // Sync URL params with filters
  useEffect(() => {
    const content = searchParams.get("content");
    if (content === "animation" && filters.contentType !== "animation") {
      updateFilter("contentType", "animation");
    } else if (content === "3d" && filters.contentType !== "3d") {
      updateFilter("contentType", "3d");
    }
  }, [searchParams]);

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

  const gridVariants = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: {
        staggerChildren: 0.05
      }
    }
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    show: { opacity: 1, y: 0 }
  };

  return (
    <div className="flex min-h-screen bg-background-primary">
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
        stats={stats}
      />

      <main
        className={`flex-1 min-w-0 transition-all duration-500 ease-in-out ${
          isSidebarOpen ? "lg:ml-[260px]" : "lg:ml-0"
        }`}
      >
        <div className="px-6 lg:px-10 py-24">
          {/* Header */}
          <div className="flex items-start justify-between mb-8 flex-wrap gap-6">
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              className="flex-1"
            >
              <h1 className="text-[clamp(28px,3.5vw,42px)] font-extrabold tracking-[-1.5px] mb-2 leading-[1.1] text-text-primary">
                {filters.contentType === "animation" ? "Каталог анимаций" : "Каталог 3D-моделей"}
              </h1>
              <p className="text-sm text-text-secondary font-light mb-6">
                Найдено {totalCount} {filters.contentType === "3d" ? "моделей" : "анимаций"}
              </p>

              <div className="relative max-w-xl group">
                <Search 
                  size={20} 
                  className="absolute left-4 top-1/2 -translate-y-1/2 text-text-muted group-focus-within:text-accent transition-colors" 
                />
                <input
                  type="text"
                  placeholder="Поиск по названию или описанию..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-12 pr-4 py-3.5 bg-background-secondary border border-border/50 rounded-2xl
                             text-text-primary text-base outline-none transition-all duration-300
                             hover:border-accent/30 focus:border-accent focus:bg-background-surface
                             shadow-sm focus:shadow-lg focus:shadow-accent/5"
                />
              </div>
            </motion.div>

            <div className="flex items-center gap-3">
              <Button
                variant="filter-toggle"
                label={isSidebarOpen ? "Скрыть фильтры" : "Фильтры"}
                icon={<FilterIcon size={16} />}
                onClick={() => setIsSidebarOpen(!isSidebarOpen)}
                className="hidden lg:flex"
              />
              <Button
                variant="filter-toggle"
                label="Фильтры"
                icon={<FilterIcon size={16} />}
                onClick={() => setIsSidebarOpen(true)}
                className="lg:hidden"
              />

              <div className="h-8 w-px bg-border/20 mx-1 hidden sm:block" />

              <div className="flex items-center gap-3">
                <select
                  value={filters.sort}
                  onChange={(e) => updateFilter("sort", e.target.value)}
                  className="px-4 py-2 bg-background-secondary border border-border/50 rounded-xl
                             text-text-primary text-sm outline-none cursor-pointer transition-all duration-300
                             hover:border-accent/40 focus:border-accent"
                >
                  {meta.sortOptions.map((o) => (
                    <option key={o} value={o}>{o}</option>
                  ))}
                </select>

                <div className="flex bg-background-secondary p-1 border border-border/50 rounded-xl overflow-hidden">
                  <button
                    onClick={() => setViewMode("grid")}
                    className={`w-9 h-9 flex items-center justify-center rounded-lg transition-all duration-300
                      ${viewMode === "grid" ? "bg-accent text-white shadow-lg shadow-accent/20" : "text-text-secondary hover:text-text-primary"}`}
                  >
                    <Grid size={18} />
                  </button>
                  <button
                    onClick={() => setViewMode("list")}
                    className={`w-9 h-9 flex items-center justify-center rounded-lg transition-all duration-300
                      ${viewMode === "list" ? "bg-accent text-white shadow-lg shadow-accent/20" : "text-text-secondary hover:text-text-primary"}`}
                  >
                    <List size={18} />
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Search indicator */}
          <AnimatePresence>
            {filters.search && (
              <motion.div 
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                className="mb-6 flex items-center gap-3 bg-accent/5 border border-accent/10 px-4 py-3 rounded-2xl"
              >
                <Search size={16} className="text-accent" />
                <span className="text-sm text-text-secondary">
                  Результаты для: <span className="text-text-primary font-bold italic">"{filters.search}"</span>
                </span>
                <button
                  onClick={() => {
                    updateFilter("search", "");
                    setSearchParams((prev) => {
                      prev.delete("search");
                      return prev;
                    });
                  }}
                  className="p-1 rounded-full hover:bg-accent/10 text-accent transition-colors ml-auto"
                >
                  <X size={14} />
                </button>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Active filters */}
          <AnimatePresence>
            {filters.contentType === "3d" && (filters.categories.length > 0 ||
              filters.formats.length > 0 ||
              filters.onlyAI) && (
              <motion.div 
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex gap-2 flex-wrap mb-8"
              >
                {filters.categories.map((cat) => (
                  <span
                    key={cat}
                    className="flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-accent/10 border border-accent/20 text-accent text-xs font-bold"
                  >
                    {cat}
                    <button
                      onClick={() =>
                        updateFilter(
                          "categories",
                          filters.categories.filter((c) => c !== cat),
                        )
                      }
                      className="hover:bg-accent/20 rounded-full p-0.5"
                    >
                      <X size={12} />
                    </button>
                  </span>
                ))}
                {filters.formats.map((fmt) => (
                  <span
                    key={fmt}
                    className="flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-accent/10 border border-accent/20 text-accent text-xs font-bold"
                  >
                    {fmt}
                    <button
                      onClick={() =>
                        updateFilter(
                          "formats",
                          filters.formats.filter((f) => f !== fmt),
                        )
                      }
                      className="hover:bg-accent/20 rounded-full p-0.5"
                    >
                      <X size={12} />
                    </button>
                  </span>
                ))}
                {filters.onlyAI && (
                  <span className="flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-accent/20 border border-accent/30 text-accent text-xs font-bold shadow-sm shadow-accent/5">
                    ✦ ИИ
                    <button
                      onClick={() => updateFilter("onlyAI", false)}
                      className="hover:bg-accent/30 rounded-full p-0.5"
                    >
                      <X size={12} />
                    </button>
                  </span>
                )}
                <button
                  onClick={resetFilters}
                  className="text-xs font-bold text-text-muted hover:text-accent transition-colors ml-2 flex items-center gap-1"
                >
                  Сбросить всё
                </button>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Grid / List */}
          <AnimatePresence mode="wait">
            {loading ? (
              <motion.div
                key="loading"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="grid gap-[24px]"
                style={{
                  gridTemplateColumns: "repeat(auto-fill,minmax(240px,1fr))",
                }}
              >
                {Array.from({ length: 12 }).map((_, i) => (
                  <div
                    key={i}
                    className="bg-background-secondary border border-border/40 rounded-2xl overflow-hidden animate-pulse h-[340px]"
                  >
                    <div className="aspect-square bg-background-surface/50" />
                    <div className="p-4 space-y-3">
                      <div className="h-4 bg-background-surface/50 rounded w-3/4" />
                      <div className="h-3 bg-background-surface/50 rounded w-1/2" />
                    </div>
                  </div>
                ))}
              </motion.div>
            ) : paginatedData.length > 0 ? (
              <motion.div
                key="content"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
              >
                {viewMode === "grid" ? (
                  <motion.div
                    variants={gridVariants}
                    initial="hidden"
                    animate="show"
                    className="grid gap-[24px]"
                    style={{
                      gridTemplateColumns: "repeat(auto-fill,minmax(240px,1fr))",
                    }}
                  >
                    {paginatedData.map((m) => (
                      <motion.div key={m.id} variants={itemVariants}>
                        <ModelCard model={m as any} type={filters.contentType} />
                      </motion.div>
                    ))}
                  </motion.div>
                ) : (
                  <motion.div 
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="flex flex-col gap-4"
                  >
                    {paginatedData.map((m) => (
                      <ModelListItem key={m.id} model={m as any} type={filters.contentType} />
                    ))}
                  </motion.div>
                )}

                <Pagination
                  currentPage={currentPage}
                  totalPages={totalPages}
                  onPageChange={setCurrentPage}
                />
              </motion.div>
            ) : (
              <motion.div
                key="empty"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
              >
                <EmptyState />
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </main>
    </div>
  );
}


