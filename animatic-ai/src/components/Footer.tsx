import { Link } from "react-router-dom";

const LINKS = {
  "Продукт": [
    { label: "3D-модели", href: "/models" },
    { label: "Анимации", href: "/animations" },
    { label: "Генерация", href: "/generation" },
    { label: "Каталог", href: "/models" },
  ],
  "Разработчикам": [
    { label: "Документация", href: "#" },
    { label: "API", href: "#" },
    { label: "SDK", href: "#" },
    { label: "Статус", href: "#" },
  ],
  "Компания": [
    { label: "О нас", href: "#" },
    { label: "Блог", href: "#" },
    { label: "Карьера", href: "#", badge: "Hiring" },
    { label: "Контакты", href: "#" },
  ],
  "Правовая информация": [
    { label: "Конфиденциальность", href: "#" },
    { label: "Условия", href: "#" },
    { label: "Безопасность", href: "#" },
  ],
};

function Footer() {
  return (
    <footer className="pt-20 px-10 pb-10 border-t border-border-default">
      <div className="w-full max-w-[1280px] mx-auto mb-20 rounded-[24px] overflow-hidden opacity-60 border border-border-default">
        <img src="/images/footer-garden.jpg" alt="" className="w-full h-auto block" />
      </div>

      <div className="max-w-[1280px] mx-auto grid grid-cols-1 lg:grid-cols-[2fr_repeat(4,1fr)] gap-10 mb-20">
        <div className="footer-brand">
          <div className="font-tight text-[18px] font-bold text-white tracking-[-0.5px] mb-4 flex items-center gap-1">
            AnimaticAI<span className="text-[10px] opacity-50 font-medium">TM</span>
          </div>
          <p className="text-[14px] font-light text-text-muted leading-[1.6] max-w-[260px]">
            Платформа для генерации, анимации и публикации 3D-моделей с помощью искусственного интеллекта.
          </p>
          <div className="flex gap-4 mt-6">
            <a href="#" className="text-[13px] font-normal text-text-muted no-underline transition-colors duration-200 hover:text-white">Twitter</a>
            <a href="#" className="text-[13px] font-normal text-text-muted no-underline transition-colors duration-200 hover:text-white">GitHub</a>
            <a href="#" className="text-[13px] font-normal text-text-muted no-underline transition-colors duration-200 hover:text-white">LinkedIn</a>
          </div>
        </div>

        {Object.entries(LINKS).map(([category, links]) => (
          <div key={category} className="footer-col">
            <h4 className="text-[13px] font-medium text-white mb-5">{category}</h4>
            <ul className="list-none flex flex-col gap-3">
              {links.map((link) => (
                <li key={link.label}>
                  <Link
                    to={link.href}
                    className="text-[14px] font-light text-text-muted no-underline transition-colors duration-200 flex items-center gap-2 hover:text-white"
                  >
                    {link.label}
                    {link.badge && (
                      <span className="py-0.5 px-2 bg-white text-black text-[10px] font-semibold rounded-full tracking-[0.5px]">
                        {link.badge}
                      </span>
                    )}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>

      <div className="max-w-[1280px] mx-auto pt-8 border-t border-border-default flex justify-between items-center flex-wrap gap-4">
        <div className="font-mono text-[12px] font-normal text-text-disabled tracking-[0.5px]">
          © 2025 AnimaticAI. Все права защищены.
        </div>
        <div className="font-mono text-[12px] font-normal text-text-muted tracking-[0.5px] flex items-center gap-2 before:content-[''] before:w-1.5 before:h-1.5 before:rounded-full before:bg-[#EC4899] before:animate-pulse-status">
          Система работает стабильно
        </div>
      </div>
    </footer>
  );
}

export default Footer;
