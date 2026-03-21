import { useState } from 'react'

export interface SliderItem {
  id: string
  icon: string
  label: string
  gradient: string
  cardImage?: string
  content: {
    title: string
    description: string
    features?: string[]
    image?: string
    cta?: {
      label: string
      onClick: () => void
    }
  }
}

interface SliderProps {
  items: SliderItem[]
}

function Slider({ items }: SliderProps) {
  const [activeIndex, setActiveIndex] = useState(0)

  return (
    <div className="w-full px-0 max-w-7xl mx-auto">

      {/* Cards */}
      <div className="flex gap-4 justify-center overflow-x-auto pb-16 pt-3 scrollbar-hide">
        {items.map((item, index) => {
          const isActive = activeIndex === index

          return (
            <button
              key={item.id}
              onClick={() => setActiveIndex(index)}
              onMouseEnter={() => setActiveIndex(index)}
              className="relative flex-shrink-0 w-[160px] h-[180px]"
            >
              {/* Image */}
              <div className={`
                absolute left-1/2 -translate-x-1/2
                flex items-center justify-center
                transition-all duration-500 ease-out z-30
                ${isActive
                  ? '-top-5 w-[130px] h-[130px] text-[110px]'
                  : 'top-7 w-[90px] h-[90px] text-[72px]'
                }
              `}>
                {item.cardImage
                  ? <img src={item.cardImage} alt={item.label}
                         className="w-full h-full object-contain drop-shadow-2xl" />
                  : item.icon
                }
              </div>

              {/* Card bg */}
              <div
                className={`
                  absolute bottom-0 left-0 right-0
                  rounded-[20px] overflow-hidden transition-all duration-500
                  ${isActive
                    ? 'shadow-[0_8px_32px_rgba(0,0,0,0.4)] h-[140px]'
                    : 'opacity-80 hover:opacity-100 h-[120px]'
                  }
                `}
                style={{ background: item.gradient }}
              >
                <div className="absolute bottom-3 left-0 right-0 px-3
                                text-center text-[13px] font-extrabold text-white">
                  {item.label}
                </div>
                {isActive && (
                  <div className="absolute top-2.5 right-2.5 w-1.5 h-1.5
                                  rounded-full bg-accent" />
                )}
              </div>
            </button>
          )
        })}
      </div>

      {/* Slides */}
      <div className="overflow-hidden rounded-[24px] border border-border">
        <div
          className="flex transition-transform duration-500 ease-out"
          style={{ transform: `translateX(-${activeIndex * 100}%)` }}
        >
          {items.map((item) => (
            <div
              key={item.id}
              className="
                transition-colors duration-[0.2s]
                w-full flex-shrink-0
                grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-12
                px-10 py-10
                bg-surface
              "
            >
              {/* Left part - text */}
              <div className="flex flex-col justify-center">
                <h3 className="
                  text-[clamp(28px,4vw,48px)] font-extrabold
                  leading-[1.1] tracking-[-1px] mb-4 text-text
                  transition-colors duration-[0.2s]
                ">
                  {item.content.title}
                </h3>

                <p className="
                  text-[16px] leading-[1.6] font-light mb-6
                  text-textSecondary
                ">
                  {item.content.description}
                </p>

                {item.content.features && (
                  <ul className="flex flex-col gap-3 mb-8">
                    {item.content.features.map((feature, i) => (
                      <li key={i} className="flex items-center gap-3 text-sm
                                             text-textSecondary">
                        <span className="
                          w-5 h-5 rounded-full flex-shrink-0
                          bg-[rgba(27,110,243,0.2)]
                          flex items-center justify-center
                          text-accent text-[10px] font-bold
                        ">
                          ✓
                        </span>
                        {feature}
                      </li>
                    ))}
                  </ul>
                )}

                {item.content.cta && (
                  <button
                    onClick={item.content.cta.onClick}
                    className="
                      w-fit px-8 py-4
                      bg-accent text-white
                      font-semibold rounded-full
                      flex items-center gap-2
                      hover:shadow-[0_0_40px_var(--accent-glow)]
                      hover:-translate-y-0.5
                      transition-all duration
                    "
                  >
                    {item.content.cta.label}
                    <svg width="16" height="16" fill="none" stroke="currentColor"
                         strokeWidth="2" viewBox="0 0 24 24">
                      <path d="M5 12h14M12 5l7 7-7 7"/>
                    </svg>
                  </button>
                )}
              </div>

              {/* Right part - image */}
              <div className="
                relative rounded-[20px] overflow-hidden
                bg-surface2 min-h-[280px]
                flex items-center justify-center
                transition-colors duration-[0.2s]
              ">
                {item.content.image
                  ? <img src={item.content.image} alt={item.content.title}
                         className="w-full h-full object-cover" />
                  : <div className="text-[100px] opacity-40 select-none">
                      {item.icon}
                    </div>
                }
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

export default Slider