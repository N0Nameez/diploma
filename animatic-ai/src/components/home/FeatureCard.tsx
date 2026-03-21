interface FeatureCardProps {
  icon: string
  iconBg: string
  title: string
  desc: string
  tags?: string[]
  tagColor?: string
  tagBg?: string
  glowColor: string
  glowPos: string
  large?: boolean
}

export function FeatureCard({
  icon,
  iconBg,
  title,
  desc,
  tags = [],
  tagColor,
  tagBg,
  glowColor,
  glowPos,
  large = false,
}: FeatureCardProps) {
  return (
    <div
      className={`p-8 rounded-[20px] bg-surface border border-border relative overflow-hidden
                 transition-all duration-200 hover:-translate-y-1 hover:border-accent
                 ${large ? 'col-span-2 grid grid-cols-2 gap-8 items-center' : ''}`}
    >
      {/* Glow */}
      <div
        className={`absolute w-48 h-48 rounded-full opacity-15 blur-[60px] pointer-events-none
                    ${glowPos.includes('bottom') ? '-bottom-10' : 'top-0'} 
                    ${glowPos.includes('right') ? 'right-0' : '-left-10'}`}
        style={{ background: glowColor }}
      />

      {/* Content */}
      <div className={large ? '' : ''}>
        <div
          className="w-[52px] h-[52px] rounded-[14px] flex items-center justify-center text-2xl mb-5"
          style={{ background: iconBg }}
        >
          {icon}
        </div>

        <h3
          className={`font-extrabold tracking-tight mb-2.5 ${
            large ? 'text-xl' : 'text-lg'
          }`}
        >
          {title}
        </h3>

        <p className="text-sm text-textSecondary font-light leading-[1.65] mb-5">
          {desc}
        </p>

        {/* Tags - only big card */}
        {large && tags.length > 0 && (
          <div className="flex gap-2 flex-wrap">
            {tags.map((t) => (
              <span
                key={t}
                className="px-3 py-1 rounded-md text-xs font-bold border"
                style={{
                  background: tagBg || 'rgba(27,110,243,0.1)',
                  color: tagColor || 'var(--accent)',
                  borderColor: `${tagColor || 'var(--accent)'}33`,
                }}
              >
                {t}
              </span>
            ))}
          </div>
        )}
      </div>

      {/* Right part - only big card */}
      {large && (
        <div
          className="rounded-[14px] overflow-hidden aspect-video bg-surface2 flex items-center
                     justify-center text-[80px] opacity-60 transition-color duration-200"
        >
          🤖
        </div>
      )}
    </div>
  )
}

export default FeatureCard