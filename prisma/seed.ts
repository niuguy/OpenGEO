import { PrismaClient } from "@prisma/client";
import { generatePromptsForBusiness, type GeneratedPrompt } from "../src/lib/prompts";
import { brandReputationPack } from "../src/lib/prompts/packs/brand-reputation";

const prisma = new PrismaClient();

async function upsertActivePrompts(businessId: string, prompts: GeneratedPrompt[]) {
  for (const prompt of prompts) {
    const samplingBasis = { packId: prompt.packId, ...prompt.samplingBasis };
    await prisma.prompt.upsert({
      where: { businessId_text: { businessId, text: prompt.text } },
      update: {
        template: prompt.template,
        clusterId: prompt.clusterId,
        clusterIntent: prompt.clusterIntent,
        samplingBasis,
        status: "ACTIVE"
      },
      create: {
        businessId,
        text: prompt.text,
        template: prompt.template,
        clusterId: prompt.clusterId,
        clusterIntent: prompt.clusterIntent,
        samplingBasis,
        status: "ACTIVE"
      }
    });
  }

  await prisma.prompt.updateMany({
    where: {
      businessId,
      text: { notIn: prompts.map((prompt) => prompt.text) },
      status: "ACTIVE",
      source: "generated"
    },
    data: { status: "ARCHIVED" }
  });
}

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

  await upsertActivePrompts(business.id, prompts);

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

  await upsertActivePrompts(accountant.id, accountantPrompts);

  console.log(`Seeded ${accountant.name} with ${accountantCompetitors.length} competitors and ${accountantPrompts.length} prompts.`);

  // Third demo: a non-local SaaS target through the brand-reputation pack.
  // It still lives in the Business table (Phase 1 keeps the schema); category
  // doubles as marketCategory and location as geography per the plan mapping.
  const saas = await prisma.business.upsert({
    where: { id: "demo-saas-helpdesk" },
    update: {
      name: "Example Helpdesk",
      category: "customer support software",
      location: "Global",
      websiteUrl: "https://example.com",
      targetAttributes: ["AI automation", "enterprise support"]
    },
    create: {
      id: "demo-saas-helpdesk",
      name: "Example Helpdesk",
      category: "customer support software",
      location: "Global",
      websiteUrl: "https://example.com",
      targetAttributes: ["AI automation", "enterprise support"]
    }
  });

  const saasCompetitors = ["Intercom", "Zendesk", "Freshdesk"];

  for (const name of saasCompetitors) {
    await prisma.competitor.upsert({
      where: { businessId_name: { businessId: saas.id, name } },
      update: {},
      create: { businessId: saas.id, name }
    });
  }

  const saasPrompts = brandReputationPack.generate({
    targetName: saas.name,
    targetKind: "saas",
    marketCategory: saas.category,
    audience: "B2B SaaS teams",
    attributes: saas.targetAttributes,
    comparedEntities: saasCompetitors
  });

  await upsertActivePrompts(saas.id, saasPrompts);

  console.log(`Seeded ${saas.name} (SaaS, brand-reputation pack) with ${saasCompetitors.length} compared entities and ${saasPrompts.length} prompts.`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
