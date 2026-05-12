import { Settings, Sparkles, Zap, FlaskConical } from "lucide-react";
import type { ApiTag } from "../../services/api";

interface SettingsPanelProps {
  mode: "model" | "animation";
  settings: any;
  onSettingsChange: (settings: any) => void;
  nameError?: string; /* Ошибка валидации имени */
  userProfile?: any;
  industryTags?: ApiTag[];
}

const CATEGORIES = [
  "Разработка игр",
  "Кинопроизводство",
  "Образование",
  "3D-печать",
  "VR / AR",
  "Интерьер",
];

const ANIMATION_TYPES = [
  "Ходьба / Бег",
  "Боевые действия",
  "Танец",
  "Медленные движения",
  "Акробатика",
  "Эмоции / Жесты",
];

export function SettingsPanel({
  mode,
  settings,
  onSettingsChange,
  nameError,
  userProfile,
  industryTags = [],
}: SettingsPanelProps) {
  const isModel = mode === "model";
  
  // Checking subscription tier
  const isPro = userProfile?.subscription_status === 'pro' || userProfile?.subscription_status === 'studio';

  // Use DB tags for models if available, otherwise fallback to hardcoded
  const categoriesToUse = isModel 
    ? (industryTags.length > 0 ? industryTags.map(t => t.name) : CATEGORIES)
    : ANIMATION_TYPES;

  return (
    <div className="bg-background-surface border border-border rounded-[18px] p-6 transition-colors duration-200">
      <div className="flex items-center gap-[10px] mb-4">
        <Settings className="w-[18px] h-[18px] text-text" />
        <span className="font-extrabold text-[15px] text-text">
          {isModel ? "Настройки модели" : "Настройки анимации"}
        </span>
        <span className="px-[10px] py-[3px] rounded-[100px] bg-background-primary text-text-muted text-[10px] font-bold tracking-[0.8px] uppercase">
          Опционально
        </span>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="flex flex-col gap-2">
          <label className="text-[11px] font-semibold text-text-secondary uppercase tracking-[0.8px]">
            Название
          </label>
          <input
            type="text"
            value={settings.name}
            onChange={(e) =>
              onSettingsChange({ ...settings, name: e.target.value })
            }
            placeholder={isModel ? "Мой персонаж" : "Анимация ходьбы"}
            className={`px-[14px] py-[11px] bg-background-secondary border rounded-[11px]
                       text-text text-[14px] outline-none focus:border-accent hover:border-accent-glow transition-all duration-200
                       placeholder:text-text-muted
                       ${nameError ? "border-red-500 bg-red-500/5" : "border-border"}`}
          />
          {nameError && (
            <span className="text-[11px] text-red-500 font-medium">
              {nameError}
            </span>
          )}
        </div>

        <div className="flex flex-col gap-2">
          <label className="text-[11px] font-semibold text-text-secondary uppercase tracking-[0.8px]">
            {isModel ? "Категория" : "Тип движения"}
          </label>
          <select
            value={settings.category}
            onChange={(e) =>
              onSettingsChange({ ...settings, category: e.target.value })
            }
            className="px-[14px] py-[11px] bg-background-secondary border border-border rounded-[11px]
                       text-text text-[14px] outline-none focus:border-accent hover:border-accent-glow transition-all duration-200
                       cursor-pointer appearance-none"
          >
            {categoriesToUse.map((cat) => (
              <option key={cat} value={cat}>
                {cat}
              </option>
            ))}
          </select>
        </div>

        {isModel && (
          <div className="col-span-2 flex flex-col gap-2">
            <label className="text-[11px] font-semibold text-text-secondary uppercase tracking-[0.8px]">
              ИИ-Модель
            </label>
            <div className="grid grid-cols-3 gap-2">
              <div 
                onClick={() => onSettingsChange({ ...settings, aiModel: "Hunyuan3D-1" })}
                className={`p-3 rounded-xl border cursor-pointer transition-all ${settings.aiModel === "Hunyuan3D-1" ? 'border-accent bg-accent/10' : 'border-border bg-background-secondary hover:border-accent-glow'}`}
              >
                <div className="flex items-center gap-2 mb-1">
                  <Sparkles className={`w-4 h-4 ${settings.aiModel === "Hunyuan3D-1" ? 'text-accent' : 'text-text-muted'}`} />
                  <span className={`text-sm font-semibold ${settings.aiModel === "Hunyuan3D-1" ? 'text-accent' : 'text-text-primary'}`}>Hunyuan3D-1</span>
                </div>
                <div className="text-xs text-text-secondary">Детальная генерация (2 кредита)</div>
              </div>

              <div 
                onClick={() => isPro && onSettingsChange({ ...settings, aiModel: "Hunyuan3D-2" })}
                className={`p-3 rounded-xl border transition-all ${!isPro ? 'opacity-50 cursor-not-allowed bg-background-primary' : 'cursor-pointer'} ${settings.aiModel === "Hunyuan3D-2" ? 'border-accent bg-accent/10' : 'border-border bg-background-secondary hover:border-accent-glow'}`}
                title={!isPro ? "Требуется подписка Pro или Studio" : ""}
              >
                <div className="flex items-center gap-2 mb-1">
                  <Zap className={`w-4 h-4 ${settings.aiModel === "Hunyuan3D-2" ? 'text-accent' : 'text-text-muted'}`} />
                  <span className={`text-sm font-semibold ${settings.aiModel === "Hunyuan3D-2" ? 'text-accent' : 'text-text-primary'}`}>Hunyuan3D-2</span>
                  {!isPro && <span className="ml-auto text-[10px] bg-accent/20 text-accent px-1.5 py-0.5 rounded">PRO</span>}
                </div>
                <div className="text-xs text-text-secondary">Быстрая генерация (3 кредита)</div>
              </div>

              <div 
                onClick={() => isPro && onSettingsChange({ ...settings, aiModel: "TRELLIS2" })}
                className={`p-3 rounded-xl border transition-all ${!isPro ? 'opacity-50 cursor-not-allowed bg-background-primary' : 'cursor-pointer'} ${settings.aiModel === "TRELLIS2" ? 'border-accent bg-accent/10' : 'border-border bg-background-secondary hover:border-accent-glow'}`}
                title={!isPro ? "Требуется подписка Pro или Studio" : ""}
              >
                <div className="flex items-center gap-2 mb-1">
                  <FlaskConical className={`w-4 h-4 ${settings.aiModel === "TRELLIS2" ? 'text-accent' : 'text-text-muted'}`} />
                  <span className={`text-sm font-semibold ${settings.aiModel === "TRELLIS2" ? 'text-accent' : 'text-text-primary'}`}>TRELLIS 2</span>
                  {!isPro && <span className="ml-auto text-[10px] bg-accent/20 text-accent px-1.5 py-0.5 rounded">PRO</span>}
                </div>
                <div className="text-xs text-text-secondary">Экспериментальная (4 кредита)</div>
              </div>
            </div>
          </div>
        )}

        <div className="col-span-2 flex flex-col gap-2">
          <label className="text-[11px] font-semibold text-text-secondary uppercase tracking-[0.8px]">
            Описание {isModel ? "(необязательно)" : ""}
          </label>
          <textarea
            value={settings.description}
            onChange={(e) =>
              onSettingsChange({ ...settings, description: e.target.value })
            }
            placeholder={
              isModel
                ? "Опиши персонажа — это поможет ИИ лучше понять задачу..."
                : "Опиши движение или действие..."
            }
            rows={3}
            className="px-[14px] py-[11px] bg-background-secondary border border-border rounded-[11px]
                       text-text text-[14px] outline-none focus:border-accent hover:border-accent-glow transition-all duration-200
                       placeholder:text-text-muted resize-none"
          />
        </div>

        {!isModel && (
          <div className="col-span-2 flex flex-col gap-2">
            <label className="text-[11px] font-semibold text-text-secondary uppercase tracking-[0.8px]">
              Выбрать 3D-модель для анимации
            </label>
            <select
              className="px-[14px] py-[11px] bg-background-secondary hover:border-accent-glow border border-border rounded-[11px]
                         text-text text-[14px] outline-none focus:border-accent transition-all duration-200
                         cursor-pointer"
            >
              <option>Рыцарь Тьмы (последний)</option>
              <option>Маг Артемис</option>
              <option>Боевой андроид</option>
              <option>+ Загрузить свою модель</option>
            </select>
          </div>
        )}
      </div>
    </div>
  );
}

export default SettingsPanel;
