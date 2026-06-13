"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  BarChart3,
  ChevronRight,
  LayoutDashboard,
  Settings2,
  Users
} from "lucide-react";

const navItems = [
  { label: "Dashboard", href: "/", icon: LayoutDashboard },
  { label: "CRM", href: "/crm", icon: Users },
  { label: "Settings", href: "/settings", icon: Settings2 },
  { label: "Analytics", href: "/analytics", icon: BarChart3 }
];

export function AppSidebar() {
  const pathname = usePathname();

  return (
    <aside className="hidden min-h-screen border-r border-black/5 bg-white px-4 py-5 lg:flex lg:flex-col">
      <Link
        href="/"
        className="mb-10 flex h-11 w-11 items-center justify-center rounded-2xl"
      >
        <img src="/logo.svg" alt="Overtly logo" className="h-9 w-9 object-contain" />
      </Link>

      <nav className="flex flex-1 flex-col gap-4">
        {navItems.map((item) => {
          const Icon = item.icon;
          const active = item.href === "/" ? pathname === "/" : pathname.startsWith(item.href);

          return (
            <Link
              key={item.href}
              href={item.href}
              title={item.label}
            className={[
                "relative flex h-11 w-11 items-center justify-center rounded-2xl transition",
                active ? "bg-[#160927] text-white" : "text-black/45 hover:bg-black/[0.04] hover:text-black"
              ].join(" ")}
            >
              <Icon className="h-4 w-4" />
              {item.label === "CRM" ? (
                <span className="absolute -right-1 -top-1 rounded-full bg-[#f3c7bf] p-0.5 text-[#160927]">
                  <ChevronRight className="h-2.5 w-2.5" />
                </span>
              ) : null}
            </Link>
          );
        })}
      </nav>

      <div className="mt-auto flex flex-col items-center gap-3">
        <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[#160927] text-xs font-semibold text-white">
          AK
        </div>
      </div>
    </aside>
  );
}
