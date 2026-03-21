import { Link } from 'react-router-dom'

const LINKS = {
  'Продукт': [
    { label: '3D-модели', href: '/models' },
    { label: 'Анимации', href: '/animations' },
    { label: 'Генерация', href: '/generation' },
    { label: 'Каталог', href: '/models' },
  ],
  'Компания': [
    { label: 'О нас', href: '#' },
    { label: 'Блог', href: '#' },
    { label: 'Карьера', href: '#' },
    { label: 'Контакты', href: '#' },
  ],
  'Поддержка': [
    { label: 'Документация', href: '#' },
    { label: 'FAQ', href: '#' },
    { label: 'Сообщество', href: '#' },
    { label: 'Статус', href: '#' },
  ],
}

function Footer() {
  return (
    <footer className="bg-surface border-t border-border transition-colors duration-200">
      <div className="max-w-7xl mx-auto py-12">

        {/* Top */}
        <div className="flex flex-wrap gap-10 justify-between mb-10">

          {/* Brand */}
          <div className="max-w-[260px]">
            <Link to="/" className="
              font-extrabold text-xl text-accent
              tracking-[-0.5px] no-underline
            ">
              AnimaticAI
            </Link>
            <p className="text-sm text-textSecondary font-light leading-relaxed mt-3">
              Платформа для генерации, анимации и публикации
              3D-моделей с помощью искусственного интеллекта.
            </p>
          </div>

          {/* Link columns */}
          <div className="flex flex-wrap gap-12">
            {Object.entries(LINKS).map(([category, links]) => (
              <div key={category}>
                <div className="
                  text-[11px] font-bold tracking-[1.5px]
                  uppercase text-textSecondary mb-4
                ">
                  {category}
                </div>
                <ul className="flex flex-col gap-2.5">
                  {links.map(link => (
                    <li key={link.label}>
                      <Link
                        to={link.href}
                        className="
                          text-sm text-textSecondary no-underline
                          hover:text-accent transition-colors duration-200
                        "
                      >
                        {link.label}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>

        {/* Divider */}
        <div className="h-px bg-border mb-6" />

        {/* Bottom */}
        <div className="flex flex-wrap items-center justify-between gap-4">
          <span className="text-xs text-textSecondary">
            © 2025 AnimaticAI. Все права защищены.
          </span>
          <div className="flex gap-5">
            <Link to="#" className="text-xs text-textSecondary hover:text-accent transition-colors duration-200 no-underline">
              Конфиденциальность
            </Link>
            <Link to="#" className="text-xs text-textSecondary hover:text-accent transition-colors duration-200 no-underline">
              Условия использования
            </Link>
          </div>
        </div>

      </div>
    </footer>
  )
}

export default Footer