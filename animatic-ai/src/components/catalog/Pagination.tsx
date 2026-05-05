interface PaginationProps {
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
}

function Pagination({
  currentPage,
  totalPages,
  onPageChange,
}: PaginationProps) {
  if (totalPages <= 1) return null;

  const getVisiblePages = (): (number | "...")[] => {
    const delta = 2;
    const range: number[] = [];
    const rangeWithDots: (number | "...")[] = [];
    let l: number | undefined;

    range.push(1);

    for (let i = currentPage - delta; i <= currentPage + delta; i++) {
      if (i > 1 && i < totalPages) {
        range.push(i);
      }
    }

    range.push(totalPages);

    const uniqueRange = [...new Set(range)].sort((a, b) => a - b);

    for (const i of uniqueRange) {
      if (l !== undefined) {
        if (i - l === 2) {
          rangeWithDots.push(l + 1);
        } else if (i - l !== 1) {
          rangeWithDots.push("...");
        }
      }
      rangeWithDots.push(i);
      l = i;
    }

    return rangeWithDots;
  };

  const visiblePages = getVisiblePages();

  return (
    <div className="flex items-center justify-center gap-1.5 mt-8">
      {/* Prev */}
      <button
        onClick={() => onPageChange(currentPage - 1)}
        disabled={currentPage === 1}
        className="w-9 h-9 flex items-center justify-center rounded-lg
                   bg-background-secondary border border-border
                   text-textSecondary text-sm font-medium
                   disabled:opacity-40 disabled:cursor-not-allowed
                   hover:border-accent hover:text-accent transition-all duration-200"
      >
        <svg
          width="16"
          height="16"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          viewBox="0 0 24 24"
        >
          <path d="M15 18l-6-6 6-6" />
        </svg>
      </button>

      {/* Pages */}
      {visiblePages.map((page, idx) =>
        page === "..." ? (
          <span
            key={`dots-${idx}`}
            className="w-9 h-9 flex items-center justify-center text-textSecondary"
          >
            ...
          </span>
        ) : (
          <button
            key={page}
            onClick={() => onPageChange(page)}
            className={`w-9 h-9 flex items-center justify-center rounded-lg text-sm font-medium
                        border transition-all duration-200
                        ${
                          currentPage === page
                            ? "bg-accent border-accent text-white"
                            : "bg-background-secondary border-border text-textSecondary hover:border-accent hover:text-accent"
                        }`}
          >
            {page}
          </button>
        ),
      )}

      {/* Next */}
      <button
        onClick={() => onPageChange(currentPage + 1)}
        disabled={currentPage === totalPages}
        className="w-9 h-9 flex items-center justify-center rounded-lg
                   bg-background-secondary border border-border
                   text-textSecondary text-sm font-medium
                   disabled:opacity-40 disabled:cursor-not-allowed
                   hover:border-accent hover:text-accent transition-all duration-200"
      >
        <svg
          width="16"
          height="16"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          viewBox="0 0 24 24"
        >
          <path d="M9 18l6-6-6-6" />
        </svg>
      </button>
    </div>
  );
}

export default Pagination;
