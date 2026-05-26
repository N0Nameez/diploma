import { Gem, Zap } from "lucide-react";

interface CreditsPanelProps {
  credits: number;
  maxCredits?: number;
  usedCredits?: number;
  resetDate?: string | null; /* ISO date string from backend */
  onBuyCredits?: () => void;
  expiringSoon?: boolean;
}

export function CreditsPanel({
  credits,
  maxCredits = 15,
  usedCredits,
  resetDate,
  onBuyCredits,
  expiringSoon,
}: CreditsPanelProps) {
  const used = usedCredits !== undefined ? usedCredits : Math.max(0, maxCredits - credits);
  const percentage = Math.min(100, (credits / maxCredits) * 100);

  // Calculate days until reset
  const daysUntilReset = resetDate
    ? Math.max(
        0,
        Math.ceil(
          (new Date(resetDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24),
        ),
      )
    : 0;

  return (
    <div className="bg-background-surface border border-border rounded-[18px] p-[18px_20px] transition-colors duration-200">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2 font-extrabold text-[14px] text-text">
          <Gem className="w-4 h-4 text-accent" />
          Кредиты
        </div>
        <div className="font-extrabold text-[18px] text-green-500">
          {credits} / {maxCredits}
        </div>
      </div>

      {/* Progress Bar */}
      <div className="h-[6px] bg-background-primary rounded-[3px] overflow-hidden mb-2">
        <div
          className="h-full bg-gradient-to-r from-green-500 to-green-600 rounded-[3px] transition-all duration-500"
          style={{ width: `${percentage}%` }}
        />
      </div>

      {/* Info */}
      <div className="flex justify-between text-[12px] text-text-secondary mb-3">
        <span>
          Использовано: <strong className="text-text">{used}</strong>
        </span>
        <span>Сброс через {daysUntilReset} дн.</span>
      </div>
      
      {/* Expiration Warning */}
      {expiringSoon && (
        <div className="mb-3 p-2.5 rounded-xl bg-yellow-500/10 border border-yellow-500/20 flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-lg bg-yellow-500/20 flex items-center justify-center shrink-0">
            <Zap className="w-3.5 h-3.5 text-yellow-500" />
          </div>
          <div className="text-[10px] text-text leading-tight font-medium">
            Подписка истекает менее чем через 24 часа
          </div>
        </div>
      )}

      {/* Upgrade Button */}
      <button 
        onClick={onBuyCredits}
        className="w-full py-2 rounded-lg bg-yellow-500/10 border border-yellow-500/20 text-yellow-500 text-[12px] font-semibold hover:bg-yellow-500/18 transition-all duration-200 flex items-center justify-center gap-1.5"
      >
        <Zap className="w-3.5 h-3.5" />
        Получить больше кредитов
      </button>
    </div>
  );
}

export default CreditsPanel;
