import type { GenerationStatus } from "../../hooks/useGeneration";
import {
  Check,
  RefreshCw,
  Circle,
  Image,
  Clapperboard,
  AlertCircle,
  ArrowRight,
} from "lucide-react";

interface PreviewPanelProps {
  mode: "model" | "animation";
  status: GenerationStatus | null;
  progress: number;
  fileUploaded: boolean;
  modelFileUrl: string | null;
  onRetry: () => void;
}

const STEPS = [
  { id: 1, label: "Подготовка данных", icon: "check" },
  { id: 2, label: "Предобработка", icon: "refresh" },
  { id: 3, label: "Генерация геометрии", icon: "circle" },
  { id: 4, label: "Упрощение меша", icon: "circle" },
  { id: 5, label: "Создание текстур", icon: "circle" },
  { id: 6, label: "Финализация", icon: "circle" },
];

const ANIM_STEPS = [
  { id: 1, label: "Загрузка видео", icon: "check" },
  { id: 2, label: "Анализ движений", icon: "refresh" },
  { id: 3, label: "Извлечение поз", icon: "circle" },
  { id: 4, label: "Применение анимации", icon: "circle" },
  { id: 5, label: "Экспорт FBX", icon: "circle" },
];

const StepIcon = ({ type }: { type: string }) => {
  switch (type) {
    case "check":
      return <Check className="w-3 h-3" />;
    case "refresh":
      return <RefreshCw className="w-3 h-3" />;
    default:
      return <Circle className="w-3 h-3" />;
  }
};

export function PreviewPanel({
  mode,
  status,
  progress,
  fileUploaded,
  modelFileUrl,
  onRetry,
}: PreviewPanelProps) {
  const isModel = mode === "model";
  const steps = isModel ? STEPS : ANIM_STEPS;

  const getStepStatus = (stepId: number) => {
    if (!status) return "pending";
    if (status === "failed") return "pending";

    const stepProgress = (stepId / steps.length) * 100;
    if (progress >= stepProgress) return "done";
    if (progress >= stepProgress - 20) return "active";
    return "pending";
  };

  return (
    <div className="bg-surface border border-border rounded-[18px] overflow-hidden transition-colors duration-200">
      {/* Preview Scene */}
      <div
        className="aspect-[4/3] relative overflow-hidden transition-colors duration-200"
        style={{ background: "var(--surface)" }}
      >
        {/* Grid Overlay */}
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            backgroundImage: `
              linear-gradient(rgba(27,110,243,0.04) 1px, transparent 1px),
              linear-gradient(90deg, rgba(27,110,243,0.04) 1px, transparent 1px)
            `,
            backgroundSize: "30px 30px",
          }}
        />

        {/* Glow Effects */}
        <div className="absolute w-[200px] h-[200px] rounded-[50%] bg-accent opacity-[0.08] blur-[60px] top-[10%] left-[20%]" />
        <div className="absolute w-[200px] h-[200px] rounded-[50%] bg-accent2 opacity-[0.08] blur-[60px] bottom-[10%] right-[20%]" />

        {/* IDLE STATE */}
        {!status || status === "queued" ? (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 p-5 text-center z-10">
            <div className="w-[64px] h-[64px] rounded-[18px] bg-surface2 border border-border flex items-center justify-center">
              {isModel ? (
                <Image className="w-[28px] h-[28px] text-text-secondary" />
              ) : (
                <Clapperboard className="w-[28px] h-[28px] text-text-secondary" />
              )}
            </div>
            <div>
              <div className="font-extrabold text-[16px] text-text mb-1">
                {fileUploaded
                  ? "Настрой параметры"
                  : isModel
                    ? "Загрузи фото"
                    : "Загрузи видео"}
              </div>
              <div className="text-[13px] text-text-secondary font-light leading-relaxed">
                {isModel
                  ? "Здесь появится результат после запуска генерации"
                  : "ИИ перенесёт движения из видео на твою 3D-модель"}
              </div>
            </div>
          </div>
        ) : null}

        {/* PROGRESS STATE */}
        {status === "processing" && (
          <div className="absolute inset-0 flex flex-col items-center gap-4 p-5 z-10">
            {/* Progress Ring */}
            <div className="relative w-[80px] h-[80px]">
              <svg
                className="transform -rotate-90"
                width="80"
                height="80"
                viewBox="0 0 80 80"
              >
                <circle
                  className="stroke-surface3"
                  cx="40"
                  cy="40"
                  r="36"
                  fill="none"
                  strokeWidth="4"
                />
                <circle
                  className="stroke-accent transition-all duration-500"
                  cx="40"
                  cy="40"
                  r="36"
                  fill="none"
                  strokeWidth="4"
                  strokeLinecap="round"
                  strokeDasharray={226}
                  strokeDashoffset={226 - (226 * progress) / 100}
                />
              </svg>
              <div className="absolute inset-0 flex items-center justify-center font-extrabold text-[16px] text-text">
                {progress}%
              </div>
            </div>

            {/* Current Step */}
            <div className="text-center">
              <div className="font-extrabold text-[14px] text-text mb-0.5">
                {progress < 15
                  ? "Подготовка..."
                  : progress < 30
                    ? "Предобработка..."
                    : progress < 55
                      ? "Генерация геометрии..."
                      : progress < 65
                        ? "Упрощение меша..."
                        : progress < 95
                          ? "Создание текстур..."
                          : "Финализация..."}
              </div>
              <div className="text-[12px] text-text-secondary font-light">
                {progress < 15
                  ? "Начало генерации"
                  : progress < 30
                    ? "Upscaling + удаление фона"
                    : progress < 55
                      ? "Hunyuan3D-2 Diffusion"
                      : progress < 65
                        ? "Quadric decimation"
                        : progress < 95
                          ? "PBR-материалы и UV"
                          : "Загрузка в облако"}
              </div>
            </div>

            {/* Steps List */}
            <div className="flex flex-col gap-2 w-full max-w-[280px]">
              {steps.map((step) => {
                const stepStatus = getStepStatus(step.id);
                return (
                  <div
                    key={step.id}
                    className={`flex items-center gap-2.5 text-[13px] ${
                      stepStatus === "done"
                        ? "text-text"
                        : stepStatus === "active"
                          ? "text-accent"
                          : "text-text-secondary"
                    }`}
                  >
                    <div
                      className={`w-5 h-5 rounded-[50%] flex items-center justify-center flex-shrink-0 ${
                        stepStatus === "done"
                          ? "bg-green-500 text-white"
                          : stepStatus === "active"
                            ? "bg-accent text-white"
                            : "bg-surface3 text-text-muted"
                      }`}
                    >
                      {stepStatus === "done" ? (
                        <Check className="w-3 h-3" />
                      ) : stepStatus === "active" ? (
                        <RefreshCw className="w-3 h-3 animate-spin" />
                      ) : (
                        <StepIcon type={step.icon} />
                      )}
                    </div>
                    <span>{step.label}</span>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* RESULT STATE */}
        {status === "completed" && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 p-5 text-center z-10">
            <div className="w-[80px] h-[80px] rounded-[20px] bg-green-500/15 border border-green-500/30 flex items-center justify-center">
              <Check className="w-[40px] h-[40px] text-green-500" />
            </div>
            <div>
              <div className="font-extrabold text-[20px] text-text mb-1">
                Модель готова!
              </div>
              <div className="text-[14px] text-text-secondary font-light">
                Посмотри результат в панели слева
              </div>
            </div>
            <div className="flex items-center gap-2 text-[13px] text-accent font-medium mt-2">
              <ArrowRight className="w-4 h-4" />
              Переключись на 3D Viewer в UploadPanel
            </div>
          </div>
        )}

        {/* FAILED STATE */}
        {status === "failed" && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 p-5 text-center z-10">
            <div className="w-[64px] h-[64px] rounded-[18px] bg-red-500/10 border border-red-500/30 flex items-center justify-center">
              <AlertCircle className="w-[28px] h-[28px] text-red-500" />
            </div>
            <div>
              <div className="font-extrabold text-[16px] text-text mb-1">
                Ошибка генерации
              </div>
              <div className="text-[13px] text-text-secondary font-light">
                Попробуйте загрузить другой файл или изменить параметры
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Meta Bar */}
      <div className="px-5 py-4 border-t border-border flex items-center justify-between gap-3">
        <div className="flex flex-col gap-0.5">
          <div className="font-extrabold text-[14px] text-text">
            {status === "completed"
              ? "3D-модель готова!"
              : status === "failed"
                ? "Ошибка"
                : "Предпросмотр"}
          </div>
          <div className="text-[11px] text-text-secondary">
            {status === "completed"
              ? "Результат в панели слева"
              : status === "failed"
                ? "Попробуй ещё раз"
                : "Настрой параметры и запусти"}
          </div>
        </div>
        <div className="flex gap-2">
          {(status === "completed" || status === "failed") && (
            <button
              onClick={onRetry}
              className="px-[14px] py-2 rounded-lg bg-surface2 border border-border text-text-secondary text-[12px] font-semibold hover:border-border2 hover:text-text transition-all duration-200 flex items-center gap-1.5"
            >
              <svg
                width="12"
                height="12"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                viewBox="0 0 24 24"
              >
                <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
                <path d="M3 3v5h5" />
              </svg>
              Заново
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

export default PreviewPanel;
