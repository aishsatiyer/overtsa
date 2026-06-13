"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { SenderAccount, SenderAccountListResponse } from "@overtly/shared";
import {
  BadgeCheck,
  Check,
  ExternalLink,
  Link2,
  PencilLine,
  Plus,
  RefreshCcw,
  Save,
  ToggleLeft,
  ToggleRight,
  Trash2
} from "lucide-react";
import { getSettingsThemeClasses } from "./settings-theme";

function getApiBaseUrl() {
  return process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000";
}

type SenderAccountDraft = {
  displayName: string;
  platformProfileUrl: string;
  photoUrl: string;
  notes: string;
  isActive: boolean;
};

const legacySenderNameMap = new Map([
  ["Founder LinkedIn", "Aishwarya LinkedIn"],
  ["Co-founder LinkedIn", "Sidharth LinkedIn"],
  ["Cofounder LinkedIn", "Sidharth LinkedIn"]
]);

function formatSenderDisplayName(value: string) {
  const normalized = value.trim();
  return legacySenderNameMap.get(normalized) || normalized;
}

const emptyDraft: SenderAccountDraft = {
  displayName: "",
  platformProfileUrl: "",
  photoUrl: "",
  notes: "",
  isActive: true
};

function toDraft(account: SenderAccount): SenderAccountDraft {
  return {
    displayName: formatSenderDisplayName(account.displayName),
    platformProfileUrl: account.platformProfileUrl ?? "",
    photoUrl: account.photoUrl ?? "",
    notes: account.notes ?? "",
    isActive: account.isActive
  };
}

function Row({
  label,
  hint,
  children
}: {
  label: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="grid gap-3 border-b border-[#eeeeee] py-5 md:grid-cols-[190px_minmax(0,1fr)] md:gap-10">
      <div className="pt-1">
        <p className="text-[12px] font-medium text-[#171717]">{label}</p>
        {hint ? (
          <p className="mt-1 max-w-[180px] text-[11px] leading-4 text-[#8f8a86]">
            {hint}
          </p>
        ) : null}
      </div>

      <div>{children}</div>
    </div>
  );
}

function FieldShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative flex min-h-11 items-center rounded-[10px] border border-[#dedede] bg-white px-3 shadow-[0_1px_0_rgba(0,0,0,0.02)] transition focus-within:border-[#c987ff] focus-within:ring-4 focus-within:ring-[#eecbff]/40">
      {children}
    </div>
  );
}

export function SenderAccountsSettingsShell() {
  const apiBaseUrl = getApiBaseUrl();
  const [items, setItems] = useState<SenderAccountListResponse["items"]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draft, setDraft] = useState<SenderAccountDraft>(emptyDraft);
  const photoInputRef = useRef<HTMLInputElement | null>(null);

  const isEditing = useMemo(() => editingId !== null, [editingId]);
  const activeCount = useMemo(() => items.filter((item) => item.isActive).length, [items]);
  const primaryAccount = items[0] ?? null;

  async function loadItems() {
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch(`${apiBaseUrl}/v1/sender-accounts`, {
        cache: "no-store"
      });

      if (!response.ok) {
        throw new Error("Could not load sender accounts.");
      }

      const data = (await response.json()) as SenderAccountListResponse;
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

  function startEdit(account: SenderAccount) {
    setEditingId(account.id);
    setDraft(toDraft(account));
    setError(null);
  }

  function resetForm() {
    setEditingId(null);
    setDraft(emptyDraft);
    setError(null);
  }

  async function saveSenderAccount() {
    setIsSaving(true);
    setError(null);

    try {
      const payload = {
        displayName: draft.displayName.trim(),
        platform: "linkedin",
        platformProfileUrl: draft.platformProfileUrl.trim() || null,
        photoUrl: draft.photoUrl.trim() || null,
        isActive: draft.isActive,
        notes: draft.notes.trim() || null
      };

      const response = await fetch(
        editingId
          ? `${apiBaseUrl}/v1/sender-accounts/${editingId}`
          : `${apiBaseUrl}/v1/sender-accounts`,
        {
          method: editingId ? "PATCH" : "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload)
        }
      );

      if (!response.ok) {
        throw new Error("Could not save sender account.");
      }

      await loadItems();
      resetForm();
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "Could not save sender account.");
    } finally {
      setIsSaving(false);
    }
  }

  async function toggleActive(account: SenderAccount) {
    setError(null);

    try {
      const response = await fetch(`${apiBaseUrl}/v1/sender-accounts/${account.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          displayName: account.displayName,
          platform: account.platform,
          platformProfileUrl: account.platformProfileUrl,
          photoUrl: account.photoUrl,
          isActive: !account.isActive,
          notes: account.notes
        })
      });

      if (!response.ok) {
        throw new Error("Could not update sender account status.");
      }

      await loadItems();
    } catch (updateError) {
      setError(
        updateError instanceof Error
          ? updateError.message
          : "Could not update sender account status."
      );
    }
  }

  function openPhotoPicker() {
    photoInputRef.current?.click();
  }

  function handlePhotoFileChange(file: File | null | undefined) {
    if (!file) {
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      const result = typeof reader.result === "string" ? reader.result : "";
      setDraft((current) => ({ ...current, photoUrl: result }));
    };
    reader.readAsDataURL(file);
  }

  return (
    <section className={`mx-auto max-w-6xl ${getSettingsThemeClasses()}`}>
      <div className="mb-5">
        <p className="text-[11px] font-medium uppercase tracking-[0.18em] text-[#9b9692]">
          Settings / Sender Accounts
        </p>
        <h2 className="mt-2 text-[22px] font-semibold tracking-[-0.03em] text-[#171717]">
          Sender accounts
        </h2>
        <p className="mt-2 max-w-2xl text-[13px] leading-6 text-[#7c7773]">
          Manage the LinkedIn identities used for outreach logging and follow-up workflows.
        </p>
      </div>

      <div className="overflow-hidden rounded-[22px] border border-[#eeeeee] bg-white shadow-[0_18px_60px_rgba(17,17,17,0.045)]">
        <div className="flex min-h-[132px] items-start justify-between bg-[#f7f7f7] px-5 py-4">
          <div className="flex items-start gap-3">
            <div className="relative h-[86px] w-[86px] overflow-hidden rounded-[16px] border border-white/70 bg-[linear-gradient(135deg,#8b42ff_0%,#d94ee6_48%,#ffb65c_100%)] shadow-sm">
              {draft.photoUrl ? (
                <img
                  src={draft.photoUrl}
                  alt="Sender preview"
                  className="h-full w-full object-cover"
                />
              ) : null}
            </div>

            <div className="pt-1">
              <p className="text-[11px] font-medium uppercase tracking-[0.14em] text-[#9b9692]">
                Account photo
              </p>
              <p className="mt-1 max-w-[220px] text-[12px] leading-5 text-[#7c7773]">
                Upload a photo so each sender has a recognizable face in settings and invite logs.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => {
              openPhotoPicker();
            }}
            className="inline-flex h-8 items-center gap-2 rounded-[8px] border border-[#dedede] bg-white px-3 text-[11px] font-medium text-[#292929] shadow-sm transition hover:bg-[#fafafa]"
          >
            <Plus className="h-3.5 w-3.5" />
            Upload image
          </button>

          <input
            ref={photoInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(event) => {
              handlePhotoFileChange(event.target.files?.[0]);
              event.currentTarget.value = "";
            }}
          />
        </div>

        <form
          className="px-5 pb-5"
          onSubmit={(event) => {
            event.preventDefault();
            void saveSenderAccount();
          }}
        >
          <Row label="Display name" hint="Name shown inside Overtly.">
            <FieldShell>
              <input
                className="h-10 w-full bg-transparent text-[12px] font-medium text-[#171717] outline-none placeholder:text-[#aaa5a0]"
                value={draft.displayName}
                onChange={(event) =>
                  setDraft((current) => ({ ...current, displayName: event.target.value }))
                }
                placeholder="Sidharth LinkedIn"
              />
            </FieldShell>
          </Row>

          <Row label="LinkedIn profile" hint="The sender profile URL.">
            <FieldShell>
              <div className="mr-3 flex h-full items-center border-r border-[#eeeeee] pr-3 text-[12px] text-[#8f8a86]">
                linkedin.com/in/
              </div>

              <input
                className="h-10 min-w-0 flex-1 bg-transparent text-[12px] font-medium text-[#171717] outline-none placeholder:text-[#aaa5a0]"
                value={draft.platformProfileUrl}
                onChange={(event) =>
                  setDraft((current) => ({ ...current, platformProfileUrl: event.target.value }))
                }
                placeholder="profile-url"
              />

              {draft.platformProfileUrl ? (
                <span className="ml-3 grid h-4 w-4 place-items-center rounded-full bg-[#16a05d] text-white">
                  <Check className="h-2.5 w-2.5" />
                </span>
              ) : null}
            </FieldShell>
          </Row>

          <Row label="Account photo" hint="Visual identity for the sender.">
            <div className="flex flex-wrap items-center gap-3">
              <div className="relative h-[86px] w-[86px] overflow-hidden rounded-[16px] border border-[#eeeeee] bg-[linear-gradient(135deg,#8b42ff_0%,#d94ee6_48%,#ffb65c_100%)] shadow-sm">
                {draft.photoUrl ? (
                  <img
                    src={draft.photoUrl}
                    alt="Sender preview"
                    className="h-full w-full object-cover"
                  />
                ) : null}
              </div>

              <button
                type="button"
                onClick={openPhotoPicker}
                className="inline-flex h-8 items-center gap-2 rounded-[8px] border border-[#dedede] bg-white px-3 text-[11px] font-medium text-[#292929] shadow-sm transition hover:bg-[#fafafa]"
              >
                <Plus className="h-3.5 w-3.5" />
                Upload new image
              </button>

              <button
                type="button"
                onClick={() => setDraft((current) => ({ ...current, photoUrl: "" }))}
                className="inline-flex h-8 items-center gap-2 rounded-[8px] border border-[#dedede] bg-[#fafafa] px-3 text-[11px] font-medium text-[#7c7773] transition hover:bg-white"
              >
                <Trash2 className="h-3.5 w-3.5" />
                Delete current image
              </button>
            </div>
          </Row>

          <Row label="Notes" hint="Internal sender context.">
            <div className="rounded-[10px] border border-[#dedede] bg-white shadow-[0_1px_0_rgba(0,0,0,0.02)] transition focus-within:border-[#c987ff] focus-within:ring-4 focus-within:ring-[#eecbff]/40">
              <textarea
                className="min-h-[112px] w-full resize-none rounded-[10px] bg-transparent px-3 py-3 text-[12px] leading-5 text-[#171717] outline-none placeholder:text-[#aaa5a0]"
                value={draft.notes}
                onChange={(event) =>
                  setDraft((current) => ({ ...current, notes: event.target.value }))
                }
                placeholder="Used for founder-led outreach, agency prospects, warm follow-ups..."
              />

              <div className="flex items-center justify-end gap-1 border-t border-[#f1f1f1] px-3 py-2 text-[#5f5956]">
                <button
                  type="button"
                  className="rounded p-1 text-[11px] font-semibold hover:bg-[#f6f6f6]"
                >
                  B
                </button>
                <button
                  type="button"
                  className="rounded p-1 text-[11px] italic hover:bg-[#f6f6f6]"
                >
                  I
                </button>
                <button
                  type="button"
                  className="rounded p-1 text-[11px] underline hover:bg-[#f6f6f6]"
                >
                  U
                </button>
              </div>
            </div>
          </Row>

          <Row label="Status" hint="Whether this sender can be used.">
            <button
              type="button"
              onClick={() => setDraft((current) => ({ ...current, isActive: !current.isActive }))}
              className={[
                "inline-flex h-9 items-center gap-2 rounded-[9px] border px-3 text-[12px] font-medium transition",
                draft.isActive
                  ? "border-[#cfe9dc] bg-[#f5fff8] text-[#167348]"
                  : "border-[#e5e5e5] bg-[#fafafa] text-[#7c7773]"
              ].join(" ")}
            >
              {draft.isActive ? (
                <ToggleRight className="h-4 w-4" />
              ) : (
                <ToggleLeft className="h-4 w-4" />
              )}
              {draft.isActive ? "Active sender" : "Inactive sender"}
            </button>
          </Row>

          <Row label="Current summary" hint="Live sender account state.">
            <div className="grid gap-3 sm:grid-cols-3">
              <div className="rounded-[14px] border border-[#eeeeee] bg-[#fafafa] p-3">
                <p className="text-[10px] font-medium uppercase tracking-[0.14em] text-[#9b9692]">
                  Primary
                </p>
                <p className="mt-2 truncate text-[13px] font-semibold text-[#171717]">
                  {primaryAccount ? formatSenderDisplayName(primaryAccount.displayName) : "No sender yet"}
                </p>
              </div>

              <div className="rounded-[14px] border border-[#eeeeee] bg-[#fafafa] p-3">
                <p className="text-[10px] font-medium uppercase tracking-[0.14em] text-[#9b9692]">
                  Total
                </p>
                <p className="mt-2 text-[18px] font-semibold text-[#171717]">{items.length}</p>
              </div>

              <div className="rounded-[14px] border border-[#eeeeee] bg-[#fafafa] p-3">
                <p className="text-[10px] font-medium uppercase tracking-[0.14em] text-[#9b9692]">
                  Active
                </p>
                <p className="mt-2 text-[18px] font-semibold text-[#171717]">{activeCount}</p>
              </div>
            </div>
          </Row>

          <div className="flex flex-wrap items-center justify-between gap-3 pt-5">
            <div>
              {error ? (
                <p className="text-[12px] leading-5 text-rose-600">{error}</p>
              ) : (
                <p className="text-[11px] text-[#8f8a86]">
                  {isEditing ? "Editing an existing sender account." : "Create a new sender account."}
                </p>
              )}
            </div>

            <div className="flex flex-wrap items-center gap-2">
              {isEditing ? (
                <button
                  type="button"
                  onClick={resetForm}
                  className="inline-flex h-9 items-center gap-2 rounded-[9px] border border-[#dedede] bg-white px-3 text-[12px] font-medium text-[#5f5956] transition hover:bg-[#fafafa]"
                >
                  <RefreshCcw className="h-3.5 w-3.5" />
                  Reset
                </button>
              ) : null}

              <button
                type="submit"
                disabled={isSaving}
                className="inline-flex h-9 items-center gap-2 rounded-[9px] bg-[#171717] px-4 text-[12px] font-medium text-white transition hover:bg-black disabled:cursor-progress disabled:opacity-60"
              >
                <Save className="h-3.5 w-3.5" />
                {isEditing ? "Update account" : "Create account"}
              </button>
            </div>
          </div>
        </form>
      </div>

      <div className="mt-5 overflow-hidden rounded-[22px] border border-[#eeeeee] bg-white shadow-[0_18px_60px_rgba(17,17,17,0.045)]">
        <div className="flex items-start justify-between gap-4 border-b border-[#eeeeee] px-5 py-5">
          <div>
            <p className="text-[13px] font-semibold tracking-[-0.01em] text-[#171717]">
              Connected sender accounts
            </p>
            <p className="mt-1 text-[12px] leading-5 text-[#8a8580]">
              Choose which LinkedIn identities can be used for outreach logging.
            </p>
          </div>

          <button
            type="button"
            onClick={resetForm}
            className="inline-flex h-8 items-center gap-2 rounded-full border border-[#e8e2de] bg-[#fbfaf9] px-3 text-[11px] font-medium text-[#5f5956] transition hover:bg-white"
          >
            <Plus className="h-3.5 w-3.5" />
            Add
          </button>
        </div>

        {isLoading ? (
          <div className="px-5 py-10 text-[12px] text-[#7c7773]">
            Loading sender accounts...
          </div>
        ) : items.length === 0 ? (
          <div className="px-5 py-10 text-[12px] text-[#7c7773]">
            No sender accounts yet.
          </div>
        ) : (
          <div className="grid gap-3 bg-[#fbfaf9] p-3">
            {items.map((account, index) => {
              const isPrimary = index === 0;

              return (
                <article
                  key={account.id}
                  className="group rounded-[18px] border border-[#eeeeee] bg-white px-4 py-4 shadow-[0_8px_28px_rgba(17,17,17,0.025)] transition hover:border-[#e2d8d2] hover:shadow-[0_14px_40px_rgba(17,17,17,0.055)]"
                >
                  <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                    <div className="flex min-w-0 items-start gap-3">
                        <div className="relative">
                        <div className="grid h-12 w-12 shrink-0 place-items-center overflow-hidden rounded-[15px] bg-[linear-gradient(135deg,#8b42ff_0%,#d94ee6_48%,#ffb65c_100%)] text-white shadow-sm">
                          {account.photoUrl ? (
                            <img
                              src={account.photoUrl}
                              alt={formatSenderDisplayName(account.displayName)}
                              className="h-full w-full object-cover"
                            />
                          ) : (
                            <BadgeCheck className="h-4 w-4" />
                          )}
                        </div>

                        <span
                          className={[
                            "absolute -bottom-0.5 -right-0.5 h-3.5 w-3.5 rounded-full border-2 border-white",
                            account.isActive ? "bg-[#16a05d]" : "bg-[#b8b2ad]"
                          ].join(" ")}
                        />
                      </div>

                      <div className="min-w-0 pt-0.5">
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="truncate text-[14px] font-semibold tracking-[-0.01em] text-[#171717]">
                            {formatSenderDisplayName(account.displayName)}
                          </p>

                          {isPrimary ? (
                            <span className="rounded-full border border-[#efe4dc] bg-[#fff8f3] px-2 py-0.5 text-[10px] font-medium text-[#9b6752]">
                              Primary
                            </span>
                          ) : null}
                        </div>

                        <p className="mt-1 text-[11px] font-medium uppercase tracking-[0.13em] text-[#aaa29d]">
                          LinkedIn sender account
                        </p>

                        {account.platformProfileUrl ? (
                          <a
                            href={account.platformProfileUrl}
                            target="_blank"
                            rel="noreferrer"
                            className="mt-1.5 inline-flex max-w-full items-center gap-1 truncate text-[12px] text-[#6f6966] underline decoration-[#ded6d1] underline-offset-4 hover:text-[#171717]"
                          >
                            <span className="truncate">{account.platformProfileUrl}</span>
                            <ExternalLink className="h-3 w-3 shrink-0" />
                          </a>
                        ) : (
                          <p className="mt-1.5 text-[12px] text-[#8f8a86]">
                            Profile URL not connected
                          </p>
                        )}

                        {account.notes ? (
                          <p className="mt-2 line-clamp-1 max-w-xl text-[12px] leading-5 text-[#8f8a86]">
                            {account.notes}
                          </p>
                        ) : null}
                      </div>
                    </div>

                    <div className="flex items-center gap-3 sm:pl-4">
                      <button
                        type="button"
                        onClick={() => void toggleActive(account)}
                        aria-pressed={account.isActive}
                        aria-label={
                          account.isActive
                            ? `Deactivate ${formatSenderDisplayName(account.displayName)}`
                            : `Activate ${formatSenderDisplayName(account.displayName)}`
                        }
                        className={[
                          "relative h-7 w-12 rounded-full border transition",
                          account.isActive
                            ? "border-[#bfe7d0] bg-[#ecfff4]"
                            : "border-[#e3dedb] bg-[#f3f1ef]"
                        ].join(" ")}
                      >
                        <span
                          className={[
                            "absolute top-1 h-5 w-5 rounded-full bg-white shadow-[0_2px_8px_rgba(17,17,17,0.16)] transition",
                            account.isActive ? "left-6" : "left-1"
                          ].join(" ")}
                        />
                      </button>

                      <span
                        className={[
                          "min-w-[54px] text-[12px] font-medium",
                          account.isActive ? "text-[#167348]" : "text-[#8f8a86]"
                        ].join(" ")}
                      >
                        {account.isActive ? "Active" : "Off"}
                      </span>

                      <button
                        type="button"
                        onClick={() => startEdit(account)}
                        className="grid h-8 w-8 place-items-center rounded-full border border-transparent text-[#7c7773] transition hover:border-[#e8e2de] hover:bg-[#fbfaf9] hover:text-[#171717]"
                        aria-label={`Edit ${formatSenderDisplayName(account.displayName)}`}
                      >
                        <PencilLine className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </div>

      <div className="mt-4 flex items-center gap-2 text-[11px] uppercase tracking-[0.18em] text-[#9b9692]">
        <Link2 className="h-3.5 w-3.5" />
        Sender accounts settings
      </div>
    </section>
  );
}
