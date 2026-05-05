import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Zap, Check, CreditCard, Loader2 } from 'lucide-react';
import { API_URL } from '@/services/api';

interface PaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  userId: string;
}

const PACKAGES = [
  { id: 'small', credits: 50, price: 99, label: 'Базовый', description: 'Для разовых генераций' },
  { id: 'medium', credits: 200, price: 299, label: 'Популярный', description: 'Лучший выбор для творчества', popular: true },
  { id: 'large', credits: 1000, price: 999, label: 'Профи', description: 'Для тех, кто создаёт много' },
];

export function PaymentModal({ isOpen, onClose, userId }: PaymentModalProps) {
  const [loading, setLoading] = useState<string | null>(null);

  const handlePurchase = async (pkg: typeof PACKAGES[0]) => {
    setLoading(pkg.id);
    try {
      const response = await fetch(`${API_URL}/api/payments/create`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user_id: userId,
          amount: pkg.price,
          credits_amount: pkg.credits
        })
      });

      const data = await response.json();
      if (data.success && data.confirmation_url) {
        // Redirect to Yookassa
        window.location.href = data.confirmation_url;
      } else {
        alert('Ошибка при создании платежа: ' + (data.error || 'Неизвестная ошибка'));
      }
    } catch (err) {
      console.error('Payment error:', err);
      alert('Не удалось связаться с сервером оплаты');
    } finally {
      setLoading(null);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
          />
          
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            className="relative w-full max-w-[500px] bg-background-surface border border-border rounded-3xl overflow-hidden shadow-2xl"
          >
            {/* Header */}
            <div className="px-8 pt-8 pb-6 border-b border-border">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-yellow-500/10 flex items-center justify-center">
                    <Zap className="w-5 h-5 text-yellow-500" />
                  </div>
                  <h2 className="text-xl font-extrabold text-text">Пополнить баланс</h2>
                </div>
                <button
                  onClick={onClose}
                  className="p-2 hover:bg-background-secondary rounded-full transition-colors"
                >
                  <X className="w-5 h-5 text-text-muted" />
                </button>
              </div>
              <p className="text-sm text-text-secondary">Выберите пакет кредитов для продолжения генераций</p>
            </div>

            {/* Content */}
            <div className="p-6 flex flex-col gap-3">
              {PACKAGES.map((pkg) => (
                <div
                  key={pkg.id}
                  className={`relative p-5 rounded-2xl border transition-all duration-300 group ${
                    pkg.popular 
                      ? 'bg-accent/5 border-accent/30 hover:border-accent' 
                      : 'bg-background-secondary border-border hover:border-accent/40'
                  }`}
                >
                  {pkg.popular && (
                    <div className="absolute -top-3 right-5 px-3 py-1 bg-accent text-white text-[10px] font-bold rounded-full shadow-lg">
                      ПОПУЛЯРНО
                    </div>
                  )}
                  
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-extrabold text-lg text-text">{pkg.credits}</span>
                        <span className="text-xs text-text-secondary font-medium uppercase tracking-wider">Кредитов</span>
                      </div>
                      <div className="text-xs text-text-muted">{pkg.description}</div>
                    </div>
                    
                    <div className="flex flex-col items-end gap-2">
                      <div className="text-xl font-black text-text">{pkg.price} ₽</div>
                      <button
                        onClick={() => handlePurchase(pkg)}
                        disabled={loading !== null}
                        className={`px-5 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 ${
                          pkg.popular
                            ? 'bg-accent text-white hover:bg-accent/90'
                            : 'bg-background-primary text-text hover:bg-accent hover:text-white'
                        } disabled:opacity-50`}
                      >
                        {loading === pkg.id ? (
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        ) : (
                          <CreditCard className="w-3.5 h-3.5" />
                        )}
                        Купить
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Footer */}
            <div className="px-8 py-5 bg-background-secondary/50 border-t border-border flex items-center justify-center gap-4 text-[11px] text-text-muted">
              <div className="flex items-center gap-1.5">
                <Check className="w-3 h-3 text-green-500" />
                Безопасная оплата ЮKassa
              </div>
              <div className="w-1 h-1 rounded-full bg-border" />
              <div className="flex items-center gap-1.5">
                <Check className="w-3 h-3 text-green-500" />
                Мгновенное зачисление
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
