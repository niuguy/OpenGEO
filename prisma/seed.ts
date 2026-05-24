import { PrismaClient } from "@prisma/client";
import { generatePromptsForBusiness } from "../src/lib/prompts";

const prisma = new PrismaClient();

async function main() {
  const business = await prisma.business.upsert({
    where: { id: "demo-woking-dentist" },
    update: {
      name: "Example Dental Clinic",
      category: "dentist",
      location: "Woking, Surrey",
      websiteUrl: "https://example.com",
      targetAttributes: [
        "emergency dentist",
        "root canal",
        "nervous patients",
        "children",
        "Invisalign",
        "same-day appointment"
      ]
    },
    create: {
      id: "demo-woking-dentist",
      name: "Example Dental Clinic",
      category: "dentist",
      location: "Woking, Surrey",
      websiteUrl: "https://example.com",
      targetAttributes: [
        "emergency dentist",
        "root canal",
        "nervous patients",
        "children",
        "Invisalign",
        "same-day appointment"
      ]
    }
  });

  const competitors = [
    "Bupa Dental Care Woking",
    "Portmore Dental",
    "Woking Dental Practice",
    "The Dental Practice Woking"
  ];

  for (const name of competitors) {
    await prisma.competitor.upsert({
      where: {
        businessId_name: {
          businessId: business.id,
          name
        }
      },
      update: {},
      create: {
        businessId: business.id,
        name
      }
    });
  }

  const prompts = generatePromptsForBusiness({
    name: business.name,
    category: business.category,
    location: business.location,
    competitors,
    attributes: business.targetAttributes
  });

  for (const prompt of prompts) {
    await prisma.prompt.upsert({
      where: {
        businessId_text: {
          businessId: business.id,
          text: prompt.text
        }
      },
      update: {
        template: prompt.template,
        clusterId: prompt.clusterId,
        clusterIntent: prompt.clusterIntent,
        samplingBasis: prompt.samplingBasis,
        status: "ACTIVE"
      },
      create: {
        businessId: business.id,
        text: prompt.text,
        template: prompt.template,
        clusterId: prompt.clusterId,
        clusterIntent: prompt.clusterIntent,
        samplingBasis: prompt.samplingBasis,
        status: "ACTIVE"
      }
    });
  }

  await prisma.prompt.updateMany({
    where: {
      businessId: business.id,
      text: {
        notIn: prompts.map((prompt) => prompt.text)
      },
      status: "ACTIVE",
      source: "generated"
    },
    data: {
      status: "ARCHIVED"
    }
  });

  console.log(`Seeded ${business.name} with ${competitors.length} competitors and ${prompts.length} prompts.`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
