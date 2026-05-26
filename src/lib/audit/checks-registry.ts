// V1 AuditCheck registry — 48 deterministic checks across 5 categories.
// Seeded into the `AuditCheck` table when the audit schema migration lands.
// Each entry is rich enough to drive both the check implementation (criteria)
// and the customer-facing report (label + description + fixGuidance).

export type AuditCheckCategory =
  | "crawler-config"
  | "structured-data"
  | "google-business-profile"
  | "site-signals"
  | "off-site-citations";

export type AuditCheckSource =
  | "google"
  | "openai"
  | "anthropic"
  | "perplexity"
  | "apple"
  | "schema.org"
  | "community"
  | "internal";

export type AuditCheckDefinition = {
  id: string;
  category: AuditCheckCategory;
  label: string;
  description: string;
  weight: number;
  vertical: string | null;
  source: AuditCheckSource;
  docsUrl: string | null;
  criteria: string;
  fixGuidance: string;
};

export const CATEGORY_LABELS: Record<AuditCheckCategory, string> = {
  "crawler-config": "AI Crawler Configuration",
  "structured-data": "Structured Data Completeness",
  "google-business-profile": "Google Business Profile",
  "site-signals": "Site & Content Signals",
  "off-site-citations": "Off-site Citations & Reviews",
};

// ─────────────────────────────────────────────────────────────────────────────
// Category 1 — AI Crawler Configuration (10 checks)
// ─────────────────────────────────────────────────────────────────────────────

const crawlerConfigChecks: AuditCheckDefinition[] = [
  {
    id: "crawler.gptbot-directive",
    category: "crawler-config",
    label: "GPTBot directive in robots.txt",
    description:
      "OpenAI's GPTBot crawler is used for training and general web indexing. An explicit directive (allow or disallow) signals intentional policy and confirms the site is reachable for AI ingestion.",
    weight: 2,
    vertical: null,
    source: "openai",
    docsUrl: "https://platform.openai.com/docs/gptbot",
    criteria:
      "PASS: explicit `User-agent: GPTBot` directive present and not blanket-disallowed. WARN: no directive (relies on default-allow). FAIL: GPTBot explicitly disallowed.",
    fixGuidance:
      "Add an explicit GPTBot block to robots.txt: `User-agent: GPTBot` followed by `Allow: /` to enable visibility, or `Disallow: /` to opt out.",
  },
  {
    id: "crawler.oai-searchbot-directive",
    category: "crawler-config",
    label: "OAI-SearchBot directive in robots.txt",
    description:
      "OAI-SearchBot indexes the web for ChatGPT Search citations. Blocking it removes the site from ChatGPT Search results entirely — usually unintended.",
    weight: 3,
    vertical: null,
    source: "openai",
    docsUrl: "https://platform.openai.com/docs/bots",
    criteria:
      "PASS: OAI-SearchBot explicitly allowed (or no blanket disallow). FAIL: OAI-SearchBot disallowed — site cannot appear in ChatGPT Search.",
    fixGuidance:
      "Add `User-agent: OAI-SearchBot\\nAllow: /` to robots.txt. Blocking this bot removes you from ChatGPT Search citations.",
  },
  {
    id: "crawler.google-extended-directive",
    category: "crawler-config",
    label: "Google-Extended directive in robots.txt",
    description:
      "Google-Extended controls whether Google can use the site's content for AI training (Gemini, Vertex AI). An explicit directive signals intentional opt-in or opt-out.",
    weight: 2,
    vertical: null,
    source: "google",
    docsUrl: "https://developers.google.com/search/docs/crawling-indexing/overview-google-crawlers",
    criteria:
      "PASS: explicit Google-Extended directive present. WARN: no directive (default-allow). Note: this controls AI training, separate from regular Googlebot indexing.",
    fixGuidance:
      "Add `User-agent: Google-Extended\\nAllow: /` to opt in to AI training, or `Disallow: /` to opt out. Note: this is separate from Googlebot for search.",
  },
  {
    id: "crawler.claudebot-directive",
    category: "crawler-config",
    label: "ClaudeBot directive in robots.txt",
    description:
      "Anthropic's ClaudeBot indexes content used by Claude and Claude.ai. Allowing it enables Claude to retrieve and cite the site.",
    weight: 1,
    vertical: null,
    source: "anthropic",
    docsUrl: "https://support.anthropic.com/en/articles/8896518-does-anthropic-crawl-data-from-the-web-and-how-can-site-owners-block-the-crawler",
    criteria:
      "PASS: ClaudeBot explicitly allowed or no blanket disallow. WARN: no directive. FAIL: ClaudeBot disallowed.",
    fixGuidance:
      "Add `User-agent: ClaudeBot\\nAllow: /` to robots.txt to enable Claude to cite your content.",
  },
  {
    id: "crawler.perplexitybot-directive",
    category: "crawler-config",
    label: "PerplexityBot directive in robots.txt",
    description:
      "PerplexityBot crawls content for citations in Perplexity AI search results. Allowing it enables visibility in Perplexity answers.",
    weight: 1,
    vertical: null,
    source: "perplexity",
    docsUrl: "https://docs.perplexity.ai/guides/bots",
    criteria:
      "PASS: PerplexityBot explicitly allowed or no blanket disallow. WARN: no directive. FAIL: PerplexityBot disallowed.",
    fixGuidance:
      "Add `User-agent: PerplexityBot\\nAllow: /` to robots.txt for Perplexity AI search visibility.",
  },
  {
    id: "crawler.applebot-extended-directive",
    category: "crawler-config",
    label: "Applebot-Extended directive in robots.txt",
    description:
      "Apple's Applebot-Extended controls whether content can be used for Apple Intelligence and AI model training. Separate from regular Applebot indexing.",
    weight: 1,
    vertical: null,
    source: "apple",
    docsUrl: "https://support.apple.com/en-gb/119829",
    criteria:
      "PASS: Applebot-Extended directive present. WARN: no directive. Note: blocking this is acceptable if Apple AI visibility is not a priority.",
    fixGuidance:
      "Add `User-agent: Applebot-Extended\\nAllow: /` to opt in to Apple Intelligence training, or `Disallow: /` to opt out.",
  },
  {
    id: "crawler.robots-valid",
    category: "crawler-config",
    label: "robots.txt is syntactically valid",
    description:
      "An unparseable robots.txt is treated as fully-permissive by most crawlers but flags poor maintenance and may cause downstream parsing errors in AI tools that depend on it.",
    weight: 1,
    vertical: null,
    source: "internal",
    docsUrl: "https://www.rfc-editor.org/rfc/rfc9309",
    criteria:
      "PASS: robots.txt fetched (200) and parses without errors per RFC 9309. FAIL: 4xx/5xx response, malformed directives, or invalid syntax.",
    fixGuidance:
      "Ensure /robots.txt returns 200 and follows RFC 9309 syntax. Common errors: missing newlines between blocks, typos in User-agent names, unescaped special characters.",
  },
  {
    id: "crawler.sitemap-referenced",
    category: "crawler-config",
    label: "Sitemap referenced from robots.txt",
    description:
      "Declaring `Sitemap:` URLs in robots.txt helps every crawler — search and AI alike — discover the canonical URL set faster than relying on link discovery.",
    weight: 1,
    vertical: null,
    source: "internal",
    docsUrl: "https://www.sitemaps.org/protocol.html",
    criteria:
      "PASS: at least one `Sitemap:` directive in robots.txt pointing to a fetchable XML sitemap.",
    fixGuidance:
      "Add `Sitemap: https://yourdomain.com/sitemap.xml` (absolute URL) to robots.txt. If you have multiple sitemaps, list each.",
  },
  {
    id: "crawler.no-blanket-disallow",
    category: "crawler-config",
    label: "No blanket disallow of all user agents",
    description:
      "A `User-agent: *` + `Disallow: /` block prevents every crawler — including all AI bots — from indexing the site. Almost always unintentional on production sites.",
    weight: 3,
    vertical: null,
    source: "internal",
    docsUrl: null,
    criteria:
      "PASS: no `User-agent: *` with blanket `Disallow: /`. FAIL: site is blocking all crawlers.",
    fixGuidance:
      "Remove the `User-agent: *` + `Disallow: /` block from robots.txt. If selective blocking is intended, target specific paths or user-agents instead.",
  },
  {
    id: "crawler.llms-txt-present",
    category: "crawler-config",
    label: "llms.txt present and valid",
    description:
      "The emerging llms.txt standard lets sites declare LLM-relevant content structure. Adoption is growing across AI tooling (Cloudflare, Anthropic, others). Early adopters gain a small ranking signal in LLM-aware indexers.",
    weight: 1,
    vertical: null,
    source: "community",
    docsUrl: "https://llmstxt.org/",
    criteria:
      "PASS: /llms.txt fetched (200) and starts with `# <Project Name>` per the spec. WARN: present but malformed. FAIL: absent (404).",
    fixGuidance:
      "Add /llms.txt at the site root with at least a project header and a short summary. Optional: link to key markdown documentation. Spec at llmstxt.org.",
  },
];

// ─────────────────────────────────────────────────────────────────────────────
// Category 2 — Structured Data Completeness (12 checks)
// ─────────────────────────────────────────────────────────────────────────────

const structuredDataChecks: AuditCheckDefinition[] = [
  {
    id: "schema.localbusiness-present",
    category: "structured-data",
    label: "LocalBusiness JSON-LD present",
    description:
      "LocalBusiness (or a vertical subtype) is the primary schema.org type that Google, Bing, and AI assistants use to identify and rank local businesses. Without it, AI tools fall back to text extraction and rank lower.",
    weight: 3,
    vertical: null,
    source: "schema.org",
    docsUrl: "https://schema.org/LocalBusiness",
    criteria:
      "PASS: valid JSON-LD `@type: LocalBusiness` (or subtype) parses on the homepage or primary location page. FAIL: no LocalBusiness markup found.",
    fixGuidance:
      "Add a JSON-LD <script type=\"application/ld+json\"> block with `@type: LocalBusiness` to the homepage. Generators: schema.org's example library or Google's Structured Data Markup Helper.",
  },
  {
    id: "schema.localbusiness-vertical-subtype",
    category: "structured-data",
    label: "Vertical-specific LocalBusiness subtype",
    description:
      "Vertical subtypes (Dentist, AccountingService, LegalService, etc.) carry industry-specific properties and rank better in AI assistants that match queries to specialty.",
    weight: 2,
    vertical: null,
    source: "schema.org",
    docsUrl: "https://schema.org/LocalBusiness",
    criteria:
      "PASS: `@type` is the most specific subtype for the business's vertical (e.g. Dentist not LocalBusiness for a dental clinic). WARN: generic LocalBusiness used when a subtype exists.",
    fixGuidance:
      "Replace `@type: LocalBusiness` with the vertical subtype: Dentist, AccountingService, LegalService, MedicalBusiness, etc. See schema.org/LocalBusiness for the full subtype tree.",
  },
  {
    id: "schema.localbusiness-required-props",
    category: "structured-data",
    label: "LocalBusiness required properties present",
    description:
      "name, address, telephone, url, and image are required for Google's Rich Results and for most AI assistants to confidently identify the business.",
    weight: 3,
    vertical: null,
    source: "google",
    docsUrl: "https://developers.google.com/search/docs/appearance/structured-data/local-business",
    criteria:
      "PASS: all 5 properties (name, address, telephone, url, image) present and non-empty. WARN: 1-2 missing. FAIL: 3+ missing.",
    fixGuidance:
      "Add the missing properties to your LocalBusiness JSON-LD. `address` should be a PostalAddress object with streetAddress, addressLocality, postalCode, addressCountry.",
  },
  {
    id: "schema.localbusiness-opening-hours",
    category: "structured-data",
    label: "openingHoursSpecification present",
    description:
      "Structured opening hours let AI assistants accurately answer 'is X open now?' queries — one of the highest-intent local searches.",
    weight: 2,
    vertical: null,
    source: "schema.org",
    docsUrl: "https://schema.org/OpeningHoursSpecification",
    criteria:
      "PASS: openingHoursSpecification array covers all 7 days with dayOfWeek, opens, closes. WARN: present but incomplete.",
    fixGuidance:
      "Add an openingHoursSpecification array with one entry per day. Use ISO 8601 time format (HH:MM). Include closed days explicitly with opens=closes=null.",
  },
  {
    id: "schema.localbusiness-geo",
    category: "structured-data",
    label: "Geo coordinates present",
    description:
      "Lat/lng coordinates anchor the business on a map and disambiguate location for AI assistants when address parsing is ambiguous.",
    weight: 1,
    vertical: null,
    source: "schema.org",
    docsUrl: "https://schema.org/GeoCoordinates",
    criteria:
      "PASS: geo property with GeoCoordinates (latitude + longitude) within valid ranges.",
    fixGuidance:
      "Add `geo: { @type: 'GeoCoordinates', latitude: 51.319, longitude: -0.555 }` to your LocalBusiness markup. Get coordinates from Google Maps (right-click → coordinates).",
  },
  {
    id: "schema.localbusiness-pricerange",
    category: "structured-data",
    label: "Price range property",
    description:
      "priceRange (e.g. '££', '$$$') helps AI assistants match price-sensitive queries like 'affordable dentist'.",
    weight: 1,
    vertical: null,
    source: "schema.org",
    docsUrl: "https://schema.org/priceRange",
    criteria:
      "PASS: priceRange property present with conventional notation (£, ££, £££ or $, $$, $$$).",
    fixGuidance:
      "Add `priceRange: '££'` (or appropriate level) to your LocalBusiness JSON-LD.",
  },
  {
    id: "schema.aggregaterating",
    category: "structured-data",
    label: "AggregateRating with ratingValue + reviewCount",
    description:
      "AggregateRating enables review snippets in search results and gives AI assistants a quantitative signal for ranking recommendations.",
    weight: 2,
    vertical: null,
    source: "google",
    docsUrl: "https://developers.google.com/search/docs/appearance/structured-data/review-snippet",
    criteria:
      "PASS: AggregateRating present with ratingValue (1-5) and reviewCount (>0). WARN: only one of the two. FAIL: absent or invalid.",
    fixGuidance:
      "Add `aggregateRating: { @type: 'AggregateRating', ratingValue: '4.7', reviewCount: '142' }`. Values must reflect a real, verifiable rating system on your site or a connected source.",
  },
  {
    id: "schema.review-present",
    category: "structured-data",
    label: "At least one Review object",
    description:
      "Individual Review objects provide qualitative content AI assistants can cite. Pairs with AggregateRating to substantiate the rating.",
    weight: 1,
    vertical: null,
    source: "schema.org",
    docsUrl: "https://schema.org/Review",
    criteria:
      "PASS: at least one Review with author, datePublished, reviewBody, reviewRating.",
    fixGuidance:
      "Add a `review` array to your LocalBusiness with one or more Review objects. Each needs author, datePublished, reviewBody, and reviewRating.",
  },
  {
    id: "schema.service-or-offercatalog",
    category: "structured-data",
    label: "Service or OfferCatalog markup",
    description:
      "Structured service listings let AI assistants match specific intent queries ('emergency dentist', 'tax planning') to the business's actual offerings.",
    weight: 2,
    vertical: null,
    source: "schema.org",
    docsUrl: "https://schema.org/OfferCatalog",
    criteria:
      "PASS: at least 3 Service items or an OfferCatalog with 3+ entries. WARN: 1-2 items. FAIL: none.",
    fixGuidance:
      "Add a `hasOfferCatalog` containing an OfferCatalog with itemListElement Service entries — one per offered service, with name and description.",
  },
  {
    id: "schema.breadcrumbs",
    category: "structured-data",
    label: "BreadcrumbList on service pages",
    description:
      "Breadcrumbs help search engines and AI assistants understand the site's information hierarchy and surface deeper service pages directly.",
    weight: 1,
    vertical: null,
    source: "google",
    docsUrl: "https://developers.google.com/search/docs/appearance/structured-data/breadcrumb",
    criteria:
      "PASS: BreadcrumbList JSON-LD present on service / category pages with at least 2 itemListElement entries.",
    fixGuidance:
      "Add BreadcrumbList JSON-LD to each service page reflecting the navigation path (Home → Services → Specific Service).",
  },
  {
    id: "schema.rich-results-valid",
    category: "structured-data",
    label: "Passes Google Rich Results Test",
    description:
      "Google's Rich Results Test is the canonical validator. Failing it means search & AI features that depend on structured data won't trigger.",
    weight: 2,
    vertical: null,
    source: "google",
    docsUrl: "https://search.google.com/test/rich-results",
    criteria:
      "PASS: Rich Results Test API returns no errors for the homepage. WARN: warnings only. FAIL: errors blocking eligibility.",
    fixGuidance:
      "Run the Rich Results Test on your homepage and fix each reported error. Common issues: missing required properties, wrong type, malformed values.",
  },
  {
    id: "schema.no-duplicate-localbusiness",
    category: "structured-data",
    label: "No conflicting LocalBusiness blocks",
    description:
      "Multiple LocalBusiness blocks with different names or IDs across pages confuse search engines and AI assistants about which entity is canonical.",
    weight: 1,
    vertical: null,
    source: "internal",
    docsUrl: null,
    criteria:
      "PASS: all LocalBusiness JSON-LD across crawled pages share the same `@id` or `name`. WARN: same name, different optional props. FAIL: conflicting names/identifiers.",
    fixGuidance:
      "Set a stable `@id` (e.g. URL of the homepage with a fragment) on every LocalBusiness block so all references point to the same entity. Reconcile any name variants.",
  },
];

// ─────────────────────────────────────────────────────────────────────────────
// Category 3 — Google Business Profile (10 checks)
// ─────────────────────────────────────────────────────────────────────────────

const googleBusinessProfileChecks: AuditCheckDefinition[] = [
  {
    id: "gbp.profile-findable",
    category: "google-business-profile",
    label: "GBP findable via Places API",
    description:
      "If the business cannot be located by name + location via the Places API, AI assistants (which use the same data) cannot cite it confidently. Foundational prerequisite for all GBP-derived ranking signals.",
    weight: 3,
    vertical: null,
    source: "google",
    docsUrl: "https://developers.google.com/maps/documentation/places/web-service/overview",
    criteria:
      "PASS: Places API findPlaceFromText returns exactly one match for `name + location`. WARN: multiple matches (ambiguous). FAIL: zero matches.",
    fixGuidance:
      "Create or claim a Google Business Profile at google.com/business. Ensure the listed name and address exactly match what's used on the website.",
  },
  {
    id: "gbp.claimed",
    category: "google-business-profile",
    label: "GBP profile is claimed",
    description:
      "Unclaimed profiles are auto-generated by Google and missing the data that drives ranking (categories, posts, photos, response rate). Claiming is required for any further GBP optimization.",
    weight: 3,
    vertical: null,
    source: "google",
    docsUrl: "https://support.google.com/business/answer/2911778",
    criteria:
      "PASS: profile shows an owner (claimed). FAIL: profile exists but is unclaimed.",
    fixGuidance:
      "Visit google.com/business, find your listing, and click 'Claim this business'. Verification typically takes 5-7 days via postcard or phone.",
  },
  {
    id: "gbp.primary-category-set",
    category: "google-business-profile",
    label: "Primary category set",
    description:
      "The primary category is the single strongest GBP ranking signal. It tells Google (and Gemini) what the business fundamentally is.",
    weight: 2,
    vertical: null,
    source: "google",
    docsUrl: "https://support.google.com/business/answer/3038177",
    criteria:
      "PASS: primary category present. FAIL: missing.",
    fixGuidance:
      "Set a primary category in GBP that exactly matches what the business does. Pick the most specific option Google offers (e.g. 'Cosmetic Dentist' over generic 'Dentist').",
  },
  {
    id: "gbp.primary-category-vertical-aligned",
    category: "google-business-profile",
    label: "Primary category aligns with vertical",
    description:
      "A primary category that mismatches the business's actual vertical causes recommendation drift in AI assistants and dilutes ranking signal.",
    weight: 2,
    vertical: null,
    source: "google",
    docsUrl: null,
    criteria:
      "PASS: primary category is within the expected category set for the audited vertical (e.g. any *Dentist for dental businesses). WARN: tangentially related. FAIL: clearly misaligned.",
    fixGuidance:
      "Change the primary category to one that precisely describes the core service. Use secondary categories for adjacent services.",
  },
  {
    id: "gbp.secondary-categories",
    category: "google-business-profile",
    label: "At least 3 secondary categories",
    description:
      "Secondary categories let GBP surface the business for adjacent intent queries. AI assistants weight category overlap heavily when ranking.",
    weight: 1,
    vertical: null,
    source: "google",
    docsUrl: null,
    criteria:
      "PASS: ≥3 secondary categories. WARN: 1-2. FAIL: 0.",
    fixGuidance:
      "Add up to 9 additional categories that describe other services the business offers. Examples for a dentist: 'Cosmetic Dentist', 'Emergency Dental Service', 'Orthodontist'.",
  },
  {
    id: "gbp.hours-specified",
    category: "google-business-profile",
    label: "Regular hours posted",
    description:
      "Posted hours drive 'open now' filtering in Google Maps and AI assistants. Missing hours significantly reduces visibility for high-intent queries.",
    weight: 2,
    vertical: null,
    source: "google",
    docsUrl: "https://support.google.com/business/answer/3038063",
    criteria:
      "PASS: regular hours posted for all 7 days (closed days explicitly marked). WARN: incomplete week.",
    fixGuidance:
      "In GBP, set Regular Hours for all 7 days. Explicitly mark closed days as 'Closed' rather than leaving blank. Also configure Special Hours for upcoming holidays.",
  },
  {
    id: "gbp.photos-recent",
    category: "google-business-profile",
    label: "≥10 photos, most recent within 90 days",
    description:
      "Photo count + recency is a freshness signal. Stale profiles (no new photos in months) rank lower; profiles with recent photos surface in 'top results' for local queries.",
    weight: 1,
    vertical: null,
    source: "google",
    docsUrl: null,
    criteria:
      "PASS: ≥10 photos AND most recent within 90 days. WARN: ≥10 photos but stale, OR <10 photos but recent activity. FAIL: <10 photos AND no recent activity.",
    fixGuidance:
      "Add at least 10 high-quality photos covering exterior, interior, team, and services. Upload a new photo monthly to maintain the freshness signal.",
  },
  {
    id: "gbp.reviews-volume-rating",
    category: "google-business-profile",
    label: "≥20 reviews, average ≥4.0",
    description:
      "Review volume and rating are the dominant social-proof signal for AI recommendations. Below these thresholds the business is rarely surfaced in 'best' or 'top-rated' queries.",
    weight: 2,
    vertical: null,
    source: "google",
    docsUrl: null,
    criteria:
      "PASS: ≥20 reviews AND average rating ≥4.0. WARN: ≥10 reviews, rating ≥3.5. FAIL: <10 reviews OR rating <3.5.",
    fixGuidance:
      "Build a systematic review-request flow: post-appointment SMS or email with a direct GBP review link. Aim for ≥1 new review per week.",
  },
  {
    id: "gbp.response-rate",
    category: "google-business-profile",
    label: "Owner response rate ≥50% (last 90 days)",
    description:
      "Responding to reviews demonstrates active business management — a quality signal AI assistants increasingly weight when distinguishing engaged from absent businesses.",
    weight: 1,
    vertical: null,
    source: "google",
    docsUrl: null,
    criteria:
      "PASS: ≥50% of reviews in last 90 days have owner responses. WARN: 25-50%. FAIL: <25%.",
    fixGuidance:
      "Respond to every new review within 7 days. Use a personalized but consistent voice. Replying to negative reviews matters more than positive ones for the responsiveness signal.",
  },
  {
    id: "gbp.posts-recent",
    category: "google-business-profile",
    label: "Recent post or update (last 30 days)",
    description:
      "GBP Posts (offers, events, updates) signal an active business and provide fresh content for AI assistants to cite. Stale profiles rank lower over time.",
    weight: 1,
    vertical: null,
    source: "google",
    docsUrl: "https://support.google.com/business/answer/7662907",
    criteria:
      "PASS: at least one Post published in last 30 days. WARN: 30-90 days. FAIL: >90 days.",
    fixGuidance:
      "Publish a GBP Post at least monthly: a service highlight, seasonal offer, or business update. Posts auto-expire after 7 days but contribute to the activity signal.",
  },
];

// ─────────────────────────────────────────────────────────────────────────────
// Category 4 — Site & Content Signals (8 checks)
// ─────────────────────────────────────────────────────────────────────────────

const siteSignalsChecks: AuditCheckDefinition[] = [
  {
    id: "site.https",
    category: "site-signals",
    label: "HTTPS with valid certificate",
    description:
      "Non-HTTPS sites are flagged as 'not secure' by browsers and de-prioritized by every modern search and AI ranker. Foundational requirement.",
    weight: 2,
    vertical: null,
    source: "internal",
    docsUrl: null,
    criteria:
      "PASS: site serves over HTTPS with a valid, non-expired certificate. FAIL: HTTP only, expired cert, or self-signed cert.",
    fixGuidance:
      "Enable HTTPS via Let's Encrypt (free) or your hosting provider. Set up automatic renewal. Redirect all HTTP traffic to HTTPS at the server level.",
  },
  {
    id: "site.mobile-friendly",
    category: "site-signals",
    label: "Mobile-friendly markup",
    description:
      "Most local-intent AI queries originate on mobile. Sites without responsive markup or proper viewport meta render poorly and rank lower.",
    weight: 2,
    vertical: null,
    source: "google",
    docsUrl: "https://developers.google.com/search/mobile-sites",
    criteria:
      "PASS: viewport meta tag present AND responsive markup (CSS media queries or fluid grid). FAIL: missing viewport OR fixed-width layout.",
    fixGuidance:
      "Add `<meta name=\"viewport\" content=\"width=device-width, initial-scale=1\">` to <head>. Use a responsive CSS framework (Tailwind, Bootstrap) or media queries.",
  },
  {
    id: "site.core-web-vitals-lcp",
    category: "site-signals",
    label: "Largest Contentful Paint < 2.5s",
    description:
      "LCP measures perceived load speed. Slow sites are de-ranked by Google and reduce the depth AI crawlers index per session.",
    weight: 1,
    vertical: null,
    source: "google",
    docsUrl: "https://web.dev/articles/lcp",
    criteria:
      "PASS: LCP < 2.5s (PageSpeed Insights mobile). WARN: 2.5-4.0s. FAIL: > 4.0s.",
    fixGuidance:
      "Optimize the largest above-the-fold image (compress, lazy-load below-fold, use <picture> with srcset). Preload critical fonts. Reduce render-blocking JS.",
  },
  {
    id: "site.core-web-vitals-inp",
    category: "site-signals",
    label: "Interaction to Next Paint < 200ms",
    description:
      "INP measures how responsive the site is to user input. Sluggish interaction triggers Google's poor-experience signal.",
    weight: 1,
    vertical: null,
    source: "google",
    docsUrl: "https://web.dev/articles/inp",
    criteria:
      "PASS: INP < 200ms (PageSpeed Insights mobile). WARN: 200-500ms. FAIL: > 500ms.",
    fixGuidance:
      "Break up long JavaScript tasks. Defer non-critical scripts. Avoid heavy event handlers on click/tap. Audit third-party tags (analytics, chat widgets) for blocking behaviour.",
  },
  {
    id: "site.core-web-vitals-cls",
    category: "site-signals",
    label: "Cumulative Layout Shift < 0.1",
    description:
      "CLS measures visual stability. Pages that jump around as they load harm both UX and ranking, and confuse AI crawlers parsing structured content.",
    weight: 1,
    vertical: null,
    source: "google",
    docsUrl: "https://web.dev/articles/cls",
    criteria:
      "PASS: CLS < 0.1 (PageSpeed Insights mobile). WARN: 0.1-0.25. FAIL: > 0.25.",
    fixGuidance:
      "Set explicit width/height on all <img> and <iframe>. Reserve space for ads and embeds. Avoid inserting content above existing content unless triggered by user interaction.",
  },
  {
    id: "site.nap-consistency",
    category: "site-signals",
    label: "NAP consistency on-site",
    description:
      "Name, Address, Phone in the site's footer/contact page must match the LocalBusiness JSON-LD. Mismatches make AI assistants distrust the data.",
    weight: 2,
    vertical: null,
    source: "internal",
    docsUrl: null,
    criteria:
      "PASS: footer/contact-page NAP matches LocalBusiness JSON-LD (case-insensitive, whitespace-normalized). WARN: minor variants (e.g. 'St' vs 'Street'). FAIL: different phone or address.",
    fixGuidance:
      "Pick a canonical NAP string and use it identically in: footer, contact page, LocalBusiness JSON-LD, Google Business Profile, and all third-party citations.",
  },
  {
    id: "site.contact-page-discoverable",
    category: "site-signals",
    label: "Contact page reachable in ≤2 clicks",
    description:
      "A discoverable contact page with NAP and a contact form is both a UX requirement and a quality signal for AI assistants verifying the business is operational.",
    weight: 1,
    vertical: null,
    source: "internal",
    docsUrl: null,
    criteria:
      "PASS: /contact (or equivalent) linked from main nav or footer, returns 200, and contains NAP. WARN: reachable but missing NAP or contact form.",
    fixGuidance:
      "Add a top-nav or footer link to /contact. The page should show full NAP, a contact form, and a Google Maps embed or directions link.",
  },
  {
    id: "site.opengraph-twitter-cards",
    category: "site-signals",
    label: "OpenGraph + Twitter Card metadata",
    description:
      "OG and Twitter Card metadata control how the site previews when shared and are parsed by some AI tools (notably Perplexity and Bing) as content-summary signals.",
    weight: 1,
    vertical: null,
    source: "community",
    docsUrl: "https://ogp.me/",
    criteria:
      "PASS: og:title, og:description, og:image, og:url present AND twitter:card meta present. WARN: OG present but Twitter Card missing.",
    fixGuidance:
      "Add to <head>: `<meta property=\"og:title\" content=\"...\">`, `og:description`, `og:image` (1200x630), `og:url`, and `<meta name=\"twitter:card\" content=\"summary_large_image\">`.",
  },
];

// ─────────────────────────────────────────────────────────────────────────────
// Category 5 — Off-site Citations & Reviews (8 checks)
// ─────────────────────────────────────────────────────────────────────────────

const offSiteCitationsChecks: AuditCheckDefinition[] = [
  {
    id: "citations.trustpilot-present",
    category: "off-site-citations",
    label: "Trustpilot profile exists",
    description:
      "Trustpilot is one of the most-cited third-party review sources in AI assistant answers (alongside Google Reviews). A missing profile is a visibility gap.",
    weight: 1,
    vertical: null,
    source: "internal",
    docsUrl: "https://developers.trustpilot.com/",
    criteria:
      "PASS: Trustpilot profile exists for the business (domain or name match). FAIL: no profile found.",
    fixGuidance:
      "Create a Trustpilot business profile at business.trustpilot.com. Free tier is sufficient for visibility; paid plans add review-invitation tools.",
  },
  {
    id: "citations.trustpilot-claimed",
    category: "off-site-citations",
    label: "Trustpilot profile claimed",
    description:
      "Unclaimed Trustpilot profiles cannot respond to reviews and rank lower in Trustpilot's own search — affecting the snippet AI assistants cite.",
    weight: 1,
    vertical: null,
    source: "internal",
    docsUrl: null,
    criteria:
      "PASS: profile is claimed (verified business owner). FAIL: profile exists but unclaimed.",
    fixGuidance:
      "Log in to business.trustpilot.com with the business's email and follow the verification flow to claim the profile.",
  },
  {
    id: "citations.vertical-directories",
    category: "off-site-citations",
    label: "Listed on vertical-specific directories",
    description:
      "Industry-authoritative directories (NHS Find a Dentist, ICAEW, Law Society, etc.) are weighted heavily by AI assistants as trust signals. Coverage of these is vertical-specific.",
    weight: 2,
    vertical: null,
    source: "internal",
    docsUrl: null,
    criteria:
      "PASS: business appears on ≥80% of the vertical's expected directory set (e.g. for dentists: NHS Find a Dentist, GDC register, Bupa, Denplan). WARN: 50-80%. FAIL: <50%.",
    fixGuidance:
      "Submit the business to each vertical directory. For regulated professions (medical, legal, accounting), ensure registration body listings are current.",
  },
  {
    id: "citations.nap-consistency-citations",
    category: "off-site-citations",
    label: "NAP consistent across citations",
    description:
      "When the same business appears with different name/address/phone across the web, AI assistants and search engines treat them as separate entities — splitting reputation signal.",
    weight: 2,
    vertical: null,
    source: "internal",
    docsUrl: null,
    criteria:
      "PASS: NAP matches across ≥90% of top 10 discovered citations (fuzzy match). WARN: 70-90%. FAIL: <70%.",
    fixGuidance:
      "Audit the top 10 directory listings and update each to the canonical NAP. Tools like BrightLocal or Whitespark can automate discovery and updates.",
  },
  {
    id: "citations.review-velocity",
    category: "off-site-citations",
    label: "Review velocity ≥1/month across platforms",
    description:
      "Steady review acquisition signals an active business. Bursts (then silence) raise authenticity concerns. AI assistants increasingly weight recency.",
    weight: 1,
    vertical: null,
    source: "internal",
    docsUrl: null,
    criteria:
      "PASS: ≥3 new reviews across all platforms in the last 90 days (≥1/month avg). WARN: 1-2 reviews. FAIL: 0 reviews.",
    fixGuidance:
      "Systematize review requests: post-service SMS or email with direct review links rotating across Google, Trustpilot, and Facebook to spread velocity.",
  },
  {
    id: "citations.cross-platform-rating-delta",
    category: "off-site-citations",
    label: "Rating consistency across platforms",
    description:
      "Large rating gaps (e.g. 4.8 on Google, 3.2 on Trustpilot) suggest cherry-picking or platform-gaming. AI assistants flag these as low-confidence signals.",
    weight: 1,
    vertical: null,
    source: "internal",
    docsUrl: null,
    criteria:
      "PASS: max-min rating across platforms (Google, Trustpilot, Yelp, FB) ≤0.5 stars. WARN: 0.5-1.0. FAIL: >1.0.",
    fixGuidance:
      "Investigate the underperforming platform: are there unresolved negative reviews? Is the request flow biased? Address quality issues before encouraging more reviews.",
  },
  {
    id: "citations.response-rate-offsite",
    category: "off-site-citations",
    label: "Off-site review response rate ≥40%",
    description:
      "Responding to reviews on third-party platforms (not just Google) signals an attentive business across the entire web — a signal AI assistants weight increasingly.",
    weight: 1,
    vertical: null,
    source: "internal",
    docsUrl: null,
    criteria:
      "PASS: ≥40% of reviews on Trustpilot/Yelp/FB in last 90 days have owner responses. WARN: 20-40%. FAIL: <20%.",
    fixGuidance:
      "Set up review-monitoring alerts on each platform. Aim to respond within 7 days. Use platform-specific tone but consistent messaging.",
  },
  {
    id: "citations.reputation-incidents",
    category: "off-site-citations",
    label: "No recent negative-review spike",
    description:
      "A sudden cluster of 1-star reviews — whether organic or coordinated — depresses ranking and surfaces in AI answers as a quality warning. Early detection enables response.",
    weight: 1,
    vertical: null,
    source: "internal",
    docsUrl: null,
    criteria:
      "PASS: <3 one-star reviews across all platforms in last 30 days. WARN: 3-5. FAIL: >5.",
    fixGuidance:
      "Identify the trigger event (service issue, viral complaint, competitor activity). Address publicly via review responses and proactively at the source. Flag fraudulent reviews via platform tools.",
  },
];

// ─────────────────────────────────────────────────────────────────────────────
// Registry export
// ─────────────────────────────────────────────────────────────────────────────

export const auditCheckRegistry: AuditCheckDefinition[] = [
  ...crawlerConfigChecks,
  ...structuredDataChecks,
  ...googleBusinessProfileChecks,
  ...siteSignalsChecks,
  ...offSiteCitationsChecks,
];

export const auditCheckRegistryByCategory: Record<
  AuditCheckCategory,
  AuditCheckDefinition[]
> = {
  "crawler-config": crawlerConfigChecks,
  "structured-data": structuredDataChecks,
  "google-business-profile": googleBusinessProfileChecks,
  "site-signals": siteSignalsChecks,
  "off-site-citations": offSiteCitationsChecks,
};
