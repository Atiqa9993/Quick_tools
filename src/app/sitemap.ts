import type { MetadataRoute } from 'next'

const BASE_URL = 'https://handwriteai.com'

/** All active tool slugs that resolve under /tools/[slug] */
const TOOL_SLUGS = [
  // PDF
  'compress-pdf',
  'pdf-to-word',
  'merge-pdf',
  'split-pdf',
  'pdf-to-text',
  // Image
  'image-compressor',
  'resize-image',
  'background-remover',
  'image-converter',
  'merge-images',
  'image-to-text',
  'image-to-pdf',
  // Text
  'word-counter',
  'case-converter',
  'remove-line-breaks',
  'bulk-ocr',
  // Converters
  'json-to-csv',
  'unit-converter',
  'currency-converter',
  'qr-code-generator',
]

export default function sitemap(): MetadataRoute.Sitemap {
  const toolPages = TOOL_SLUGS.map((slug) => ({
    url: `${BASE_URL}/tools/${slug}`,
    lastModified: new Date(),
    changeFrequency: 'monthly' as const,
    priority: 0.8,
  }))

  return [
    {
      url: BASE_URL,
      lastModified: new Date(),
      changeFrequency: 'weekly' as const,
      priority: 1,
    },
    {
      url: `${BASE_URL}/pricing`,
      lastModified: new Date(),
      changeFrequency: 'monthly' as const,
      priority: 0.9,
    },
    ...toolPages,
    {
      url: `${BASE_URL}/contact`,
      lastModified: new Date(),
      changeFrequency: 'yearly' as const,
      priority: 0.5,
    },
    {
      url: `${BASE_URL}/privacy`,
      lastModified: new Date(),
      changeFrequency: 'yearly' as const,
      priority: 0.4,
    },
    {
      url: `${BASE_URL}/terms`,
      lastModified: new Date(),
      changeFrequency: 'yearly' as const,
      priority: 0.4,
    },
  ]
}
