"use client";

import { BellRing, CalendarDays, ClipboardList } from "lucide-react";
import { getSettingsThemeClasses } from "./settings-theme";

const prompts = [
  {
    title: "After a few invite logs",
    description: "Ask if the latest sends still belong to V1, V2, or a custom tweak."
  },
  {
    title: "When a new pattern appears",
    description: "Prompt for confirmation if a message drifts away from the known templates."
  },
  {
    title: "Weekly review",
    description: "Collect a small human check-in so the classification stays honest over time."
  }
];

export function ReviewPromptsSettingsShell() {
  return (
    <section className={`space-y-6 ${getSettingsThemeClasses()}`}>
      <div className="space-y-2">
        <p className="settings-kicker text-[11px] font-medium uppercase tracking-[0.18em]">
          Settings
        </p>
        <h2 className="settings-heading text-2xl font-semibold tracking-tight">Review Prompts</h2>
        <p className="settings-copy max-w-2xl text-sm leading-6">
          This is the calm check-in layer. The system can ask you occasionally whether sends still
          belong to V1, V2, or a custom message.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        {prompts.map((prompt, index) => (
          <article
            key={prompt.title}
            className="settings-card rounded-3xl border bg-white p-5 shadow-sm"
          >
            <div className="flex items-start justify-between gap-4">
              <div className="settings-icon grid h-10 w-10 place-items-center rounded-2xl">
                {index === 0 ? (
                  <ClipboardList className="h-4 w-4" />
                ) : index === 1 ? (
                  <BellRing className="h-4 w-4" />
                ) : (
                  <CalendarDays className="h-4 w-4" />
                )}
              </div>
              <span className="settings-chip rounded-full border px-2.5 py-1 text-[11px] font-medium">
                Prompt {index + 1}
              </span>
            </div>
            <strong className="settings-heading mt-4 block text-sm font-semibold">{prompt.title}</strong>
            <p className="settings-copy mt-1 text-sm leading-6">{prompt.description}</p>
          </article>
        ))}
      </div>

      <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
        <div className="settings-card rounded-3xl border bg-white p-5 shadow-sm">
          <p className="settings-kicker text-[11px] font-medium uppercase tracking-[0.18em]">
            What this is
          </p>
          <p className="settings-label mt-2 text-sm leading-6">
            Review prompts are a small check-in queue for uncertain sends. When a message drifts
            from V1 or V2, the system can ask you whether it should stay custom or be grouped with
            one of the canonical versions.
          </p>
        </div>

        <div className="settings-card rounded-3xl border bg-white p-5 shadow-sm">
          <p className="settings-kicker text-[11px] font-medium uppercase tracking-[0.18em]">
            Suggested behavior
          </p>
          <p className="settings-label mt-2 text-sm leading-6">
            Ask only when there is enough signal to make the question useful. The goal is a gentle
            calibration loop, not a constant interrupt.
          </p>
        </div>
      </div>
    </section>
  );
}
