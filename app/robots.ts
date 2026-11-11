import type { MetadataRoute } from 'next';

/**
 * Self-host instances should stay out of search / AI indexes.
 * Canonical product + SEO live on https://flowcomments.com (Cloud).
 */
export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: '*',
      disallow: '/',
    },
  };
}
