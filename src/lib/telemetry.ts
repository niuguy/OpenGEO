import { prisma } from "./prisma";

type TelemetryPayload = Record<string, string | number | boolean | null | string[] | number[]>;

export async function trackEvent(eventName: string, payload: TelemetryPayload = {}) {
  if (process.env.TELEMETRY_ENABLED === "false") {
    return;
  }

  try {
    await prisma.telemetryEvent.create({
      data: {
        eventName,
        source: process.env.TELEMETRY_SOURCE || "local-oss",
        payload
      }
    });
  } catch (error) {
    console.warn("Telemetry event was not recorded", error);
  }
}
