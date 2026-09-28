import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { ToolContent } from '@/components/ToolContent';
import { ToolPage } from '@/components/ToolPage';
import { FORMAT_TOOLS, getToolBySlug } from '@/lib/tools';

export const dynamicParams = false;

export function generateStaticParams() {
  return FORMAT_TOOLS.map((t) => ({ tool: t.slug }));
}

type Props = { params: Promise<{ tool: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { tool } = await params;
  const config = getToolBySlug(tool);
  if (!config) return {};
  return {
    title: config.title,
    description: config.description,
    alternates: { canonical: `/${config.slug}` },
    openGraph: { title: config.title, description: config.description, url: `/${config.slug}`, type: 'website' },
  };
}

export default async function FormatToolPage({ params }: Props) {
  const { tool } = await params;
  const config = getToolBySlug(tool);
  if (!config) notFound();
  return (
    <ToolPage h1={config.h1} intro={config.intro}>
      <ToolContent tool={config} />
    </ToolPage>
  );
}
