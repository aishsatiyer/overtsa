"use client";

import { useEffect, useMemo, useState } from "react";
import type { CreateOrganizationInput, Organization, OrganizationListResponse } from "@overtly/shared";
import {
  Building2,
  Globe,
  Grid2x2,
  Layers3,
  List,
  MoreHorizontal,
  Plus,
  Search,
  ShieldCheck,
  Star,
  Users,
  PencilLine,
  Table2,
  Trash2,
  X
} from "lucide-react";

function getApiBaseUrl() {
  return process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000";
}

function getLogoDevToken() {
  return process.env.NEXT_PUBLIC_LOGO_DEV_TOKEN ?? "";
}

type OrganizationDraft = {
  name: string;
  domain: string;
  logoUrl: string;
  linkedinCompanyUrl: string;
  organizationType: CreateOrganizationInput["organizationType"];
  employeeCountText: string;
  notes: string;
  isPreviousEmployer: boolean;
};

const emptyDraft: OrganizationDraft = {
  name: "",
  domain: "",
  logoUrl: "",
  linkedinCompanyUrl: "",
  organizationType: "other",
  employeeCountText: "",
  notes: "",
  isPreviousEmployer: false
};

function toDraft(org: Organization): OrganizationDraft {
  return {
    name: org.name,
    domain: org.domain ?? "",
    logoUrl: org.logoUrl ?? "",
    linkedinCompanyUrl: org.linkedinCompanyUrl ?? "",
    organizationType: org.organizationType,
    employeeCountText: org.employeeCountText ?? "",
    notes: org.notes ?? "",
    isPreviousEmployer: org.isPreviousEmployer
  };
}

function formatDate(value: string | null) {
  if (!value) return "Not set";
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return value;
  return parsed.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric"
  });
}

function formatDisplayLabel(value: string | null | undefined) {
  if (!value) return "Not set";
  return value.replaceAll("_", " ").replace(/\b\w/g, (char) => char.toUpperCase());
}

function formatSegment(value: Organization["segment"]) {
  if (!value) return "Not set";
  return value.replaceAll("_", " ");
}

function formatOrgType(value: Organization["organizationType"]) {
  return value.replaceAll("_", " ");
}

function getApiError(response: Response, fallback: string) {
  return response
    .json()
    .then((body) => (typeof body?.message === "string" && body.message.trim() ? body.message : fallback))
    .catch(() => fallback);
}

function getInitials(name: string) {
  return name
    .split(" ")
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

function getDomainHost(value: string | null | undefined) {
  if (!value) return null;

  const trimmed = value.trim();

  if (!trimmed) return null;

  try {
    const url = trimmed.startsWith("http") ? new URL(trimmed) : new URL(`https://${trimmed}`);
    return url.hostname.replace(/^www\./i, "").toLowerCase();
  } catch {
    return trimmed
      .replace(/^https?:\/\//i, "")
      .replace(/^www\./i, "")
      .split("/")[0]
      .toLowerCase();
  }
}

function getOrganizationLogoUrls(org: Organization) {
  const token = getLogoDevToken();
  const domain = getDomainHost(org.domain ?? org.linkedinCompanyUrl ?? null);
  const name = org.name.trim();
  const encodedName = encodeURIComponent(name);
  const explicitLogo = org.logoUrl?.trim() ?? "";

  const urls: string[] = [];

  if (explicitLogo) {
    urls.push(explicitLogo);
  }

  if (token && domain) {
    urls.push(`https://img.logo.dev/${domain}?token=${token}&size=128&format=png&fallback=404`);
  }

  if (token && name) {
    urls.push(`https://img.logo.dev/${encodedName}?token=${token}&size=128&format=png&fallback=404`);
  }

  if (domain) {
    urls.push(`https://logo.clearbit.com/${domain}?size=128`);
    urls.push(`https://www.google.com/s2/favicons?domain=${domain}&sz=128`);
  }

  return urls;
}

function getTypeTone(org: Organization) {
  if (org.isPreviousEmployer) {
    return "border-[#f6d7bd] bg-[#fff3eb] text-[#a45a2a] before:bg-[#e89a67]";
  }

  switch (org.organizationType) {
    case "brand":
      return "border-[#ffd6d0] bg-[#fff1ef] text-[#9f4d45] before:bg-[#ff8e7f]";
    case "agency":
      return "border-[#dedee5] bg-[#f6f6f8] text-[#4f5662] before:bg-[#8d929d]";
    case "startup":
      return "border-[#f4cfc8] bg-[#fff7f4] text-[#8d5148] before:bg-[#eca596]";
    case "consultancy":
      return "border-[#e5ddda] bg-[#faf8f7] text-[#5e5552] before:bg-[#a29995]";
    default:
      return "border-[#e8e8ec] bg-[#f8f8fa] text-[#5d626c] before:bg-[#9ca1aa]";
  }
}

function CompanyAvatar({ org }: { org: Organization }) {
  const [logoIndex, setLogoIndex] = useState(0);
  const logoUrls = useMemo(() => getOrganizationLogoUrls(org), [org]);
  const logoUrl = logoUrls[logoIndex] ?? null;

  useEffect(() => {
    setLogoIndex(0);
  }, [org.id, org.domain, org.linkedinCompanyUrl, org.logoUrl]);

  return (
    <span className="flex h-8 w-8 shrink-0 items-center justify-center overflow-hidden rounded-full border border-white bg-[#111111] text-[11px] font-semibold tracking-[-0.03em] text-white shadow-[0_2px_10px_rgba(17,17,17,0.12)]">
      {logoUrl ? (
        <img
          alt={`${org.name} logo`}
          className="h-full w-full object-cover"
          src={logoUrl}
          onError={() => {
            if (logoIndex < logoUrls.length - 1) {
              setLogoIndex((current) => current + 1);
              return;
            }

            setLogoIndex(logoUrls.length);
          }}
        />
      ) : (
        getInitials(org.name)
      )}
    </span>
  );
}

function OrgBadge({ org }: { org: Organization }) {
  return (
    <span
      className={[
        "relative inline-flex items-center gap-1.5 rounded-md border px-2.5 py-1 text-[11px] font-medium capitalize leading-none before:h-1.5 before:w-1.5 before:rounded-full",
        getTypeTone(org)
      ].join(" ")}
    >
      {org.isPreviousEmployer ? "ex-customer" : formatOrgType(org.organizationType)}
    </span>
  );
}

function getOrgThemeClasses() {
  return [
    "text-[#171717]",
    "[&_.org-card]:!border-[#eee9e6] [&_.org-card]:!bg-white",
    "[&_.org-soft]:!bg-[#fbfaf9]",
    "[&_.org-subtle]:!bg-[#fffdfc]",
    "[&_.org-outline]:!border-[#eee9e6]",
    "[&_.org-heading]:!text-[#151515]",
    "[&_.org-muted]:!text-[#817a76]",
    "[&_.org-field]:!border-[#e8e3e0] [&_.org-field]:!bg-[#fbfaf9] [&_.org-field]:!text-[#171717] [&_.org-field]:placeholder:!text-[#aaa29e]",
    "[&_input]:!border-[#e8e3e0] [&_input]:!bg-[#fbfaf9] [&_input]:!text-[#171717] [&_input]:placeholder:!text-[#aaa29e] [&_select]:!border-[#e8e3e0] [&_select]:!bg-[#fbfaf9] [&_select]:!text-[#171717] [&_textarea]:!border-[#e8e3e0] [&_textarea]:!bg-[#fbfaf9] [&_textarea]:!text-[#171717] [&_textarea]:placeholder:!text-[#aaa29e]",
    "[&_.org-solid]:!bg-[#1d1d1d] [&_.org-solid]:!text-white hover:[&_.org-solid]:!bg-black",
    "[&_.org-banner]:!border-[#f4d1cb] [&_.org-banner]:!bg-[#fff4f1] [&_.org-banner]:!text-[#a64e44]"
  ].join(" ");
}

function OrganizationFormModal({
  draft,
  error,
  isOpen,
  isSaving,
  isEditing,
  onClose,
  onSave,
  setDraft
}: {
  draft: OrganizationDraft;
  error: string | null;
  isOpen: boolean;
  isSaving: boolean;
  isEditing: boolean;
  onClose: () => void;
  onSave: () => void;
  setDraft: React.Dispatch<React.SetStateAction<OrganizationDraft>>;
}) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/20 p-4 backdrop-blur-sm">
      <button aria-label="Close organization form" className="absolute inset-0 cursor-default" type="button" onClick={onClose} />
      <section className="org-card relative z-10 w-full max-w-xl rounded-[22px] border bg-white p-5 shadow-[0_26px_80px_rgba(0,0,0,0.14)]">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="org-muted text-[10px] font-medium uppercase tracking-[0.2em]">Manual org</p>
            <h3 className="org-heading mt-1 text-[18px] font-semibold tracking-[-0.04em]">
              {isEditing ? "Update organization" : "Add organization"}
            </h3>
          </div>
          <button type="button" onClick={onClose} className="org-field org-muted inline-flex h-8 w-8 items-center justify-center rounded-lg border transition hover:bg-black/[0.04] hover:text-inherit">
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="mt-5 grid gap-3">
          <label className="org-muted grid gap-1.5 text-[11px] font-medium">
            <span>Name</span>
            <input className="org-field h-10 rounded-xl border px-3 text-[13px] outline-none transition focus:border-[#ee9f91]" value={draft.name} onChange={(event) => setDraft((current) => ({ ...current, name: event.target.value }))} placeholder="Example Org" />
          </label>
          <label className="grid gap-1.5 text-[11px] font-medium text-[#68615e]">
            <span>Website / domain</span>
            <input className="h-10 rounded-xl border border-[#e8e3e0] bg-[#fbfaf9] px-3 text-[13px] outline-none transition focus:border-[#ee9f91] focus:bg-white" value={draft.domain} onChange={(event) => setDraft((current) => ({ ...current, domain: event.target.value }))} placeholder="example.com" />
          </label>
          <label className="grid gap-1.5 text-[11px] font-medium text-[#68615e]">
            <span>Logo URL</span>
            <input className="h-10 rounded-xl border border-[#e8e3e0] bg-[#fbfaf9] px-3 text-[13px] outline-none transition focus:border-[#ee9f91] focus:bg-white" value={draft.logoUrl} onChange={(event) => setDraft((current) => ({ ...current, logoUrl: event.target.value }))} placeholder="Captured from LinkedIn company page" />
          </label>
          <label className="grid gap-1.5 text-[11px] font-medium text-[#68615e]">
            <span>Employees</span>
            <input className="h-10 rounded-xl border border-[#e8e3e0] bg-[#fbfaf9] px-3 text-[13px] outline-none transition focus:border-[#ee9f91] focus:bg-white" value={draft.employeeCountText} onChange={(event) => setDraft((current) => ({ ...current, employeeCountText: event.target.value }))} placeholder="51-200 employees" />
          </label>
          <label className="grid gap-1.5 text-[11px] font-medium text-[#68615e]">
            <span>LinkedIn company URL</span>
            <input className="h-10 rounded-xl border border-[#e8e3e0] bg-[#fbfaf9] px-3 text-[13px] outline-none transition focus:border-[#ee9f91] focus:bg-white" value={draft.linkedinCompanyUrl} onChange={(event) => setDraft((current) => ({ ...current, linkedinCompanyUrl: event.target.value }))} placeholder="https://www.linkedin.com/company/..." />
          </label>
          <label className="grid gap-1.5 text-[11px] font-medium text-[#68615e]">
            <span>Type</span>
            <select className="h-10 rounded-xl border border-[#e8e3e0] bg-[#fbfaf9] px-3 text-[13px] outline-none transition focus:border-[#ee9f91] focus:bg-white" value={draft.organizationType} onChange={(event) => setDraft((current) => ({ ...current, organizationType: event.target.value as OrganizationDraft["organizationType"] }))}>
              <option value="other">Other</option>
              <option value="agency">Agency</option>
              <option value="in_house">In-house</option>
              <option value="brand">Brand</option>
              <option value="startup">Startup</option>
              <option value="consultancy">Consultancy</option>
            </select>
          </label>
          <label className="grid gap-1.5 text-[11px] font-medium text-[#68615e]">
            <span>Notes</span>
            <textarea className="min-h-24 rounded-xl border border-[#e8e3e0] bg-[#fbfaf9] px-3 py-2 text-[13px] leading-6 outline-none transition focus:border-[#ee9f91] focus:bg-white" value={draft.notes} onChange={(event) => setDraft((current) => ({ ...current, notes: event.target.value }))} placeholder="Important context about this company" />
          </label>
          <label className="flex items-center gap-2 text-[12px] font-medium text-[#68615e]">
            <input type="checkbox" checked={draft.isPreviousEmployer} onChange={(event) => setDraft((current) => ({ ...current, isPreviousEmployer: event.target.checked }))} />
            Mark as previous employer
          </label>
        </div>

        {error ? <p className="mt-3 text-xs leading-5 text-rose-600">{error}</p> : null}

        <div className="mt-5 flex items-center justify-end gap-2">
          <button type="button" onClick={onClose} className="inline-flex h-9 items-center rounded-xl border border-[#e8e3e0] bg-white px-3.5 text-[12px] font-medium text-[#5f5a57] transition hover:bg-[#faf8f7]">Cancel</button>
          <button type="button" onClick={onSave} disabled={isSaving} className="inline-flex h-9 items-center gap-2 rounded-xl bg-[#111] px-3.5 text-[12px] font-medium text-white transition hover:bg-[#292929] disabled:cursor-progress disabled:opacity-70">
            <Plus className="h-3.5 w-3.5" />
            {isSaving ? "Saving..." : isEditing ? "Update org" : "Create org"}
          </button>
        </div>
      </section>
    </div>
  );
}

function OrganizationDetailDrawer({
  isDeleting,
  isOpen,
  org,
  onClose,
  onDelete,
  onEdit
}: {
  isDeleting: boolean;
  isOpen: boolean;
  org: Organization | null;
  onClose: () => void;
  onDelete: () => void;
  onEdit: (org: Organization) => void;
}) {
  if (!isOpen || !org) return null;

  return (
    <div className="fixed inset-0 z-30 flex items-stretch justify-end bg-black/20 p-3 backdrop-blur-sm">
      <button aria-label="Close organization drawer" className="absolute inset-0 cursor-default" type="button" onClick={onClose} />
      <section className="relative z-10 flex h-full w-full max-w-xl flex-col overflow-hidden rounded-[22px] border border-[#ece8e6] bg-white shadow-[0_26px_80px_rgba(0,0,0,0.14)]">
        <div className="flex items-start justify-between gap-3 border-b border-[#eeeae7] px-5 py-4">
          <div className="flex items-center gap-3">
            <CompanyAvatar org={org} />
            <div>
              <p className="text-[10px] font-medium uppercase tracking-[0.2em] text-[#99918d]">Company profile</p>
              <h3 className="mt-1 text-[18px] font-semibold tracking-[-0.04em] text-[#141414]">{org.name}</h3>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <OrgBadge org={org} />
            <button type="button" onClick={onClose} className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-[#ebe7e4] text-[#777] transition hover:bg-[#faf8f7] hover:text-black">
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        <div className="min-h-0 flex-1 space-y-4 overflow-y-auto px-5 py-5">
        <div className="grid gap-3 rounded-[18px] border border-[#eeeae7] bg-[#fbfaf9] p-4 text-[12px] text-[#625d5a]">
          <div className="flex items-center gap-2"><Globe className="h-4 w-4 text-[#b2aaa6]" />{org.domain ? <a className="truncate text-[#3f3b39] hover:underline" href={org.domain.startsWith("http") ? org.domain : `https://${org.domain}`} rel="noreferrer" target="_blank">{org.domain}</a> : <span>No domain</span>}</div>
          <div className="flex items-center gap-2"><Users className="h-4 w-4 text-[#b2aaa6]" /><span>{org.employeeCountText || "Employee count not captured"}</span></div>
          <div className="flex items-center gap-2"><Building2 className="h-4 w-4 text-[#b2aaa6]" /><span>{formatOrgType(org.organizationType)}</span></div>
          <div className="flex items-center gap-2"><Layers3 className="h-4 w-4 text-[#b2aaa6]" /><span>{formatSegment(org.segment)}</span></div>
          <div className="flex items-center gap-2"><ShieldCheck className="h-4 w-4 text-[#b2aaa6]" /><span>{org.currentStatus || "No current status set"}</span></div>
            <div className="flex items-center gap-2"><Users className="h-4 w-4 text-[#b2aaa6]" /><span>{org.contactCount} attached people</span></div>
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <strong className="text-[12px] font-medium text-[#171717]">People attached</strong>
              <span className="rounded-full bg-[#f7eeee] px-2 py-0.5 text-[10px] text-[#9b6960]">{org.peoplePreview.length}</span>
            </div>
            {org.peoplePreview.length === 0 ? (
              <p className="rounded-[16px] border border-dashed border-[#e8e3e0] bg-[#fbfaf9] p-4 text-[12px] text-[#8d8682]">No people attached yet.</p>
            ) : (
              <div className="space-y-2">
                {org.peoplePreview.map((person) => (
                  <div key={person.id} className="flex items-center justify-between gap-3 rounded-[16px] border border-[#eeeae7] bg-white px-4 py-3">
                    <div className="min-w-0">
                      <p className="truncate text-[12px] font-medium text-[#171717]">{person.fullName}</p>
                      <p className="truncate text-[11px] text-[#88817d]">{person.title}</p>
                    </div>
                    <span className="rounded-md bg-[#fbfaf9] px-2 py-1 text-[10px] uppercase tracking-[0.12em] text-[#8d8682]">{formatDisplayLabel(person.lifecycleStatus)}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="flex items-center justify-between gap-3 border-t border-[#eeeae7] px-5 py-4">
          <p className="text-[12px] text-[#88817d]">Open LinkedIn manually if you want to capture more visible company context.</p>
          <div className="flex items-center gap-2">
            <button type="button" onClick={() => onEdit(org)} className="inline-flex h-9 items-center gap-2 rounded-xl border border-[#e8e3e0] bg-white px-4 text-[12px] font-medium text-[#5f5a57] transition hover:bg-[#faf8f7]"><PencilLine className="h-4 w-4" />Edit</button>
            <button type="button" onClick={onDelete} disabled={isDeleting} className="inline-flex h-9 items-center gap-2 rounded-xl border border-[#f0c6c0] bg-[#fff1ef] px-4 text-[12px] font-medium text-[#a64e44] transition hover:bg-[#ffe7e3] disabled:cursor-progress disabled:opacity-70"><Trash2 className="h-4 w-4" />{isDeleting ? "Deleting..." : "Delete"}</button>
          </div>
        </div>
      </section>
    </div>
  );
}

export function OrgCrmShell() {
  const apiBaseUrl = getApiBaseUrl();
  const [items, setItems] = useState<OrganizationListResponse["items"]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [viewMode, setViewMode] = useState<"table" | "grid" | "list">("table");
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draft, setDraft] = useState<OrganizationDraft>(emptyDraft);

  async function loadItems() {
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch(`${apiBaseUrl}/v1/organizations`, { cache: "no-store" });
      if (!response.ok) throw new Error("Could not load organizations.");
      const data = (await response.json()) as OrganizationListResponse;
      setItems(data.items);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Unknown error");
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    void loadItems();
  }, [apiBaseUrl]);

  const selectedOrg = useMemo(() => items.find((item) => item.id === selectedId) ?? null, [items, selectedId]);

  const filteredItems = useMemo(() => {
    if (!searchQuery.trim()) return items;
    const query = searchQuery.trim().toLowerCase();
    return items.filter((item) => {
      return (
        item.name.toLowerCase().includes(query) ||
        (item.domain ?? "").toLowerCase().includes(query) ||
        (item.linkedinCompanyUrl ?? "").toLowerCase().includes(query) ||
        (item.employeeCountText ?? "").toLowerCase().includes(query) ||
        item.organizationType.toLowerCase().includes(query) ||
        item.peoplePreview.some((person) => person.fullName.toLowerCase().includes(query))
      );
    });
  }, [items, searchQuery]);

  const currentOrgCount = filteredItems.filter((item) => !item.isPreviousEmployer).length;
  const previousOrgCount = filteredItems.filter((item) => item.isPreviousEmployer).length;
  const attachedPeopleCount = filteredItems.reduce((sum, item) => sum + item.contactCount, 0);

  function startEdit(org: Organization) {
    setEditingId(org.id);
    setDraft(toDraft(org));
    setError(null);
    setIsFormOpen(true);
  }

  function startNew() {
    setEditingId(null);
    setDraft(emptyDraft);
    setError(null);
    setIsFormOpen(true);
  }

  function closeForm() {
    setIsFormOpen(false);
    setEditingId(null);
    setDraft(emptyDraft);
    setError(null);
  }

  async function saveOrganization() {
    setIsSaving(true);
    setError(null);

    const payload: CreateOrganizationInput = {
      name: draft.name.trim(),
      domain: draft.domain.trim() || null,
      logoUrl: draft.logoUrl.trim() || null,
      linkedinCompanyUrl: draft.linkedinCompanyUrl.trim() || null,
      organizationType: draft.organizationType,
      notes: draft.notes.trim() || null,
      employeeCountText: draft.employeeCountText.trim() || null,
      isPreviousEmployer: draft.isPreviousEmployer
    };

    try {
      const response = await fetch(editingId ? `${apiBaseUrl}/v1/organizations/${editingId}` : `${apiBaseUrl}/v1/organizations`, {
        method: editingId ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });

      if (!response.ok) throw new Error(await getApiError(response, "Could not save organization."));
      const data = await response.json();
      const saved: Organization = data.item;
      await loadItems();
      setSelectedId(saved.id);
      closeForm();
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "Could not save organization.");
    } finally {
      setIsSaving(false);
    }
  }

  async function deleteOrganization() {
    if (!selectedOrg) return;
    setIsDeleting(true);
    setError(null);

    try {
      const response = await fetch(`${apiBaseUrl}/v1/organizations/${selectedOrg.id}`, { method: "DELETE" });
      if (!response.ok) throw new Error(await getApiError(response, "Could not delete organization."));
      const nextItems = items.filter((item) => item.id !== selectedOrg.id);
      setItems(nextItems);
      setSelectedId(nextItems[0]?.id ?? null);
      if (editingId === selectedOrg.id) closeForm();
    } catch (deleteError) {
      setError(deleteError instanceof Error ? deleteError.message : "Could not delete organization.");
    } finally {
      setIsDeleting(false);
    }
  }

  return (
    <div className={getOrgThemeClasses()}>
      <section className="org-crm-shell org-card min-h-[calc(100vh-32px)] rounded-[28px] border bg-[#f7f5f3] p-3 text-[#171717] shadow-[0_26px_80px_rgba(21,18,16,0.08)]">
      <div className="org-card overflow-hidden rounded-[24px] border bg-white shadow-[0_18px_60px_rgba(17,17,17,0.06)]">
        <header className="org-outline flex min-h-[64px] items-center justify-between border-b px-5">
          <div className="flex items-center gap-3">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#111] text-[15px] font-semibold text-white">A</div>
            <div>
              <p className="org-muted text-[11px] uppercase tracking-[0.18em]">Companies</p>
              <h2 className="org-heading text-[16px] font-semibold tracking-[-0.04em]">Organization list</h2>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <div className="org-card org-soft org-muted hidden items-center gap-2 rounded-xl border px-3 py-2 text-[12px] md:flex"><Layers3 className="h-3.5 w-3.5" />{filteredItems.length} companies</div>
            <div className="org-card org-muted hidden items-center gap-2 rounded-xl border px-3 py-2 text-[12px] md:flex"><Users className="h-3.5 w-3.5" />{attachedPeopleCount} people</div>
            <button type="button" onClick={startNew} className="org-solid inline-flex h-9 items-center gap-2 rounded-xl px-3.5 text-[12px] font-medium shadow-[0_8px_18px_rgba(17,17,17,0.12)] transition"><Plus className="h-3.5 w-3.5" />Add company</button>
          </div>
        </header>

        <div className="org-subtle org-outline flex flex-wrap items-center justify-between gap-3 border-b px-5 py-4">
          <label className="org-field org-muted flex h-9 min-w-[240px] flex-1 items-center gap-2 rounded-xl border px-3 text-[12px] shadow-[0_2px_8px_rgba(17,17,17,0.03)] md:max-w-sm">
            <Search className="org-muted h-3.5 w-3.5" />
            <input value={searchQuery} onChange={(event) => setSearchQuery(event.target.value)} placeholder="Search Company" className="w-full bg-transparent outline-none placeholder:text-inherit" />
          </label>

          <div className="flex items-center gap-2">
            <div className="org-card org-muted hidden h-9 items-center gap-2 rounded-xl border px-3 text-[12px] sm:flex"><span className="h-1.5 w-1.5 rounded-full bg-[#ee9f91]" />{currentOrgCount} current</div>
            <div className="hidden h-9 items-center gap-2 rounded-xl border border-[#f2d4cc] bg-[#fff4f1] px-3 text-[12px] text-[#9e5b51] sm:flex"><Star className="h-3.5 w-3.5 fill-current" />{previousOrgCount} previous</div>
            <div className="org-card inline-flex h-9 items-center gap-1 rounded-xl border p-1">
              {[
                { value: "table", icon: Table2, label: "List view" },
                { value: "grid", icon: Grid2x2, label: "Grid" },
                { value: "list", icon: List, label: "Cards" }
              ].map((option) => {
                const Icon = option.icon;
                const active = viewMode === option.value;
                return (
                  <button key={option.value} type="button" onClick={() => setViewMode(option.value as typeof viewMode)} className={["inline-flex h-7 items-center gap-1.5 rounded-lg px-2.5 text-[11px] font-medium transition", active ? "org-solid bg-[#111] text-white" : "org-muted hover:bg-black/[0.04] hover:text-inherit"].join(" ")}>
                    <Icon className="h-3.5 w-3.5" />
                    <span className="hidden sm:inline">{option.label}</span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {error ? <div className="org-banner border-b px-5 py-3 text-[12px]">{error}</div> : null}

        {isLoading ? (
          <div className="org-muted px-5 py-10 text-sm">Loading organizations...</div>
        ) : filteredItems.length === 0 ? (
          <div className="org-muted px-5 py-10 text-sm">No organizations yet.</div>
        ) : viewMode === "table" ? (
          <div className="overflow-x-auto p-4">
            <div className="min-w-[920px] overflow-hidden rounded-xl border border-[#eee9e6] bg-white">
              <div className="grid grid-cols-[36px_1.8fr_1.2fr_0.8fr_1fr_1fr_44px] items-center border-b border-[#eee9e6] bg-[#f7f5f3] px-4 py-3 text-[11px] font-medium text-[#8f8783]">
                <span><input type="checkbox" className="h-3.5 w-3.5 rounded border-[#dfd8d4]" /></span>
                <span>Company name</span>
                <span>URLs</span>
                <span>Type</span>
                <span>Owner</span>
                <span>Last contacted</span>
                <span />
              </div>
              <div className="divide-y divide-[#f0ece9]">
                {filteredItems.map((org) => {
                  const isSelected = org.id === selectedOrg?.id;
                  const visibleUrl = org.domain || org.linkedinCompanyUrl || "No website";
                  const firstPerson = org.peoplePreview[0];
                  const employeeLabel = org.employeeCountText || "Employee count not captured";

                  return (
                    <button key={org.id} type="button" onClick={() => setSelectedId(org.id)} className={["grid w-full grid-cols-[36px_1.8fr_1.2fr_0.8fr_1fr_1fr_44px] items-center px-4 py-3 text-left transition", isSelected ? "bg-[#fff4f1]" : "bg-white hover:bg-[#fbfaf9]"].join(" ")}>
                      <span onClick={(event) => event.stopPropagation()}><input type="checkbox" className="h-3.5 w-3.5 rounded border-[#dfd8d4]" /></span>
                      <span className="flex min-w-0 items-center gap-2.5">
                        <CompanyAvatar org={org} />
                        <span className="min-w-0">
                          <span className="block truncate text-[13px] font-medium tracking-[-0.02em] text-[#171717]">{org.name}</span>
                          <span className="mt-0.5 block truncate text-[11px] text-[#9b9490]">{formatOrgType(org.organizationType)}</span>
                        </span>
                      </span>
                      <span className="min-w-0 pr-6">
                        <span className="block truncate text-[12px] text-[#4c69a7] underline-offset-2 hover:underline">{visibleUrl}</span>
                        <span className="mt-0.5 block truncate text-[11px] text-[#8f8783]">{employeeLabel}</span>
                      </span>
                      <span><OrgBadge org={org} /></span>
                      <span className="flex min-w-0 items-center gap-2 text-[12px] text-[#5f5956]">
                        <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[#f0e7e4] text-[10px] font-semibold text-[#5f4540]">{firstPerson ? getInitials(firstPerson.fullName) : "—"}</span>
                        <span className="truncate">{firstPerson?.fullName ?? "Unassigned"}</span>
                      </span>
                      <span className="text-[12px] text-[#746d69]">{formatDate(org.lastContactedAt)}</span>
                      <span className="flex justify-end text-[#9b9490]"><MoreHorizontal className="h-4 w-4" /></span>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        ) : viewMode === "grid" ? (
          <div className="grid auto-rows-max gap-3 p-4 md:grid-cols-2 xl:grid-cols-3">
            {filteredItems.map((org) => {
              const isSelected = org.id === selectedOrg?.id;
              const firstPerson = org.peoplePreview[0];
              return (
                <button key={org.id} type="button" onClick={() => setSelectedId(org.id)} className={["group overflow-hidden rounded-[18px] border bg-white text-left shadow-[0_6px_18px_rgba(17,17,17,0.04)] transition hover:-translate-y-0.5 hover:shadow-[0_14px_32px_rgba(17,17,17,0.08)]", isSelected ? "border-[#ee9f91]" : "border-[#eee9e6]"].join(" ")}>
                  <div className="h-14 bg-gradient-to-r from-[#f2d3cc] via-[#f7ebe8] to-[#e8e6e4]" />
                  <div className="px-4 pb-4">
                    <div className="-mt-6 flex items-start justify-between gap-3">
                      <CompanyAvatar org={org} />
                      <span className="mt-2 rounded-lg bg-white/90 p-1 text-[#8f8783] shadow-sm"><MoreHorizontal className="h-4 w-4" /></span>
                    </div>
                    <div className="mt-3">
                      <p className="truncate text-[14px] font-semibold tracking-[-0.04em] text-[#171717]">{org.name}</p>
                      <p className="mt-1 truncate text-[11px] text-[#8f8783]">{org.domain || org.linkedinCompanyUrl || "No website"}</p>
                      <p className="mt-0.5 truncate text-[11px] text-[#8f8783]">{org.employeeCountText || "Employee count not captured"}</p>
                    </div>
                    <div className="mt-4 flex items-center justify-between gap-2 rounded-xl bg-[#fbfaf9] px-3 py-2">
                      <span className="min-w-0 text-[11px] text-[#6f6966]">{firstPerson?.fullName ?? "Unassigned"}</span>
                      <span className="shrink-0 rounded-md bg-white px-2 py-1 text-[10px] text-[#4f4a47]">Owner</span>
                    </div>
                    <div className="mt-3 flex items-center justify-between gap-2">
                      <OrgBadge org={org} />
                      <span className="text-[11px] text-[#8f8783]">{org.contactCount} contacts</span>
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        ) : (
          <div className="space-y-2 p-4">
            {filteredItems.map((org) => {
              const isSelected = org.id === selectedOrg?.id;
              return (
                <button key={org.id} type="button" onClick={() => setSelectedId(org.id)} className={["flex w-full items-center justify-between gap-4 rounded-[16px] border px-4 py-3 text-left transition", isSelected ? "border-[#ee9f91] bg-[#fff4f1]" : "border-[#eee9e6] bg-white hover:bg-[#fbfaf9]"].join(" ")}>
                  <div className="flex min-w-0 items-center gap-3">
                    <CompanyAvatar org={org} />
                    <div className="min-w-0">
                      <p className="truncate text-[13px] font-medium tracking-[-0.02em] text-[#171717]">{org.name}</p>
                      <p className="mt-0.5 truncate text-[11px] text-[#8f8783]">{org.domain || org.linkedinCompanyUrl || "No website"}</p>
                      <p className="mt-0.5 truncate text-[11px] text-[#8f8783]">{org.employeeCountText || "Employee count not captured"}</p>
                    </div>
                  </div>
                  <div className="hidden items-center gap-2 sm:flex">
                    <OrgBadge org={org} />
                    <span className="rounded-lg bg-[#fbfaf9] px-2.5 py-1 text-[11px] text-[#6f6966]">{org.contactCount} contacts</span>
                    <span className="rounded-lg bg-[#fbfaf9] px-2.5 py-1 text-[11px] text-[#6f6966]">{formatDate(org.lastContactedAt)}</span>
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </div>

      <OrganizationFormModal draft={draft} error={error} isOpen={isFormOpen} isSaving={isSaving} isEditing={Boolean(editingId)} onClose={closeForm} onSave={() => void saveOrganization()} setDraft={setDraft} />
      <OrganizationDetailDrawer isDeleting={isDeleting} isOpen={Boolean(selectedOrg)} org={selectedOrg} onClose={() => setSelectedId(null)} onDelete={() => void deleteOrganization()} onEdit={startEdit} />
    </section>
    </div>
  );
}
