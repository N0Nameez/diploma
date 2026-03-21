import Button from "./Button";
import { Link } from "react-router-dom";

interface NavbarProps {
    links: { label: string; href: string }[]
    onThemeToggle: () => void
    onLoginClick: () => void
    onRegisterClick: () => void 
}

function Navbar({ links, onThemeToggle, onLoginClick, onRegisterClick}: NavbarProps) {

    return(
        <nav className="fixed top-0 left-0 right-0 z-50 h-16
                bg-navBg backdrop-blur-lg
                border-b border-border
                flex items-center px-8 gap-8
                transition-colors duration-[0.2s]">
            
            <Link to="/" className="font-extrabold text-[24px] text-accent
            tracking-[-0.5px] shrink-0">AnimaticAI</Link>

            <div className="flex gap-1">
                {links.map((link) => (
                    <Button key={link.href} label={link.label} href={link.href} variant="link"></Button>
                ))}
            </div>

            <div className="flex-1 max-w-[380px] relative">
                <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"
                className="absolute left-3 top-2/4 -translate-y-1/2 opacity-40 text-textSecondary">
                    <circle cx="11" cy="11" r="8"/>
                    <path d="m21 21-4.35-4.35"/>
                </svg>

                <input className="w-full pt-2 pr-4 pb-2 pl-10 border
                bg-surface2 border-border rounded-[10px]
                text-text text-[14px] outline-none transition-colors duration-[0.2s]
                focus:border-accent placeholder-textSecondary " placeholder="Поиск моделей, анимаций, авторов" />
            </div>

            <div className="ml-auto flex items-center gap-5">
                <button onClick={onThemeToggle} className="w-9 h-9 bg-surface2 border border-border
                rounded-[10px] cursor-pointer flex items-center justify-center transition-all
                text-textSecondary hover:bg-surface hover:text-accent">
                    {<svg id="themeIcon" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                        <circle cx="12" cy="12" r="5"/>
                        <path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42"/>
                    </svg>}
                </button>

                <Button label="Войти" variant="ghost" onClick={onLoginClick} />
                <Button label="Регистрация" variant="primary" onClick={onRegisterClick} />
            </div>
        </nav>
    )
}

export default Navbar