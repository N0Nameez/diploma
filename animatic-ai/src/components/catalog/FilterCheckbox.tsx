import { motion } from "framer-motion";
import { Check, Sparkles } from "lucide-react";

interface FilterCheckboxProps {
  label: string;
  count: string;
  checked: boolean;
  onChange: () => void;
  isAIGen?: boolean;
}

function FilterCheckbox({
  label,
  count,
  checked,
  onChange,
}: FilterCheckboxProps) {
  return (
    <motion.div
      onClick={onChange}
      whileHover={{ x: 2 }}
      whileTap={{ scale: 0.98 }}
      className={`group flex items-center justify-between px-3 py-2.5 rounded-xl cursor-pointer 
                  transition-all duration-300 mb-1 ${
                    checked 
                      ? "bg-accent/10 border border-accent/20" 
                      : "hover:bg-background-secondary border border-transparent"
                  }`}
    >
      <div className="flex items-center gap-3">
        <div
          className={`w-5 h-5 rounded-lg flex items-center justify-center flex-shrink-0 
                         border transition-all duration-300 ${
                           checked
                             ? "bg-accent border-accent shadow-lg shadow-accent/25"
                             : "bg-background-secondary border-border group-hover:border-accent/40"
                         }`}
        >
          {checked && (
            <motion.div
              initial={{ scale: 0, rotate: -45 }}
              animate={{ scale: 1, rotate: 0 }}
            >
              <Check className="text-white w-3.5 h-3.5" strokeWidth={3} />
            </motion.div>
          )}
        </div>
        <span className={`text-sm font-medium transition-colors duration-300 flex items-center gap-2 ${
          checked ? "text-text-primary" : "text-text-secondary group-hover:text-text-primary"
        }`}>
          {label}
        </span>
      </div>
      <span
        className={`text-[10px] font-bold px-2 py-0.5 rounded-full transition-all duration-300 ${
          checked 
            ? "bg-accent text-white" 
            : "bg-background-surface text-text-muted group-hover:bg-border/20 group-hover:text-text-secondary"
        }`}
      >
        {count}
      </span>
    </motion.div>
  );
}

export default FilterCheckbox;
