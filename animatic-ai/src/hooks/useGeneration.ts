/**
 * useGeneration.ts — Прокси-хук для GenerationContext
 * Обеспечивает обратную совместимость со старым импортом.
 */
export { useGeneration } from "../contexts/GenerationContext";
export type { 
  GenerationMode, 
  GenerationStatus, 
  QualityLevel, 
  GenerationSettings, 
  GenerationHistory 
} from "../contexts/GenerationContext";