import React from 'react';
import { motion } from 'framer-motion';
import { Button } from '@/components/Button';
import { Rocket } from 'lucide-react';
import { Magnetic } from '@/components/Magnetic';

interface CTASectionProps {
  onRegisterClick: () => void;
}

/**
 * Final call-to-action section at the bottom of the page.
 */
export function CTASection({ onRegisterClick }: CTASectionProps) {
  return (
    <section className="py-[160px] px-10 max-w-[1280px] mx-auto text-center relative overflow-hidden" id="cta">
      {/* Background Glow */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[700px] h-[400px] bg-accent/10 blur-[120px] pointer-events-none rounded-full"></div>
      
      <motion.div
        initial={{ opacity: 0, y: 30 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.8 }}
      >
        <h2 className="font-tight text-[clamp(36px,5vw,64px)] font-medium leading-[1.05] tracking-[-2px] mb-5">
          Начни создавать<br />
          <span className="bg-clip-text text-transparent bg-gradient-to-r from-[#EC4899] to-[#7C3AED]">прямо сейчас.</span>
        </h2>
        <p className="text-[16px] font-light text-text-tertiary leading-[1.7] max-w-[440px] mx-auto mb-10">
          Первые 5 генераций — бесплатно. Без карты. Без обязательств.
        </p>

        <Magnetic strength={0.3}>
          <motion.div
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
            <Button
              label="Создать 3D-модель"
              onClick={onRegisterClick}
              variant="hero-primary"
              icon={<Rocket className="w-5 h-5 mr-2" />}
              className="rounded-full mx-auto"
            />
          </motion.div>
        </Magnetic>
      </motion.div>
    </section>
  );
}
