import { Settings } from "lucide-react";

interface SettingsPanelProps {
  mode: "model" | "animation";
  settings: any;
  onSettingsChange: (settings: any) => void;
  nameError?: string; /* Ошибка валидации имени */
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
}: SettingsPanelProps) {
  const isModel = mode === "model";

  return (
    <div className="bg-surface border border-border rounded-[18px] p-6 transition-colors duration-200">
      <div className="flex items-center gap-[10px] mb-4">
        <Settings className="w-[18px] h-[18px] text-text" />
        <span className="font-extrabold text-[15px] text-text">
          {isModel ? "Настройки модели" : "Настройки анимации"}
        </span>
        <span className="px-[10px] py-[3px] rounded-[100px] bg-surface2 text-text-muted text-[10px] font-bold tracking-[0.8px] uppercase">
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
            className={`px-[14px] py-[11px] bg-surface2 border rounded-[11px]
                       text-text text-[14px] outline-none focus:border-accent transition-all duration-200
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
            className="px-[14px] py-[11px] bg-surface2 border border-border rounded-[11px]
                       text-text text-[14px] outline-none focus:border-accent transition-all duration-200
                       cursor-pointer appearance-none"
          >
            {(isModel ? CATEGORIES : ANIMATION_TYPES).map((cat) => (
              <option key={cat} value={cat}>
                {cat}
              </option>
            ))}
          </select>
        </div>

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
            className="px-[14px] py-[11px] bg-surface2 border border-border rounded-[11px]
                       text-text text-[14px] outline-none focus:border-accent transition-all duration-200
                       placeholder:text-text-muted resize-none"
          />
        </div>

        {!isModel && (
          <div className="col-span-2 flex flex-col gap-2">
            <label className="text-[11px] font-semibold text-text-secondary uppercase tracking-[0.8px]">
              Выбрать 3D-модель для анимации
            </label>
            <select
              className="px-[14px] py-[11px] bg-surface2 border border-border rounded-[11px]
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
