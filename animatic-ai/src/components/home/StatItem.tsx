interface StatItemProps{
    num: string
    label: string
}

function StatItem({num, label} : StatItemProps){
    return(
        <div className="flex flex-col gap-[2px]">
            <span className="font-syne text-2xl font-bold">{num}</span>
            <span className="font-xs text-textSecondary font-normal">{label}</span>
        </div>
    )
}

export default StatItem