"use client";

import Link from "next/link";
import {
  ArrowRight,
  BadgeCheck,
  BellRing,
  MessageSquareText,
  Workflow
} from "lucide-react";
import { getSettingsThemeClasses } from "./settings-theme";

const cards = [
  {
    href: "/settings/invite-templates",
    title: "Invite Templates",
    description: "Open the library in the templates-first view.",
    icon: MessageSquareText
  },
  {
    href: "/settings/sender-accounts",
    title: "Sender Accounts",
    description: "See the LinkedIn accounts available for logging.",
    icon: BadgeCheck
  },
  {
    href: "/settings/message-variants",
    title: "Message Variants",
    description: "Open the same library in version-history mode.",
    icon: Workflow
  },
  {
    href: "/settings/review-prompts",
    title: "Review Prompts",
    description: "Set how often the system should ask for confirmation.",
    icon: BellRing
  }
];

export function SettingsShell() {
  return (
    <section className={`space-y-6 ${getSettingsThemeClasses()}`}>
      <div className="space-y-2">
        <p className="settings-kicker text-[11px] font-medium uppercase tracking-[0.18em]">
          Settings
        </p>
        <h2 className="settings-heading text-2xl font-semibold tracking-tight">
          System settings
        </h2>
        <p className="settings-copy max-w-2xl text-sm leading-6">
          This is where the operational pieces live: templates, sender accounts, message variants,
          and review behavior. The CRM stays for records; this stays for rules.
        </p>

        <div className="flex flex-wrap gap-2 pt-2">
          {cards.map((card) => (
            <Link
              key={card.href}
              href={card.href}
              className="settings-chip inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-medium transition hover:bg-[#fbfaf9]"
            >
              {card.title}
            </Link>
          ))}
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {cards.map((card) => {
          const Icon = card.icon;

          return (
            <Link
              key={card.href}
              href={card.href}
              className="settings-card group rounded-3xl border bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
            >
              <div className="flex items-start justify-between gap-4">
                <div className="settings-icon grid h-10 w-10 place-items-center rounded-2xl">
                  <Icon className="h-4 w-4" />
                </div>
                <ArrowRight className="settings-copy h-4 w-4 transition group-hover:translate-x-0.5" />
              </div>
              <strong className="settings-heading mt-4 block text-sm font-semibold">
                {card.title}
              </strong>
              <p className="settings-copy mt-1 text-sm leading-6">{card.description}</p>
            </Link>
          );
        })}
      </div>
    </section>
  );
}
