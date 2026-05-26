import { Sliders } from "lucide-react";

interface QualitySettingsProps {
  qualityLevel: string;
  polyCount: string;
  enablePbr: boolean;
  enableRig: boolean;
  autoPublish: boolean;
  aiModel?: string;
  onQualityChange: (level: string) => void;
  onPolyChange: (count: string) => void;
  onToggle: (setting: string, value: boolean) => void;
}

const POLY_LABELS = ["5K", "25K", "50K", "75K", "100K+"];

/* Model-specific quality info displayed as badges */
const QUALITY_INFO: Record<string, Record<string, { label: string; values: Record<string, string> }>> = {
  "Hunyuan3D-2": {
    draft: { label: "Draft", values: { "Res": "128", "Steps": "20", "CFG": "4.0" } },
    high:  { label: "High",  values: { "Res": "256", "Steps": "30", "CFG": "5.5" } },
    ultra: { label: "Ultra", values: { "Res": "512", "Steps": "50", "CFG": "7.0" } },
  },
  "Hunyuan3D-1": {
    draft: { label: "Draft", values: { "Diffusion": "20", "Faces": "25K" } },
    high:  { label: "High",  values: { "Diffusion": "35", "Faces": "50K" } },
    ultra: { label: "Ultra", values: { "Diffusion": "50", "Faces": "90K" } },
  },
  "TRELLIS2": {
    draft: { label: "Draft", values: { "Steps": "12", "Tokens": "16K" } },
    high:  { label: "High",  values: { "Steps": "20", "Tokens": "32K" } },
    ultra: { label: "Ultra", values: { "Steps": "30", "Tokens": "49K" } },
  },
};

export function QualitySettings({
  qualityLevel,
  polyCount,
  enablePbr,
  enableRig,
  autoPublish,
  aiModel = "Hunyuan3D-2",
  onQualityChange,
  onPolyChange,
  onToggle,
}: QualitySettingsProps) {
  const modelInfo = QUALITY_INFO[aiModel] || QUALITY_INFO["Hunyuan3D-2"];
  const currentInfo = modelInfo[qualityLevel];
  return (
    <div className="bg-background-surface border border-border rounded-[18px] p-6 transition-colors duration-200">
      <div className="flex items-center gap-[10px] mb-4">
        <Sliders className="w-[18px] h-[18px] text-text" />
        <span className="font-extrabold text-[15px] text-text">
          Параметры генерации
        </span>
      </div>

      {/* Качество */}
      <div className="mb-5">
        <label className="text-[11px] font-semibold text-text-secondary uppercase tracking-[0.8px] mb-4 block">
          Качество / Детализация
        </label>
        <div className="flex flex-col gap-2">
          <div className="flex justify-between items-center">
            <span className="text-[13px] text-text-secondary">Детализация</span>
            <span className="text-[13px] font-bold text-accent min-w-[48px] text-right">
              {qualityLevel === "draft"
                ? "Draft"
                : qualityLevel === "high"
                  ? "High"
                  : "Ultra"}
            </span>
          </div>
          <input
            type="range"
            min="1"
            max="3"
            value={
              qualityLevel === "draft" ? 1 : qualityLevel === "high" ? 2 : 3
            }
            onChange={(e) => {
              const val = e.target.value;
              onQualityChange(
                val === "1" ? "draft" : val === "2" ? "high" : "ultra",
              );
            }}
            className="w-full h-1 bg-background-secondary rounded appearance-none cursor-pointer
                       [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-[18px]
                       [&::-webkit-slider-thumb]:h-[18px] [&::-webkit-slider-thumb]:rounded-[50%]
                       [&::-webkit-slider-thumb]:bg-accent [&::-webkit-slider-thumb]:cursor-pointer
                       [&::-webkit-slider-thumb]:shadow-[0_0_8px_var(--accent-glow)]
                       [&::-webkit-slider-thumb]:border-2 [&::-webkit-slider-thumb]:border-surface
                       [&::-webkit-slider-thumb]:transition-transform duration-200 [&::-webkit-slider-thumb]:hover:scale-110"
          />
          <div className="flex justify-between text-[10px] text-text-muted">
            <span>Draft</span>
            <span>High</span>
            <span>Ultra</span>
          </div>
          {/* Show actual params for current quality */}
          {currentInfo && (
            <div className="mt-2 flex gap-2 text-[10px] text-text-secondary flex-wrap">
              {Object.entries(currentInfo.values).map(([key, val]) => (
                <span key={key} className="px-2 py-1 rounded bg-background-secondary">
                  {key}: {val}
                </span>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Полигоны */}
      <div className="mb-5">
        <label className="text-[11px] font-semibold text-text-secondary uppercase tracking-[0.8px] mb-4 block">
          Количество полигонов
        </label>
        <div className="flex flex-col gap-2">
          <div className="flex justify-between items-center">
            <span className="text-[13px] text-text-secondary">Поли-счёт</span>
            <span className="text-[13px] font-bold text-accent min-w-[48px] text-right">
              {polyCount}
            </span>
          </div>
          <input
            type="range"
            min="1"
            max="5"
            value={POLY_LABELS.indexOf(polyCount) + 1}
            onChange={(e) =>
              onPolyChange(POLY_LABELS[parseInt(e.target.value) - 1])
            }
            className="w-full h-1 bg-background-secondary rounded appearance-none cursor-pointer
                       [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-[18px] 
                       [&::-webkit-slider-thumb]:h-[18px] [&::-webkit-slider-thumb]:rounded-[50%] 
                       [&::-webkit-slider-thumb]:bg-accent [&::-webkit-slider-thumb]:cursor-pointer
                       [&::-webkit-slider-thumb]:shadow-[0_0_8px_var(--accent-glow)]
                       [&::-webkit-slider-thumb]:border-2 [&::-webkit-slider-thumb]:border-surface
                       [&::-webkit-slider-thumb]:transition-transform duration-200 [&::-webkit-slider-thumb]:hover:scale-110"
          />
          <div className="flex justify-between text-[10px] text-text-muted">
            <span>5K</span>
            <span>25K</span>
            <span>100K+</span>
          </div>
        </div>
      </div>

      {/* Переключатели */}
      <div className="space-y-3">
        <div className="flex items-center justify-between py-2.5 border-b border-border">
          <div className="flex flex-col gap-0.5">
            <span className="text-[14px] font-medium">PBR-текстуры</span>
            <span className="text-[12px] text-text-secondary font-light">
              Физически корректный рендеринг
            </span>
          </div>
          <label className="relative w-[38px] h-[22px]">
            <input
              type="checkbox"
              checked={enablePbr}
              onChange={(e) => onToggle("enablePbr", e.target.checked)}
              className="opacity-0 w-0 h-0"
            />
            <span
              className={`absolute inset-0 rounded-[11px] cursor-pointer transition-colors duration-200
                             ${enablePbr ? "bg-accent" : "bg-background-secondary"}`}
            />
            <span
              className={`absolute w-4 h-4 rounded-[50%] bg-white top-1 left-1
                             transition-transform duration-200 shadow-[0_1px_4px_rgba(0,0,0,0.3)]
                             ${enablePbr ? "translate-x-4" : ""}`}
            />
          </label>
        </div>

        <div className="flex items-center justify-between py-2.5 border-b border-border">
          <div className="flex flex-col gap-0.5">
            <span className="text-[14px] font-medium">Авто-риг (Humanoid)</span>
            <span className="text-[12px] text-text-secondary font-light">
              Скелет для Mixamo и UE5
            </span>
          </div>
          <label className="relative w-[38px] h-[22px]">
            <input
              type="checkbox"
              checked={enableRig}
              onChange={(e) => onToggle("enableRig", e.target.checked)}
              className="opacity-0 w-0 h-0"
            />
            <span
              className={`absolute inset-0 rounded-[11px] cursor-pointer transition-colors duration-200
                             ${enableRig ? "bg-accent" : "bg-background-secondary"}`}
            />
            <span
              className={`absolute w-4 h-4 rounded-[50%] bg-white top-1 left-1
                             transition-transform duration-200 shadow-[0_1px_4px_rgba(0,0,0,0.3)]
                             ${enableRig ? "translate-x-4" : ""}`}
            />
          </label>
        </div>

        <div className="flex items-center justify-between py-2.5">
          <div className="flex flex-col gap-0.5">
            <span className="text-[13px] font-medium">Авто-публикация</span>
            <span className="text-[11px] text-text-secondary font-light">
              Сразу выложить в каталог
            </span>
          </div>
          <label className="relative w-[38px] h-[22px] flex-shrink-0">
            <input
              type="checkbox"
              checked={autoPublish}
              onChange={(e) => onToggle("autoPublish", e.target.checked)}
              className="opacity-0 w-0 h-0"
            />
            <span
              className={`absolute inset-0 rounded-[11px] cursor-pointer transition-colors duration-200
                             ${autoPublish ? "bg-accent" : "bg-background-secondary"}`}
            />
            <span
              className={`absolute w-4 h-4 rounded-[50%] bg-white top-1 left-1
                             transition-transform duration-200 shadow-[0_1px_4px_rgba(0,0,0,0.3)]
                             ${autoPublish ? "translate-x-4" : ""}`}
            />
          </label>
        </div>
      </div>
    </div>
  );
}

export default QualitySettings;
