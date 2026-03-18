import StatItem from "./StatItem"
import Button from "../Button"
import ViewerCard from "./ViewerCard"

interface HeroProps{
    onRegisterClick: () => void
}

function Hero({ onRegisterClick }: HeroProps){
    const stats = [
        { num: '24k+', label: '3D-моделей'},
        { num: '8.4k+', label: 'Анимаций'},
        { num: '12k+', label: 'Авторов'}
    ]

    return(
        <section className="
            min-h-screen pt-16 relative
            flex items-center overflow-hidden
        ">
            {/* Hero Background */}
            <div className="
                absolute inset-0 
                bg-hero-gradient 
                pointer-events-none
                animate-heartbeat
            "></div>
            
            {/* Hero Grid */}
            <div className="
                absolute inset-0 
                bg-grid-pattern 
                pointer-events-none 
                opacity-50
                [background-size:60px_60px]
                [mask-image:radial-gradient(ellipse_70%_70%_at_50%_50%,black_20%,transparent_80%)]
                [-webkit-mask-image:radial-gradient(ellipse_70%_70%_at_50%_50%,black_20%,transparent_80%)]
            "/>

            {/* Hero Inner */}
            <div className="
                w-full max-w-[1280px] mx-auto 
                px-10 py-[60px] pb-20 
                grid grid-cols-1 md:grid-cols-2 
                gap-12 items-center 
                relative z-10
            ">
                {/* Hero Left */}
                <div>
                    {/* Hero Label */}
                    <div className="
                        inline-flex items-center 
                        gap-2 bg-tagBg 
                        border border-[rgba(27,110,243,0.25)] 
                        rounded-full
                        py-[5px] px-[14px] 
                        text-xs font-semibold 
                        text-accent tracking-[0.5px] 
                        uppercase mb-6 
                        animate-fade-up
                    ">
                        <span className="
                            w-[6px] h-[6px] 
                            rounded-full 
                            bg-accent
                            animate-pulse-dot
                        "></span>
                        ИИ-платформа нового поколения
                    </div>
                    
                    {/* Hero Title */}
                    <h1 className="
                        text-[clamp(38px,5vw,64px)] 
                        font-extrabold leading-[1.08]
                        tracking-[-2px] mb-5
                        animate-fade-up-delay-1
                    ">
                        Создавайте<br />
                        <span className="text-accent">3D-модели</span><br />
                        <em className="not-italic text-accent2">оживляйте</em> их
                    </h1>

                    {/* Hero Subtitle */}
                    <p className="
                        text-[17px] leading-[1.65]
                        text-textSecondary
                        max-w-[440px] mb-9
                        font-light animate-fade-up-delay-2
                    ">
                        Мощный ИИ превратит ваши фотографии в 3D-модели,
                        а видео — в реалистичные анимации.
                        Публикуйте, делитесь и вдохновляйтесь.
                    </p>
                    
                    {/* Hero Actions */}
                    <div className="
                        flex gap-3 flex-wrap
                        animate-fade-up-delay-3
                    ">
                        <Button
                            label="Начать бесплатно"
                            variant="hero-primary"
                            onClick={onRegisterClick}
                            icon={
                                <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                                    <polygon points="5 3 19 12 5 21 5 3" />
                                </svg>
                            }
                        />
                        <Button
                            label="Смотреть демо"
                            variant="hero-secondary"
                            onClick={() => console.log('демо')}
                            icon={
                                <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                                    <circle cx="12" cy="12" r="10"/>
                                    <path d="M12 8v4l3 3"/>
                                </svg>
                            }
                        />
                    </div>
                    
                    {/* Hero Stats */}
                    <div className="
                        flex gap-8 mt-12
                        animate-fade-up-delay-4
                    ">
                        {stats.map((stat) =>(
                            <StatItem key={stat.label} num={stat.num} label={stat.label}/>
                        ))}
                    </div>
                </div>

                {/* Hero Viewer */}
                <div className="
                    relative 
                    animate-fade-up-delay-4
                ">
                    {/* Viewer Model Placeholder */}
                    <div className="relative animate-fade-up-delay-4">
                        <ViewerCard />
                    </div>

                </div>
            </div>
        </section>
    )
}

export default Hero