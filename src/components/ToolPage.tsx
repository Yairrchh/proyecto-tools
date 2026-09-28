import type { ReactNode } from 'react';
import { ImageCompressor } from './ImageCompressor';

export function ToolPage({ h1, intro, children }: { h1: string; intro: string; children?: ReactNode }) {
  return (
    <main className="mx-auto flex w-full max-w-3xl flex-col gap-8 px-4 py-10">
      <header className="flex flex-col gap-2 text-center">
        <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">{h1}</h1>
        <p className="text-neutral-600 dark:text-neutral-400">{intro}</p>
      </header>
      <ImageCompressor />
      {children}
    </main>
  );
}
