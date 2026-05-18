import Link from "next/link";
import { ContactForm } from "@/components/contact-form";
import { prisma } from "@/lib/prisma";

export default async function HomePage() {
  const demo = await prisma.business.findFirst({
    where: { id: "demo-woking-dentist" }
  });

  return (
    <div className="mx-auto max-w-6xl px-4 py-10">
      <section className="grid gap-8 lg:grid-cols-[1.15fr_0.85fr] lg:items-start">
        <div>
          <p className="mb-3 text-sm font-medium uppercase tracking-wide text-accent">Open-source local AI visibility</p>
          <h1 className="max-w-3xl text-4xl font-semibold leading-tight text-ink sm:text-5xl">
            Run client-ready ChatGPT visibility audits with your own API key.
          </h1>
          <p className="mt-5 max-w-2xl text-lg leading-8 text-muted">
            Built for local SEO agencies that need transparent measurement before selling AI search retainers. Track
            whether ChatGPT recommends a local business, which competitors appear, and what reasons show up in the
            answer.
          </p>
          <div className="mt-7 flex flex-wrap gap-3">
            <Link
              href={demo ? `/businesses/${demo.id}` : "/businesses/new"}
              className="focus-ring rounded-md bg-accent px-4 py-2 text-sm font-medium text-white"
            >
              Open demo audit
            </Link>
            <Link
              href="/businesses/new"
              className="focus-ring rounded-md border border-line bg-white px-4 py-2 text-sm font-medium text-ink"
            >
              Create an audit
            </Link>
          </div>
        </div>

        <div className="rounded-lg border border-line bg-white p-5 shadow-sm">
          <h2 className="text-base font-semibold text-ink">Open-core boundary</h2>
          <dl className="mt-4 space-y-4 text-sm">
            <div>
              <dt className="font-medium text-ink">Open source</dt>
              <dd className="mt-1 text-muted">Prompt generation, OpenAI runs, structured extraction, scoring, dashboard.</dd>
            </div>
            <div>
              <dt className="font-medium text-ink">Agency proof</dt>
              <dd className="mt-1 text-muted">Use your own OpenAI key. Raw answers and extracted fields stay visible.</dd>
            </div>
            <div>
              <dt className="font-medium text-ink">Commercial path</dt>
              <dd className="mt-1 text-muted">Managed monitoring, white-label reports, vertical benchmarks, and support.</dd>
            </div>
          </dl>
        </div>
      </section>

      <section className="mt-12 grid gap-4 md:grid-cols-3">
        {[
          ["Measure", "Visibility score, average rank, competitor mentions, and prompt-level evidence."],
          ["Explain", "Structured extraction captures sentiment, attributes, reasons, and URLs when present."],
          ["Learn", "Local telemetry records usage events so maintainers can see what agencies actually try."]
        ].map(([title, body]) => (
          <div key={title} className="rounded-lg border border-line bg-white p-5">
            <h2 className="font-semibold text-ink">{title}</h2>
            <p className="mt-2 text-sm leading-6 text-muted">{body}</p>
          </div>
        ))}
      </section>

      <section className="mt-12 grid gap-8 lg:grid-cols-[0.9fr_1.1fr]">
        <div>
          <h2 className="text-2xl font-semibold text-ink">Business inquiries</h2>
          <p className="mt-3 text-sm leading-6 text-muted">
            Agencies can run the tracker locally first. Use this form for managed setup, white-label reports, vertical
            prompt packs, or benchmark access.
          </p>
          <p className="mt-3 text-sm text-muted">
            Contact email: {process.env.NEXT_PUBLIC_CONTACT_EMAIL || "set NEXT_PUBLIC_CONTACT_EMAIL"}
          </p>
        </div>
        <ContactForm />
      </section>
    </div>
  );
}
