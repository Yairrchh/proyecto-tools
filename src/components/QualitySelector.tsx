'use client';

import { QUALITY_LEVELS, QUALITY_ORDER } from '@/lib/quality';
import type { QualityLevel } from '@/lib/types';

export function QualitySelector({
  value,
  onChange,
}: {
  value: QualityLevel;
  onChange: (level: QualityLevel) => void;
}) {
  return (
    <div role="radiogroup" aria-label="Nivel de compresión" className="grid grid-cols-1 gap-2 sm:grid-cols-3">
      {QUALITY_ORDER.map((level) => {
        const preset = QUALITY_LEVELS[level];
        const active = level === value;
        return (
          <button
            key={level}
            type="button"
            role="radio"
            aria-checked={active}
            onClick={() => onChange(level)}
            className={`rounded-xl border p-3 text-left transition-colors ${
              active
                ? 'border-blue-600 bg-blue-50 dark:bg-blue-950'
                : 'border-neutral-300 hover:border-blue-400 dark:border-neutral-700'
            }`}
          >
            <span className="block font-medium">{preset.label}</span>
            <span className="block text-xs text-neutral-600 dark:text-neutral-400">{preset.description}</span>
          </button>
        );
      })}
    </div>
  );
}
