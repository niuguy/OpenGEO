import { LangfuseSpanProcessor } from "@langfuse/otel";
import {
  type LangfuseSpanAttributes,
  type LangfuseSpan,
  startObservation
} from "@langfuse/tracing";
import { NodeSDK } from "@opentelemetry/sdk-node";

type LangfuseEnv = Partial<Pick<
  NodeJS.ProcessEnv,
  "LANGFUSE_ENABLED" | "LANGFUSE_PUBLIC_KEY" | "LANGFUSE_SECRET_KEY" | "LANGFUSE_BASE_URL" | "NODE_ENV"
>>;

export type TraceHandle = {
  traceId: string;
  observationId: string;
  traceUrl: string | null;
  parentSpanContext: ReturnType<LangfuseSpan["otelSpan"]["spanContext"]>;
  observation: LangfuseSpan;
};

let sdk: NodeSDK | null = null;
let sdkStarted = false;
let sdkFailed = false;

export function isLangfuseEnabled(env: LangfuseEnv = process.env) {
  if (env.LANGFUSE_ENABLED === "false") {
    return false;
  }

  return Boolean(env.LANGFUSE_PUBLIC_KEY && env.LANGFUSE_SECRET_KEY);
}

export function getEnvironmentTag(env: LangfuseEnv = process.env) {
  return env.NODE_ENV || "development";
}

export function getLangfuseBaseUrl(env: LangfuseEnv = process.env) {
  return env.LANGFUSE_BASE_URL || "https://cloud.langfuse.com";
}

export function buildLangfuseTraceUrl(traceId: string, env: LangfuseEnv = process.env) {
  if (!isLangfuseEnabled(env)) {
    return null;
  }

  return `${getLangfuseBaseUrl(env).replace(/\/$/, "")}/trace/${traceId}`;
}

export function ensureLangfuseInitialized(env: LangfuseEnv = process.env) {
  if (!isLangfuseEnabled(env) || sdkStarted || sdkFailed) {
    return isLangfuseEnabled(env) && sdkStarted;
  }

  try {
    sdk = new NodeSDK({
      spanProcessors: [
        new LangfuseSpanProcessor({
          publicKey: env.LANGFUSE_PUBLIC_KEY,
          secretKey: env.LANGFUSE_SECRET_KEY,
          baseUrl: getLangfuseBaseUrl(env)
        })
      ]
    });
    sdk.start();
    sdkStarted = true;
    return true;
  } catch (error) {
    sdkFailed = true;
    console.warn("Langfuse tracing disabled after initialization failure.", error);
    return false;
  }
}

export function createTraceHandle(name: string, attributes: LangfuseSpanAttributes = {}) {
  if (!ensureLangfuseInitialized()) {
    return null;
  }

  try {
    const observation = startObservation(name, {
      ...attributes,
      environment: attributes.environment || getEnvironmentTag()
    });

    return {
      traceId: observation.traceId,
      observationId: observation.id,
      traceUrl: buildLangfuseTraceUrl(observation.traceId),
      parentSpanContext: observation.otelSpan.spanContext(),
      observation
    };
  } catch (error) {
    console.warn("Langfuse trace creation failed; continuing without tracing.", error);
    return null;
  }
}

export function finishTrace(handle: TraceHandle | null, output?: unknown) {
  if (!handle) {
    return;
  }

  try {
    handle.observation.update({ output });
    handle.observation.end();
  } catch (error) {
    console.warn("Langfuse trace finalization failed.", error);
  }
}

export function failTrace(handle: TraceHandle | null, error: unknown) {
  if (!handle) {
    return;
  }

  try {
    handle.observation.update({
      level: "ERROR",
      statusMessage: error instanceof Error ? error.message : "Unknown tracing error",
      metadata: {
        error: error instanceof Error ? error.message : String(error)
      }
    });
    handle.observation.end();
  } catch (finalizeError) {
    console.warn("Langfuse trace failure finalization failed.", finalizeError);
  }
}

export async function flushLangfuse() {
  if (!sdkStarted || !sdk) {
    return;
  }

  await sdk.shutdown();
  sdk = null;
  sdkStarted = false;
}
