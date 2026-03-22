import { Link } from "react-router-dom"

interface ButtonProps {
  label: string
  onClick?: () => void
  variant?: 'primary' | 'ghost' | 'link' | 'hero-primary' | 'hero-secondary' | 'filter-toggle'
  href?: string
  icon?: React.ReactNode
  className?: string
}

const base = 'rounded-[10px] font-semibold cursor-pointer transition-all text-sm'

const variantClasses = {
  primary: 'px-5 py-2 bg-accent text-white shadow-[0_0_20px_var(--accent-glow)] hover:opacity-[0.88] hover:-translate-y-px hover:shadow-[0_4px_24px_var(--accent-glow)]',
  ghost:   'px-5 py-2 bg-transparent border border-border text-text hover:border-accent hover:bg-accentGlow',
  link: 'px-3 py-2 rounded-lg text-sm font-medium text-textSecondary hover:text-text hover:bg-surface2 transition-all',
  'hero-primary':   'px-7 py-[14px] bg-accent text-white flex items-center gap-2 shadow-[0_0_40px_var(--accent-glow)] transition-all hover:-translate-y-0.5 hover:shadow-[0_8px_40px_var(--accent-glow)]',
  'hero-secondary': 'py-[14px] px-7 bg-surface2 border border-border text-text flex items-center gap-2 transition-colors duration-[0.2s] hover:border-accent hover:bg-accentGlow',
  'filter-toggle': 'px-4 py-2 bg-surface2 border border-border text-textSecondary hover:border-accent hover:text-accent flex items-center gap-2',
}

function Button({ label, onClick, variant = 'primary', href, icon, className = '' }: ButtonProps) {
  const classes = `${base} ${variantClasses[variant]} ${className}`

  const content = (
    <>
      {icon && icon}
      {label}
    </>
  )
  
  if (href) {
    return (
      <Link to={href} className={classes}>
        {content}
      </Link>
    )
  }

  return <button className={classes} onClick={onClick}>{content}</button>
}

export default Button