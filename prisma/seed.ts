import { PrismaClient } from "@prisma/client";
import { generatePromptsForBusiness } from "../src/lib/prompts";

const prisma = new PrismaClient();

async function main() {
  const business = await prisma.business.upsert({
    where: { id: "demo-woking-dentist" },
    update: {
      name: "Fictional Dental Clinic",
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
      name: "Fictional Dental Clinic",
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

  // Second demo: accountant — shows the platform works beyond healthcare
  const accountant = await prisma.business.upsert({
    where: { id: "demo-london-accountant" },
    update: {
      name: "Example Accounting Firm",
      category: "accountant",
      location: "London, UK",
      websiteUrl: "https://example.com",
      targetAttributes: [
        "self-assessment tax return",
        "small business accounting",
        "VAT returns",
        "payroll services",
        "free initial consultation",
        "fixed-fee pricing"
      ]
    },
    create: {
      id: "demo-london-accountant",
      name: "Example Accounting Firm",
      category: "accountant",
      location: "London, UK",
      websiteUrl: "https://example.com",
      targetAttributes: [
        "self-assessment tax return",
        "small business accounting",
        "VAT returns",
        "payroll services",
        "free initial consultation",
        "fixed-fee pricing"
      ]
    }
  });

  const accountantCompetitors = [
    "Deloitte London",
    "BDO UK",
    "Mazars London",
    "Crowe UK"
  ];

  for (const name of accountantCompetitors) {
    await prisma.competitor.upsert({
      where: { businessId_name: { businessId: accountant.id, name } },
      update: {},
      create: { businessId: accountant.id, name }
    });
  }

  const accountantPrompts = generatePromptsForBusiness({
    name: accountant.name,
    category: accountant.category,
    location: accountant.location,
    competitors: accountantCompetitors,
    attributes: accountant.targetAttributes
  });

  for (const p of accountantPrompts) {
    await prisma.prompt.upsert({
      where: { businessId_text: { businessId: accountant.id, text: p.text } },
      update: { template: p.template, clusterId: p.clusterId, clusterIntent: p.clusterIntent, samplingBasis: p.samplingBasis, status: "ACTIVE" },
      create: { businessId: accountant.id, text: p.text, template: p.template, clusterId: p.clusterId, clusterIntent: p.clusterIntent, samplingBasis: p.samplingBasis, status: "ACTIVE" }
    });
  }

  await prisma.prompt.updateMany({
    where: { businessId: accountant.id, text: { notIn: accountantPrompts.map((p) => p.text) }, status: "ACTIVE", source: "generated" },
    data: { status: "ARCHIVED" }
  });

  console.log(`Seeded ${accountant.name} with ${accountantCompetitors.length} competitors and ${accountantPrompts.length} prompts.`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
