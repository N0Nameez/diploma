import { Link } from "react-router-dom"

interface ButtonProps {
  label: string
  onClick?: () => void
  variant?: 'primary' | 'ghost' | 'hero-primary' | 'hero-secondary'
  href?: string
  icon?: React.ReactNode
}

const base = 'rounded-[10px] font-semibold cursor-pointer transition-all text-sm'

const variantClasses = {
  primary: 'px-5 py-2 bg-accent text-white shadow-[0_0_20px_var(--accent-glow)] hover:opacity-[0.88] hover:-translate-y-px hover:shadow-[0_4px_24px_var(--accent-glow)]',
  ghost:   'px-5 py-2 bg-transparent border border-border text-text hover:border-accent hover:bg-accentGlow',

  'hero-primary':   'px-7 py-[14px] bg-accent text-white flex items-center gap-2 shadow-[0_0_40px_var(--accent-glow)] transition-all hover:-translate-y-0.5 hover:shadow-[0_8px_40px_var(--accent-glow)]',
  'hero-secondary': 'py-[14px] px-7 bg-surface2 border border-border text-text flex items-center gap-2 transition-all hover:border-accent hover:bg-accentGlow',
}

function Button({ label, onClick, variant = 'primary', href, icon }: ButtonProps) {
  const classes = `${base} ${variantClasses[variant]}`

  const content = (
    <>
      {icon && icon}
      {label}
    </>
  )
  
  if (href) {
    return (
      <Link to={href} className="px-3 py-2 rounded-lg text-sm font-medium 
                 text-[var(--text-secondary)] 
                 hover:text-[var(--text)] hover:bg-[var(--surface2)] 
                 transition-all">
        {label}
      </Link>
    )
  }

  return <button className={classes} onClick={onClick}>{content}</button>
}

export default Button