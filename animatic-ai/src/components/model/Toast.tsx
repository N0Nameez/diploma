import { useEffect } from "react";
import { Check, AlertCircle } from "lucide-react";

interface ToastProps {
  message: string;
  isVisible: boolean;
  onClose: () => void;
  type?: "success" | "error";
}

export function Toast({ message, isVisible, onClose, type = "success" }: ToastProps) {
  useEffect(() => {
    if (isVisible) {
      const timer = setTimeout(() => {
        onClose();
      }, 2800);
      return () => clearTimeout(timer);
    }
  }, [isVisible, onClose]);

  if (!isVisible) return null;

  const isError = type === "error";

  return (
    <div
      className={`fixed bottom-7 left-1/2 -translate-x-1/2 z-[2000] px-5 py-3 font-medium text-sm rounded-xl border flex items-center gap-2 transition-all duration-300 shadow-[0_12px_40px_rgba(0,0,0,0.3)] ${
        isVisible ? "translate-y-0 opacity-100" : "translate-y-10 opacity-0"
      } ${
        isError 
          ? "bg-red-500/10 border-red-500/20 text-red-400" 
          : "bg-background-surface border-border text-text-primary"
      }`}
    >
      <span className={isError ? "text-red-500" : "text-accent"}>
        {isError ? <AlertCircle className="w-4 h-4" /> : <Check className="w-4 h-4" />}
      </span>
      <span>{message}</span>
    </div>
  );
}

export default Toast;
