import { useEffect, useState } from "react";
import { Check } from "lucide-react";

interface ToastProps {
  message: string;
  isVisible: boolean;
  onClose: () => void;
}

export function Toast({ message, isVisible, onClose }: ToastProps) {
  useEffect(() => {
    if (isVisible) {
      const timer = setTimeout(() => {
        onClose();
      }, 2800);
      return () => clearTimeout(timer);
    }
  }, [isVisible, onClose]);

  if (!isVisible) return null;

  return (
    <div
      className={`fixed bottom-7 left-1/2 -translate-x-1/2 z-[2000] bg-background-surface border border-border rounded-xl px-5 py-3 font-medium text-sm shadow-[0_12px_40px_rgba(0,0,0,0.3)] flex items-center gap-2 transition-all duration-300 ${
        isVisible ? "translate-y-0 opacity-100" : "translate-y-10 opacity-0"
      }`}
    >
      <span className="text-accent">
        <Check className="w-4 h-4" />
      </span>
      <span>{message}</span>
    </div>
  );
}

export default Toast;
