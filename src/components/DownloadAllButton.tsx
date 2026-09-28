'use client';

import { useState } from 'react';
import { downloadBlob } from '@/lib/download';
import type { Job } from '@/lib/jobs';
import { buildZip } from '@/lib/zip';

export function DownloadAllButton({ jobs, names }: { jobs: Job[]; names: Map<string, string> }) {
  const [busy, setBusy] = useState(false);
  const ready = jobs.filter((j) => j.status === 'done' && j.blob);

  async function onClick() {
    setBusy(true);
    try {
      const zip = await buildZip(ready.map((j) => ({ name: names.get(j.id)!, blob: j.blob! })));
      downloadBlob(zip, 'imagenes-comprimidas.zip');
    } finally {
      setBusy(false);
    }
  }

  return (
    <button
      type="button"
      disabled={ready.length === 0 || busy}
      onClick={onClick}
      className="rounded-xl bg-blue-600 px-5 py-3 font-medium text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
    >
      {busy ? 'Preparando…' : `Descargar todo (${ready.length})`}
    </button>
  );
}
