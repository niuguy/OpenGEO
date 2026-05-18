import Link from "next/link";

export default function NotFound() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-12">
      <div className="rounded-lg border border-line bg-white p-6 shadow-sm">
        <h1 className="text-2xl font-semibold text-ink">Not found</h1>
        <p className="mt-2 text-sm text-muted">The requested audit does not exist.</p>
        <Link href="/businesses" className="mt-5 inline-block rounded-md bg-accent px-4 py-2 text-sm font-medium text-white">
          Back to audits
        </Link>
      </div>
    </div>
  );
}
