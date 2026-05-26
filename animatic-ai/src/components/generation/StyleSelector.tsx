import { Palette, Check } from "lucide-react";

interface StyleSelectorProps {
  selectedStyle: string;
  onSelectStyle: (style: string) => void;
}

const STYLES = [
  {
    id: "fantasy",
    name: "Фэнтези",
    emoji: "🤺",
    gradient: "from-[#1a1a2e] to-[#16213e]",
  },
  {
    id: "nature",
    name: "Природа",
    emoji: "🧝",
    gradient: "from-[#1a3a2a] to-[#0d2a18]",
  },
  {
    id: "superhero",
    name: "Супергерой",
    emoji: "🦸",
    gradient: "from-[#2a1520] to-[#1a0d15]",
  },
  {
    id: "scifi",
    name: "Sci-Fi",
    emoji: "🤖",
    gradient: "from-[#1a1a1a] to-[#2a2a2a]",
  },
  {
    id: "realism",
    name: "Реализм",
    emoji: "🧑‍💼",
    gradient: "from-[#0d2045] to-[#1B3A6B]",
  },
  {
    id: "medieval",
    name: "Средневековье",
    emoji: "🏹",
    gradient: "from-[#2a1a05] to-[#4a3010]",
  },
  {
    id: "horror",
    name: "Хоррор",
    emoji: "🧟",
    gradient: "from-[#1a051a] to-[#2a0a2a]",
  },
  {
    id: "mythology",
    name: "Мифология",
    emoji: "🧜",
    gradient: "from-[#051a1a] to-[#0a2a2a]",
  },
];

export function StyleSelector({
  selectedStyle,
  onSelectStyle,
}: StyleSelectorProps) {
  return (
    <div className="bg-background-surface border border-border rounded-[18px] p-6">
      <div className="flex items-center gap-[10px] mb-4">
        <span className="font-extrabold text-[15px] text-text flex items-center gap-2">
          <Palette className="w-4 h-4" /> Стиль персонажа
        </span>
        <span className="px-[10px] py-[3px] rounded-[100px] bg-green-500/12 text-green-500 text-[10px] font-bold tracking-[0.8px] uppercase">
          NEW
        </span>
      </div>

      <div className="grid grid-cols-4 gap-2">
        {STYLES.map((style) => (
          <div
            key={style.id}
            onClick={() => onSelectStyle(style.id)}
            className={`rounded-[12px] overflow-hidden cursor-pointer border-2 transition-all duration-200 relative
                        ${
                          selectedStyle === style.id
                            ? "border-accent"
                            : "border-transparent hover:border-border2"
                        }`}
          >
            <div
              className={`h-[72px] bg-gradient-to-br ${style.gradient}
                            flex items-center justify-center text-[36px]`}
            >
              {style.emoji}
            </div>
            <div className="py-1.5 px-2 bg-background-secondary text-center">
              <div className="text-[11px] font-semibold">{style.name}</div>
            </div>
            {selectedStyle === style.id && (
              <div
                className="absolute top-1.5 right-1.5 w-[18px] h-[18px] rounded-[50%]
                              bg-accent text-white text-[10px] font-bold flex items-center
                              justify-center"
              >
                <Check className="w-3 h-3" />
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

export default StyleSelector;
