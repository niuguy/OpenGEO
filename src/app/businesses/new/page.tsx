import { BusinessForm } from "@/components/business-form";

export default function NewBusinessPage() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-8">
      <h1 className="text-3xl font-semibold text-ink">Create an AI visibility audit</h1>
      <p className="mt-2 text-sm leading-6 text-muted">
        Add one local business, its known competitors, and target service attributes. No auth or multi-tenant setup in
        the OSS MVP.
      </p>
      <div className="mt-6">
        <BusinessForm />
      </div>
    </div>
  );
}
