import type { WebsiteCrawlResult } from "./site-crawler";

export type WebsiteBusinessProfile = {
  name: string;
  category: string;
  location: string;
  targetAttributes: string[];
};

const CATEGORY_HINTS = [
  "dentist",
  "dental clinic",
  "orthodontist",
  "solicitor",
  "accountant",
  "estate agent",
  "plumber",
  "electrician",
  "physiotherapist",
  "veterinary",
  "restaurant",
  "clinic"
];

const ATTRIBUTE_HINTS = [
  "emergency",
  "same-day",
  "children",
  "family",
  "invisalign",
  "root canal",
  "implants",
  "cosmetic",
  "private",
  "nhs",
  "finance",
  "nervous patients",
  "reviews",
  "opening hours"
];

export function inferBusinessProfile(crawl: WebsiteCrawlResult): WebsiteBusinessProfile {
  const homepage = crawl.pages[0];
  const summary = crawl.summaryText.toLowerCase();
  const titleName = cleanTitle(homepage?.title || new URL(crawl.normalizedUrl).hostname.replace(/^www\./, ""));

  return {
    name: titleName,
    category: inferCategory(summary),
    location: inferLocation(crawl.summaryText) || "Unknown location",
    targetAttributes: inferAttributes(summary)
  };
}

function cleanTitle(title: string) {
  return title
    .split(/[-|•]/)[0]
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 80);
}

function inferCategory(summary: string) {
  const match = CATEGORY_HINTS.find((hint) => summary.includes(hint));
  if (!match) {
    return "local business";
  }
  if (match === "dental clinic") {
    return "dentist";
  }
  return match;
}

function inferAttributes(summary: string) {
  const attributes = ATTRIBUTE_HINTS.filter((hint) => summary.includes(hint));
  return Array.from(new Set(attributes)).slice(0, 10);
}

function inferLocation(text: string) {
  const postcode = text.match(/\b[A-Z]{1,2}\d[A-Z\d]?\s*\d[A-Z]{2}\b/i)?.[0];
  const locationLine = text.match(/\b(?:in|near|serving)\s+([A-Z][A-Za-z .'-]+(?:,\s*[A-Z][A-Za-z .'-]+)?)/)?.[1];
  return [locationLine, postcode].filter(Boolean).join(", ") || null;
}
