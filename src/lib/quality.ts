import type { QualityLevel } from './types';

export interface QualityPreset {
  label: string;
  description: string;
  jpeg: number;
  webp: number;
  pngLevel: number;
}

export const QUALITY_LEVELS: Record<QualityLevel, QualityPreset> = {
  high: { label: 'Alta calidad', description: 'Casi sin diferencia visible', jpeg: 85, webp: 85, pngLevel: 2 },
  balanced: { label: 'Equilibrada', description: 'La mejor relación tamaño/calidad', jpeg: 75, webp: 75, pngLevel: 3 },
  max: { label: 'Máxima compresión', description: 'El archivo más pequeño posible', jpeg: 60, webp: 60, pngLevel: 4 },
};

export const QUALITY_ORDER: QualityLevel[] = ['high', 'balanced', 'max'];
export const DEFAULT_QUALITY: QualityLevel = 'balanced';
