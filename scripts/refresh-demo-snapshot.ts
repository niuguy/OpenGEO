import { parseObservationProviders } from "../src/lib/ai/providers";
import { refreshVisibilitySnapshotForProvider } from "../src/lib/process-prompt-job";
import { prisma } from "../src/lib/prisma";

async function main() {
  const providers = parseObservationProviders(process.env.OBSERVATION_PROVIDERS, ["chatgpt"]);
  for (const provider of providers) {
    await refreshVisibilitySnapshotForProvider("demo-woking-dentist", provider);
  }
  console.log("Refreshed demo visibility snapshot.");
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
