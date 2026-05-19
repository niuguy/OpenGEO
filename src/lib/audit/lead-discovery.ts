import { ProxyAgent, request } from "undici";
import { execFile } from "node:child_process";
import { promisify } from "node:util";

export type LeadDiscoveryInput = {
  category: string;
  location: string;
  limit?: number;
};

export type DiscoveredLead = {
  source: string;
  sourceId: string;
  name: string;
  category: string;
  location: string;
  websiteUrl: string | null;
  phone: string | null;
  rating: number | null;
  reviewCount: number | null;
  address: string | null;
  mapsUrl: string | null;
  raw: unknown;
};

export async function discoverGooglePlacesLeads(input: LeadDiscoveryInput): Promise<DiscoveredLead[]> {
  const apiKey = process.env.GOOGLE_PLACES_API_KEY;
  if (!apiKey) {
    throw new Error("GOOGLE_PLACES_API_KEY is not set. Add it to .env to discover Google Maps/Places prospects.");
  }

  const limit = Math.max(1, Math.min(input.limit ?? 10, 20));
  const response = await postJsonWithProxyFallback("https://places.googleapis.com/v1/places:searchText", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-goog-api-key": apiKey,
      "x-goog-fieldmask": [
        "places.id",
        "places.displayName",
        "places.formattedAddress",
        "places.googleMapsUri",
        "places.nationalPhoneNumber",
        "places.rating",
        "places.userRatingCount",
        "places.websiteUri",
        "places.primaryTypeDisplayName"
      ].join(",")
    },
    body: JSON.stringify({
      textQuery: `${input.category} in ${input.location}`,
      pageSize: limit,
      regionCode: process.env.GOOGLE_PLACES_REGION_CODE || "GB",
      languageCode: process.env.GOOGLE_PLACES_LANGUAGE_CODE || "en"
    })
  });

  if (response.statusCode < 200 || response.statusCode >= 300) {
    throw new Error(`Google Places request failed: ${response.statusCode}`);
  }

  const data = response.data as { places?: GooglePlace[] };
  return (data.places ?? []).slice(0, limit).map((place) => ({
    source: "google_places",
    sourceId: place.id,
    name: place.displayName?.text || "Unknown business",
    category: place.primaryTypeDisplayName?.text || input.category,
    location: input.location,
    websiteUrl: place.websiteUri || null,
    phone: place.nationalPhoneNumber || null,
    rating: typeof place.rating === "number" ? place.rating : null,
    reviewCount: typeof place.userRatingCount === "number" ? place.userRatingCount : null,
    address: place.formattedAddress || null,
    mapsUrl: place.googleMapsUri || null,
    raw: place
  }));
}

const execFileAsync = promisify(execFile);

async function postJsonWithProxyFallback(
  url: string,
  init: {
    method: string;
    headers: Record<string, string>;
    body: string;
  }
) {
  const dispatcher = getProxyDispatcher();

  try {
    const response = await request(url, dispatcher ? { ...init, dispatcher } : init);
    return {
      statusCode: response.statusCode,
      data: await response.body.json()
    };
  } catch {
    return postJsonWithCurl(url, init);
  }
}

async function postJsonWithCurl(
  url: string,
  init: {
    headers: Record<string, string>;
    body: string;
  }
) {
  const args = [
    "-sS",
    "--max-time",
    String(Math.ceil(Number(process.env.WEBSITE_CRAWL_TIMEOUT_MS || 12000) / 1000)),
    "-X",
    "POST",
    "-w",
    "\n%{http_code}",
    url
  ];
  for (const [key, value] of Object.entries(init.headers)) {
    args.push("-H", `${key}: ${value}`);
  }
  args.push("--data", init.body);

  const socksProxy = getSocksProxyAddress();
  if (socksProxy) {
    args.unshift("--socks5-hostname", socksProxy);
  }

  const { stdout } = await execFileAsync("curl", args, {
    maxBuffer: 1024 * 1024
  });
  const separator = stdout.lastIndexOf("\n");
  const body = separator >= 0 ? stdout.slice(0, separator) : stdout;
  const statusCode = Number(separator >= 0 ? stdout.slice(separator + 1) : 0);

  return {
    statusCode,
    data: JSON.parse(body)
  };
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

function getSocksProxyAddress() {
  const proxy =
    process.env.CLASH_SOCKS_PROXY_URL ||
    process.env.ALL_PROXY ||
    process.env.all_proxy;

  if (!proxy || !/^socks5h?:\/\//i.test(proxy)) {
    return null;
  }

  const parsed = new URL(proxy);
  return `${parsed.hostname}:${parsed.port}`;
}

type GooglePlace = {
  id: string;
  displayName?: { text?: string };
  primaryTypeDisplayName?: { text?: string };
  formattedAddress?: string;
  googleMapsUri?: string;
  nationalPhoneNumber?: string;
  rating?: number;
  userRatingCount?: number;
  websiteUri?: string;
};
