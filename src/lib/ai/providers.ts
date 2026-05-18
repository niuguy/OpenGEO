import type { ObservationProvider } from "./openai-client";
export type { ObservationProvider } from "./openai-client";

export const OBSERVATION_PROVIDERS: ObservationProvider[] = ["chatgpt", "gemini", "google_ai_overview"];

export function isObservationProvider(value: string): value is ObservationProvider {
  return OBSERVATION_PROVIDERS.includes(value as ObservationProvider);
}

export function parseObservationProviders(value: string | undefined, fallback: ObservationProvider[] = ["chatgpt"]) {
  if (!value) {
    return fallback;
  }

  const providers = value
    .split(",")
    .map((provider) => provider.trim())
    .filter(isObservationProvider);

  return providers.length > 0 ? providers : fallback;
}

export function providerLabel(provider: string) {
  if (provider === "gemini") {
    return "Gemini";
  }

  if (provider === "google_ai_overview") {
    return "Google AI Overview";
  }

  return "ChatGPT";
}
