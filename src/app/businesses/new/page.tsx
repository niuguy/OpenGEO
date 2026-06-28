import { AuditWizard } from "@/components/audit-wizard";

export default function NewBusinessPage() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-8">
      <h1 className="text-3xl font-semibold text-ink">Set up an AI visibility audit</h1>
      <p className="mt-2 text-sm leading-6 text-muted">
        Start with a website or a name. We&apos;ll figure out what kind of target this is, pre-fill the details, and let
        you confirm everything before generating the prompts. No auth or multi-tenant setup in the OSS MVP.
      </p>
      <div className="mt-6">
        <AuditWizard />
      </div>
    </div>
  );
}
