"use client";

import { useEffect, useMemo, useState } from "react";
import type {
  CreateInviteTemplateInput,
  InviteTemplate,
  InviteTemplateListResponse,
  InviteTemplatePerformance,
  InviteTemplatePerformanceListResponse
} from "@overtly/shared";
import {
  Archive,
  ChevronRight,
  CopyPlus,
  Plus,
  Search,
  Trash2,
  Undo2
} from "lucide-react";
import { getSettingsThemeClasses } from "./settings-theme";

type TabKey = "templates" | "variants";

type Draft = {
  name: string;
  versionLabel: string;
  targetSegment: string[];
  templateText: string;
  notes: string;
  isActive: boolean;
};

const segmentOptions = [
  {
    value: "agency",
    label: "Agency",
    dot: "bg-[#e88a78]",
    active: "border-[#efc5ba] bg-[#fff3ef] text-[#a95145]"
  },
  {
    value: "in_house",
    label: "In-house",
    dot: "bg-[#8ea2e8]",
    active: "border-[#ccd6f5] bg-[#f2f5ff] text-[#5b6fb8]"
  },
  {
    value: "founder",
    label: "Founder",
    dot: "bg-[#a98be8]",
    active: "border-[#ddcff8] bg-[#f7f1ff] text-[#7258b4]"
  },
  {
    value: "consultant",
    label: "Consultant",
    dot: "bg-[#78b98e]",
    active: "border-[#cfe8d7] bg-[#f1faf4] text-[#4f835e]"
  },
  {
    value: "other",
    label: "Other",
    dot: "bg-[#9c9691]",
    active: "border-[#e5ddd7] bg-[#f7f4f1] text-[#635c57]"
  }
] as const;

const emptyDraft: Draft = {
  name: "",
  versionLabel: "",
  targetSegment: [],
  templateText: "",
  notes: "",
  isActive: true
};

function getApiBaseUrl() {
  return process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000";
}

function formatDate(value: string | null | undefined) {
  if (!value) return "Not set";

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return value;

  return parsed.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric"
  });
}

function formatTimeAgo(value: string | null | undefined) {
  if (!value) return "Never";

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return value;

  const diffMs = Date.now() - parsed.getTime();
  const diffDays = Math.max(0, Math.floor(diffMs / 86400000));

  if (diffDays === 0) return "Today";
  if (diffDays === 1) return "1 day ago";

  return `${diffDays} days ago`;
}

function formatAudienceLabel(values: string[]) {
  if (!values.length) return "Open audience";

  return values
    .map((value) => segmentOptions.find((item) => item.value === value)?.label ?? value)
    .join(", ");
}

function toDraft(template: InviteTemplate): Draft {
  return {
    name: template.name,
    versionLabel: template.versionLabel,
    targetSegment: template.audienceTags.length
      ? template.audienceTags
      : template.targetSegment
        ? [template.targetSegment]
        : [],
    templateText: template.templateText,
    notes: template.notes ?? "",
    isActive: template.isActive
  };
}

function familyScore(performance: InviteTemplatePerformance[]) {
  if (!performance.length) return 0;

  const total = performance.reduce((sum, item) => sum + item.score, 0);
  return total / performance.length;
}

function getAudienceMeta(value: string) {
  return segmentOptions.find((item) => item.value === value);
}

function Stat({
  label,
  value
}: {
  label: string;
  value: string | number;
}) {
  return (
    <div className="min-w-0">
      <p className="text-[11px] leading-none text-[#9a918c]">{label}</p>
      <p className="mt-1 text-sm font-medium tracking-[-0.01em] text-[#171717]">{value}</p>
    </div>
  );
}

function FieldLabel({ children }: { children: React.ReactNode }) {
  return (
    <span className="text-[12px] font-medium leading-none text-[#6f6965]">
      {children}
    </span>
  );
}

const inputClass =
  "w-full rounded-[14px] border border-[#e7dfd8] bg-[#fffdfb] px-3.5 py-2.5 text-sm text-[#171717] outline-none transition placeholder:text-[#b6aea8] focus:border-[#171717] focus:bg-white";

const textareaClass =
  "w-full resize-none rounded-[14px] border border-[#e7dfd8] bg-[#fffdfb] px-3.5 py-3 text-sm leading-6 text-[#171717] outline-none transition placeholder:text-[#b6aea8] focus:border-[#171717] focus:bg-white";

export function MessageLibrarySettingsShell({
  initialTab = "templates"
}: {
  initialTab?: TabKey;
}) {
  const apiBaseUrl = getApiBaseUrl();

  const [tab, setTab] = useState<TabKey>(initialTab);
  const [templates, setTemplates] = useState<InviteTemplateListResponse["items"]>([]);
  const [performance, setPerformance] = useState<InviteTemplatePerformance[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [draft, setDraft] = useState<Draft>(emptyDraft);
  const [hasSeededSelection, setHasSeededSelection] = useState(false);

  const selectedTemplate = useMemo(
    () => templates.find((item) => item.id === selectedId) ?? null,
    [selectedId, templates]
  );

  const performanceById = useMemo(
    () => new Map(performance.map((item) => [item.id, item] as const)),
    [performance]
  );

  const query = searchQuery.trim().toLowerCase();

  const visibleTemplates = useMemo(() => {
    const base = tab === "templates" ? templates.filter((item) => item.isActive) : templates;

    if (!query) return base;

    return base.filter((item) => {
      const audience = item.audienceTags.join(" ").toLowerCase();
      const text = [
        item.name,
        item.versionLabel,
        item.templateText,
        item.notes ?? "",
        audience
      ]
        .join(" ")
        .toLowerCase();

      return text.includes(query);
    });
  }, [query, tab, templates]);

  const activeCount = useMemo(
    () => templates.filter((item) => item.isActive).length,
    [templates]
  );

  const archivedCount = useMemo(
    () => templates.filter((item) => !item.isActive).length,
    [templates]
  );

  const familyCount = useMemo(
    () => new Set(templates.map((item) => item.name.trim())).size,
    [templates]
  );

  const averageScore = useMemo(() => familyScore(performance), [performance]);

  const familyGroups = useMemo(() => {
    const map = new Map<string, InviteTemplate[]>();

    for (const item of visibleTemplates) {
      const key = item.name.trim() || "Untitled family";
      const bucket = map.get(key) ?? [];
      bucket.push(item);
      map.set(key, bucket);
    }

    return Array.from(map.entries()).map(([name, items]) => ({
      name,
      items: [...items].sort((a, b) => b.createdAt.localeCompare(a.createdAt)),
      score:
        items.length > 0
          ? items.reduce((sum, item) => sum + (performanceById.get(item.id)?.score ?? 0), 0) /
          items.length
          : 0,
      replies: items.reduce((sum, item) => sum + (performanceById.get(item.id)?.replies ?? 0), 0)
    }));
  }, [performanceById, visibleTemplates]);

  const archivedGroups = useMemo(() => {
    const map = new Map<string, InviteTemplate[]>();

    for (const item of templates.filter((entry) => !entry.isActive)) {
      const key = item.name.trim() || "Untitled family";
      const bucket = map.get(key) ?? [];
      bucket.push(item);
      map.set(key, bucket);
    }

    return Array.from(map.entries()).map(([name, items]) => ({
      name,
      items: [...items].sort((a, b) => b.createdAt.localeCompare(a.createdAt))
    }));
  }, [templates]);

  const selectedPerformance = selectedTemplate ? performanceById.get(selectedTemplate.id) : null;

  const familyHistory = selectedTemplate
    ? templates
      .filter((item) => item.name === selectedTemplate.name)
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
    : [];

  async function loadItems() {
    setIsLoading(true);
    setError(null);

    try {
      const [templatesResponse, performanceResponse] = await Promise.all([
        fetch(`${apiBaseUrl}/v1/invite-templates`, { cache: "no-store" }),
        fetch(`${apiBaseUrl}/v1/invite-templates/performance`, { cache: "no-store" })
      ]);

      if (!templatesResponse.ok) throw new Error("Could not load message library.");
      if (!performanceResponse.ok) throw new Error("Could not load performance data.");

      const templatesData = (await templatesResponse.json()) as InviteTemplateListResponse;
      const performanceData =
        (await performanceResponse.json()) as InviteTemplatePerformanceListResponse;

      setTemplates(templatesData.items);
      setPerformance(performanceData.items);
    } catch (loadError) {
      setTemplates([]);
      setPerformance([]);
      setError(loadError instanceof Error ? loadError.message : "Unknown error");
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    void loadItems();
  }, [apiBaseUrl]);

  useEffect(() => {
    if (!hasSeededSelection && !selectedTemplate && visibleTemplates[0]) {
      setSelectedId(visibleTemplates[0].id);
      setHasSeededSelection(true);
    }
  }, [hasSeededSelection, selectedTemplate, visibleTemplates]);

  useEffect(() => {
    if (selectedTemplate) {
      setDraft(toDraft(selectedTemplate));
    } else {
      setDraft(emptyDraft);
    }
  }, [selectedTemplate?.id]);

  function beginClone(template: InviteTemplate) {
    setSelectedId(template.id);
    setDraft({
      ...toDraft(template),
      notes: template.notes ?? ""
    });
    setError(null);
  }

  function startNew() {
    setSelectedId(null);
    setHasSeededSelection(true);
    setDraft(emptyDraft);
    setError(null);
  }

  async function saveVersion() {
    setIsSaving(true);
    setError(null);

    try {
      const payload: CreateInviteTemplateInput = {
        name: draft.name.trim(),
        versionLabel: draft.versionLabel.trim(),
        targetSegment: draft.targetSegment[0]
          ? (draft.targetSegment[0] as CreateInviteTemplateInput["targetSegment"])
          : null,
        audienceTags: draft.targetSegment,
        templateText: draft.templateText.trim(),
        notes: draft.notes.trim() || null,
        isActive: draft.isActive
      };

      const response = await fetch(`${apiBaseUrl}/v1/invite-templates`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });

      if (!response.ok) {
        throw new Error("Could not save message version.");
      }

      await loadItems();
      setSelectedId(null);
      setDraft(emptyDraft);
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "Could not save message version.");
    } finally {
      setIsSaving(false);
    }
  }

  async function archiveSelected() {
    if (!selectedTemplate) return;

    setIsSaving(true);
    setError(null);

    try {
      const response = await fetch(`${apiBaseUrl}/v1/invite-templates/${selectedTemplate.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: selectedTemplate.name,
          versionLabel: selectedTemplate.versionLabel,
          targetSegment: selectedTemplate.targetSegment,
          audienceTags: selectedTemplate.audienceTags,
          templateText: selectedTemplate.templateText,
          notes: selectedTemplate.notes,
          isActive: false
        })
      });

      if (!response.ok) throw new Error("Could not archive this version.");

      await loadItems();
    } catch (archiveError) {
      setError(archiveError instanceof Error ? archiveError.message : "Could not archive this version.");
    } finally {
      setIsSaving(false);
    }
  }

  async function deleteSelected() {
    if (!selectedTemplate) return;

    const confirmed = window.confirm(
      "Delete this version permanently? You can archive it instead if you want to keep history."
    );

    if (!confirmed) return;

    setIsDeleting(true);
    setError(null);

    try {
      const response = await fetch(`${apiBaseUrl}/v1/invite-templates/${selectedTemplate.id}`, {
        method: "DELETE"
      });

      if (!response.ok) throw new Error("Could not delete this version.");

      await loadItems();
      setSelectedId(null);
      setDraft(emptyDraft);
    } catch (deleteError) {
      setError(deleteError instanceof Error ? deleteError.message : "Could not delete this version.");
    } finally {
      setIsDeleting(false);
    }
  }

  function toggleAudienceTag(tag: string) {
    setDraft((current) => {
      const exists = current.targetSegment.includes(tag);

      const next = exists
        ? current.targetSegment.filter((item) => item !== tag)
        : [...current.targetSegment, tag];

      return {
        ...current,
        targetSegment: next
      };
    });
  }

  return (
    <section
      className={[
        "min-h-screen space-y-6 bg-[#faf8f5] text-[#171717]",
        getSettingsThemeClasses()
      ].join(" ")}
    >
      <header className="border-b border-[#e8e0da] pb-5">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-2xl">
            <p className="text-[11px] font-medium uppercase tracking-[0.2em] text-[#9d948e]">
              Settings
            </p>
            <h1 className="mt-2 text-[30px] font-medium tracking-[-0.045em] text-[#171717]">
              Message Library
            </h1>
            <p className="mt-2 text-sm leading-6 text-[#746d68]">
              Create, compare, and preserve invite messages without turning the page into a
              spreadsheet.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-5">
            <div className="grid grid-cols-4 gap-4 rounded-[18px] border border-[#e8e0da] bg-[#fffdfb] px-4 py-3 shadow-[0_20px_60px_rgba(40,30,24,0.04)]">
              <Stat label="Families" value={familyCount} />
              <Stat label="Active" value={activeCount} />
              <Stat label="Archived" value={archivedCount} />
              <Stat label="Score" value={averageScore.toFixed(1)} />
            </div>

            <button
              type="button"
              onClick={startNew}
              className="inline-flex h-10 items-center gap-2 rounded-full bg-[#171717] px-4 text-sm font-medium text-white transition hover:bg-black"
            >
              <Plus className="h-4 w-4" />
              New version
            </button>
          </div>
        </div>
      </header>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_410px]">
        <main className="min-w-0 space-y-4">
          <section className="rounded-[22px] border border-[#e8e0da] bg-[#fffdfb] p-3 shadow-[0_24px_80px_rgba(40,30,24,0.05)]">
            <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
              <div className="flex rounded-full border border-[#e8e0da] bg-[#f7f3ef] p-1">
                {[
                  { key: "templates", label: "Active templates" },
                  { key: "variants", label: "All variants" }
                ].map((item) => {
                  const active = tab === item.key;

                  return (
                    <button
                      key={item.key}
                      type="button"
                      onClick={() => setTab(item.key as TabKey)}
                      className={[
                        "rounded-full px-3.5 py-1.5 text-sm font-medium transition",
                        active
                          ? "bg-white text-[#171717] shadow-[0_8px_22px_rgba(40,30,24,0.08)]"
                          : "text-[#827973] hover:text-[#171717]"
                      ].join(" ")}
                    >
                      {item.label}
                    </button>
                  );
                })}
              </div>

              <label className="flex h-10 min-w-0 items-center gap-2 rounded-full border border-[#e8e0da] bg-white px-3 md:w-[360px]">
                <Search className="h-4 w-4 shrink-0 text-[#9d948e]" />
                <input
                  value={searchQuery}
                  onChange={(event) => setSearchQuery(event.target.value)}
                  placeholder="Search messages, notes, audiences..."
                  className="w-full bg-transparent text-sm text-[#171717] outline-none placeholder:text-[#aaa29e]"
                />
              </label>
            </div>
          </section>

          <section className="overflow-hidden rounded-[26px] border border-[#e8e0da] bg-[#fffdfb] shadow-[0_24px_80px_rgba(40,30,24,0.05)]">
            <div className="flex items-center justify-between border-b border-[#eee6df] px-5 py-4">
              <div>
                <p className="text-[11px] font-medium uppercase tracking-[0.18em] text-[#9d948e]">
                  Library
                </p>
                <h2 className="mt-1 text-base font-medium tracking-[-0.02em] text-[#171717]">
                  Message families
                </h2>
              </div>

              <div className="text-right text-xs leading-5 text-[#8d847e]">
                <p>{isLoading ? "Loading" : `${visibleTemplates.length} visible versions`}</p>
                <p>{performance.length} tracked variants</p>
              </div>
            </div>

            {isLoading ? (
              <div className="px-5 py-16 text-sm text-[#746d68]">
                Loading message library...
              </div>
            ) : familyGroups.length === 0 ? (
              <div className="px-5 py-16 text-sm text-[#746d68]">
                No message versions yet.
              </div>
            ) : (
              <div className="divide-y divide-[#eee6df]">
                {familyGroups.map((family) => (
                  <section key={family.name} className="bg-white/70">
                    <div className="flex items-center justify-between gap-4 bg-[#fcfaf8] px-5 py-3">
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium tracking-[-0.01em] text-[#171717]">
                          {family.name}
                        </p>
                        <p className="mt-0.5 text-xs text-[#9d948e]">
                          {family.items.length} versions · {family.replies} replies
                        </p>
                      </div>

                      <p className="shrink-0 text-xs text-[#8d847e]">
                        score{" "}
                        <span className="font-medium text-[#171717]">
                          {family.score.toFixed(1)}
                        </span>
                      </p>
                    </div>

                    <div className="divide-y divide-[#f0e9e3]">
                      {family.items.map((item) => {
                        const perf = performanceById.get(item.id);
                        const selected = item.id === selectedTemplate?.id;

                        return (
                          <button
                            key={item.id}
                            type="button"
                            onClick={() => {
                              setSelectedId(item.id);
                              beginClone(item);
                            }}
                            className={[
                              "group grid w-full grid-cols-[minmax(0,1fr)_auto] gap-4 px-5 py-4 text-left transition",
                              selected
                                ? "bg-[#fff4ef]"
                                : "bg-white hover:bg-[#fffaf7]"
                            ].join(" ")}
                          >
                            <div className="min-w-0">
                              <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                                <p className="text-sm font-medium tracking-[-0.01em] text-[#171717]">
                                  {item.versionLabel}
                                </p>

                                <span className="text-xs text-[#b0a7a0]">/</span>

                                <span className="text-xs text-[#8d847e]">
                                  {formatAudienceLabel(item.audienceTags)}
                                </span>

                                <span
                                  className={[
                                    "ml-1 inline-flex h-1.5 w-1.5 rounded-full",
                                    item.isActive ? "bg-[#6fb47e]" : "bg-[#d7a18d]"
                                  ].join(" ")}
                                />
                              </div>

                              <p className="mt-2 line-clamp-2 max-w-3xl text-sm leading-6 text-[#5f5956]">
                                {item.templateText}
                              </p>

                              <div className="mt-3 flex flex-wrap items-center gap-3 text-xs text-[#9d948e]">
                                <span>Updated {formatTimeAgo(item.updatedAt)}</span>
                                <span>Created {formatDate(item.createdAt)}</span>
                                {item.notes ? <span className="truncate">Note: {item.notes}</span> : null}
                              </div>
                            </div>

                            <div className="flex min-w-[116px] items-center justify-end gap-4">
                              <div className="hidden text-right text-xs leading-5 text-[#8d847e] sm:block">
                                <p>
                                  <span className="font-medium text-[#171717]">
                                    {perf?.replies ?? 0}
                                  </span>{" "}
                                  replies
                                </p>
                                <p>
                                  <span className="font-medium text-[#171717]">
                                    {perf?.accepts ?? 0}
                                  </span>{" "}
                                  accepts
                                </p>
                              </div>

                              <span
                                className={[
                                  "grid h-8 w-8 place-items-center rounded-full border transition",
                                  selected
                                    ? "border-[#171717] bg-[#171717] text-white"
                                    : "border-[#e8e0da] bg-white text-[#9d948e] group-hover:border-[#171717] group-hover:text-[#171717]"
                                ].join(" ")}
                              >
                                <ChevronRight className="h-4 w-4" />
                              </span>
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  </section>
                ))}
              </div>
            )}
          </section>

          {tab === "variants" && archivedGroups.length ? (
            <section className="rounded-[26px] border border-dashed border-[#e4d6cd] bg-[#fcf8f5] p-5">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <p className="text-[11px] font-medium uppercase tracking-[0.18em] text-[#9d948e]">
                    Archive
                  </p>
                  <h2 className="mt-1 text-base font-medium tracking-[-0.02em] text-[#171717]">
                    Archived versions
                  </h2>
                </div>

                <Archive className="h-4 w-4 text-[#9d948e]" />
              </div>

              <div className="mt-4 grid gap-3 md:grid-cols-2">
                {archivedGroups.map((family) => (
                  <div
                    key={family.name}
                    className="rounded-[18px] border border-[#e8e0da] bg-white p-3"
                  >
                    <div className="flex items-center justify-between gap-3">
                      <p className="truncate text-sm font-medium text-[#171717]">
                        {family.name}
                      </p>
                      <span className="shrink-0 text-xs text-[#9d948e]">
                        {family.items.length} archived
                      </span>
                    </div>

                    <div className="mt-3 space-y-1">
                      {family.items.map((item) => (
                        <button
                          key={item.id}
                          type="button"
                          onClick={() => {
                            setSelectedId(item.id);
                            beginClone(item);
                          }}
                          className="flex w-full items-center justify-between gap-3 rounded-[12px] px-2 py-2 text-left text-sm transition hover:bg-[#fff7f2]"
                        >
                          <span className="truncate text-[#6f6965]">{item.versionLabel}</span>
                          <span className="text-xs text-[#9d948e]">Open</span>
                        </button>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </section>
          ) : null}
        </main>

        <aside className="min-w-0 space-y-4 xl:sticky xl:top-5 xl:self-start">
          <section className="overflow-hidden rounded-[26px] border border-[#e8e0da] bg-white shadow-[0_24px_80px_rgba(40,30,24,0.06)]">
            <div className="border-b border-[#eee6df] bg-[#fffdfb] px-5 py-4">
              <p className="text-[11px] font-medium uppercase tracking-[0.18em] text-[#9d948e]">
                Editor
              </p>

              <div className="mt-1 flex items-start justify-between gap-4">
                <div className="min-w-0">
                  <h2 className="truncate text-xl font-medium tracking-[-0.035em] text-[#171717]">
                    {selectedTemplate ? selectedTemplate.name : "New version"}
                  </h2>
                  <p className="mt-1 text-sm leading-6 text-[#746d68]">
                    {selectedTemplate
                      ? "Clone the selected message or save a refined version."
                      : "Start a new reusable invite message."}
                  </p>
                </div>

                {selectedTemplate?.isActive ? (
                  <span className="rounded-full border border-[#cfe8d7] bg-[#f1faf4] px-2.5 py-1 text-xs font-medium text-[#4f835e]">
                    Active
                  </span>
                ) : selectedTemplate ? (
                  <span className="rounded-full border border-[#ead7cc] bg-[#fff4ef] px-2.5 py-1 text-xs font-medium text-[#a95145]">
                    Archived
                  </span>
                ) : null}
              </div>

              {selectedPerformance ? (
                <div className="mt-4 grid grid-cols-4 gap-3 border-t border-[#eee6df] pt-4">
                  <Stat label="Score" value={selectedPerformance.score.toFixed(1)} />
                  <Stat label="Sent" value={selectedPerformance.sends} />
                  <Stat label="Accepts" value={selectedPerformance.accepts} />
                  <Stat label="Replies" value={selectedPerformance.replies} />
                </div>
              ) : null}
            </div>

            <form
              className="space-y-4 px-5 py-5"
              onSubmit={(event) => {
                event.preventDefault();
                void saveVersion();
              }}
            >
              <label className="grid gap-2">
                <FieldLabel>Family name</FieldLabel>
                <input
                  value={draft.name}
                  onChange={(event) =>
                    setDraft((current) => ({ ...current, name: event.target.value }))
                  }
                  className={inputClass}
                  placeholder="Agency invite"
                />
              </label>

              <div className="grid grid-cols-2 gap-3">
                <label className="grid gap-2">
                  <FieldLabel>Version</FieldLabel>
                  <input
                    value={draft.versionLabel}
                    onChange={(event) =>
                      setDraft((current) => ({
                        ...current,
                        versionLabel: event.target.value
                      }))
                    }
                    className={inputClass}
                    placeholder="V1"
                  />
                </label>

                <div className="grid gap-2">
                  <FieldLabel>Status</FieldLabel>
                  <button
                    type="button"
                    onClick={() =>
                      setDraft((current) => ({
                        ...current,
                        isActive: !current.isActive
                      }))
                    }
                    className={[
                      "flex h-[42px] items-center justify-between rounded-[14px] border px-3.5 text-sm font-medium transition",
                      draft.isActive
                        ? "border-[#cfe8d7] bg-[#f4fbf6] text-[#4f835e]"
                        : "border-[#e8e0da] bg-[#fffdfb] text-[#746d68]"
                    ].join(" ")}
                  >
                    <span>{draft.isActive ? "Active" : "Inactive"}</span>
                    <span
                      className={[
                        "relative h-5 w-9 rounded-full transition",
                        draft.isActive ? "bg-[#6fb47e]" : "bg-[#d8d0ca]"
                      ].join(" ")}
                    >
                      <span
                        className={[
                          "absolute top-0.5 h-4 w-4 rounded-full bg-white shadow-sm transition",
                          draft.isActive ? "left-[18px]" : "left-0.5"
                        ].join(" ")}
                      />
                    </span>
                  </button>
                </div>
              </div>

              <div className="grid gap-2">
                <FieldLabel>Audience</FieldLabel>

                <div className="flex flex-wrap gap-2">
                  {segmentOptions.map((option) => {
                    const active = draft.targetSegment.includes(option.value);

                    return (
                      <button
                        type="button"
                        key={option.value}
                        onClick={() => toggleAudienceTag(option.value)}
                        className={[
                          "inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-medium transition",
                          active
                            ? option.active
                            : "border-[#e8e0da] bg-white text-[#746d68] hover:border-[#d8cec7] hover:bg-[#fffaf7]"
                        ].join(" ")}
                      >
                        <span className={["h-1.5 w-1.5 rounded-full", option.dot].join(" ")} />
                        {option.label}
                      </button>
                    );
                  })}
                </div>
              </div>

              <label className="grid gap-2">
                <FieldLabel>Message</FieldLabel>
                <textarea
                  value={draft.templateText}
                  onChange={(event) =>
                    setDraft((current) => ({
                      ...current,
                      templateText: event.target.value
                    }))
                  }
                  className={[textareaClass, "min-h-[180px]"].join(" ")}
                  placeholder="Hi {{first_name}}, ..."
                />
              </label>

              <label className="grid gap-2">
                <FieldLabel>Internal note</FieldLabel>
                <textarea
                  value={draft.notes}
                  onChange={(event) =>
                    setDraft((current) => ({ ...current, notes: event.target.value }))
                  }
                  className={[textareaClass, "min-h-[92px]"].join(" ")}
                  placeholder="What changed in this version?"
                />
              </label>

              {error ? (
                <p className="rounded-[14px] border border-[#f0c6c0] bg-[#fff4f1] px-3 py-2 text-sm leading-6 text-[#a95145]">
                  {error}
                </p>
              ) : null}

              <div className="flex flex-col gap-2 pt-1 sm:flex-row">
                <button
                  type="submit"
                  disabled={isSaving}
                  className="inline-flex min-h-10 flex-1 items-center justify-center gap-2 rounded-full bg-[#171717] px-4 text-sm font-medium text-white transition hover:bg-black disabled:cursor-progress disabled:opacity-70"
                >
                  <CopyPlus className="h-4 w-4" />
                  {selectedTemplate ? "Save as new version" : "Create version"}
                </button>

                <button
                  type="button"
                  onClick={() => selectedTemplate && beginClone(selectedTemplate)}
                  disabled={!selectedTemplate}
                  className="inline-flex min-h-10 items-center justify-center gap-2 rounded-full border border-[#e8e0da] bg-white px-4 text-sm font-medium text-[#746d68] transition hover:bg-[#fffaf7] disabled:cursor-not-allowed disabled:opacity-45"
                >
                  <Undo2 className="h-4 w-4" />
                  Reopen
                </button>
              </div>
            </form>
          </section>

          {selectedTemplate ? (
            <section className="rounded-[26px] border border-[#e8e0da] bg-[#fffdfb] p-5 shadow-[0_20px_70px_rgba(40,30,24,0.04)]">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <p className="text-[11px] font-medium uppercase tracking-[0.18em] text-[#9d948e]">
                    History
                  </p>
                  <h3 className="mt-1 text-base font-medium tracking-[-0.02em] text-[#171717]">
                    Version timeline
                  </h3>
                </div>

                <span className="text-xs text-[#9d948e]">{familyHistory.length} versions</span>
              </div>

              <div className="mt-4 space-y-1">
                {familyHistory.map((item) => {
                  const perf = performanceById.get(item.id);
                  const isCurrent = item.id === selectedTemplate.id;

                  return (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => {
                        setSelectedId(item.id);
                        beginClone(item);
                      }}
                      className={[
                        "flex w-full items-center justify-between gap-3 rounded-[14px] px-3 py-3 text-left transition",
                        isCurrent ? "bg-[#fff4ef]" : "hover:bg-[#fffaf7]"
                      ].join(" ")}
                    >
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium text-[#171717]">
                          {item.versionLabel}
                        </p>
                        <p className="mt-0.5 truncate text-xs text-[#9d948e]">
                          {formatDate(item.createdAt)} · {formatAudienceLabel(item.audienceTags)}
                        </p>
                      </div>

                      <div className="shrink-0 text-right text-xs leading-5 text-[#8d847e]">
                        <p>score {perf?.score.toFixed(1) ?? "0.0"}</p>
                        <p>{formatTimeAgo(item.updatedAt)}</p>
                      </div>
                    </button>
                  );
                })}
              </div>
            </section>
          ) : null}

          {selectedTemplate ? (
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => void archiveSelected()}
                disabled={isSaving}
                className="inline-flex min-h-11 items-center justify-center gap-2 rounded-full border border-[#e8e0da] bg-white px-4 text-sm font-medium text-[#746d68] transition hover:bg-[#fffaf7] disabled:cursor-progress disabled:opacity-70"
              >
                <Archive className="h-4 w-4" />
                Archive
              </button>

              <button
                type="button"
                onClick={() => void deleteSelected()}
                disabled={isDeleting}
                className="inline-flex min-h-11 items-center justify-center gap-2 rounded-full border border-[#f0c6c0] bg-[#fff4f1] px-4 text-sm font-medium text-[#a95145] transition hover:bg-[#ffe9e4] disabled:cursor-progress disabled:opacity-70"
              >
                <Trash2 className="h-4 w-4" />
                {isDeleting ? "Deleting..." : "Delete"}
              </button>
            </div>
          ) : null}
        </aside>
      </div>
    </section>
  );
}

export function InviteTemplatesSettingsShell() {
  return <MessageLibrarySettingsShell initialTab="templates" />;
}