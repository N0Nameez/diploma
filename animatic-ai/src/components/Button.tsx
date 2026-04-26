import React from 'react';
import { Link } from "react-router-dom";

interface ButtonProps {
  label: string;
  onClick?: () => void;
  variant?:
    | "primary"
    | "ghost"
    | "link"
    | "hero-primary"
    | "hero-secondary"
    | "filter-toggle";
  href?: string;
  icon?: React.ReactNode;
  className?: string;
  disabled?: boolean;
}

const base =
  "rounded-[10px] font-semibold cursor-pointer transition-all duration-200 text-sm inline-flex items-center justify-center";

const variantClasses = {
  primary: 'px-5 py-2 bg-btn-primary-bg text-btn-primary-text hover:bg-btn-primary-hover hover:text-text-primary shadow-[0_0_20px_var(--accent-glow)] hover:opacity-[0.88] hover:-translate-y-px hover:shadow-[0_4px_24px_var(--accent-glow)]',
  
  ghost:   'px-5 py-2 bg-transparent border border-border text-text-primary hover:border-accent hover:bg-accent-glow',
  
  link: "relative text-sm font-extralight text-text-secondary hover:text-text-primary rounded-[100px] transition-colors duration-300 font-sans after:absolute after:bottom-[-5px] after:left-0 after:w-full after:h-px after:bg-accent after:origin-left after:scale-x-0 after:transition-transform after:duration-300 hover:after:scale-x-100",
  
  "hero-primary":
    "px-7 py-[14px] bg-accent text-white flex items-center gap-2 shadow-[0_0_20px_var(--accent-glow)] transition-all duration-200 hover:-translate-y-0.5 hover:shadow-[0_8px_40px_var(--accent-glow)]",
  
  "hero-secondary":
    "py-[14px] px-7 flex items-center gap-2 transition-all duration-200 hover:-translate-y-0.5" +
    " bg-btn-secondary-bg border border-border text-text-secondary hover:border-accent hover:bg-accent-glow hover:text-text-primary",
  
  "filter-toggle":
    "px-4 py-2 bg-background-secondary border border-border text-text-secondary hover:border-accent hover:text-accent flex items-center gap-2",
};

/**
 * Reusable button component supporting multiple variants and Link routing.
 */
export function Button({
  label,
  onClick,
  variant = "primary",
  href,
  icon,
  className = "",
  disabled = false,
}: ButtonProps) {
  const classes = `${base} ${variantClasses[variant]} ${className}`;

  const content = (
    <>
      {icon && icon}
      {label}
    </>
  );

  if (href) {
    return (
      <Link to={href} className={classes}>
        {content}
      </Link>
    );
  }

  return (
    <button className={classes} onClick={onClick} disabled={disabled}>
      {content}
    </button>
  );
}
