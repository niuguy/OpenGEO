import Link from "next/link";
import { prisma } from "@/lib/prisma";

export default async function BusinessesPage() {
  const businesses = await prisma.business.findMany({
    orderBy: { createdAt: "desc" },
    include: {
      _count: {
        select: {
          competitors: true,
          prompts: true,
        },
      },
    },
  });

  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-3xl font-semibold text-ink">Audits</h1>
          <p className="mt-2 text-sm text-muted">
            Local businesses configured for AI visibility observation.
          </p>
        </div>
        <Link
          href="/#inquiry"
          className="focus-ring rounded-md bg-accent px-4 py-2 text-sm font-medium text-white"
        >
          New audit
        </Link>
      </div>

      <div className="mt-6 overflow-hidden rounded-lg border border-line bg-white">
        {businesses.length === 0 ? (
          <div className="p-8 text-sm text-muted">
            No audits yet. Create one to start measuring ChatGPT visibility.
          </div>
        ) : (
          <table className="w-full text-left text-sm">
            <thead className="border-b border-line bg-panel text-muted">
              <tr>
                <th className="px-4 py-3 font-medium">Business</th>
                <th className="px-4 py-3 font-medium">Category</th>
                <th className="px-4 py-3 font-medium">Location</th>
                <th className="px-4 py-3 font-medium">Competitors</th>
                <th className="px-4 py-3 font-medium">Prompts</th>
              </tr>
            </thead>
            <tbody>
              {businesses.map((business) => (
                <tr
                  key={business.id}
                  className="border-b border-line last:border-0"
                >
                  <td className="px-4 py-3">
                    <Link
                      href={`/businesses/${business.id}`}
                      className="font-medium text-accent hover:underline"
                    >
                      {business.name}
                    </Link>
                  </td>
                  <td className="px-4 py-3 text-muted">{business.category}</td>
                  <td className="px-4 py-3 text-muted">{business.location}</td>
                  <td className="px-4 py-3 text-muted">
                    {business._count.competitors}
                  </td>
                  <td className="px-4 py-3 text-muted">
                    {business._count.prompts}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
