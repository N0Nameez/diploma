import Section from "../Section"
import FeatureCard from "./FeatureCard"

const FEATURES = [
  {
    icon: '📸',
    iconBg: 'rgba(27,110,243,0.15)',
    title: 'Генерация 3D из фото',
    desc: 'Загрузи одно фото — ИИ создаст полноценную 3D-модель персонажа. Поддержка GLB, FBX, OBJ.',
    tags: ['GLB', 'FBX', 'OBJ'],
    tagColor: 'var(--accent)',
    tagBg: 'rgba(27,110,243,0.1)',
    glowColor: 'var(--accent)',
    glowPos: '',
    large: true,
  },
  {
    icon: '🎥',
    iconBg: 'rgba(124,58,237,0.15)',
    title: 'Анимация из видео',
    desc: 'Загрузи видео с движением — ИИ перенесёт его на твою 3D-модель.',
    tags: [],
    tagColor: '',
    tagBg: '',
    glowColor: 'var(--accent2)',
    glowPos: 'top-0 left-0',
    large: false,
  },
  {
    icon: '🌐',
    iconBg: 'rgba(16,185,129,0.15)',
    title: 'Публикация и каталог',
    desc: 'Делись моделями с сообществом, получай лайки, комментарии и подписчиков.',
    tags: [],
    tagColor: '',
    tagBg: '',
    glowColor: '#10B981',
    glowPos: 'top-0 right-0',
    large: false,
  },
  {
    icon: '✨',
    iconBg: 'rgba(245,158,11,0.15)',
    title: 'Рекомендации',
    desc: 'Персонализированная лента на основе твоих предпочтений. Алгоритм учится вместе с тобой.',
    tags: [],
    tagColor: '',
    tagBg: '',
    glowColor: '#F59E0B',
    glowPos: 'bottom-0 left-0',
    large: false,
  },
  {
    icon: '🔒',
    iconBg: 'rgba(239,68,68,0.12)',
    title: 'Модерация',
    desc: 'Все публикуемые модели проходят проверку. Безопасная среда для всего сообщества.',
    tags: [],
    tagColor: '',
    tagBg: '',
    glowColor: '#EF4444',
    glowPos: 'bottom-0 right-0',
    large: false,
  },
]

export function FeaturesSection() {
  return (
    <section className="py-20 max-w-7xl mx-auto">
      {/* Header */}
      <div className="mb-12">
        <Section
          label="Возможности ИИ"
          title="Всё нужное — в одном месте"
          sub="Генерация, анимация и публикация. Все в одном месте."
        />
      </div>

      {/* Grid */}
      <div className="grid grid-cols-2 gap-5">
        {FEATURES.map((feature) => (
          <FeatureCard key={feature.title} {...feature} />
        ))}
      </div>
    </section>
  )
}

export default FeaturesSection