import { MetadataRoute } from 'next';

export default function sitemap(): MetadataRoute.Sitemap {
  return [
    {
      url: 'https://3v3.ek21.com',
      lastModified: new Date('2026-01-16'),
      changeFrequency: 'monthly',
      priority: 1,
    },
  ];
}
