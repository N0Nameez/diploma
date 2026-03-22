interface EmptyStateProps {
  title?: string
  subtitle?: string
  icon?: string
}

function EmptyState({ 
  title = 'Ничего не найдено', 
  subtitle = 'Попробуй изменить фильтры',
  icon = '🔍'
}: EmptyStateProps = {}) {
  return (
    <div className="flex flex-col items-center justify-center py-20 text-[var(--text-secondary)]">
      <div className="text-5xl mb-4 opacity-50">{icon}</div>
      <div className="font-['Exo_2'] text-xl font-bold text-[var(--text)] mb-2">
        {title}
      </div>
      <div className="text-sm font-light">
        {subtitle}
      </div>
    </div>
  )
}

export default EmptyState