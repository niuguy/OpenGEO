import { notFound } from "next/navigation";
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { PromptsReview } from "@/components/prompts-review";

type PageProps = {
  params: Promise<{ id: string }>;
};

export default async function PromptsReviewPage({ params }: PageProps) {
  const { id } = await params;
  const business = await prisma.business.findUnique({
    where: { id },
    include: {
      prompts: {
        where: { status: { in: ["DRAFT", "ACTIVE"] } },
        orderBy: [{ source: "asc" }, { createdAt: "asc" }]
      }
    }
  });

  if (!business) {
    notFound();
  }

  const initialPrompts = business.prompts.map((prompt) => ({
    id: prompt.id,
    text: prompt.text,
    clusterIntent: prompt.clusterIntent,
    status: prompt.status,
    source: prompt.source
  }));

  return (
    <div className="mx-auto max-w-4xl px-4 py-10">
      <div className="mb-6">
        <Link href="/" className="text-sm text-muted hover:text-ink">
          ← Back to home
        </Link>
        <h1 className="mt-2 text-3xl font-semibold text-ink">Review prompts for {business.name}</h1>
        <p className="mt-2 text-muted">
          These are the questions we&apos;ll ask ChatGPT (and any other configured providers) about
          {" "}
          {business.location}. Toggle off anything irrelevant, add your own, then start the audit.
        </p>
      </div>

      <PromptsReview businessId={business.id} initialPrompts={initialPrompts} />
    </div>
  );
}
