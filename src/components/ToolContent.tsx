import type { ToolConfig } from '@/lib/tools';

export function ToolContent({ tool }: { tool: ToolConfig }) {
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: tool.faq.map((f) => ({
      '@type': 'Question',
      name: f.question,
      acceptedAnswer: { '@type': 'Answer', text: f.answer },
    })),
  };

  return (
    <div className="flex flex-col gap-8">
      <section aria-labelledby="como-se-usa">
        <h2 id="como-se-usa" className="mb-3 text-xl font-semibold">
          Cómo se usa
        </h2>
        <ol className="list-inside list-decimal space-y-1 text-neutral-700 dark:text-neutral-300">
          {tool.steps.map((s) => (
            <li key={s}>{s}</li>
          ))}
        </ol>
      </section>

      <section aria-labelledby="preguntas">
        <h2 id="preguntas" className="mb-3 text-xl font-semibold">
          Preguntas frecuentes
        </h2>
        <div className="flex flex-col gap-2">
          {tool.faq.map((f) => (
            <details key={f.question} className="rounded-xl border border-neutral-200 p-3 dark:border-neutral-800">
              <summary className="cursor-pointer font-medium">{f.question}</summary>
              <p className="mt-2 text-neutral-700 dark:text-neutral-300">{f.answer}</p>
            </details>
          ))}
        </div>
      </section>

      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, '\\u003c') }}
      />
    </div>
  );
}
