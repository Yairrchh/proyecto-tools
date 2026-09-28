import { describe, expect, it } from 'vitest';
import { FORMAT_TOOLS, HOME_TOOL, getToolBySlug } from '@/lib/tools';

const all = [HOME_TOOL, ...FORMAT_TOOLS];

describe('configuración SEO de las herramientas', () => {
  it('tiene las rutas por formato esperadas', () => {
    expect(FORMAT_TOOLS.map((t) => t.slug)).toEqual(['comprimir-jpg', 'comprimir-png', 'comprimir-webp']);
  });
  it('los slugs son únicos', () => {
    const slugs = all.map((t) => t.slug);
    expect(new Set(slugs).size).toBe(slugs.length);
  });
  it.each(all.map((t) => [t.slug || '(inicio)', t] as const))('%s tiene metadatos válidos', (_name, t) => {
    expect(t.title.length).toBeGreaterThan(10);
    expect(t.title.length).toBeLessThanOrEqual(60);
    expect(t.description.length).toBeGreaterThan(50);
    expect(t.description.length).toBeLessThanOrEqual(160);
    expect(t.steps.length).toBeGreaterThanOrEqual(3);
    expect(t.faq.length).toBeGreaterThanOrEqual(3);
  });
  it('getToolBySlug encuentra y rechaza', () => {
    expect(getToolBySlug('comprimir-png')?.slug).toBe('comprimir-png');
    expect(getToolBySlug('comprimir-gif')).toBeUndefined();
    expect(getToolBySlug('')).toBeUndefined();
  });
});
