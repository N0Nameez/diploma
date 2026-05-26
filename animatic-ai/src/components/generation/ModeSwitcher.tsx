interface ModeSwitcherProps {
  mode: "model" | "animation";
  onModeChange: (mode: "model" | "animation") => void;
}

export function ModeSwitcher({ mode, onModeChange }: ModeSwitcherProps) {
  return (
    <div className="inline-flex bg-background-surface border border-border rounded-[14px] p-[5px] gap-[4px] mb-8">
      <button
        onClick={() => onModeChange("model")}
        className={`px-[22px] py-[10px] rounded-[10px] text-[14px] font-semibold
                   flex items-center gap-2 transition-all duration-200
                   ${
                     mode === "model"
                       ? "bg-accent text-white shadow-[0_4px_16px_var(--accent-glow)]"
                       : "text-textSecondary hover:text-text hover:bg-background-secondary"
                   }`}
      >
        <svg
          width="15"
          height="15"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          viewBox="0 0 24 24"
        >
          <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" />
        </svg>
        3D-модель из фото
      </button>
      <button
        onClick={() => onModeChange("animation")}
        className={`px-[22px] py-[10px] rounded-[10px] text-[14px] font-semibold
                   flex items-center gap-2 transition-all duration-200
                   ${
                     mode === "animation"
                       ? "bg-accent text-white shadow-[0_4px_16px_var(--accent-glow)]"
                       : "text-textSecondary hover:text-text hover:bg-background-secondary"
                   }`}
      >
        <svg
          width="15"
          height="15"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          viewBox="0 0 24 24"
        >
          <polygon points="5 3 19 12 5 21 5 3" />
        </svg>
        Анимация из видео
      </button>
    </div>
  );
}

export default ModeSwitcher;
