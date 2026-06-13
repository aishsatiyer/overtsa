"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ChevronRight } from "lucide-react";

const labelMap: Record<string, string> = {
  "/": "Dashboard",
  "/crm": "CRM",
  "/linkedin-crm": "People CRM",
  "/org-crm": "Org CRM",
  "/settings": "Settings",
  "/settings/invite-templates": "Invite Templates",
  "/settings/sender-accounts": "Sender Accounts",
  "/settings/message-variants": "Message Variants",
  "/settings/review-prompts": "Review Prompts",
  "/analytics": "Analytics"
};

function buildCrumbs(pathname: string) {
  if (pathname === "/") return [];

  if (pathname === "/crm") {
    return [
      { href: "/", label: "Dashboard" },
      { href: "/crm", label: "CRM" }
    ];
  }

  if (pathname.startsWith("/settings/")) {
    const leaf = labelMap[pathname] ?? "Settings";
    return [
      { href: "/", label: "Dashboard" },
      { href: "/settings", label: "Settings" },
      { href: pathname, label: leaf }
    ];
  }

  if (pathname === "/linkedin-crm" || pathname === "/org-crm") {
    return [
      { href: "/", label: "Dashboard" },
      { href: "/crm", label: "CRM" },
      { href: pathname, label: labelMap[pathname] ?? "CRM" }
    ];
  }

  return [
    { href: "/", label: "Dashboard" },
    {
      href: pathname,
      label: labelMap[pathname] ?? (pathname.replaceAll("/", " ").trim() || "Page")
    }
  ];
}

export function Breadcrumbs() {
  const pathname = usePathname();
  const crumbs = buildCrumbs(pathname);

  if (!crumbs.length) return null;

  return (
    <nav aria-label="Breadcrumb" className="mb-4 flex flex-wrap items-center gap-1.5 text-[11px] text-[#8f8783]">
      {crumbs.map((crumb, index) => {
        const isLast = index === crumbs.length - 1;

        return (
          <div key={crumb.href} className="flex items-center gap-1.5">
            {index > 0 ? <ChevronRight className="h-3 w-3" /> : null}
            {isLast ? (
              <span className="font-medium text-[#171717]">{crumb.label}</span>
            ) : (
              <Link href={crumb.href} className="transition hover:text-[#171717]">
                {crumb.label}
              </Link>
            )}
          </div>
        );
      })}
    </nav>
  );
}
