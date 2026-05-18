import * as cheerio from "cheerio";
import { ProxyAgent } from "undici";

export type CrawledPage = {
  url: string;
  title: string | null;
  description: string | null;
  headings: string[];
  text: string;
  links: string[];
  schemaTypes: string[];
};

export type WebsiteCrawlResult = {
  websiteUrl: string;
  normalizedUrl: string;
  pages: CrawledPage[];
  summaryText: string;
};

const DEFAULT_MAX_PAGES = 6;
const MAX_TEXT_PER_PAGE = 5000;

export function normalizeWebsiteUrl(input: string) {
  const value = input.trim();
  const withProtocol = /^https?:\/\//i.test(value) ? value : `https://${value}`;
  const url = new URL(withProtocol);
  url.hash = "";
  return url.toString().replace(/\/$/, "");
}

export async function crawlWebsite(inputUrl: string, maxPages = DEFAULT_MAX_PAGES): Promise<WebsiteCrawlResult> {
  const normalizedUrl = normalizeWebsiteUrl(inputUrl);
  const start = new URL(normalizedUrl);
  const queue = [start.toString()];
  const seen = new Set<string>();
  const pages: CrawledPage[] = [];

  while (queue.length > 0 && pages.length < maxPages) {
    const url = queue.shift();
    if (!url || seen.has(url)) {
      continue;
    }
    seen.add(url);

    const page = await fetchPage(url);
    if (!page) {
      continue;
    }
    pages.push(page);

    for (const link of page.links) {
      if (pages.length + queue.length >= maxPages) {
        break;
      }
      const parsed = new URL(link);
      if (parsed.hostname === start.hostname && !seen.has(parsed.toString())) {
        queue.push(parsed.toString());
      }
    }
  }

  return {
    websiteUrl: inputUrl,
    normalizedUrl,
    pages,
    summaryText: pages.map((page) => [page.title, page.description, page.headings.join(" "), page.text].filter(Boolean).join("\n")).join("\n\n")
  };
}

async function fetchPage(url: string): Promise<CrawledPage | null> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), Number(process.env.WEBSITE_CRAWL_TIMEOUT_MS || 12000));

  try {
    const response = await fetchWithProxyFallback(url, controller.signal);
    const contentType = response.headers.get("content-type") || "";
    if (!response.ok || !contentType.includes("text/html")) {
      return null;
    }

    return parseHtml(url, await response.text());
  } finally {
    clearTimeout(timeout);
  }
}

async function fetchWithProxyFallback(url: string, signal: AbortSignal) {
  const init = {
    signal,
    headers: {
      "user-agent": "LocalAIVisibilityTracker/0.1 (+website audit; contact site owner)"
    }
  };
  const dispatcher = getProxyDispatcher();

  if (!dispatcher) {
    return fetch(url, init);
  }

  try {
    return await fetch(url, {
      ...init,
      dispatcher
    } as RequestInit);
  } catch {
    return fetch(url, init);
  }
}

function getProxyDispatcher() {
  const proxy =
    process.env.HTTP_PROXY ||
    process.env.http_proxy ||
    process.env.HTTPS_PROXY ||
    process.env.https_proxy;

  if (!proxy || !/^https?:\/\//i.test(proxy)) {
    return undefined;
  }

  return new ProxyAgent(proxy);
}

function parseHtml(url: string, html: string): CrawledPage {
  const $ = cheerio.load(html);
  $("script, style, noscript, svg").remove();

  const base = new URL(url);
  const links = new Set<string>();
  $("a[href]").each((_index, element) => {
    const href = $(element).attr("href");
    if (!href || href.startsWith("mailto:") || href.startsWith("tel:")) {
      return;
    }
    try {
      const parsed = new URL(href, base);
      parsed.hash = "";
      links.add(parsed.toString().replace(/\/$/, ""));
    } catch {
      // Ignore malformed links.
    }
  });

  const schemaTypes = new Set<string>();
  $('script[type="application/ld+json"]').each((_index, element) => {
    const raw = $(element).text();
    try {
      const parsed = JSON.parse(raw);
      collectSchemaTypes(parsed, schemaTypes);
    } catch {
      // Schema blocks are often invalid; ignore them.
    }
  });

  const text = $("body")
    .text()
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, MAX_TEXT_PER_PAGE);

  return {
    url,
    title: $("title").first().text().trim() || null,
    description: $('meta[name="description"]').attr("content")?.trim() || null,
    headings: $("h1,h2")
      .map((_index, element) => $(element).text().replace(/\s+/g, " ").trim())
      .get()
      .filter(Boolean)
      .slice(0, 20),
    text,
    links: Array.from(links),
    schemaTypes: Array.from(schemaTypes)
  };
}

function collectSchemaTypes(value: unknown, output: Set<string>) {
  if (Array.isArray(value)) {
    value.forEach((item) => collectSchemaTypes(item, output));
    return;
  }

  if (!value || typeof value !== "object") {
    return;
  }

  const record = value as Record<string, unknown>;
  const type = record["@type"];
  if (typeof type === "string") {
    output.add(type);
  } else if (Array.isArray(type)) {
    type.filter((item): item is string => typeof item === "string").forEach((item) => output.add(item));
  }

  for (const nested of Object.values(record)) {
    if (nested && typeof nested === "object") {
      collectSchemaTypes(nested, output);
    }
  }
}
