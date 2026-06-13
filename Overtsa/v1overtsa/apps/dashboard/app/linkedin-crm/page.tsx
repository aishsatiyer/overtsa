import { ProspectsCrmShell } from "../components/linkedin-crm/prospects-crm-shell";

export default function LinkedInCrmPage() {
  return (
    <main className="space-y-4">
      <section className="flex items-start justify-between gap-4">
        <div className="space-y-2">
          <p className="text-[11px] font-medium uppercase tracking-[0.18em] text-slate-500">
            LinkedIn CRM
          </p>
          <h2 className="text-[22px] font-semibold tracking-tight text-slate-950">Prospects</h2>
        </div>
      </section>

      <ProspectsCrmShell />
    </main>
  );
}
