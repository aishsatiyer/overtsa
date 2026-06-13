"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowUpRight,
  CalendarClock,
  Filter,
  Grid2x2,
  List,
  PencilLine,
  Plus,
  Search,
  Send,
  Trash2,
  X
} from "lucide-react";
import type {
  CreateResearchedProspectInput,
  InviteTemplate,
  OutreachAttempt,
  ProspectDetailResponse,
  ProspectListItem,
  ProspectListResponse,
  SenderAccount,
  UpdateProspectInput,
  UpdateProspectWorkflowInput
} from "@overtly/shared";

const defaultForm: CreateResearchedProspectInput = {
  fullName: "",
  linkedinProfileUrl: "",
  organizationName: "",
  organizationType: "other",
  title: "",
  priority: "medium",
  segment: null,
  locationText: "",
  region: "",
  icpType: "",
  notes: ""
};

const segmentOptions = [
  { value: "", label: "No segment" },
  { value: "agency", label: "Agency" },
  { value: "in_house", label: "In-house" },
  { value: "founder", label: "Founder" },
  { value: "consultant", label: "Consultant" },
  { value: "other", label: "Other" }
] as const;

const orgTypeOptions = [
  { value: "agency", label: "Agency" },
  { value: "in_house", label: "In-house" },
  { value: "brand", label: "Brand" },
  { value: "startup", label: "Startup" },
  { value: "consultancy", label: "Consultancy" },
  { value: "other", label: "Other" }
] as const;

const priorityOptions = [
  { value: "low", label: "Low" },
  { value: "medium", label: "Medium" },
  { value: "high", label: "High" },
  { value: "urgent", label: "Urgent" }
] as const;

const inputClassName =
  "min-h-9 rounded-[14px] border border-[#eadfdd] bg-white/90 px-3 text-[12px] font-light text-[#171414] outline-none transition placeholder:text-[#b8adab] focus:border-[#f19b8f] focus:ring-2 focus:ring-[#f7c6bf]/40";

function getPeopleThemeClasses() {
  return [
    "text-[#171717]",
    "[&_.people-crm-shell]:!bg-[#f6f4f2]",
    "[&_.people-crm-shell_.bg-white]:!bg-white",
    "[&_.people-crm-shell_.bg-white\\/80]:!bg-white/80",
    "[&_.people-crm-shell_.text-\\[\\#171414\\]]:!text-[#171717]",
    "[&_.people-crm-shell_.text-\\[\\#514744\\]]:!text-[#4b4b4b]",
    "[&_.people-crm-shell_.text-\\[\\#8b817e\\]]:!text-[#7a7a7a]",
    "[&_.people-crm-shell_.border-\\[\\#eadfdd\\]]:!border-[#e7e0dc]",
    "[&_.people-crm-shell_input]:!border-[#e7e0dc] [&_.people-crm-shell_input]:!bg-white [&_.people-crm-shell_input]:!text-[#171717] [&_.people-crm-shell_input]:placeholder:!text-[#a39a96]",
    "[&_.people-crm-shell_select]:!border-[#e7e0dc] [&_.people-crm-shell_select]:!bg-white [&_.people-crm-shell_select]:!text-[#171717]",
    "[&_.people-crm-shell_textarea]:!border-[#e7e0dc] [&_.people-crm-shell_textarea]:!bg-white [&_.people-crm-shell_textarea]:!text-[#171717] [&_.people-crm-shell_textarea]:placeholder:!text-[#a39a96]"
  ].join(" ");
}

function getApiBaseUrl() {
  return process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000";
}

function getPriorityClasses(priority: ProspectListItem["priority"]) {
  const tone = getPriorityTone(priority);

  if (tone === "priority-low") {
    return "border-[#e8dfdd] bg-[#fbf8f7] text-[#59504d]";
  }

  if (tone === "priority-medium") {
    return "border-[#f5cfc8] bg-[#fff3f1] text-[#ba5f53]";
  }

  if (tone === "priority-high") {
    return "border-[#f1bd9d] bg-[#fff6ec] text-[#a9682d]";
  }

  return "border-[#f3aaa0] bg-[#fff0ee] text-[#b94f44]";
}

function formatDisplayLabel(value: string | null | undefined): string {
  if (!value) {
    return "Not set";
  }

  return value
    .replaceAll("_", " ")
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

function formatSenderDisplayName(value: string | null | undefined): string {
  if (!value) {
    return "Not set";
  }

  const normalized = value.trim();

  if (normalized === "Founder LinkedIn") {
    return "Aishwarya LinkedIn";
  }

  if (normalized === "Co-founder LinkedIn" || normalized === "Cofounder LinkedIn") {
    return "Sidharth LinkedIn";
  }

  return normalized;
}

function getSenderLabel(item: ProspectListItem): string {
  return formatSenderDisplayName(item.latestSenderAccountName) || "Not sent";
}

function getStageLabel(item: ProspectListItem): string {
  switch (item.lifecycleStatus) {
    case "researched":
      return "Saved";
    case "invite_sent":
      return "Invite sent";
    case "accepted":
      return "Accepted";
    case "accepted_silent":
      return "Accepted, no reply";
    case "follow_up_active":
      return "Follow-up active";
    case "replied":
      return "Replied";
    case "positive_interest":
      return "Interested";
    case "deferred":
      return "Deferred";
    case "scheduling":
      return "Scheduling";
    case "call_booked":
      return "Call booked";
    case "not_interested":
      return "Not interested";
    case "archived":
      return "Archived";
    default:
      return formatDisplayLabel(item.lifecycleStatus);
  }
}

function getAcceptanceLabel(item: ProspectListItem): string {
  switch (item.acceptedStatus) {
    case "unknown":
      return "Not checked";
    case "pending":
      return "Pending";
    case "accepted":
      return "Accepted";
    case "not_accepted":
      return "Not accepted";
    default:
      return formatDisplayLabel(item.acceptedStatus);
  }
}

function getFollowUpLabel(item: ProspectListItem): string {
  switch (item.followUpStage) {
    case "none":
      return "Not started";
    case "follow_up_1_due":
      return "Follow-up 1 due";
    case "follow_up_1_sent":
      return "Follow-up 1 sent";
    case "follow_up_2_due":
      return "Follow-up 2 due";
    case "follow_up_2_sent":
      return "Follow-up 2 sent";
    case "follow_up_3_due":
      return "Follow-up 3 due";
    case "follow_up_3_sent":
      return "Follow-up 3 sent";
    case "replied":
      return "Reply received";
    case "snoozed":
      return "Snoozed";
    case "archived":
      return "Archived";
    default:
      return formatDisplayLabel(item.followUpStage);
  }
}

function getNextStepLabel(item: ProspectListItem): string {
  if (item.nextActionType) {
    return formatDisplayLabel(item.nextActionType);
  }

  if (item.lifecycleStatus === "researched") {
    return "Review";
  }

  if (item.acceptedStatus === "accepted" && item.followUpStage === "none") {
    return "Start follow-up";
  }

  if (item.lifecycleStatus === "accepted_silent") {
    return "Send follow-up";
  }

  return "Review";
}

function getPriorityTone(priority: ProspectListItem["priority"]): string {
  return `priority-${priority}`;
}

function formatLocalDateTime(value: string | null) {
  if (!value) {
    return "Not set";
  }

  return new Intl.DateTimeFormat("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit"
  }).format(new Date(value));
}

function toEditForm(item: ProspectListItem): UpdateProspectInput {
  return {
    fullName: item.fullName,
    linkedinProfileUrl: item.linkedinProfileUrl,
    photoUrl: item.photoUrl,
    organizationName: item.organizationName,
    organizationType: item.organizationType,
    title: item.title,
    priority: item.priority,
    segment: item.segment,
    locationText: item.locationText,
    region: item.region,
    icpType: null,
    notes: item.notes
  };
}

type InviteFormState = {
  senderAccountId: string;
  inviteTemplateId: string;
  sentAt: string;
  inviteNoteText: string;
  notes: string;
};

function createInviteForm(
  senderAccounts: SenderAccount[],
  inviteTemplates: InviteTemplate[]
): InviteFormState {
  const preferredSender = senderAccounts.find((account) => account.isActive) ?? senderAccounts[0];
  const preferredTemplate = inviteTemplates.find((template) => template.isActive) ?? inviteTemplates[0];
  const now = new Date();
  const localDateTime = new Date(now.getTime() - now.getTimezoneOffset() * 60_000)
    .toISOString()
    .slice(0, 16);

  return {
    senderAccountId: preferredSender?.id ?? "",
    inviteTemplateId: preferredTemplate?.id ?? "",
    sentAt: localDateTime,
    inviteNoteText: preferredTemplate?.templateText ?? "",
    notes: ""
  };
}

function ProspectInviteSheet({
  error,
  form,
  isOpen,
  isSaving,
  inviteTemplates,
  senderAccounts,
  onClose,
  onSubmit,
  setForm
}: {
  error: string | null;
  form: InviteFormState;
  isOpen: boolean;
  isSaving: boolean;
  inviteTemplates: InviteTemplate[];
  senderAccounts: SenderAccount[];
  onClose: () => void;
  onSubmit: (event: React.FormEvent<HTMLFormElement>) => void;
  setForm: React.Dispatch<React.SetStateAction<InviteFormState>>;
}) {
  if (!isOpen) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-40 flex items-stretch justify-end bg-[#160b28]/30 p-3 backdrop-blur-sm">
      <button
        aria-label="Close invite sheet"
        className="absolute inset-0 cursor-default"
        type="button"
        onClick={onClose}
      />

      <section className="relative z-10 flex h-full w-full max-w-2xl flex-col overflow-hidden rounded-[24px] border border-[#eadfdd] bg-white/90 shadow-[0_30px_90px_rgba(34,22,19,0.12)]">
        <div className="flex items-start justify-between gap-4 border-b border-[#eadfdd] px-5 py-4">
          <div className="space-y-1">
            <p className="text-[11px] font-medium uppercase tracking-[0.18em] text-[#8b817e]">
              Invite log
            </p>
            <h3 className="text-lg font-light tracking-[-0.035em] text-[#171414]">
              Log a manually sent invite
            </h3>
            <p className="text-[12px] text-[#8b817e]">
              Capture the sender account, version, note, and sent time. The backend will mark the
              prospect as invite sent.
            </p>
          </div>

          <button
            className="inline-flex h-9 w-9 items-center justify-center rounded-[14px] border border-[#eadfdd] text-[#8b817e] transition hover:bg-[#fbf8f7] hover:text-[#171414]"
            type="button"
            onClick={onClose}
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <form className="flex min-h-0 flex-1 flex-col" onSubmit={onSubmit}>
          <div className="grid flex-1 gap-4 overflow-y-auto px-5 py-5 md:grid-cols-2">
            <label className="grid gap-2 text-[12px] text-[#6d625f] md:col-span-1">
              <span className="font-medium text-[#514744]">Sender account</span>
              <select
                className="min-h-9 rounded-[14px] border border-[#eadfdd] bg-white/90 px-3 text-[12px] text-[#171414] outline-none transition focus:border-[#f19b8f] focus:ring-2 focus:ring-[#f7c6bf]/40"
                value={form.senderAccountId}
                onChange={(event) =>
                  setForm((current) => ({ ...current, senderAccountId: event.target.value }))
                }
              >
                <option value="">Select sender</option>
                {senderAccounts.map((account) => (
                  <option key={account.id} value={account.id}>
                    {formatSenderDisplayName(account.displayName)}
                  </option>
                ))}
              </select>
            </label>

            <label className="grid gap-2 text-[12px] text-[#6d625f] md:col-span-1">
              <span className="font-medium text-[#514744]">Invite version</span>
              <select
                className="min-h-9 rounded-[14px] border border-[#eadfdd] bg-white/90 px-3 text-[12px] text-[#171414] outline-none transition focus:border-[#f19b8f] focus:ring-2 focus:ring-[#f7c6bf]/40"
                value={form.inviteTemplateId}
                onChange={(event) => {
                  const selectedTemplate = inviteTemplates.find(
                    (template) => template.id === event.target.value
                  );

                  setForm((current) => ({
                    ...current,
                    inviteTemplateId: event.target.value,
                    inviteNoteText: selectedTemplate?.templateText ?? current.inviteNoteText
                  }));
                }}
              >
                <option value="">Select template</option>
                {inviteTemplates.map((template) => (
                  <option key={template.id} value={template.id}>
                    {template.name} v{template.versionLabel}
                  </option>
                ))}
              </select>
            </label>

            <label className="grid gap-2 text-[12px] text-[#6d625f] md:col-span-1">
              <span className="font-medium text-[#514744]">Sent at</span>
              <div className="flex items-center gap-2 rounded-[14px] border border-[#eadfdd] bg-white/90 px-3 focus-within:border-slate-400 focus-within:ring-2 focus-within:ring-slate-200">
                <CalendarClock className="h-4 w-4 text-[#b7adaa]" />
                <input
                  className="min-h-9 w-full border-0 bg-transparent text-[12px] text-[#171414] outline-none"
                  type="datetime-local"
                  value={form.sentAt}
                  onChange={(event) =>
                    setForm((current) => ({ ...current, sentAt: event.target.value }))
                  }
                />
              </div>
            </label>

            <div className="md:col-span-1" />

            <label className="grid gap-2 text-[12px] text-[#6d625f] md:col-span-2">
              <span className="font-medium text-[#514744]">Invite note</span>
              <textarea
                className="min-h-[150px] rounded-[22px] border border-[#eadfdd] bg-white/90 shadow-[0_20px_60px_rgba(34,22,19,0.04)] px-3 py-3 text-[12px] text-[#171414] outline-none transition focus:border-[#f19b8f] focus:ring-2 focus:ring-[#f7c6bf]/40"
                value={form.inviteNoteText}
                onChange={(event) =>
                  setForm((current) => ({ ...current, inviteNoteText: event.target.value }))
                }
              />
            </label>

            <label className="grid gap-2 text-[12px] text-[#6d625f] md:col-span-2">
              <span className="font-medium text-[#514744]">Notes</span>
              <textarea
                className="min-h-[110px] rounded-[22px] border border-[#eadfdd] bg-white/90 shadow-[0_20px_60px_rgba(34,22,19,0.04)] px-3 py-3 text-[12px] text-[#171414] outline-none transition focus:border-[#f19b8f] focus:ring-2 focus:ring-[#f7c6bf]/40"
                value={form.notes}
                onChange={(event) =>
                  setForm((current) => ({ ...current, notes: event.target.value }))
                }
              />
            </label>

            {error ? <p className="text-[12px] text-[#c95f54] md:col-span-2">{error}</p> : null}
          </div>

          <div className="flex items-center justify-between gap-3 border-t border-[#eadfdd] px-5 py-4">
            <p className="text-[12px] text-[#8b817e]">
              The prospect will move to invite sent with follow-up timing set automatically.
            </p>
            <div className="flex items-center gap-2">
              <button
                className="inline-flex h-10 items-center rounded-[14px] border border-[#eadfdd] px-4 text-[12px] font-medium text-[#6d625f] transition hover:bg-[#fbf8f7] hover:text-[#171414]"
                type="button"
                onClick={onClose}
              >
                Cancel
              </button>
              <button
                className="inline-flex h-10 items-center rounded-[14px] bg-[#160b28] px-4 text-[12px] font-medium text-white shadow-[0_12px_35px_rgba(34,22,19,0.035)] transition hover:bg-[#24113c] disabled:opacity-70"
                type="submit"
                disabled={isSaving}
              >
                <Send className="mr-2 h-4 w-4" />
                {isSaving ? "Saving..." : "Save invite"}
              </button>
            </div>
          </div>
        </form>
      </section>
    </div>
  );
}

export function ProspectDetailShell({ prospectId }: { prospectId: string }) {
  const router = useRouter();
  const apiBaseUrl = useMemo(() => getApiBaseUrl(), []);
  const [item, setItem] = useState<ProspectListItem | null>(null);
  const [form, setForm] = useState<UpdateProspectInput | null>(null);
  const [senderAccounts, setSenderAccounts] = useState<SenderAccount[]>([]);
  const [inviteTemplates, setInviteTemplates] = useState<InviteTemplate[]>([]);
  const [outreachAttempts, setOutreachAttempts] = useState<OutreachAttempt[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isInviteOpen, setIsInviteOpen] = useState(false);
  const [isInviting, setIsInviting] = useState(false);
  const [inviteError, setInviteError] = useState<string | null>(null);
  const [inviteForm, setInviteForm] = useState(() => createInviteForm([], []));

  useEffect(() => {
    async function load() {
      setIsLoading(true);
      setError(null);

      try {
        const prospectResponse = await fetch(`${apiBaseUrl}/v1/prospects/${prospectId}`, {
          cache: "no-store"
        });

        if (!prospectResponse.ok) {
          throw new Error("Could not load prospect details.");
        }

        const prospectData = (await prospectResponse.json()) as ProspectDetailResponse;

        setItem(prospectData.item);
        setForm(toEditForm(prospectData.item));

        const [senderResult, templateResult, outreachResult] = await Promise.allSettled([
          fetch(`${apiBaseUrl}/v1/sender-accounts`, { cache: "no-store" }),
          fetch(`${apiBaseUrl}/v1/invite-templates`, { cache: "no-store" }),
          fetch(`${apiBaseUrl}/v1/prospects/${prospectId}/outreach-attempts`, {
            cache: "no-store"
          })
        ]);

        if (senderResult.status === "fulfilled" && senderResult.value.ok) {
          const senderData = (await senderResult.value.json()) as {
            items: SenderAccount[];
            total: number;
          };
          setSenderAccounts(senderData.items);
        } else {
          setSenderAccounts([]);
        }

        if (templateResult.status === "fulfilled" && templateResult.value.ok) {
          const templateData = (await templateResult.value.json()) as {
            items: InviteTemplate[];
            total: number;
          };
          setInviteTemplates(templateData.items);
        } else {
          setInviteTemplates([]);
        }

        if (outreachResult.status === "fulfilled" && outreachResult.value.ok) {
          const outreachData = (await outreachResult.value.json()) as {
            items: OutreachAttempt[];
            total: number;
          };
          setOutreachAttempts(outreachData.items);
        } else {
          setOutreachAttempts([]);
        }
      } catch (loadError) {
        setError(loadError instanceof Error ? loadError.message : "Unknown error");
      } finally {
        setIsLoading(false);
      }
    }

    void load();
  }, [apiBaseUrl, prospectId]);

  useEffect(() => {
    if (!senderAccounts.length && !inviteTemplates.length) {
      return;
    }

    setInviteForm((current) => {
      if (current.senderAccountId || current.inviteTemplateId) {
        return current;
      }

      return createInviteForm(senderAccounts, inviteTemplates);
    });
  }, [senderAccounts, inviteTemplates]);

  async function handleSave(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!form) {
      return;
    }

    setIsSaving(true);
    setError(null);

    try {
      const response = await fetch(`${apiBaseUrl}/v1/prospects/${prospectId}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          ...form,
          segment: form.segment || null,
          locationText: form.locationText || null,
          region: form.region || null,
          icpType: form.icpType || null,
          notes: form.notes || null
        })
      });

      if (!response.ok) {
        throw new Error("Could not update prospect.");
      }

      const data = (await response.json()) as ProspectDetailResponse;
      setItem(data.item);
      setForm(toEditForm(data.item));
      setIsEditing(false);
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "Unknown error");
    } finally {
      setIsSaving(false);
    }
  }

  async function handleDelete() {
    if (!window.confirm("Delete this prospect from CRM? This removes it from the database too.")) {
      return;
    }

    setIsDeleting(true);
    setError(null);

    try {
      const response = await fetch(`${apiBaseUrl}/v1/prospects/${prospectId}`, {
        method: "DELETE"
      });

      if (!response.ok) {
        throw new Error("Could not delete prospect.");
      }

      router.push("/linkedin-crm");
      router.refresh();
    } catch (deleteError) {
      setError(deleteError instanceof Error ? deleteError.message : "Unknown error");
      setIsDeleting(false);
    }
  }

  async function handleLogInvite(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    setIsInviting(true);
    setInviteError(null);

    try {
      const response = await fetch(`${apiBaseUrl}/v1/prospects/${prospectId}/invites`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          senderAccountId: inviteForm.senderAccountId,
          inviteTemplateId: inviteForm.inviteTemplateId || null,
          sentAt: inviteForm.sentAt ? new Date(inviteForm.sentAt).toISOString() : null,
          inviteNoteText: inviteForm.inviteNoteText || null,
          notes: inviteForm.notes || null
        })
      });

      if (!response.ok) {
        throw new Error("Could not log invite.");
      }

      const data = (await response.json()) as {
        prospect: ProspectListItem;
        outreachAttempt: OutreachAttempt;
      };

      setItem(data.prospect);
      setForm(toEditForm(data.prospect));
      setOutreachAttempts((current) => [data.outreachAttempt, ...current]);
      setIsInviteOpen(false);
      setInviteForm(createInviteForm(senderAccounts, inviteTemplates));
    } catch (inviteSaveError) {
      setInviteError(
        inviteSaveError instanceof Error ? inviteSaveError.message : "Unknown error"
      );
    } finally {
      setIsInviting(false);
    }
  }

  async function handleWorkflowUpdate(input: UpdateProspectWorkflowInput) {
    setError(null);

    try {
      const response = await fetch(`${apiBaseUrl}/v1/prospects/${prospectId}/status`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify(input)
      });

      if (!response.ok) {
        throw new Error("Could not update workflow.");
      }

      const data = (await response.json()) as ProspectDetailResponse;
      setItem(data.item);
      setForm(toEditForm(data.item));
    } catch (workflowError) {
      setError(workflowError instanceof Error ? workflowError.message : "Unknown error");
    }
  }

  if (isLoading) {
    return (
      <section className="rounded-[22px] border border-[#eadfdd] bg-white/90 p-5 text-[12px] font-light text-[#756b68] shadow-[0_18px_50px_rgba(34,22,19,0.04)]">
        Loading prospect...
      </section>
    );
  }

  if (error && !item) {
    return (
      <section className="rounded-[22px] border border-[#eadfdd] bg-white/90 p-5 text-[12px] font-light text-[#756b68] shadow-[0_18px_50px_rgba(34,22,19,0.04)]">
        {error}
      </section>
    );
  }

  if (!item || !form) {
    return (
      <section className="rounded-[22px] border border-[#eadfdd] bg-white/90 p-5 text-[12px] font-light text-[#756b68] shadow-[0_18px_50px_rgba(34,22,19,0.04)]">
        Prospect not found.
      </section>
    );
  }

  return (
    <section className="space-y-5 rounded-[28px] bg-[#fbf8f7] p-4 font-light">
      <div className="flex items-start justify-between gap-4">
        <div className="space-y-2">
          <p className="text-[11px] font-medium uppercase tracking-[0.18em] text-[#8b817e]">
            Prospect detail
          </p>
          <h2 className="text-2xl font-light tracking-[-0.04em] text-[#171414]">{item.fullName}</h2>
        </div>
        <div className="flex items-center gap-2">
          <Link
            href="/linkedin-crm"
            className="inline-flex min-h-9 items-center rounded-[14px] border border-[#eadfdd] px-4 text-[12px] font-medium text-[#6d625f] transition hover:bg-[#fbf8f7] hover:text-[#171414]"
          >
            Back to CRM
          </Link>
          <button
            className="inline-flex min-h-9 items-center rounded-[14px] border border-[#eadfdd] px-4 text-[12px] font-medium text-[#514744] transition hover:bg-[#fbf8f7]"
            type="button"
            onClick={() => {
              setForm(toEditForm(item));
              setIsEditing((current) => !current);
            }}
          >
            <PencilLine className="mr-2 h-4 w-4" />
            {isEditing ? "Cancel edit" : "Edit"}
          </button>
          <button
            className="inline-flex min-h-9 items-center rounded-[14px] border border-[#eadfdd] px-4 text-[12px] font-medium text-[#514744] transition hover:bg-[#fbf8f7]"
            type="button"
            onClick={() => {
              setInviteError(null);
              setInviteForm(createInviteForm(senderAccounts, inviteTemplates));
              setIsInviteOpen(true);
            }}
          >
            <Send className="mr-2 h-4 w-4" />
            Log invite
          </button>
          <button
            className="inline-flex min-h-9 items-center rounded-[14px] bg-[#d96f63] px-4 text-[12px] font-medium text-white shadow-[0_12px_35px_rgba(34,22,19,0.035)] transition hover:bg-[#c95f54] disabled:opacity-70"
            type="button"
            disabled={isDeleting}
            onClick={handleDelete}
          >
            <Trash2 className="mr-2 h-4 w-4" />
            {isDeleting ? "Deleting..." : "Delete"}
          </button>
        </div>
      </div>

      <section className="rounded-[22px] border border-[#eadfdd] bg-white/90 p-5 shadow-[0_18px_50px_rgba(34,22,19,0.04)]">
        <div className="flex flex-col justify-between gap-5 lg:flex-row lg:items-center">
          <div className="flex items-center gap-4">
            {item.photoUrl ? (
              <div
                className="h-14 w-14 rounded-[18px] bg-[#eadfdd] bg-cover bg-center bg-no-repeat"
                style={{ backgroundImage: `url("${item.photoUrl}")` }}
              />
            ) : (
              <div className="grid h-14 w-14 place-items-center rounded-[18px] bg-[#f5eeee] text-[12px] font-medium text-[#514744]">
                {item.fullName.slice(0, 2).toUpperCase()}
              </div>
            )}
            <div className="space-y-1">
              <strong className="block text-lg font-medium tracking-tight text-[#171414]">
                {item.fullName}
              </strong>
              <span className="block text-[12px] leading-6 text-[#8b817e]">{item.title}</span>
            </div>
          </div>

          <a
            href={item.linkedinProfileUrl}
            target="_blank"
            rel="noreferrer"
            className="inline-flex min-h-9 items-center rounded-[14px] bg-[#160b28] px-4 text-[12px] font-medium text-white shadow-[0_12px_35px_rgba(34,22,19,0.035)] transition hover:bg-[#24113c]"
          >
            Open LinkedIn
          </a>
        </div>
      </section>

      <section className="rounded-[22px] border border-[#eadfdd] bg-white/90 p-5 shadow-[0_18px_50px_rgba(34,22,19,0.04)]">
        <div className="mb-4">
          <p className="text-[11px] font-medium uppercase tracking-[0.18em] text-[#8b817e]">
            Workflow
          </p>
          <h3 className="mt-1 text-lg font-medium tracking-tight text-[#171414]">
            Update prospect state
          </h3>
        </div>

        <div className="flex flex-wrap gap-2">
          <button
            className="inline-flex min-h-9 items-center rounded-[14px] border border-[#eadfdd] bg-white/90 px-4 text-[12px] font-medium text-[#514744] transition hover:bg-[#fbf8f7] hover:text-[#171414]"
            type="button"
            onClick={() =>
              void handleWorkflowUpdate({
                lifecycleStatus: "accepted",
                acceptedStatus: "accepted",
                followUpStage: "none",
                nextActionType: "start_follow_up",
                lastContactedAt: new Date().toISOString()
              })
            }
          >
            Mark accepted
          </button>
          <button
            className="inline-flex min-h-9 items-center rounded-[14px] border border-[#eadfdd] bg-white/90 px-4 text-[12px] font-medium text-[#514744] transition hover:bg-[#fbf8f7] hover:text-[#171414]"
            type="button"
            onClick={() =>
              void handleWorkflowUpdate({
                lifecycleStatus: "accepted_silent",
                acceptedStatus: "accepted",
                followUpStage: "follow_up_1_due",
                nextActionType: "send_follow_up_1"
              })
            }
          >
            Accepted, no reply
          </button>
          <button
            className="inline-flex min-h-9 items-center rounded-[14px] border border-[#eadfdd] bg-white/90 px-4 text-[12px] font-medium text-[#514744] transition hover:bg-[#fbf8f7] hover:text-[#171414]"
            type="button"
            onClick={() =>
              void handleWorkflowUpdate({
                lifecycleStatus: "follow_up_active",
                acceptedStatus: "accepted",
                followUpStage: "follow_up_1_due",
                nextActionType: "send_follow_up_1"
              })
            }
          >
            Follow-up active
          </button>
          <button
            className="inline-flex min-h-9 items-center rounded-[14px] border border-[#eadfdd] bg-white/90 px-4 text-[12px] font-medium text-[#514744] transition hover:bg-[#fbf8f7] hover:text-[#171414]"
            type="button"
            onClick={() =>
              void handleWorkflowUpdate({
                lifecycleStatus: "replied",
                acceptedStatus: "accepted",
                followUpStage: "replied",
                nextActionType: "review_reply",
                lastRepliedAt: new Date().toISOString()
              })
            }
          >
            Mark replied
          </button>
        </div>
      </section>

      <section className="rounded-[22px] border border-[#eadfdd] bg-white/90 p-5 shadow-[0_18px_50px_rgba(34,22,19,0.04)]">
        <div className="mb-4 flex items-start justify-between gap-4">
          <div>
            <p className="text-[11px] font-medium uppercase tracking-[0.18em] text-[#8b817e]">
              Outreach
            </p>
            <h3 className="mt-1 text-lg font-medium tracking-tight text-[#171414]">
              Logged invites
            </h3>
          </div>
          <button
            className="inline-flex min-h-9 items-center rounded-[14px] border border-[#eadfdd] px-3 text-[12px] font-medium text-[#514744] transition hover:bg-[#fbf8f7]"
            type="button"
            onClick={() => {
              setInviteError(null);
              setInviteForm(createInviteForm(senderAccounts, inviteTemplates));
              setIsInviteOpen(true);
            }}
          >
            <Plus className="mr-2 h-4 w-4" />
            Add invite
          </button>
        </div>

        {outreachAttempts.length === 0 ? (
          <p className="text-[12px] text-[#8b817e]">No invites logged yet.</p>
        ) : (
          <div className="overflow-hidden rounded-[18px] border border-[#eadfdd]">
            <div className="grid grid-cols-[1fr_1fr_1fr_1fr_1fr] gap-3 border-b border-[#eadfdd] bg-[#fbf8f7] px-4 py-3 text-[10px] font-medium uppercase tracking-[0.18em] text-[#b7adaa]">
              <span>Sender</span>
              <span>Template</span>
              <span>Status</span>
              <span>Sent</span>
              <span>Note</span>
            </div>
            {outreachAttempts.map((attempt) => (
              <div
                key={attempt.id}
                className="grid grid-cols-[1fr_1fr_1fr_1fr_1fr] gap-3 border-b border-[#f2ebe9] px-4 py-3 text-[12px] last:border-b-0"
              >
                <span className="truncate text-[#171414]">
                  {formatSenderDisplayName(attempt.senderAccountName)}
                </span>
                <span className="truncate text-[#514744]">
                  {attempt.inviteTemplateName ?? "No template"}
                </span>
                <span className="truncate text-[#514744]">{formatDisplayLabel(attempt.status)}</span>
                <span className="truncate text-[#514744]">{formatLocalDateTime(attempt.sentAt)}</span>
                <span className="truncate text-[#8b817e]">
                  {attempt.inviteNoteText ?? "No invite note"}
                </span>
              </div>
            ))}
          </div>
        )}
      </section>

      {isEditing ? (
        <section className="rounded-[22px] border border-[#eadfdd] bg-white/90 p-5 shadow-[0_18px_50px_rgba(34,22,19,0.04)]">
          <div className="mb-4">
            <p className="text-[11px] font-medium uppercase tracking-[0.18em] text-[#8b817e]">
              Edit
            </p>
            <h3 className="mt-1 text-lg font-medium tracking-tight text-[#171414]">
              Update prospect
            </h3>
          </div>

          <form className="grid grid-cols-1 gap-4 md:grid-cols-2" onSubmit={handleSave}>
            <label className="grid gap-2 text-[12px] text-[#6d625f]">
              <span className="font-medium text-[#514744]">Full name</span>
              <input
                className={inputClassName}
                value={form.fullName}
                onChange={(event) =>
                  setForm((current) =>
                    current ? { ...current, fullName: event.target.value } : current
                  )
                }
              />
            </label>

            <label className="grid gap-2 text-[12px] text-[#6d625f]">
              <span className="font-medium text-[#514744]">LinkedIn URL</span>
              <input
                className={inputClassName}
                value={form.linkedinProfileUrl}
                onChange={(event) =>
                  setForm((current) =>
                    current ? { ...current, linkedinProfileUrl: event.target.value } : current
                  )
                }
              />
            </label>

            <label className="grid gap-2 text-[12px] text-[#6d625f]">
              <span className="font-medium text-[#514744]">Title</span>
              <input
                className={inputClassName}
                value={form.title}
                onChange={(event) =>
                  setForm((current) =>
                    current ? { ...current, title: event.target.value } : current
                  )
                }
              />
            </label>

            <label className="grid gap-2 text-[12px] text-[#6d625f]">
              <span className="font-medium text-[#514744]">Organization</span>
              <input
                className={inputClassName}
                value={form.organizationName}
                onChange={(event) =>
                  setForm((current) =>
                    current ? { ...current, organizationName: event.target.value } : current
                  )
                }
              />
            </label>

            <label className="grid gap-2 text-[12px] text-[#6d625f]">
              <span className="font-medium text-[#514744]">Organization type</span>
              <select
                className={inputClassName}
                value={form.organizationType}
                onChange={(event) =>
                  setForm((current) =>
                    current
                      ? {
                        ...current,
                        organizationType: event.target.value as UpdateProspectInput["organizationType"]
                      }
                      : current
                  )
                }
              >
                {orgTypeOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>

            <label className="grid gap-2 text-[12px] text-[#6d625f]">
              <span className="font-medium text-[#514744]">Priority</span>
              <select
                className={inputClassName}
                value={form.priority}
                onChange={(event) =>
                  setForm((current) =>
                    current
                      ? {
                        ...current,
                        priority: event.target.value as UpdateProspectInput["priority"]
                      }
                      : current
                  )
                }
              >
                {priorityOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>

            <label className="grid gap-2 text-[12px] text-[#6d625f]">
              <span className="font-medium text-[#514744]">Segment</span>
              <select
                className={inputClassName}
                value={form.segment ?? ""}
                onChange={(event) =>
                  setForm((current) =>
                    current
                      ? {
                        ...current,
                        segment: (event.target.value || null) as UpdateProspectInput["segment"]
                      }
                      : current
                  )
                }
              >
                {segmentOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>

            <label className="grid gap-2 text-[12px] text-[#6d625f]">
              <span className="font-medium text-[#514744]">Location</span>
              <input
                className={inputClassName}
                value={form.locationText ?? ""}
                onChange={(event) =>
                  setForm((current) =>
                    current ? { ...current, locationText: event.target.value } : current
                  )
                }
              />
            </label>

            <label className="grid gap-2 text-[12px] text-[#6d625f]">
              <span className="font-medium text-[#514744]">Region</span>
              <input
                className={inputClassName}
                value={form.region ?? ""}
                onChange={(event) =>
                  setForm((current) =>
                    current ? { ...current, region: event.target.value } : current
                  )
                }
              />
            </label>

            <label className="grid gap-2 text-[12px] text-[#6d625f] md:col-span-2">
              <span className="font-medium text-[#514744]">Notes</span>
              <textarea
                className="min-h-[120px] rounded-[22px] border border-[#eadfdd] bg-white/90 shadow-[0_20px_60px_rgba(34,22,19,0.04)] px-3 py-3 text-[12px] text-[#171414] outline-none transition focus:border-[#f19b8f] focus:ring-2 focus:ring-[#f7c6bf]/40"
                value={form.notes ?? ""}
                onChange={(event) =>
                  setForm((current) => (current ? { ...current, notes: event.target.value } : current))
                }
              />
            </label>

            <div className="flex items-center gap-3 md:col-span-2">
              <button
                className="inline-flex min-h-9 items-center rounded-[14px] bg-[#160b28] px-4 text-[12px] font-medium text-white shadow-[0_12px_35px_rgba(34,22,19,0.035)] transition hover:bg-[#24113c] disabled:opacity-70"
                type="submit"
                disabled={isSaving}
              >
                {isSaving ? "Saving..." : "Save changes"}
              </button>
              {error ? <p className="text-[12px] text-[#c95f54]">{error}</p> : null}
            </div>
          </form>
        </section>
      ) : null}

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        <article className="rounded-[22px] border border-[#eadfdd] bg-white/90 p-4 shadow-[0_18px_50px_rgba(34,22,19,0.035)]">
          <p className="text-[11px] font-medium uppercase tracking-[0.18em] text-[#8b817e]">
            Organization
          </p>
          <strong className="mt-3 block text-[12px] font-medium text-[#171414]">
            {item.organizationName}
          </strong>
          <span className="mt-1 block text-[12px] text-[#8b817e]">
            {item.organizationType.replaceAll("_", " ")}
          </span>
        </article>

        <article className="rounded-[22px] border border-[#eadfdd] bg-white/90 p-4 shadow-[0_18px_50px_rgba(34,22,19,0.035)]">
          <p className="text-[11px] font-medium uppercase tracking-[0.18em] text-[#8b817e]">
            Location
          </p>
          <strong className="mt-3 block text-[12px] font-medium text-[#171414]">
            {item.locationText ?? "Unknown"}
          </strong>
          <span className="mt-1 block text-[12px] text-[#8b817e]">{item.region ?? "No region yet"}</span>
        </article>

        <article className="rounded-[22px] border border-[#eadfdd] bg-white/90 p-4 shadow-[0_18px_50px_rgba(34,22,19,0.035)]">
          <p className="text-[11px] font-medium uppercase tracking-[0.18em] text-[#8b817e]">
            Status
          </p>
          <strong className="mt-3 block text-[12px] font-medium text-[#171414]">
            {getStageLabel(item)}
          </strong>
          <span className="mt-1 block text-[12px] text-[#8b817e]">{getAcceptanceLabel(item)}</span>
        </article>

        <article className="rounded-[22px] border border-[#eadfdd] bg-white/90 p-4 shadow-[0_18px_50px_rgba(34,22,19,0.035)]">
          <p className="text-[11px] font-medium uppercase tracking-[0.18em] text-[#8b817e]">
            LinkedIn
          </p>
          <a
            href={item.linkedinProfileUrl}
            target="_blank"
            rel="noreferrer"
            className="mt-3 block break-all text-[12px] font-medium text-[#171414] underline underline-offset-4"
          >
            {item.linkedinProfileUrl}
          </a>
          <span className="mt-1 block text-[12px] text-[#8b817e]">
            {item.acceptedStatus.replaceAll("_", " ")}
          </span>
        </article>

        <article className="rounded-[22px] border border-[#eadfdd] bg-white/90 p-4 shadow-[0_18px_50px_rgba(34,22,19,0.035)]">
          <p className="text-[11px] font-medium uppercase tracking-[0.18em] text-[#8b817e]">
            Segment
          </p>
          <strong className="mt-3 block text-[12px] font-medium text-[#171414]">
            {item.segment ? formatDisplayLabel(item.segment) : "Open"}
          </strong>
          <span className="mt-1 block text-[12px] text-[#8b817e]">Audience bucket</span>
        </article>

        <article className="rounded-[22px] border border-[#eadfdd] bg-white/90 p-4 shadow-[0_18px_50px_rgba(34,22,19,0.035)]">
          <p className="text-[11px] font-medium uppercase tracking-[0.18em] text-[#8b817e]">
            Priority
          </p>
          <strong className="mt-3 block text-[12px] font-medium text-[#171414]">
            {formatDisplayLabel(item.priority)}
          </strong>
          <span className="mt-1 block text-[12px] text-[#8b817e]">Current importance</span>
        </article>

        <article className="rounded-[22px] border border-[#eadfdd] bg-white/90 p-4 shadow-[0_18px_50px_rgba(34,22,19,0.035)]">
          <p className="text-[11px] font-medium uppercase tracking-[0.18em] text-[#8b817e]">
            Next action
          </p>
          <strong className="mt-3 block text-[12px] font-medium text-[#171414]">
            {getNextStepLabel(item)}
          </strong>
          <span className="mt-1 block text-[12px] text-[#8b817e]">{getFollowUpLabel(item)}</span>
        </article>

        <article className="rounded-[22px] border border-[#eadfdd] bg-white/90 p-4 shadow-[0_18px_50px_rgba(34,22,19,0.035)]">
          <p className="text-[11px] font-medium uppercase tracking-[0.18em] text-[#8b817e]">
            Created
          </p>
          <strong className="mt-3 block text-[12px] font-medium text-[#171414]">
            {new Date(item.createdAt).toLocaleDateString()}
          </strong>
          <span className="mt-1 block text-[12px] text-[#8b817e]">First saved to CRM</span>
        </article>

        <article className="rounded-[22px] border border-[#eadfdd] bg-white/90 p-4 shadow-[0_18px_50px_rgba(34,22,19,0.035)]">
          <p className="text-[11px] font-medium uppercase tracking-[0.18em] text-[#8b817e]">
            Last updated
          </p>
          <strong className="mt-3 block text-[12px] font-medium text-[#171414]">
            {new Date(item.updatedAt).toLocaleDateString()}
          </strong>
          <span className="mt-1 block text-[12px] text-[#8b817e]">Most recent change</span>
        </article>
      </section>

      <section className="rounded-[22px] border border-[#eadfdd] bg-white/90 p-5 shadow-[0_18px_50px_rgba(34,22,19,0.04)]">
        <div className="mb-4">
          <p className="text-[11px] font-medium uppercase tracking-[0.18em] text-[#8b817e]">
            Notes
          </p>
          <h3 className="mt-1 text-base font-medium tracking-tight text-[#171414]">Context</h3>
        </div>
        <p className="text-[12px] leading-7 text-[#6d625f]">{item.notes ?? "No notes yet."}</p>
      </section>

      <ProspectInviteSheet
        error={inviteError}
        form={inviteForm}
        inviteTemplates={inviteTemplates}
        isOpen={isInviteOpen}
        isSaving={isInviting}
        senderAccounts={senderAccounts}
        setForm={setInviteForm}
        onClose={() => setIsInviteOpen(false)}
        onSubmit={handleLogInvite}
      />
    </section>
  );
}

function PrioritySelect({
  apiBaseUrl,
  item,
  onUpdated
}: {
  apiBaseUrl: string;
  item: ProspectListItem;
  onUpdated: (item: ProspectListItem) => void;
}) {
  const [isSaving, setIsSaving] = useState(false);

  async function handleChange(nextPriority: ProspectListItem["priority"]) {
    if (nextPriority === item.priority) {
      return;
    }

    setIsSaving(true);

    try {
      const response = await fetch(`${apiBaseUrl}/v1/prospects/${item.id}/priority`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          priority: nextPriority
        })
      });

      if (!response.ok) {
        throw new Error("Could not update priority.");
      }

      const data = (await response.json()) as { item: ProspectListItem };
      onUpdated(data.item);
    } catch (error) {
      console.error(error);
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <select
      className={`min-h-7 rounded-md border px-2.5 pr-7 text-[12px] font-medium outline-none transition ${getPriorityClasses(item.priority)} ${isSaving ? "opacity-70" : ""}`}
      value={item.priority}
      disabled={isSaving}
      onChange={(event) => handleChange(event.target.value as ProspectListItem["priority"])}
      onClick={(event) => event.stopPropagation()}
    >
      {priorityOptions.map((option) => (
        <option key={option.value} value={option.value}>
          {option.label}
        </option>
      ))}
    </select>
  );
}

function ProspectRow({
  apiBaseUrl,
  item,
  onOpenPreview,
  onPriorityUpdated
}: {
  apiBaseUrl: string;
  item: ProspectListItem;
  onOpenPreview: (item: ProspectListItem) => void;
  onPriorityUpdated: (item: ProspectListItem) => void;
}) {
  return (
    <div
      role="button"
      tabIndex={0}
      className="grid grid-cols-[36px_1.3fr_1.45fr_1.25fr_1.05fr_0.78fr_0.9fr_0.98fr_0.76fr] gap-3 border-b border-[#f2ebe9] px-3 py-3 text-[12px] transition hover:bg-[#fbf8f7]"
      onClick={() => onOpenPreview(item)}
      onKeyDown={(event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          onOpenPreview(item);
        }
      }}
    >
      <div className="flex items-start justify-center pt-3" onClick={(event) => event.stopPropagation()}>
        <input type="checkbox" className="h-3.5 w-3.5 rounded border-[#ddd0cd]" />
      </div>

      <div className="flex min-w-0 items-center gap-3">
        {item.photoUrl ? (
          <div
            className="h-9 w-9 shrink-0 rounded-full bg-[#eadfdd] bg-cover bg-center bg-no-repeat ring-1 ring-black/5"
            style={{ backgroundImage: `url("${item.photoUrl}")` }}
          />
        ) : (
          <div className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-[#f5eeee] text-[12px] font-medium text-[#514744] ring-1 ring-black/5">
            {item.fullName.slice(0, 2).toUpperCase()}
          </div>
        )}
        <div className="min-w-0">
          <strong className="block truncate text-[12px] font-medium text-[#171414]">
            {item.fullName}
          </strong>
          <span className="block truncate text-[11px] text-[#8b817e]">
            {item.locationText ?? item.region ?? "No location"}
          </span>
        </div>
      </div>

      <div className="min-w-0">
        <span className="block truncate text-[12px] leading-5 text-[#8b817e]">
          {item.title || "No title"}
        </span>
      </div>

      <div className="min-w-0 space-y-1">
        <strong className="block truncate text-[12px] font-medium text-[#171414]">
          {item.organizationName}
        </strong>
        <span className="block truncate text-[11px] text-[#8b817e]">
          {item.organizationType.replaceAll("_", " ")}
        </span>
      </div>

      <div className="space-y-1">
        <strong className="block truncate text-[12px] font-medium text-[#171414]">
          {getSenderLabel(item)}
        </strong>
        <span className="block truncate text-[11px] text-[#8b817e]">
          Request owner
        </span>
      </div>

      <div className="flex items-start" onClick={(event) => event.stopPropagation()}>
        <PrioritySelect apiBaseUrl={apiBaseUrl} item={item} onUpdated={onPriorityUpdated} />
      </div>

      <div className="space-y-1">
        <strong className="block text-[12px] font-medium text-[#171414]">{getStageLabel(item)}</strong>
        <span className="block text-[11px] text-[#8b817e]">{getAcceptanceLabel(item)}</span>
      </div>

      <div className="space-y-1">
        <strong className="block text-[12px] font-medium text-[#171414]">
          {getNextStepLabel(item)}
        </strong>
        <span className="block text-[11px] text-[#8b817e]">{getFollowUpLabel(item)}</span>
      </div>

      <div className="group relative flex items-start justify-end">
        <span className="inline-flex min-h-6 items-center rounded-md bg-[#f5eeee] px-2 text-[11px] font-medium text-[#514744]">
          {new Date(item.updatedAt).toLocaleDateString("en-GB", {
            day: "2-digit",
            month: "short"
          })}
        </span>

        <div className="pointer-events-none absolute right-0 top-full z-20 mt-2 hidden w-56 rounded-[14px] border border-[#eadfdd] bg-white/90 p-3 text-left shadow-[0_18px_50px_rgba(34,22,19,0.08)] group-hover:block">
          <p className="text-[10px] font-medium uppercase tracking-[0.16em] text-[#b7adaa]">
            Updated
          </p>
          <p className="mt-1 text-[12px] text-[#6d625f]">
            {new Date(item.updatedAt).toLocaleDateString("en-GB", {
              day: "2-digit",
              month: "short",
              year: "numeric"
            })}
          </p>
          <p className="mt-2 text-[10px] font-medium uppercase tracking-[0.16em] text-[#b7adaa]">
            Location
          </p>
          <p className="mt-1 text-[12px] text-[#6d625f]">
            {item.locationText ?? item.region ?? "No location"}
          </p>
        </div>
      </div>
    </div>
  );
}

function ProspectListCard({
  apiBaseUrl,
  item,
  onOpenPreview,
  onPriorityUpdated
}: {
  apiBaseUrl: string;
  item: ProspectListItem;
  onOpenPreview: (item: ProspectListItem) => void;
  onPriorityUpdated: (item: ProspectListItem) => void;
}) {
  return (
    <div
      role="button"
      tabIndex={0}
      className="rounded-[18px] border border-[#eadfdd] bg-white/90 p-3 text-left transition hover:-translate-y-0.5 hover:border-[#ddd0cd] hover:bg-[#fcfbfb] hover:shadow-[0_14px_35px_rgba(34,22,19,0.05)]"
      onClick={() => onOpenPreview(item)}
      onKeyDown={(event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          onOpenPreview(item);
        }
      }}
    >
      <div className="flex items-start justify-between gap-4">
        <div className="flex min-w-0 items-center gap-3">
          {item.photoUrl ? (
            <div
              className="h-8 w-8 shrink-0 rounded-full bg-[#eadfdd] bg-cover bg-center bg-no-repeat"
              style={{ backgroundImage: `url("${item.photoUrl}")` }}
            />
          ) : (
            <div className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-[#f5eeee] text-[11px] font-medium text-[#514744]">
              {item.fullName.slice(0, 2).toUpperCase()}
            </div>
          )}
            <div className="min-w-0">
              <strong className="block truncate text-[12px] font-medium text-[#171414]">
                {item.fullName}
              </strong>
              <span className="block truncate text-[11px] text-[#8b817e]">{item.title}</span>
            </div>
        </div>

        <div className="flex items-center gap-2">
          <PrioritySelect apiBaseUrl={apiBaseUrl} item={item} onUpdated={onPriorityUpdated} />
        </div>
      </div>

      <div className="mt-3 grid grid-cols-2 gap-2 text-[11px] text-[#8b817e] sm:grid-cols-4">
        <div>
          <span className="block text-[#b7adaa]">Org</span>
          <span className="block truncate text-[#514744]">{item.organizationName}</span>
        </div>
        <div>
          <span className="block text-[#b7adaa]">Sender</span>
          <span className="block truncate text-[#514744]">{getSenderLabel(item)}</span>
        </div>
        <div>
          <span className="block text-[#b7adaa]">Stage</span>
          <span className="block truncate text-[#514744]">{getStageLabel(item)}</span>
        </div>
        <div>
          <span className="block text-[#b7adaa]">Next</span>
          <span className="block truncate text-[#514744]">{getNextStepLabel(item)}</span>
        </div>
        <div>
          <span className="block text-[#b7adaa]">Updated</span>
          <span className="block truncate text-[#514744]">
            {new Date(item.updatedAt).toLocaleDateString("en-GB", {
              day: "2-digit",
              month: "short"
            })}
          </span>
        </div>
      </div>
    </div>
  );
}

function ProspectStackCard({
  apiBaseUrl,
  item,
  onOpenPreview,
  onPriorityUpdated
}: {
  apiBaseUrl: string;
  item: ProspectListItem;
  onOpenPreview: (item: ProspectListItem) => void;
  onPriorityUpdated: (item: ProspectListItem) => void;
}) {
  return (
    <div
      role="button"
      tabIndex={0}
      className="rounded-[18px] border border-[#eadfdd] bg-white/90 p-4 transition hover:-translate-y-0.5 hover:border-[#ddd0cd] hover:bg-[#fcfbfb] hover:shadow-[0_14px_35px_rgba(34,22,19,0.05)]"
      onClick={() => onOpenPreview(item)}
      onKeyDown={(event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          onOpenPreview(item);
        }
      }}
    >
      <div className="flex items-start justify-between gap-4">
        <div className="flex min-w-0 items-center gap-3">
          {item.photoUrl ? (
            <div
              className="h-10 w-10 shrink-0 rounded-full bg-[#eadfdd] bg-cover bg-center bg-no-repeat ring-1 ring-black/5"
              style={{ backgroundImage: `url("${item.photoUrl}")` }}
            />
          ) : (
            <div className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-[#f5eeee] text-[12px] font-medium text-[#514744] ring-1 ring-black/5">
              {item.fullName.slice(0, 2).toUpperCase()}
            </div>
          )}
          <div className="min-w-0">
            <strong className="block truncate text-[12px] font-medium text-[#171414]">
              {item.fullName}
            </strong>
            <span className="block truncate text-[11px] text-[#8b817e]">
              {item.title || "No title"}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <span className="inline-flex min-h-6 items-center rounded-md bg-[#f5eeee] px-2 text-[11px] font-medium text-[#514744]">
            {new Date(item.updatedAt).toLocaleDateString("en-GB", {
              day: "2-digit",
              month: "short"
            })}
          </span>
        </div>
      </div>

      <div className="mt-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-[14px] bg-[#fbf8f7] px-3 py-2">
          <span className="block text-[10px] uppercase tracking-[0.16em] text-[#b7adaa]">Org</span>
          <span className="block truncate text-[12px] text-[#514744]">{item.organizationName}</span>
        </div>
        <div className="rounded-[14px] bg-[#fbf8f7] px-3 py-2">
          <span className="block text-[10px] uppercase tracking-[0.16em] text-[#b7adaa]">Sender</span>
          <span className="block truncate text-[12px] text-[#514744]">{getSenderLabel(item)}</span>
        </div>
        <div className="rounded-[14px] bg-[#fbf8f7] px-3 py-2">
          <span className="block text-[10px] uppercase tracking-[0.16em] text-[#b7adaa]">Priority</span>
          <div className="pt-1" onClick={(event) => event.stopPropagation()}>
            <PrioritySelect apiBaseUrl={apiBaseUrl} item={item} onUpdated={onPriorityUpdated} />
          </div>
        </div>
        <div className="rounded-[14px] bg-[#fbf8f7] px-3 py-2">
          <span className="block text-[10px] uppercase tracking-[0.16em] text-[#b7adaa]">Stage</span>
          <span className="block truncate text-[12px] text-[#514744]">{getStageLabel(item)}</span>
        </div>
        <div className="rounded-[14px] bg-[#fbf8f7] px-3 py-2">
          <span className="block text-[10px] uppercase tracking-[0.16em] text-[#b7adaa]">Next</span>
          <span className="block truncate text-[12px] text-[#514744]">{getNextStepLabel(item)}</span>
        </div>
      </div>

      <div className="mt-4 flex items-center justify-between gap-3 border-t border-[#f2ebe9] pt-3 text-[11px] text-[#8b817e]">
        <span className="truncate">{item.locationText ?? item.region ?? "No location"}</span>
        <span className="inline-flex items-center gap-1 text-[#6d625f]">
          Preview <ArrowUpRight className="h-3 w-3" />
        </span>
      </div>
    </div>
  );
}

function ProspectDetailPanel({
  item,
  onClose
}: {
  item: ProspectListItem;
  onClose: () => void;
}) {
  return (
    <div className="fixed inset-0 z-40 flex justify-end bg-[#160b28]/20 backdrop-blur-[2px]">
      <button
        aria-label="Close prospect drawer"
        className="absolute inset-0 cursor-default"
        type="button"
        onClick={onClose}
      />

      <aside className="relative z-10 flex h-full w-full max-w-[420px] flex-col overflow-y-auto border-l border-[#eadfdd] bg-white/95 p-5 shadow-[0_20px_70px_rgba(34,22,19,0.12)]">
        <div className="flex items-start justify-between gap-4">
          <div className="space-y-1">
            <p className="text-[10px] font-medium uppercase tracking-[0.18em] text-[#b7adaa]">
              Prospect preview
            </p>
            <h3 className="text-[18px] font-medium tracking-[-0.03em] text-[#171414]">
              {item.fullName}
            </h3>
            <p className="text-[12px] text-[#8b817e]">{item.title || "No title yet"}</p>
          </div>
          <button
            type="button"
            className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-[#eadfdd] text-[#8b817e] transition hover:bg-[#fbf8f7] hover:text-[#171414]"
            onClick={onClose}
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="mt-5 rounded-[20px] border border-[#eadfdd] bg-[#fbf8f7] p-4">
          <div className="flex items-center gap-3">
            {item.photoUrl ? (
              <div
                className="h-12 w-12 rounded-full bg-[#eadfdd] bg-cover bg-center bg-no-repeat ring-1 ring-black/5"
                style={{ backgroundImage: `url("${item.photoUrl}")` }}
              />
            ) : (
              <div className="grid h-12 w-12 place-items-center rounded-full bg-[#f5eeee] text-[12px] font-medium text-[#514744] ring-1 ring-black/5">
                {item.fullName.slice(0, 2).toUpperCase()}
              </div>
            )}
            <div className="min-w-0">
              <p className="truncate text-[12px] font-medium text-[#171414]">{item.organizationName}</p>
              <p className="truncate text-[11px] text-[#8b817e]">{item.organizationType.replaceAll("_", " ")}</p>
            </div>
          </div>

          <div className="mt-4 grid grid-cols-2 gap-3 text-[11px] text-[#6d625f]">
            <div>
              <span className="block text-[#b7adaa]">Priority</span>
              <span className="block text-[#514744]">{item.priority}</span>
            </div>
            <div>
              <span className="block text-[#b7adaa]">Stage</span>
              <span className="block text-[#514744]">{getStageLabel(item)}</span>
            </div>
            <div>
              <span className="block text-[#b7adaa]">Next step</span>
              <span className="block text-[#514744]">{getNextStepLabel(item)}</span>
            </div>
            <div>
              <span className="block text-[#b7adaa]">Updated</span>
              <span className="block text-[#514744]">
                {new Date(item.updatedAt).toLocaleDateString("en-GB", {
                  day: "2-digit",
                  month: "short",
                  year: "numeric"
                })}
              </span>
            </div>
          </div>
        </div>

        <div className="mt-5 space-y-4">
          <a
            href={`/linkedin-crm/${item.id}`}
            className="inline-flex min-h-9 items-center justify-between rounded-[14px] bg-[#160b28] px-4 text-[12px] font-medium text-white transition hover:bg-[#24113c]"
          >
            Open full profile
            <ArrowUpRight className="ml-2 h-4 w-4" />
          </a>

          <a
            href={item.linkedinProfileUrl}
            target="_blank"
            rel="noreferrer"
            className="inline-flex min-h-9 items-center rounded-[14px] border border-[#eadfdd] px-4 text-[12px] font-medium text-[#514744] transition hover:bg-[#fbf8f7] hover:text-[#171414]"
          >
            Open LinkedIn
          </a>

          <p className="text-[11px] leading-5 text-[#8b817e]">
            First click opens this preview. Use full profile when you want to edit, log invite, or
            change workflow state.
          </p>
        </div>
      </aside>
    </div>
  );
}

function ProspectCreateSheet({
  error,
  form,
  isOpen,
  isSaving,
  onClose,
  onSubmit,
  setForm
}: {
  error: string | null;
  form: CreateResearchedProspectInput;
  isOpen: boolean;
  isSaving: boolean;
  onClose: () => void;
  onSubmit: (event: React.FormEvent<HTMLFormElement>) => Promise<void>;
  setForm: React.Dispatch<React.SetStateAction<CreateResearchedProspectInput>>;
}) {
  if (!isOpen) {
    return null;
  }

  return (
    <div
      className="fixed inset-0 z-40 flex justify-end bg-[#160b28]/20 backdrop-blur-[1px]"
      role="presentation"
      onClick={onClose}
    >
      <aside
        className="flex h-full w-full max-w-[560px] flex-col gap-6 overflow-y-auto bg-white p-6 shadow-[0_30px_90px_rgba(34,22,19,0.12)]"
        role="dialog"
        aria-modal="true"
        aria-label="Add researched prospect"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-4">
          <div className="space-y-2">
            <p className="text-[11px] font-medium uppercase tracking-[0.18em] text-[#8b817e]">
              Manual fallback
            </p>
            <h3 className="text-xl font-light tracking-[-0.04em] text-[#171414]">Add Prospect</h3>
            <p className="max-w-md text-[12px] leading-6 text-[#8b817e]">
              This stays as the backup path. Extension-first capture is still the main product motion.
            </p>
          </div>
          <button
            className="inline-flex min-h-9 items-center rounded-[14px] border border-[#eadfdd] px-3 text-[12px] font-medium text-[#6d625f] transition hover:bg-[#fbf8f7] hover:text-[#171414]"
            type="button"
            onClick={onClose}
            aria-label="Close"
          >
            Close
          </button>
        </div>

        <form className="grid grid-cols-1 gap-4 md:grid-cols-2" onSubmit={onSubmit}>
          <label className="grid gap-2 text-[12px] text-[#6d625f]">
            <span className="font-medium text-[#514744]">Full name</span>
            <input
              className={inputClassName}
              value={form.fullName}
              onChange={(event) =>
                setForm((current) => ({ ...current, fullName: event.target.value }))
              }
              required
            />
          </label>

          <label className="grid gap-2 text-[12px] text-[#6d625f]">
            <span className="font-medium text-[#514744]">LinkedIn URL</span>
            <input
              className={inputClassName}
              value={form.linkedinProfileUrl}
              onChange={(event) =>
                setForm((current) => ({
                  ...current,
                  linkedinProfileUrl: event.target.value
                }))
              }
              required
            />
          </label>

          <label className="grid gap-2 text-[12px] text-[#6d625f]">
            <span className="font-medium text-[#514744]">Organization</span>
            <input
              className={inputClassName}
              value={form.organizationName}
              onChange={(event) =>
                setForm((current) => ({
                  ...current,
                  organizationName: event.target.value
                }))
              }
              required
            />
          </label>

          <label className="grid gap-2 text-[12px] text-[#6d625f]">
            <span className="font-medium text-[#514744]">Organization type</span>
            <select
              className={inputClassName}
              value={form.organizationType}
              onChange={(event) =>
                setForm((current) => ({
                  ...current,
                  organizationType: event.target.value as CreateResearchedProspectInput["organizationType"]
                }))
              }
            >
              {orgTypeOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>

          <label className="grid gap-2 text-[12px] text-[#6d625f]">
            <span className="font-medium text-[#514744]">Title</span>
            <input
              className={inputClassName}
              value={form.title}
              onChange={(event) =>
                setForm((current) => ({ ...current, title: event.target.value }))
              }
              required
            />
          </label>

          <label className="grid gap-2 text-[12px] text-[#6d625f]">
            <span className="font-medium text-[#514744]">Priority</span>
            <select
              className={inputClassName}
              value={form.priority ?? "medium"}
              onChange={(event) =>
                setForm((current) => ({
                  ...current,
                  priority: event.target.value as CreateResearchedProspectInput["priority"]
                }))
              }
            >
              {priorityOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>

          <label className="grid gap-2 text-[12px] text-[#6d625f]">
            <span className="font-medium text-[#514744]">Segment</span>
            <select
              className={inputClassName}
              value={form.segment ?? ""}
              onChange={(event) =>
                setForm((current) => ({
                  ...current,
                  segment: (event.target.value || null) as CreateResearchedProspectInput["segment"]
                }))
              }
            >
              {segmentOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>

          <label className="grid gap-2 text-[12px] text-[#6d625f]">
            <span className="font-medium text-[#514744]">Location</span>
            <input
              className={inputClassName}
              value={form.locationText ?? ""}
              onChange={(event) =>
                setForm((current) => ({
                  ...current,
                  locationText: event.target.value
                }))
              }
            />
          </label>

          <label className="grid gap-2 text-[12px] text-[#6d625f]">
            <span className="font-medium text-[#514744]">Region</span>
            <input
              className={inputClassName}
              value={form.region ?? ""}
              onChange={(event) =>
                setForm((current) => ({ ...current, region: event.target.value }))
              }
            />
          </label>

          <label className="grid gap-2 text-[12px] text-[#6d625f] md:col-span-2">
            <span className="font-medium text-[#514744]">Notes</span>
            <textarea
              className="min-h-[140px] rounded-[22px] border border-[#eadfdd] bg-white/90 shadow-[0_20px_60px_rgba(34,22,19,0.04)] px-3 py-3 text-[12px] text-[#171414] outline-none transition focus:border-[#f19b8f] focus:ring-2 focus:ring-[#f7c6bf]/40"
              value={form.notes ?? ""}
              onChange={(event) =>
                setForm((current) => ({ ...current, notes: event.target.value }))
              }
              rows={4}
            />
          </label>

          <div className="flex items-center gap-3 md:col-span-2">
            <button
              className="inline-flex min-h-10 items-center rounded-[14px] bg-[#160b28] px-4 text-[12px] font-medium text-white shadow-[0_12px_35px_rgba(34,22,19,0.035)] transition hover:bg-[#24113c] disabled:cursor-progress disabled:opacity-70"
              type="submit"
              disabled={isSaving}
            >
              {isSaving ? "Saving..." : "Save researched prospect"}
            </button>
            {error ? <p className="text-[12px] text-[#c95f54]">{error}</p> : null}
          </div>
        </form>
      </aside>
    </div>
  );
}

export function ProspectsCrmShell() {
  const apiBaseUrl = useMemo(() => getApiBaseUrl(), []);
  const router = useRouter();
  const [items, setItems] = useState<ProspectListItem[]>([]);
  const [viewMode, setViewMode] = useState<"grid" | "table" | "list">("table");
  const [sortBy, setSortBy] = useState<"updated_desc" | "updated_asc" | "name_asc" | "name_desc">(
    "updated_desc"
  );
  const [searchQuery, setSearchQuery] = useState("");
  const [priorityFilter, setPriorityFilter] = useState("all");
  const [stageFilter, setStageFilter] = useState("all");
  const [segmentFilter, setSegmentFilter] = useState("all");
  const [organizationTypeFilter, setOrganizationTypeFilter] = useState("all");
  const [acceptedFilter, setAcceptedFilter] = useState("all");
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [isSortOpen, setIsSortOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState(defaultForm);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [previewItem, setPreviewItem] = useState<ProspectListItem | null>(null);

  const filteredItems = useMemo(() => {
    const result = items.filter((item) => {
      const matchesSearch =
        searchQuery.trim() === "" ||
        item.fullName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.organizationName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.linkedinProfileUrl.toLowerCase().includes(searchQuery.toLowerCase());

      const matchesPriority = priorityFilter === "all" || item.priority === priorityFilter;
      const matchesStage = stageFilter === "all" || item.lifecycleStatus === stageFilter;
      const matchesSegment = segmentFilter === "all" || item.segment === segmentFilter;
      const matchesOrganizationType =
        organizationTypeFilter === "all" || item.organizationType === organizationTypeFilter;
      const matchesAccepted = acceptedFilter === "all" || item.acceptedStatus === acceptedFilter;

      return (
        matchesSearch &&
        matchesPriority &&
        matchesStage &&
        matchesSegment &&
        matchesOrganizationType &&
        matchesAccepted
      );
    });

    return result.sort((left, right) => {
      switch (sortBy) {
        case "name_asc":
          return left.fullName.localeCompare(right.fullName);
        case "name_desc":
          return right.fullName.localeCompare(left.fullName);
        case "updated_asc":
          return new Date(left.updatedAt).getTime() - new Date(right.updatedAt).getTime();
        case "updated_desc":
        default:
          return new Date(right.updatedAt).getTime() - new Date(left.updatedAt).getTime();
      }
    });
  }, [
    acceptedFilter,
    items,
    organizationTypeFilter,
    priorityFilter,
    searchQuery,
    segmentFilter,
    sortBy,
    stageFilter
  ]);

  async function loadProspects() {
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch(`${apiBaseUrl}/v1/prospects`, {
        cache: "no-store"
      });

      if (!response.ok) {
        throw new Error("Could not load prospects.");
      }

      const data = (await response.json()) as ProspectListResponse;
      setItems(data.items);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Unknown error");
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    void loadProspects();
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    const storedViewMode = window.localStorage.getItem("linkedin-crm-view-mode");
    if (storedViewMode === "grid" || storedViewMode === "table" || storedViewMode === "list") {
      setViewMode(storedViewMode);
    }
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    window.localStorage.setItem("linkedin-crm-view-mode", viewMode);
  }, [viewMode]);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsSaving(true);
    setError(null);

    try {
      const response = await fetch(`${apiBaseUrl}/v1/prospects/researched`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          ...form,
          segment: form.segment || null,
          priority: form.priority || "medium",
          locationText: form.locationText || null,
          region: form.region || null,
          icpType: form.icpType || null,
          notes: form.notes || null
        })
      });

      if (!response.ok) {
        throw new Error("Could not save researched prospect.");
      }

      setForm(defaultForm);
      setIsCreateOpen(false);
      await loadProspects();
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "Unknown error");
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <div className={getPeopleThemeClasses()}>
      <section className="people-crm-shell space-y-6 rounded-[28px] bg-[#fbf8f7] p-4 font-light">
        <section className="space-y-3">
          <div className="flex flex-col gap-3 rounded-[22px] border border-[#eadfdd] bg-white/80 px-4 py-3 xl:flex-row xl:items-center xl:justify-between">
            <div className="space-y-1">
              <h3 className="text-[13px] font-medium tracking-[-0.02em] text-[#171414]">
                All prospects
              </h3>
              <p className="text-[12px] text-[#8b817e]">
                Extension capture feeds this table. Manual add stays as fallback.
              </p>
            </div>

            <div className="flex items-center gap-2">
              <div className="inline-flex min-h-7 items-center rounded-lg border border-[#eadfdd] bg-[#fbf8f7] px-3 text-[12px] font-medium text-[#6d625f]">
                {filteredItems.length} prospect{filteredItems.length === 1 ? "" : "s"}
              </div>
              <button
                className="inline-flex min-h-7 items-center rounded-lg bg-[#160b28] px-3 text-[12px] font-medium text-white shadow-[0_12px_35px_rgba(34,22,19,0.035)] transition hover:bg-[#24113c]"
                type="button"
                onClick={() => {
                  setError(null);
                  setIsCreateOpen(true);
                }}
              >
                Add Prospect
              </button>
            </div>
          </div>

          <div className="flex flex-col gap-2 lg:flex-row lg:items-center lg:justify-between">
            <div className="relative flex flex-wrap items-center gap-2">
              <button
                className={`inline-flex min-h-7 items-center rounded-lg px-3 text-[12px] font-medium transition ${viewMode === "grid"
                  ? "border border-slate-950 bg-[#160b28] text-white shadow-[0_12px_35px_rgba(34,22,19,0.035)]"
                  : "border border-[#eadfdd] bg-[#fbf8f7] text-[#8b817e] hover:border-[#ddd0cd] hover:bg-[#f5eeee] hover:text-[#514744]"
                  }`}
                type="button"
                aria-pressed={viewMode === "grid"}
                onClick={() => setViewMode("grid")}
              >
                <Grid2x2 className="mr-1 h-3.5 w-3.5" />
                Grid
              </button>
              <button
                className={`inline-flex min-h-7 items-center rounded-lg px-3 text-[12px] font-medium transition ${viewMode === "table"
                  ? "border border-slate-950 bg-[#160b28] text-white shadow-[0_12px_35px_rgba(34,22,19,0.035)]"
                  : "border border-[#eadfdd] bg-[#fbf8f7] text-[#8b817e] hover:border-[#ddd0cd] hover:bg-[#f5eeee] hover:text-[#514744]"
                  }`}
                type="button"
                aria-pressed={viewMode === "table"}
                onClick={() => setViewMode("table")}
              >
                <List className="mr-1 h-3.5 w-3.5" />
                Table
              </button>
              <button
                className={`inline-flex min-h-7 items-center rounded-lg px-3 text-[12px] font-medium transition ${viewMode === "list"
                  ? "border border-slate-950 bg-[#160b28] text-white shadow-[0_12px_35px_rgba(34,22,19,0.035)]"
                  : "border border-[#eadfdd] bg-[#fbf8f7] text-[#8b817e] hover:border-[#ddd0cd] hover:bg-[#f5eeee] hover:text-[#514744]"
                  }`}
                type="button"
                aria-pressed={viewMode === "list"}
                onClick={() => setViewMode("list")}
              >
                <List className="mr-1 h-3.5 w-3.5" />
                List
              </button>
              <div className="relative">
                <button
                  className={`inline-flex min-h-7 items-center rounded-lg px-3 text-[12px] font-medium transition ${isSortOpen
                    ? "border border-slate-950 bg-[#160b28] text-white shadow-[0_12px_35px_rgba(34,22,19,0.035)]"
                    : "border border-[#eadfdd] bg-white/90 text-[#514744] hover:border-[#ddd0cd] hover:bg-[#fbf8f7]"
                    }`}
                  type="button"
                  onClick={() => {
                    setIsFilterOpen(false);
                    setIsSortOpen((current) => !current);
                  }}
                >
                  Sort by
                </button>

                {isSortOpen ? (
                  <div className="absolute left-0 top-full z-20 mt-2 w-56 rounded-[22px] border border-[#eadfdd] bg-white/90 shadow-[0_20px_60px_rgba(34,22,19,0.04)] p-2 shadow-[0_18px_50px_rgba(34,22,19,0.08)]">
                    {[
                      { value: "updated_desc", label: "Recently updated" },
                      { value: "updated_asc", label: "Oldest updated" },
                      { value: "name_asc", label: "Name A-Z" },
                      { value: "name_desc", label: "Name Z-A" }
                    ].map((option) => (
                      <button
                        key={option.value}
                        className={`flex w-full items-center justify-between rounded-[14px] px-3 py-2 text-left text-[12px] transition ${sortBy === option.value
                          ? "bg-[#160b28] text-white"
                          : "text-[#514744] hover:bg-[#fbf8f7]"
                          }`}
                        type="button"
                        onClick={() => {
                          setSortBy(option.value as typeof sortBy);
                          setIsSortOpen(false);
                        }}
                      >
                        <span>{option.label}</span>
                      </button>
                    ))}
                  </div>
                ) : null}
              </div>

              <div className="relative">
                <button
                  className={`inline-flex min-h-7 items-center rounded-lg px-3 text-[12px] font-medium transition ${isFilterOpen
                    ? "border border-slate-950 bg-[#160b28] text-white shadow-[0_12px_35px_rgba(34,22,19,0.035)]"
                    : "border border-[#eadfdd] bg-white/90 text-[#514744] hover:border-[#ddd0cd] hover:bg-[#fbf8f7]"
                    }`}
                  type="button"
                  onClick={() => {
                    setIsSortOpen(false);
                    setIsFilterOpen((current) => !current);
                  }}
                >
                  <Filter className="mr-1 h-3.5 w-3.5" />
                  Filter
                </button>

                {isFilterOpen ? (
                  <div className="absolute left-0 top-full z-20 mt-2 w-[320px] rounded-[22px] border border-[#eadfdd] bg-white/90 shadow-[0_20px_60px_rgba(34,22,19,0.04)] p-3 shadow-[0_18px_50px_rgba(34,22,19,0.08)]">
                    <div className="grid gap-3">
                      <select
                        className="min-h-9 rounded-[14px] border border-[#eadfdd] bg-white/90 px-3 text-[12px] text-[#514744] outline-none transition focus:border-[#f19b8f]"
                        value={priorityFilter}
                        onChange={(event) => setPriorityFilter(event.target.value)}
                      >
                        <option value="all">Priority</option>
                        <option value="low">Low</option>
                        <option value="medium">Medium</option>
                        <option value="high">High</option>
                        <option value="urgent">Urgent</option>
                      </select>

                      <select
                        className="min-h-9 rounded-[14px] border border-[#eadfdd] bg-white/90 px-3 text-[12px] text-[#514744] outline-none transition focus:border-[#f19b8f]"
                        value={stageFilter}
                        onChange={(event) => setStageFilter(event.target.value)}
                      >
                        <option value="all">Stage</option>
                        <option value="researched">Saved</option>
                        <option value="invite_sent">Invite sent</option>
                        <option value="accepted">Accepted</option>
                        <option value="accepted_silent">Accepted, no reply</option>
                        <option value="follow_up_active">Follow-up active</option>
                        <option value="replied">Replied</option>
                        <option value="positive_interest">Interested</option>
                        <option value="deferred">Deferred</option>
                        <option value="scheduling">Scheduling</option>
                        <option value="call_booked">Call booked</option>
                        <option value="not_interested">Not interested</option>
                        <option value="archived">Archived</option>
                      </select>

                      <select
                        className="min-h-9 rounded-[14px] border border-[#eadfdd] bg-white/90 px-3 text-[12px] text-[#514744] outline-none transition focus:border-[#f19b8f]"
                        value={segmentFilter}
                        onChange={(event) => setSegmentFilter(event.target.value)}
                      >
                        <option value="all">Segment</option>
                        <option value="agency">Agency</option>
                        <option value="in_house">In-house</option>
                        <option value="founder">Founder</option>
                        <option value="consultant">Consultant</option>
                        <option value="other">Other</option>
                      </select>

                      <select
                        className="min-h-9 rounded-[14px] border border-[#eadfdd] bg-white/90 px-3 text-[12px] text-[#514744] outline-none transition focus:border-[#f19b8f]"
                        value={organizationTypeFilter}
                        onChange={(event) => setOrganizationTypeFilter(event.target.value)}
                      >
                        <option value="all">Org type</option>
                        <option value="agency">Agency</option>
                        <option value="in_house">In-house</option>
                        <option value="brand">Brand</option>
                        <option value="startup">Startup</option>
                        <option value="consultancy">Consultancy</option>
                        <option value="other">Other</option>
                      </select>

                      <select
                        className="min-h-9 rounded-[14px] border border-[#eadfdd] bg-white/90 px-3 text-[12px] text-[#514744] outline-none transition focus:border-[#f19b8f]"
                        value={acceptedFilter}
                        onChange={(event) => setAcceptedFilter(event.target.value)}
                      >
                        <option value="all">Accepted</option>
                        <option value="unknown">Not checked</option>
                        <option value="pending">Pending</option>
                        <option value="accepted">Accepted</option>
                        <option value="not_accepted">Not accepted</option>
                      </select>

                      <button
                        className="inline-flex min-h-9 items-center justify-center rounded-[14px] border border-[#eadfdd] bg-[#fbf8f7] px-3 text-[12px] font-medium text-[#6d625f] transition hover:border-[#ddd0cd] hover:bg-[#f5eeee] hover:text-[#171414]"
                        type="button"
                        onClick={() => {
                          setSearchQuery("");
                          setPriorityFilter("all");
                          setStageFilter("all");
                          setSegmentFilter("all");
                          setOrganizationTypeFilter("all");
                          setAcceptedFilter("all");
                        }}
                      >
                        Clear filters
                      </button>
                    </div>
                  </div>
                ) : null}
              </div>
            </div>

            <div className="flex items-center gap-2">
              <div className="flex min-h-7 items-center gap-2 rounded-lg border border-[#eadfdd] bg-white/90 px-3 lg:w-[240px]">
                <Search className="h-3.5 w-3.5 text-[#b7adaa]" />
                <input
                  className="w-full border-0 bg-transparent text-[12px] text-[#171414] outline-none"
                  placeholder="Search prospects, titles, orgs"
                  value={searchQuery}
                  onChange={(event) => setSearchQuery(event.target.value)}
                />
              </div>
            </div>
          </div>

          <div className="overflow-hidden rounded-[22px] border border-[#eadfdd] bg-white/90 shadow-[0_20px_60px_rgba(34,22,19,0.04)]">
            <div className="px-4 pt-4">
              <div className="flex items-end justify-between gap-4">
                <div className="space-y-1">
                  <h3 className="text-[13px] font-medium tracking-[-0.02em] text-[#171414]">
                    All prospects
                  </h3>
                  <p className="text-[12px] text-[#8b817e]">
                    Extension capture feeds this table. Manual add stays as fallback.
                  </p>
                </div>
                <div className="inline-flex min-h-7 items-center rounded-lg border border-[#eadfdd] bg-[#fbf8f7] px-3 text-[12px] font-medium text-[#6d625f]">
                  {filteredItems.length} prospect{filteredItems.length === 1 ? "" : "s"}
                </div>
              </div>
            </div>

            <div className="px-4 pb-4 pt-3">
              {viewMode === "table" ? (
                <div className="overflow-hidden rounded-[18px] border border-[#eadfdd] bg-white/90">
                  <div className="overflow-x-auto">
                      <div className="min-w-[1310px]">
                      <div className="grid grid-cols-[36px_1.3fr_1.45fr_1.25fr_1.05fr_0.78fr_0.9fr_0.98fr_0.76fr] gap-3 border-b border-[#eadfdd] px-3 py-2 text-[10px] font-medium uppercase tracking-[0.18em] text-[#b7adaa]">
                        <span className="flex items-center justify-center">
                          <input type="checkbox" className="h-3.5 w-3.5 rounded border-[#ddd0cd]" />
                        </span>
                        <span>Prospect</span>
                        <span>Title</span>
                        <span>Organization</span>
                        <span>Sender</span>
                        <span>Priority</span>
                        <span>Stage</span>
                        <span>Next step</span>
                        <span className="text-right">Updated</span>
                      </div>

                      {isLoading ? (
                        Array.from({ length: 6 }).map((_, index) => (
                          <div
                            key={index}
                            className="grid grid-cols-[36px_1.3fr_1.45fr_1.25fr_1.05fr_0.78fr_0.9fr_0.98fr_0.76fr] gap-3 border-b border-[#f2ebe9] px-3 py-3"
                          >
                            <div className="flex items-start justify-center pt-3">
                              <div className="h-3.5 w-3.5 rounded border border-[#eadfdd] bg-white/90" />
                            </div>
                            <div className="flex items-center gap-3">
                              <div className="h-9 w-9 rounded-full bg-[#f5eeee]" />
                              <div className="space-y-2">
                                <div className="h-4 w-32 rounded-full bg-[#eadfdd]" />
                                <div className="h-3 w-24 rounded-full bg-[#f5eeee]" />
                              </div>
                            </div>
                            <div className="space-y-2">
                              <div className="h-4 w-40 rounded-full bg-[#eadfdd]" />
                              <div className="h-3 w-24 rounded-full bg-[#f5eeee]" />
                            </div>
                            <div className="space-y-2">
                              <div className="h-4 w-28 rounded-full bg-[#eadfdd]" />
                              <div className="h-3 w-20 rounded-full bg-[#f5eeee]" />
                            </div>
                            <div className="space-y-2">
                              <div className="h-4 w-28 rounded-full bg-[#eadfdd]" />
                              <div className="h-3 w-16 rounded-full bg-[#f5eeee]" />
                            </div>
                            <div className="space-y-2">
                              <div className="h-7 w-20 rounded-md bg-[#f5eeee]" />
                            </div>
                            <div className="space-y-2">
                              <div className="h-4 w-24 rounded-full bg-[#eadfdd]" />
                              <div className="h-3 w-20 rounded-full bg-[#f5eeee]" />
                            </div>
                            <div className="space-y-2">
                              <div className="h-4 w-24 rounded-full bg-[#eadfdd]" />
                              <div className="h-3 w-20 rounded-full bg-[#f5eeee]" />
                            </div>
                            <div className="space-y-2 justify-self-end text-right">
                              <div className="ml-auto h-4 w-16 rounded-full bg-[#eadfdd]" />
                              <div className="ml-auto h-3 w-20 rounded-full bg-[#f5eeee]" />
                            </div>
                          </div>
                        ))
                      ) : filteredItems.length === 0 ? (
                        <div className="px-3 py-12 text-[12px] text-[#8b817e]">
                          No prospects yet. Add one to test the live save flow, then we can switch this over to
                          extension-first capture.
                        </div>
                      ) : (
                        filteredItems.map((item) => (
                          <ProspectRow
                            key={item.id}
                            apiBaseUrl={apiBaseUrl}
                            item={item}
                            onOpenPreview={setPreviewItem}
                            onPriorityUpdated={(updatedItem) =>
                              setItems((current) =>
                                current.map((candidate) =>
                                  candidate.id === updatedItem.id ? updatedItem : candidate
                                )
                              )
                            }
                          />
                        ))
                      )}
                    </div>
                  </div>
                </div>
              ) : viewMode === "grid" ? (
                <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
                  {isLoading ? (
                    Array.from({ length: 8 }).map((_, index) => (
                      <div
                        key={index}
                        className="min-h-[170px] rounded-[18px] border border-[#eadfdd] bg-white/90 p-3"
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex items-center gap-3">
                            <div className="h-10 w-10 rounded-full bg-[#f5eeee]" />
                            <div className="space-y-2">
                              <div className="h-4 w-32 rounded-full bg-[#eadfdd]" />
                              <div className="h-3 w-20 rounded-full bg-[#f5eeee]" />
                            </div>
                          </div>
                          <div className="h-6 w-14 rounded-md bg-[#f5eeee]" />
                        </div>
                        <div className="mt-4 grid grid-cols-2 gap-2">
                          <div className="h-8 rounded-lg bg-[#fbf8f7]" />
                          <div className="h-8 rounded-lg bg-[#fbf8f7]" />
                          <div className="h-8 rounded-lg bg-[#fbf8f7]" />
                          <div className="h-8 rounded-lg bg-[#fbf8f7]" />
                        </div>
                      </div>
                    ))
                  ) : filteredItems.length === 0 ? (
                    <div className="col-span-full px-2 py-12 text-[12px] text-[#8b817e]">
                      No prospects yet. Add one to test the live save flow, then we can switch this over to
                      extension-first capture.
                    </div>
                  ) : (
                    filteredItems.map((item) => (
                      <ProspectListCard
                        key={item.id}
                        apiBaseUrl={apiBaseUrl}
                        item={item}
                        onOpenPreview={setPreviewItem}
                        onPriorityUpdated={(updatedItem) =>
                          setItems((current) =>
                            current.map((candidate) =>
                              candidate.id === updatedItem.id ? updatedItem : candidate
                            )
                          )
                        }
                      />
                    ))
                  )}
                </div>
              ) : (
                <div className="space-y-3">
                  {isLoading ? (
                    Array.from({ length: 5 }).map((_, index) => (
                      <div
                        key={index}
                        className="rounded-[18px] border border-[#eadfdd] bg-white/90 p-4"
                      >
                        <div className="flex items-start justify-between gap-4">
                          <div className="flex items-center gap-3">
                            <div className="h-10 w-10 rounded-full bg-[#f5eeee]" />
                            <div className="space-y-2">
                              <div className="h-4 w-36 rounded-full bg-[#eadfdd]" />
                              <div className="h-3 w-24 rounded-full bg-[#f5eeee]" />
                            </div>
                          </div>
                          <div className="h-7 w-20 rounded-md bg-[#f5eeee]" />
                        </div>
                        <div className="mt-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
                          <div className="h-9 rounded-lg bg-[#fbf8f7]" />
                          <div className="h-9 rounded-lg bg-[#fbf8f7]" />
                          <div className="h-9 rounded-lg bg-[#fbf8f7]" />
                          <div className="h-9 rounded-lg bg-[#fbf8f7]" />
                        </div>
                      </div>
                    ))
                  ) : filteredItems.length === 0 ? (
                    <div className="px-2 py-12 text-[12px] text-[#8b817e]">
                      No prospects yet. Add one to test the live save flow, then we can switch this over to
                      extension-first capture.
                    </div>
                  ) : (
                    filteredItems.map((item) => (
                      <ProspectStackCard
                        key={item.id}
                        apiBaseUrl={apiBaseUrl}
                        item={item}
                        onOpenPreview={setPreviewItem}
                        onPriorityUpdated={(updatedItem) =>
                          setItems((current) =>
                            current.map((candidate) =>
                              candidate.id === updatedItem.id ? updatedItem : candidate
                            )
                          )
                        }
                      />
                    ))
                  )}
                </div>
              )}
            </div>
          </div>
        </section>
      </section>

      <ProspectCreateSheet
        error={error}
        form={form}
        isOpen={isCreateOpen}
        isSaving={isSaving}
        onClose={() => setIsCreateOpen(false)}
        onSubmit={handleSubmit}
        setForm={setForm}
      />

      {previewItem ? (
        <ProspectDetailPanel
          item={previewItem}
          onClose={() => setPreviewItem(null)}
        />
      ) : null}
    </div>
  );
}
