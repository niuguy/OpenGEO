import * as cheerio from "cheerio";
import { ProxyAgent } from "undici";
import { normalizeWebsiteUrl } from "./site-crawler";

export type OutreachFormField = {
  name: string | null;
  type: string;
  label: string | null;
  placeholder: string | null;
  required: boolean;
};

export type OutreachForm = {
  pageUrl: string;
  action: string | null;
  method: string;
  classification: "contact" | "booking" | "newsletter" | "search" | "unknown";
  hasCaptcha: boolean;
  submitText: string | null;
  fields: OutreachFormField[];
};

export type OutreachContactPage = {
  url: string;
  title: string | null;
  emails: string[];
  phoneNumbers: string[];
  formCount: number;
};

export type OutreachCrawlResult = {
  websiteUrl: string;
  normalizedUrl: string;
  emails: string[];
  phoneNumbers: string[];
  contactPages: OutreachContactPage[];
  forms: OutreachForm[];
  pagesScanned: number;
};

type ParsedOutreachPage = OutreachContactPage & {
  links: string[];
  forms: OutreachForm[];
};

const DEFAULT_MAX_PAGES = 8;
const MAX_TEXT_FOR_SIGNALS = 7000;
const EMAIL_PATTERN = /\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/gi;
const PHONE_PATTERN = /(?:\+44\s?|0)(?:\d[\s().-]?){9,12}\d/g;
const PRIORITY_LINK_PATTERN = /contact|enquir|appointment|book|visit|about|team|location/i;
const LIKELY_PUBLIC_EMAIL_TLDS = new Set([
  "uk",
  "com",
  "org",
  "net",
  "co",
  "info",
  "clinic",
  "dental",
  "dentist"
]);

export async function crawlOutreachContacts(inputUrl: string, maxPages = DEFAULT_MAX_PAGES): Promise<OutreachCrawlResult> {
  const normalizedUrl = normalizeWebsiteUrl(inputUrl);
  const start = new URL(normalizedUrl);
  const queue = [start.toString()];
  const seen = new Set<string>();
  const pages: ParsedOutreachPage[] = [];

  while (queue.length > 0 && pages.length < maxPages) {
    const url = queue.shift();
    if (!url || seen.has(url)) {
      continue;
    }
    seen.add(url);

    const page = await fetchOutreachPage(url);
    if (!page) {
      continue;
    }
    pages.push(page);

    const internalLinks = page.links
      .filter((link) => {
        const parsed = new URL(link);
        return parsed.hostname === start.hostname && !seen.has(parsed.toString());
      })
      .sort((a, b) => Number(PRIORITY_LINK_PATTERN.test(b)) - Number(PRIORITY_LINK_PATTERN.test(a)));

    for (const link of internalLinks) {
      if (pages.length + queue.length >= maxPages) {
        break;
      }
      if (!queue.includes(link)) {
        queue.push(link);
      }
    }
  }

  const emails = uniqueSorted(pages.flatMap((page) => page.emails));
  const phoneNumbers = uniqueSorted(pages.flatMap((page) => page.phoneNumbers));
  const forms = pages.flatMap((page) => page.forms);

  return {
    websiteUrl: inputUrl,
    normalizedUrl,
    emails,
    phoneNumbers,
    contactPages: pages
      .filter((page) => page.emails.length > 0 || page.phoneNumbers.length > 0 || page.formCount > 0 || PRIORITY_LINK_PATTERN.test(page.url))
      .map(({ links: _links, forms: _forms, ...page }) => page),
    forms,
    pagesScanned: pages.length
  };
}

export function extractOutreachSignals(url: string, html: string): ParsedOutreachPage {
  const $ = cheerio.load(html);
  const base = new URL(url);
  const rawHtml = html.replace(/&commat;|&#64;/gi, "@").replace(/&period;|&#46;/gi, ".");
  const visibleText = $("body").text().replace(/\s+/g, " ").trim().slice(0, MAX_TEXT_FOR_SIGNALS);
  const emails = uniqueSorted([...extractEmails(rawHtml), ...extractObfuscatedEmails(visibleText)]);
  const phoneNumbers = uniqueSorted([...extractPhoneNumbers(visibleText), ...extractTelLinks($)]);
  const links = extractLinks($, base);
  const forms = extractForms($, base);

  return {
    url,
    title: $("title").first().text().trim() || null,
    emails,
    phoneNumbers,
    formCount: forms.length,
    links,
    forms
  };
}

async function fetchOutreachPage(url: string): Promise<ParsedOutreachPage | null> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), Number(process.env.WEBSITE_CRAWL_TIMEOUT_MS || 12000));

  try {
    const response = await fetchWithProxyFallback(url, controller.signal);
    const contentType = response.headers.get("content-type") || "";
    if (!response.ok || !contentType.includes("text/html")) {
      return null;
    }
    return extractOutreachSignals(url, await response.text());
  } catch {
    return null;
  } finally {
    clearTimeout(timeout);
  }
}

async function fetchWithProxyFallback(url: string, signal: AbortSignal) {
  const init = {
    signal,
    headers: {
      "user-agent": "LocalAIVisibilityTracker/0.1 (+public outreach contact discovery; contact site owner)"
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

function extractEmails(text: string) {
  return Array.from(text.matchAll(EMAIL_PATTERN))
    .map((match) => normalizeEmail(match[0]))
    .filter(isUsefulEmail);
}

function extractObfuscatedEmails(text: string) {
  const normalized = text
    .replace(/\s*(?:\[|\()?at(?:\]|\))?\s*/gi, "@")
    .replace(/\s*(?:\[|\()?dot(?:\]|\))?\s*/gi, ".")
    .replace(/\s+@\s+/g, "@")
    .replace(/\s+\.\s+/g, ".");

  return extractEmails(normalized);
}

function extractPhoneNumbers(text: string) {
  return Array.from(text.matchAll(PHONE_PATTERN))
    .map((match) => match[0].replace(/\s+/g, " ").trim())
    .filter((phone) => phone.replace(/\D/g, "").length >= 10);
}

function extractTelLinks($: cheerio.CheerioAPI) {
  return $("a[href^='tel:']")
    .map((_index, element) => ($(element).attr("href") || "").replace(/^tel:/i, "").trim())
    .get()
    .filter(Boolean);
}

function extractLinks($: cheerio.CheerioAPI, base: URL) {
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
  return Array.from(links);
}

function extractForms($: cheerio.CheerioAPI, base: URL): OutreachForm[] {
  return $("form")
    .map((_index, element) => {
      const form = $(element);
      const action = form.attr("action");
      const fields = form
        .find("input, textarea, select")
        .map((_fieldIndex, fieldElement) => {
          const field = $(fieldElement);
          const id = field.attr("id");
          return {
            name: field.attr("name") || id || null,
            type: field.attr("type") || fieldElement.tagName.toLowerCase(),
            label: id ? $(`label[for="${cssEscape(id)}"]`).text().replace(/\s+/g, " ").trim() || null : null,
            placeholder: field.attr("placeholder") || null,
            required: field.is("[required], [aria-required='true']")
          };
        })
        .get()
        .filter((field) => field.type !== "hidden");
      const submitText =
        form.find("button[type='submit'], input[type='submit'], button").first().text().replace(/\s+/g, " ").trim() ||
        form.find("input[type='submit']").first().attr("value") ||
        null;
      const actionUrl = action ? safeUrl(action, base) : base.toString();
      const formText = `${form.attr("id") || ""} ${form.attr("class") || ""} ${action || ""} ${submitText || ""} ${fields
        .map((field) => `${field.name || ""} ${field.placeholder || ""} ${field.label || ""}`)
        .join(" ")}`;

      return {
        pageUrl: base.toString(),
        action: actionUrl,
        method: (form.attr("method") || "GET").toUpperCase(),
        classification: classifyForm(formText),
        hasCaptcha: /captcha|recaptcha|hcaptcha|g-recaptcha/i.test(form.html() || ""),
        submitText,
        fields
      };
    })
    .get();
}

function classifyForm(text: string): OutreachForm["classification"] {
  if (/search/i.test(text)) {
    return "search";
  }
  if (/newsletter|subscribe/i.test(text)) {
    return "newsletter";
  }
  if (/appointment|booking|book|consultation|callback/i.test(text)) {
    return "booking";
  }
  if (/contact|enquir|message|email|phone|name/i.test(text)) {
    return "contact";
  }
  return "unknown";
}

function safeUrl(value: string, base: URL) {
  try {
    return new URL(value, base).toString();
  } catch {
    return null;
  }
}

function cssEscape(value: string) {
  return value.replace(/["\\]/g, "\\$&");
}

function normalizeEmail(email: string) {
  return email.toLowerCase().replace(/^mailto:/, "").replace(/[),.;:]+$/, "");
}

function isUsefulEmail(email: string) {
  const domain = email.split("@")[1];
  const tld = domain?.split(".").at(-1);
  return Boolean(domain && tld && LIKELY_PUBLIC_EMAIL_TLDS.has(tld)) &&
    !/\.(png|jpg|jpeg|gif|webp|svg|css|js)$/i.test(email) &&
    !email.includes("example.");
}

function uniqueSorted(values: string[]) {
  return Array.from(new Set(values.map((value) => value.trim()).filter(Boolean))).sort((a, b) => a.localeCompare(b));
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
