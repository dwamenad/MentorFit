import type { SourcePreview } from '../../src/lib/mentor-engine';
import { readThroughCache } from './cache';
import { fetchTextWithPolicy } from './http';

const FACULTY_PAGE_TTL_MS = 24 * 60 * 60 * 1000;

function decodeEntities(value: string) {
  return value
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/\s+/g, ' ')
    .trim();
}

function stripTags(value: string) {
  return decodeEntities(value.replace(/<[^>]+>/g, ' '));
}

function matchFirst(html: string, pattern: RegExp) {
  const match = html.match(pattern);
  return match?.[1] ? stripTags(match[1]) : undefined;
}

export function inferSourceTypeFromUrl(rawUrl: string): SourcePreview['sourceType'] {
  const url = new URL(rawUrl);
  if (url.hostname.includes('scholar.google')) {
    return 'Google Scholar';
  }
  if (url.hostname.includes('orcid.org')) {
    return 'ORCID';
  }
  if (/lab|labs|center|centre|group|institute/.test(url.pathname)) {
    return 'Lab Page';
  }
  if (/faculty|people|person|staff|profile/.test(url.pathname)) {
    return 'Faculty Page';
  }
  return 'Personal Website';
}

export async function fetchSourcePreview(rawUrl: string): Promise<SourcePreview> {
  const sourceType = inferSourceTypeFromUrl(rawUrl);

  return readThroughCache({
    namespace: 'faculty-page-preview',
    key: rawUrl,
    ttlMs: FACULTY_PAGE_TTL_MS,
    loader: async () => {
      try {
        const { body, contentType, ok, status } = await fetchTextWithPolicy(rawUrl, {
          redirect: 'follow',
        });

        const headings = Array.from(body.matchAll(/<h[1-2][^>]*>([\s\S]*?)<\/h[1-2]>/gi))
          .map((match) => stripTags(match[1]))
          .filter(Boolean)
          .slice(0, 4);

        const title = matchFirst(body, /<title[^>]*>([\s\S]*?)<\/title>/i);
        const description =
          matchFirst(body, /<meta[^>]+name=["']description["'][^>]+content=["']([\s\S]*?)["'][^>]*>/i) ??
          matchFirst(body, /<meta[^>]+property=["']og:description["'][^>]+content=["']([\s\S]*?)["'][^>]*>/i);

        return {
          title,
          description,
          headings,
          fetched: ok,
          fetchNote: ok
            ? contentType.includes('html')
              ? undefined
              : `Fetched ${contentType || 'non-HTML content'}; used limited metadata extraction.`
            : `Source responded with ${status}.`,
          sourceType,
          sourceReliability: ok ? (contentType.includes('html') ? 0.78 : 0.58) : 0.32,
        };
      } catch (error) {
        return {
          headings: [],
          fetched: false,
          fetchNote: error instanceof Error ? error.message : 'Unable to fetch source preview.',
          sourceType,
          sourceReliability: 0.28,
        };
      }
    },
  });
}
