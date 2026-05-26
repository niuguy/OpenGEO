"use client";

export function WhitelabelForm({ businessId }: { businessId: string }) {
  return (
    <form
      className="mt-2 flex items-center gap-2"
      onSubmit={(e) => {
        e.preventDefault();
        const fd = new FormData(e.currentTarget);
        const name = encodeURIComponent(String(fd.get("agencyName") || ""));
        const site = encodeURIComponent(String(fd.get("agencyWebsite") || ""));
        const url = `/api/businesses/${businessId}/report.pdf?agencyName=${name}&agencyWebsite=${site}`;
        window.open(url, "_blank");
      }}
    >
      <input
        name="agencyName"
        required
        placeholder="Agency name"
        className="focus-ring rounded-md border border-line px-2 py-1 text-xs w-32"
      />
      <input
        name="agencyWebsite"
        placeholder="yoursite.com"
        className="focus-ring rounded-md border border-line px-2 py-1 text-xs w-28"
      />
      <button
        type="submit"
        className="focus-ring rounded-md border border-line bg-white px-2 py-1 text-xs font-medium hover:bg-panel"
      >
        Get PDF
      </button>
    </form>
  );
}
