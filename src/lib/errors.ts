export const ANIMATED_WEBP = 'animated-webp';

export function friendlyError(message: string): string {
  if (message === ANIMATED_WEBP) {
    return 'Este WebP es animado: se perdería la animación, así que no se comprime.';
  }
  return 'No se pudo procesar esta imagen.';
}
