import type { MetadataRoute } from 'next';
import { SITE_URL } from '@/lib/site';
import { FORMAT_TOOLS } from '@/lib/tools';

export default function sitemap(): MetadataRoute.Sitemap {
  return [
    { url: SITE_URL, priority: 1 },
    ...FORMAT_TOOLS.map((t) => ({ url: `${SITE_URL}/${t.slug}`, priority: 0.8 })),
  ];
}
