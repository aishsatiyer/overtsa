import Link from "next/link";
import { ArrowRight, Building2, Users } from "lucide-react";

const crmItems = [
  {
    href: "/linkedin-crm",
    title: "People CRM",
    description: "Manage prospects, invite logs, and follow-up workflow.",
    icon: Users
  },
  {
    href: "/org-crm",
    title: "Org CRM",
    description: "Track companies, logos, websites, and attached people.",
    icon: Building2
  }
];

export default function CrmLandingPage() {
  return (
    <section className="space-y-6">
      <div className="space-y-2">
        <p className="text-[11px] font-medium uppercase tracking-[0.18em] text-[#8f8783]">
          CRM
        </p>
        <h1 className="text-2xl font-semibold tracking-tight text-[#171717]">CRM</h1>
        <p className="max-w-2xl text-sm leading-6 text-[#6f6966]">
          Pick the surface you want to work in. People CRM handles prospects and invites. Org CRM
          handles companies and the records around them.
        </p>

        <div className="flex flex-wrap gap-2 pt-2">
          {crmItems.map((item) => (
            <Link
              key={`${item.href}-chip`}
              href={item.href}
              className="inline-flex items-center gap-2 rounded-full border border-[#e7e0dc] bg-white px-3 py-1.5 text-xs font-medium text-[#5f5956] transition hover:bg-[#fbfaf9]"
            >
              {item.title}
            </Link>
          ))}
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        {crmItems.map((item) => {
          const Icon = item.icon;

          return (
            <Link
              key={item.href}
              href={item.href}
              className="group rounded-[28px] border border-[#e7e0dc] bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
            >
              <div className="flex items-start justify-between gap-4">
                <div className="rounded-2xl bg-[#171717] p-3 text-white">
                  <Icon className="h-5 w-5" />
                </div>
                <ArrowRight className="h-4 w-4 text-[#8f8783] transition group-hover:translate-x-0.5" />
              </div>
              <strong className="mt-5 block text-sm font-semibold text-[#171717]">
                {item.title}
              </strong>
              <p className="mt-1 text-sm leading-6 text-[#6f6966]">{item.description}</p>
            </Link>
          );
        })}
      </div>
    </section>
  );
}
