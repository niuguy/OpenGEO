import Link from "next/link";
import { ContactForm } from "@/components/contact-form";
import { prisma } from "@/lib/prisma";
import { Badge, ProgressBar } from "@/components/ui-extras";

export default async function HomePage() {
  const demo = await prisma.business.findFirst({
    where: { id: "demo-woking-dentist" },
  });

  const demoSnapshot = demo
    ? await prisma.visibilitySnapshot.findFirst({
        where: { businessId: demo.id },
        orderBy: { createdAt: "desc" },
      })
    : null;

  return (
    <div className="mx-auto max-w-6xl px-4 py-10">
      <section className="grid gap-12 lg:grid-cols-[1.1fr_0.9fr] lg:items-center">
        <div>
          <Badge variant="accent" className="mb-4 uppercase tracking-wider">
            AI Search Visibility Engine
          </Badge>
          <h1 className="max-w-3xl text-4xl font-semibold leading-tight text-ink sm:text-6xl">
            See how your business appears in AI search results.
          </h1>
          <p className="mt-6 max-w-2xl text-lg leading-8 text-muted">
            Track your visibility across ChatGPT, Gemini, and Google AI
            Overview. Identify competitive gaps, monitor brand mentions, and
            understand exactly why AI recommends you (or your competitors).
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

        <div className="relative">
          <div className="absolute -inset-1 rounded-2xl bg-gradient-to-tr from-accent/20 to-transparent blur-2xl" />
          <div className="relative rounded-2xl border border-line bg-white p-6 shadow-xl">
            <div className="flex items-center justify-between border-b border-line pb-4">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-widest text-muted">
                  Demo Report
                </p>
                <p className="font-semibold text-ink">
                  {demo?.name || "Example Clinic"}
                </p>
              </div>
              <Badge variant="accent">Live Data</Badge>
            </div>

            <div className="mt-6 space-y-6">
              <div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted">AI Visibility Score</span>
                  <span className="font-bold text-ink">
                    {demoSnapshot?.visibilityScore || 68}%
                  </span>
                </div>
                <ProgressBar
                  value={demoSnapshot?.visibilityScore || 68}
                  className="mt-2"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="rounded-lg bg-panel p-3 border border-line">
                  <p className="text-[10px] font-bold uppercase text-muted">
                    Share of Voice
                  </p>
                  <p className="mt-1 text-xl font-bold text-ink">
                    {demoSnapshot?.shareOfVoice || 42}%
                  </p>
                </div>
                <div className="rounded-lg bg-panel p-3 border border-line">
                  <p className="text-[10px] font-bold uppercase text-muted">
                    Avg. Rank
                  </p>
                  <p className="mt-1 text-xl font-bold text-ink">
                    #{demoSnapshot?.averageRank?.toFixed(1) || "1.8"}
                  </p>
                </div>
              </div>

              <div className="rounded-lg border border-line border-dashed p-4">
                <p className="text-xs font-medium text-ink">Latest Insight</p>
                <p className="mt-1 text-xs leading-relaxed text-muted italic">
                  \"The AI recommends this business specifically for 'emergency
                  dentistry' and 'children's care' due to positive local
                  sentiment extracted from recent reviews.\"
                </p>
              </div>
            </div>

            <div className="mt-6 flex justify-center">
              <span className="text-[10px] font-medium text-muted uppercase tracking-widest">
                Real-time sampling active
              </span>
            </div>
          </div>
        </div>
      </section>

      <section className="mt-24 text-center">
        <h2 className="text-3xl font-semibold text-ink">How it works</h2>
        <div className="mt-12 grid gap-8 md:grid-cols-3">
          {[
            {
              step: "01",
              title: "Crawl & Context",
              body: "We analyze your website digital footprint, extracting semantic attributes and service signals that AI models look for.",
            },
            {
              step: "02",
              title: "Intent Sampling",
              body: "We simulate dozens of local-intent searches across ChatGPT, Gemini, and Google to see how models recommend your business.",
            },
            {
              step: "03",
              title: "Gap Analysis",
              body: "Identify exactly why competitors are outranking you in AI answers and get a roadmap to improve your AI visibility.",
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
                  <p className="font-semibold">Win Competitive Gaps</p>
                  <p className="text-sm text-white/60 mt-1">
                    Identify specific attributes that lead to competitor
                    recommendations.
                  </p>
                </div>
              </div>
              <div className="flex gap-4">
                <div className="mt-1 h-5 w-5 shrink-0 rounded-full bg-accent/20 flex items-center justify-center text-accent text-xs">
                  ✓
                </div>
                <div>
                  <p className="font-semibold">Verify Performance</p>
                  <p className="text-sm text-white/60 mt-1">
                    Access raw provider data to validate AI visibility gains.
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
                  content opportunities.
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
              \"The transparency provided by the raw source data has been a
              game-changer for our agency's client reporting.\""
            </p>
            <p className="mt-3 text-xs font-bold text-muted uppercase tracking-widest">
              — Senior SEO Lead
            </p>
          </div>
          <p className="mt-8 text-sm text-muted">
            Contact us:{" "}
            <span className="font-bold text-ink">
              {process.env.NEXT_PUBLIC_CONTACT_EMAIL ||
                "set NEXT_PUBLIC_CONTACT_EMAIL"}
            </span>
          </p>
        </div>
        <div className="rounded-2xl border border-line bg-white p-8 shadow-sm">
          <ContactForm />
        </div>
      </section>
    </div>
  );
}
