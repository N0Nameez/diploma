import React from 'react';
import { HeroScene } from '@/components/home/HeroScene';
import { AboutSection } from '@/components/home/AboutSection';
import { ProcessSection } from '@/components/home/ProcessSection';
import { CharacterSection } from '@/components/home/CharacterSection';
import { PricingSection } from '@/components/home/PricingSection';
import { FAQSection } from '@/components/home/FAQSection';
import { CTASection } from '@/components/home/CTASection';
import { WorkExamples } from '@/components/home/WorkExamples';
import { SectionDivider } from '@/components/home/SectionDivider';

import type { User } from "@supabase/supabase-js";

interface HomePageProps {
  onRegisterClick: () => void;
  user: User | null;
}

/**
 * Main landing page component assembling all home sections.
 * All sections are optimized with Framer Motion for performance and polish.
 */
export function HomePage({ onRegisterClick, user }: HomePageProps) {
  return (
    <main className="min-h-screen bg-black">
      <HeroScene onRegisterClick={onRegisterClick} user={user} />
      <SectionDivider />
      <AboutSection />
      <SectionDivider className="opacity-50" />
      <ProcessSection />
      <SectionDivider />
      <WorkExamples />
      <SectionDivider />
      <CharacterSection />
      <SectionDivider className="opacity-50" />
      <PricingSection onRegisterClick={onRegisterClick} />
      <SectionDivider />
      <FAQSection />
      <CTASection onRegisterClick={onRegisterClick} />
    </main>
  );
}
