// Maps free-text semantic attribute labels extracted by the AI to canonical forms.
// Keys are lowercase substrings to match; values are canonical labels.
// A null value means the label is too generic to be useful and should be dropped.

type TaxonomyEntry = { match: string; canonical: string | null };

const GENERIC_FILTERS: TaxonomyEntry[] = [
  { match: "location and accessibility", canonical: null },
  { match: "location", canonical: null },
  { match: "category", canonical: null },
  { match: "services offered", canonical: null },
  { match: "services", canonical: null },
  { match: "answer provided", canonical: null },
  { match: "personal knowledge", canonical: null },
  { match: "general recommendation", canonical: null },
];

const HEALTHCARE_TAXONOMY: TaxonomyEntry[] = [
  { match: "emergency dentist", canonical: "emergency dentistry" },
  { match: "emergency dental", canonical: "emergency dentistry" },
  { match: "urgent dental", canonical: "emergency dentistry" },
  { match: "gentle approach", canonical: "anxiety-friendly care" },
  { match: "calming environment", canonical: "anxiety-friendly care" },
  { match: "relaxed atmosphere", canonical: "anxiety-friendly care" },
  { match: "anxiety-friendly", canonical: "anxiety-friendly care" },
  { match: "nervous patients", canonical: "anxiety-friendly care" },
  { match: "nervous patient", canonical: "anxiety-friendly care" },
  { match: "pediatric dentistry", canonical: "family and children" },
  { match: "children's dentistry", canonical: "family and children" },
  { match: "family-friendly", canonical: "family and children" },
  { match: "family friendly", canonical: "family and children" },
  { match: "children", canonical: "family and children" },
  { match: "same-day appointment", canonical: "same-day appointments" },
  { match: "same day appointment", canonical: "same-day appointments" },
  { match: "same day", canonical: "same-day appointments" },
  { match: "urgent appointment", canonical: "same-day appointments" },
  { match: "nhs dentist", canonical: "NHS treatment" },
  { match: "nhs dental", canonical: "NHS treatment" },
  { match: "nhs listing", canonical: "NHS treatment" },
  { match: "nhs", canonical: "NHS treatment" },
  { match: "private dentist", canonical: "private treatment" },
  { match: "private dental", canonical: "private treatment" },
  { match: "private listing", canonical: "private treatment" },
  { match: "invisalign", canonical: "Invisalign" },
  { match: "root canal", canonical: "root canal treatment" },
  { match: "insurance and payment", canonical: "insurance and payment options" },
  { match: "insurance and pricing", canonical: "insurance and payment options" },
  { match: "local listing", canonical: "local directory listings" },
  { match: "local recommendations", canonical: "local directory listings" },
  { match: "patient review", canonical: "patient reviews" },
  { match: "reviews and recommendation", canonical: "patient reviews" },
  { match: "technology and technique", canonical: "modern dental technology" },
];

const ACCOUNTANT_TAXONOMY: TaxonomyEntry[] = [
  { match: "self assessment", canonical: "self-assessment tax return" },
  { match: "self-assessment", canonical: "self-assessment tax return" },
  { match: "tax return", canonical: "self-assessment tax return" },
  { match: "personal tax", canonical: "self-assessment tax return" },
  { match: "small business", canonical: "small business accounting" },
  { match: "sme accounting", canonical: "small business accounting" },
  { match: "startup accounting", canonical: "small business accounting" },
  { match: "vat return", canonical: "VAT returns" },
  { match: "vat registration", canonical: "VAT returns" },
  { match: "payroll service", canonical: "payroll services" },
  { match: "paye", canonical: "payroll services" },
  { match: "bookkeeping", canonical: "bookkeeping" },
  { match: "fixed fee", canonical: "fixed-fee pricing" },
  { match: "fixed-fee", canonical: "fixed-fee pricing" },
  { match: "free consultation", canonical: "free initial consultation" },
  { match: "free initial", canonical: "free initial consultation" },
  { match: "icaew", canonical: "ICAEW accreditation" },
  { match: "acca", canonical: "ACCA accreditation" },
  { match: "chartered accountant", canonical: "chartered accountant" },
  { match: "companies house", canonical: "Companies House filings" },
];

function isHealthcareCategory(category: string): boolean {
  const c = category.toLowerCase();
  return (
    c.includes("dentist") ||
    c.includes("dental") ||
    c.includes("doctor") ||
    c.includes("clinic") ||
    c.includes("gp") ||
    c.includes("optician") ||
    c.includes("physio") ||
    c.includes("medical")
  );
}

function isAccountantCategory(category: string): boolean {
  const c = category.toLowerCase();
  return (
    c.includes("accountant") ||
    c.includes("accounting") ||
    c.includes("bookkeeper") ||
    c.includes("tax advisor")
  );
}

function buildTaxonomy(category: string): TaxonomyEntry[] {
  const entries: TaxonomyEntry[] = [...GENERIC_FILTERS];
  if (isHealthcareCategory(category)) {
    entries.push(...HEALTHCARE_TAXONOMY);
  }
  if (isAccountantCategory(category)) {
    entries.push(...ACCOUNTANT_TAXONOMY);
  }
  return entries;
}

export function normalizeAttribute(label: string, category: string): string | null {
  const normalizedLabel = label.trim().toLowerCase();
  const taxonomy = buildTaxonomy(category);

  for (const entry of taxonomy) {
    if (normalizedLabel.includes(entry.match)) {
      return entry.canonical;
    }
  }

  return label.trim() || null;
}
