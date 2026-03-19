interface SectionProps{
    title: string
    label: string
    sub?: string
}

function Section({title, label, sub}: SectionProps){
   return(
    <>
        <div className="
        pt-0 px-10 pb-5 
        max-w-7xl my-0 mx-auto">
                <div className="
                text-[11px] font-bold tracking-[2px]
                uppercase text-accent mb-3
                flex items-center gap-[10px]
                before:content-[''] before:w-[24px] 
                before:h-[2px] before:bg-accent 
                before:rounded-[2px] before:inline-block">
                    {label}
                </div>
                
                <div className="
                text-[clamp(28px,3.5vw,42px)]
                font-extrabold tracking-[-1.5px]
                mb-3 leading-[1.1]">
                    {title}
                </div>          

                {sub && (
                    <div className="
                    text-[16px] text-textSecondary font-light">
                        {sub}
                    </div>
                )}
        </div>
    </>
   ) 
}

export default Section