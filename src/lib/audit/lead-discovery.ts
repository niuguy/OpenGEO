import { ProxyAgent, request } from "undici";

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
  const response = await requestWithProxyFallback("https://places.googleapis.com/v1/places:searchText", {
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

  const data = (await response.body.json()) as { places?: GooglePlace[] };
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

async function requestWithProxyFallback(
  url: string,
  init: {
    method: string;
    headers: Record<string, string>;
    body: string;
  }
) {
  const dispatcher = getProxyDispatcher();

  if (!dispatcher) {
    return request(url, init);
  }

  try {
    return await request(url, {
      ...init,
      dispatcher
    });
  } catch {
    return request(url, init);
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
