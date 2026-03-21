import Button from "../Button"

interface CTABannerProps {
  onRegisterClick: () => void
}
 
function CTABanner({ onRegisterClick }: CTABannerProps) {
  return (
    <section className=" pb-20 max-w-7xl mx-auto">
      <div className="relative rounded-[24px] overflow-hidden
                      border border-border
                      px-20 py-16
                      flex items-center justify-between
                      gap-10 flex-wrap"
           style={{ background: 'linear-gradient(135deg,#0D2045 0%,#1B1040 50%,#0D2045 100%)' }}>
 
        {/* Background glow */}
        <div className="absolute -top-24 -right-24 w-[400px] h-[400px]
                        rounded-full blur-[80px] opacity-[0.08] pointer-events-none"
             style={{ background: 'var(--accent)' }} />
 
        {/* Text */}
        <div>
          <h2 className="font-extrabold text-[clamp(24px,3vw,36px)]
                         tracking-tight text-white mb-2.5">
            Начни создавать прямо сейчас
          </h2>
          <p className="text-textSecondary font-light text-base">
            Первые 5 генераций — бесплатно. Без карты.
          </p>
        </div>
 
        {/* Buttons */}
        <div className="flex gap-3 flex-wrap flex-shrink-0">
            <Button
                label="Создать аккаунт"
                variant="hero-primary"
                onClick={onRegisterClick}
            />
            <Button
                label="Смотреть каталог"
                variant="hero-secondary"
                onClick={() => console.log('демо')}
                href="/models"
            />
        </div>
      </div>
    </section>
  )
}

export default CTABanner