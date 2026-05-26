import Link from "next/link";
import { ContactForm } from "@/components/contact-form";
import { prisma } from "@/lib/prisma";
import { Badge } from "@/components/ui-extras";
import { DemoReportCard } from "@/components/demo-report-card";

export default async function HomePage() {
  const demo = await prisma.business.findFirst({
    where: { id: "demo-woking-dentist" },
  });

  const demoName = demo?.name ?? "Smile Dental Practice";
  const demoLocation = demo?.location ?? "Woking, Surrey";

  return (
    <div className="mx-auto max-w-6xl px-4 py-10">
      <section className="grid gap-12 lg:grid-cols-[1.1fr_0.9fr] lg:items-center">
        <div>
          <Badge variant="accent" className="mb-4 uppercase tracking-wider">
            AI Search Visibility & Readiness Audit
          </Badge>
          <h1 className="max-w-3xl text-4xl font-semibold leading-tight text-ink sm:text-6xl">
            See how your business appears in AI search results.
          </h1>
          <p className="mt-6 max-w-2xl text-lg leading-8 text-muted">
            Audit your AI search readiness against Google, OpenAI, and
            Schema.org standards — and verify how ChatGPT actually answers about
            you, with reproducible, source-cited results.
          </p>
          <div className="mt-8 flex flex-wrap gap-4">
            <Link
              href={demo ? `/businesses/${demo.id}` : "/businesses/new"}
              className="focus-ring rounded-md bg-accent px-6 py-3 text-sm font-semibold text-white transition-opacity hover:opacity-90"
            >
              View Sample Audit
            </Link>
            <Link
              href="#inquiry"
              className="focus-ring rounded-md border border-line bg-white px-6 py-3 text-sm font-semibold text-ink transition-colors hover:bg-panel"
            >
              Analyze Your Business
            </Link>
          </div>
        </div>

        <DemoReportCard businessName={demoName} location={demoLocation} />
      </section>

      <section className="mt-24 text-center">
        <h2 className="text-3xl font-semibold text-ink">How it works</h2>
        <div className="mt-12 grid gap-8 md:grid-cols-3">
          {[
            {
              step: "01",
              title: "Audit the inputs",
              body: "Deterministic checks against Google's, OpenAI's, and Schema.org's published standards: structured data, AI crawler config, Google Business Profile, and off-site citations.",
            },
            {
              step: "02",
              title: "Spot-check the outputs",
              body: "Pinned-model LLM samples with confidence intervals show how ChatGPT, Gemini, and Google AI actually answer about you — reproducibly, with raw evidence you can verify.",
            },
            {
              step: "03",
              title: "Ship the fix",
              body: "Every failing check comes with a documented fix and its point-value impact on your readiness score. No vague recommendations.",
            },
          ].map((item) => (
            <div
              key={item.step}
              className="group relative rounded-2xl border border-line bg-white p-8 transition-shadow hover:shadow-md"
            >
              <div className="mb-4 inline-flex h-12 w-12 items-center justify-center rounded-full bg-panel text-xl font-bold text-accent transition-colors group-hover:bg-accent group-hover:text-white">
                {item.step}
              </div>
              <h3 className="text-xl font-semibold text-ink">{item.title}</h3>
              <p className="mt-3 text-sm leading-7 text-muted">{item.body}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="mt-24 rounded-3xl bg-ink p-10 text-white lg:p-16">
        <div className="grid gap-12 lg:grid-cols-2 lg:items-center">
          <div>
            <h2 className="text-3xl font-semibold sm:text-4xl">
              Strategic intelligence for the AI era.
            </h2>
            <p className="mt-6 text-lg text-white/70">
              Stop guessing how AI models perceive your brand. Get structured
              evidence, raw answers, and competitive benchmarks.
            </p>
            <div className="mt-10 space-y-6">
              <div className="flex gap-4">
                <div className="mt-1 h-5 w-5 shrink-0 rounded-full bg-accent/20 flex items-center justify-center text-accent text-xs">
                  ✓
                </div>
                <div>
                  <p className="font-semibold">Protect Your Brand</p>
                  <p className="text-sm text-white/60 mt-1">
                    Monitor sentiment and accuracy in AI-generated answers.
                  </p>
                </div>
              </div>
              <div className="flex gap-4">
                <div className="mt-1 h-5 w-5 shrink-0 rounded-full bg-accent/20 flex items-center justify-center text-accent text-xs">
                  ✓
                </div>
                <div>
                  <p className="font-semibold">Action-First Reporting</p>
                  <p className="text-sm text-white/60 mt-1">
                    Every audit ends with a ranked fix list, scored by readiness
                    impact. No vague recommendations.
                  </p>
                </div>
              </div>
              <div className="flex gap-4">
                <div className="mt-1 h-5 w-5 shrink-0 rounded-full bg-accent/20 flex items-center justify-center text-accent text-xs">
                  ✓
                </div>
                <div>
                  <p className="font-semibold">Reproducible by Design</p>
                  <p className="text-sm text-white/60 mt-1">
                    Deterministic checks plus pinned-model LLM observation mean
                    the same audit returns the same score. Trend lines you can
                    actually trust.
                  </p>
                </div>
              </div>
            </div>
          </div>
          <div className="rounded-2xl bg-white/5 p-8 border border-white/10">
            <h3 className="text-xl font-semibold">Strategic Insights</h3>
            <div className="mt-8 space-y-8">
              <div>
                <dt className="text-sm font-bold uppercase tracking-wider text-accent">
                  Any Local Service Category
                </dt>
                <dd className="mt-2 text-sm text-white/60 leading-6">
                  Works out of the box for dentists, accountants, solicitors,
                  plumbers, and more. Category-specific evidence signals are
                  applied automatically so prompts match how real customers
                  search.
                </dd>
              </div>
              <div>
                <dt className="text-sm font-bold uppercase tracking-wider text-accent">
                  For Businesses
                </dt>
                <dd className="mt-2 text-sm text-white/60 leading-6">
                  Ensure your unique value is accurately captured. Monitor how
                  you are recommended to potential customers across all major AI
                  platforms.
                </dd>
              </div>
              <div>
                <dt className="text-sm font-bold uppercase tracking-wider text-accent">
                  For Agencies
                </dt>
                <dd className="mt-2 text-sm text-white/60 leading-6">
                  Deliver data-backed AI SEO strategies. Use transparent
                  sampling to prove visibility gains and identify high-value
                  content opportunities across your entire client portfolio.
                </dd>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section
        id="inquiry"
        className="mt-24 grid gap-12 lg:grid-cols-[0.9fr_1.1fr] lg:items-start"
      >
        <div>
          <h2 className="text-3xl font-semibold text-ink">Get Started</h2>
          <p className="mt-4 text-lg text-muted">
            Ready to scale your AI search monitoring? We offer managed setup,
            white-label reports, and industry-specific benchmarking for
            high-growth brands and agencies.
          </p>
          <div className="mt-8 rounded-xl border border-line bg-panel p-6">
            <p className="text-sm font-medium text-ink italic">
              &ldquo;The transparency provided by the raw source data has been a
              game-changer for our agency&rsquo;s client reporting.&rdquo;
            </p>
            <p className="mt-3 text-xs font-bold text-muted uppercase tracking-widest">
              — Senior SEO Lead
            </p>
          </div>
          {process.env.NEXT_PUBLIC_CONTACT_EMAIL && (
            <p className="mt-8 text-sm text-muted">
              Contact us:{" "}
              <span className="font-bold text-ink">
                {process.env.NEXT_PUBLIC_CONTACT_EMAIL}
              </span>
            </p>
          )}
        </div>
        <div className="rounded-2xl border border-line bg-white p-8 shadow-sm">
          <ContactForm />
        </div>
      </section>
    </div>
  );
}
