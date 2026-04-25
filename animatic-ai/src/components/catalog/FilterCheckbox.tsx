import { Check } from "lucide-react";

interface FilterCheckboxProps {
  label: string;
  count: string;
  checked: boolean;
  onChange: () => void;
}

function FilterCheckbox({
  label,
  count,
  checked,
  onChange,
}: FilterCheckboxProps) {
  return (
    <div
      onClick={onChange}
      className={`flex items-center justify-between px-2.5 py-2 rounded-lg cursor-pointer 
                  transition-colors duration-200 mb-0.5 ${checked ? "bg-tagBg" : "hover:bg-surface2"}`}
    >
      <div className="flex items-center gap-2.5">
        <div
          className={`w-4 h-4 rounded flex items-center justify-center flex-shrink-0 
                         border transition-all duration-200 ${
                           checked
                             ? "bg-accent border-accent"
                             : "bg-surface2 border-border"
                         }`}
        >
          {checked && <Check className="text-white w-3 h-3" />}
        </div>
        <span className="text-sm text-text">{label}</span>
      </div>
      <span
        className="text-[11px] text-textSecondary 
                       bg-surface2 px-1.5 py-0.5 rounded-lg"
      >
        {count}
      </span>
    </div>
  );
}

export default FilterCheckbox;
