import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, Minus } from 'lucide-react';

const FAQS = [
  {
    question: 'Как работает генерация из одного фото?',
    answer: 'Наша нейросеть анализирует геометрию объекта на фото и восстанавливает недостающие части, используя огромную базу данных 3D-примитивов и текстур. Это позволяет получить реалистичную модель всего за несколько секунд.'
  },
  {
    question: 'Какие форматы файлов поддерживаются для экспорта?',
    answer: 'Вы можете экспортировать готовые модели в форматах GLB (оптимально для веба), FBX (для игр), OBJ и USDZ (для AR на iOS).'
  },
  {
    question: 'Можно ли использовать созданные модели в коммерческих целях?',
    answer: 'Да, на тарифах Pro и Enterprise вы получаете полную коммерческую лицензию на все сгенерированные объекты и анимации.'
  },
  {
    question: 'Как работает перенос анимации из видео?',
    answer: 'Мы используем технологию Computer Vision для захвата движений скелета человека или животного из видеопотока и автоматического риггинга вашей 3D-модели.'
  }
];

function FAQItem({ faq, index }: { faq: typeof FAQS[0], index: number }) {
  const [isOpen, setIsOpen] = React.useState(index === 0);

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ delay: index * 0.1 }}
      className="border-b border-border"
    >
      <button 
        onClick={() => setIsOpen(!isOpen)}
        className="w-full py-8 flex items-center justify-between text-left group"
      >
        <span className={`text-[20px] font-medium transition-colors ${isOpen ? 'text-text-primary' : 'text-text-secondary group-hover:text-text-primary'}`}>
          {faq.question}
        </span>
        <div className={`p-2 rounded-full transition-all ${isOpen ? 'bg-accent text-text-primary' : 'bg-background-surface text-text-muted group-hover:bg-background-icon'}`}>
          {isOpen ? <Minus className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
        </div>
      </button>
      
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3, ease: 'easeInOut' }}
            className="overflow-hidden"
          >
            <p className="pb-8 text-text-tertiary font-light leading-relaxed max-w-[800px]">
              {faq.answer}
            </p>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

export function FAQSection() {
  return (
    <section className="py-[160px] px-10 relative" id="faq">
      <div className="max-w-[900px] mx-auto">
        <motion.div 
          initial={{ opacity: 0, x: -20 }}
          whileInView={{ opacity: 1, x: 0 }}
          viewport={{ once: true }}
          className="font-mono text-[12px] text-text-dimmed uppercase tracking-[2px] mb-8 flex items-center gap-4"
        >
          <span className="w-8 h-px bg-accent/50" />
          Часто задаваемые вопросы
        </motion.div>
        
        <div className="space-y-2">
          {FAQS.map((faq, index) => (
            <FAQItem key={index} faq={faq} index={index} />
          ))}
        </div>
      </div>
    </section>
  );
}
