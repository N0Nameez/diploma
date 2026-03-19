import Section from "../Section"
import Slider from "../Slider"
import type { SliderItem } from "../Slider"

function CategoriesSection() {
  const categories: SliderItem[] = [
    {
      id: 'film', icon: '🎬', label: 'Кинопроизводство',
      gradient: 'linear-gradient(135deg, #1a3a5c, #0a1f3d)',
      content: { title: '3D для кино и VFX', description: 'Создавайте реалистичные модели персонажей, окружения и реквизита для фильмов и сериалов.', features: ['Быстрый прототипинг', 'PBR текстуры', 'Экспорт в FBX/OBJ'], cta: { label: 'Смотреть примеры', onClick: () => console.log('film') } }
    },
    {
      id: 'product', icon: '🔧', label: 'Дизайн продукта',
      gradient: 'linear-gradient(135deg, #1a2a4a, #0d2040)',
      content: { title: 'Промышленный дизайн', description: 'Визуализируйте продукты до производства. Идеально для презентаций и краудфандинга.', features: ['Точные размеры', 'Реалистичные материалы', 'Анимация сборки'], cta: { label: 'Начать проект', onClick: () => console.log('product') } }
    },
    {
      id: 'education', icon: '🎓', label: 'Образование',
      gradient: 'linear-gradient(135deg, #2a1a4a, #1a0d38)',
      content: { title: 'Обучающий контент', description: 'Создавайте интерактивные 3D-модели для учебных материалов и онлайн-курсов.', features: ['Интерактивность', 'Аннотации', 'Мультиязычность'], cta: { label: 'Для преподавателей', onClick: () => console.log('education') } }
    },
    {
      id: 'games', icon: '🎮', label: 'Разработка игр',
      gradient: 'linear-gradient(135deg, #1a3a2a, #0d2a18)',
      content: { title: 'Геймдев ассеты', description: 'Готовые модели для Unity и Unreal Engine. Оптимизированные меши и текстуры.', features: ['Low-poly модели', 'Ready для движков', 'LOD системы'], cta: { label: 'Библиотека ассетов', onClick: () => console.log('games') } }
    },
    {
      id: 'printing', icon: '🖨️', label: '3D-печать',
      gradient: 'linear-gradient(135deg, #3a2a1a, #2a1a0d)',
      content: { title: 'Модели для печати', description: 'Подготовленные к печати модели с проверкой на ошибки и поддержками.', features: ['STL экспорт', 'Проверка геометрии', 'Оптимальная ориентация'], cta: { label: 'Загрузить модель', onClick: () => console.log('printing') } }
    },
    {
      id: 'vr', icon: '🥽', label: 'VR / AR',
      gradient: 'linear-gradient(135deg, #3a1a1a, #2a0d0d)',
      content: { title: 'Иммерсивный опыт', description: 'Создавайте контент для виртуальной и дополненной реальности.', features: ['Оптимизация FPS', 'VR-ready', 'AR маркеры'], cta: { label: 'VR демо', onClick: () => console.log('vr') } }
    },
    {
      id: 'interior', icon: '🛋️', label: 'Интерьерный дизайн',
      gradient: 'linear-gradient(135deg, #1a1a3a, #0d0d2a)',
      content: { title: 'Визуализация интерьеров', description: 'Быстрое создание мебели и декора для архитектурных визуализаций.', features: ['PBR материалы', 'Световые сцены', 'Экспорт в 3ds Max'], cta: { label: 'Каталог мебели', onClick: () => console.log('interior') } }
    },
  ]

  return (
    <>
      <Section label="Категории" title="Погрузись в мир 3D" />
      <Slider items={categories} />
    </>
  )
}

export default CategoriesSection