import type { Metadata } from 'next';
import { ToolContent } from '@/components/ToolContent';
import { ToolPage } from '@/components/ToolPage';
import { HOME_TOOL } from '@/lib/tools';

export const metadata: Metadata = {
  title: HOME_TOOL.title,
  description: HOME_TOOL.description,
  alternates: { canonical: '/' },
  openGraph: { title: HOME_TOOL.title, description: HOME_TOOL.description, url: '/', type: 'website' },
};

export default function Home() {
  return (
    <ToolPage h1={HOME_TOOL.h1} intro={HOME_TOOL.intro}>
      <ToolContent tool={HOME_TOOL} />
    </ToolPage>
  );
}
