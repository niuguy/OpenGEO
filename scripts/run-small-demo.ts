import { processPromptRun } from "../src/lib/process-prompt-job";
import { parseObservationProviders } from "../src/lib/ai/providers";
import { prisma } from "../src/lib/prisma";

async function main() {
  const prompts = await prisma.prompt.findMany({
    where: {
      businessId: "demo-woking-dentist",
      status: "ACTIVE",
      runs: {
        none: {
          status: "COMPLETED"
        }
      }
    },
    orderBy: {
      createdAt: "asc"
    },
    take: Number(process.env.DEMO_PROMPT_LIMIT || 3),
    select: {
      id: true,
      text: true
    }
  });

  if (prompts.length === 0) {
    throw new Error("No unrun demo prompts found. Increase DEMO_PROMPT_LIMIT after adding or resetting demo prompts.");
  }

  const evaluationRunId = `demo-small-real-etl-${Date.now()}`;
  const providers = parseObservationProviders(process.env.OBSERVATION_PROVIDERS, ["chatgpt"]);
  for (const provider of providers) {
    for (const [sampleIndex, prompt] of prompts.entries()) {
      const runId = await processPromptRun(prompt.id, {
        evaluationRunId,
        sampleIndex,
        provider
      });
      console.log(`[${provider}] ${prompt.text} -> ${runId}`);
    }
  }

  console.log(`Completed ${prompts.length * providers.length} prompt runs for ${evaluationRunId}`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
