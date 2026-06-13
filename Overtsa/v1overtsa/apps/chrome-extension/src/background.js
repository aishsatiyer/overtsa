const API_BASE_URL = "http://localhost:4000";

const storageKeys = {
  senderAccountId: "overtly_sender_account_id",
  inviteTemplateId: "overtly_invite_template_id",
  inviteNoteText: "overtly_invite_note_text",
  lastAutoInviteSignature: "overtly_last_auto_invite_signature",
  lastAutoInviteAt: "overtly_last_auto_invite_at"
};

async function readInviteContext() {
  const stored = await chrome.storage.local.get([
    storageKeys.senderAccountId,
    storageKeys.inviteTemplateId,
    storageKeys.inviteNoteText,
    storageKeys.lastAutoInviteSignature,
    storageKeys.lastAutoInviteAt
  ]);

  return {
    senderAccountId: stored[storageKeys.senderAccountId] || "",
    inviteTemplateId: stored[storageKeys.inviteTemplateId] || "",
    inviteNoteText: stored[storageKeys.inviteNoteText] || "",
    lastAutoInviteSignature: stored[storageKeys.lastAutoInviteSignature] || "",
    lastAutoInviteAt: stored[storageKeys.lastAutoInviteAt] || ""
  };
}

async function saveAutoInviteMarker(signature) {
  await chrome.storage.local.set({
    [storageKeys.lastAutoInviteSignature]: signature,
    [storageKeys.lastAutoInviteAt]: new Date().toISOString()
  });
}

function normalizeText(value) {
  return typeof value === "string" ? value.trim().replace(/\s+/g, " ") : "";
}

async function readJson(response) {
  const contentType = response.headers.get("content-type") || "";

  if (!contentType.includes("application/json")) {
    return null;
  }

  try {
    return await response.json();
  } catch (_error) {
    return null;
  }
}

async function fetchSenderAccounts() {
  const response = await fetch(`${API_BASE_URL}/v1/sender-accounts`);

  if (!response.ok) {
    const body = await readJson(response);
    throw new Error(body?.message || "Could not load sender accounts.");
  }

  const body = await readJson(response);
  return Array.isArray(body?.items) ? body.items : [];
}

async function fetchProspectByUrl(linkedinProfileUrl) {
  const response = await fetch(
    `${API_BASE_URL}/v1/prospects/by-url?linkedinProfileUrl=${encodeURIComponent(linkedinProfileUrl)}`
  );

  if (response.status === 404) {
    return null;
  }

  if (!response.ok) {
    const body = await readJson(response);
    throw new Error(body?.message || "Could not look up CRM prospect.");
  }

  const body = await readJson(response);
  return body?.item ?? null;
}

async function resolveSenderAccountId(storedSenderAccountId) {
  const senderAccountId = normalizeText(storedSenderAccountId);

  if (senderAccountId) {
    return senderAccountId;
  }

  const senderAccounts = await fetchSenderAccounts();
  const activeSenderAccounts = senderAccounts.filter((account) => account?.isActive);

  if (activeSenderAccounts.length === 1) {
    const resolvedSenderAccountId = activeSenderAccounts[0].id;
    await chrome.storage.local.set({
      [storageKeys.senderAccountId]: resolvedSenderAccountId
    });
    return resolvedSenderAccountId;
  }

  return "";
}

function broadcastMessage(message) {
  try {
    chrome.runtime.sendMessage(message, () => {
      void chrome.runtime.lastError;
    });
  } catch (_error) {
    // Best effort only.
  }
}

async function logInviteAttempt({
  prospectId,
  senderAccountId,
  inviteTemplateId,
  inviteNoteText
}) {
  const response = await fetch(`${API_BASE_URL}/v1/prospects/${prospectId}/invites`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      senderAccountId,
      inviteTemplateId: inviteTemplateId || null,
      sentAt: new Date().toISOString(),
      inviteNoteText: inviteNoteText || null,
      notes: "Auto-logged from LinkedIn confirmation."
    })
  });

  const body = await readJson(response);

  if (!response.ok) {
    throw new Error(body?.message || "Could not auto-log invite.");
  }

  return body;
}

function buildSignature({ profileUrl, senderAccountId, inviteTemplateId, inviteNoteText }) {
  return [
    profileUrl || "",
    senderAccountId || "",
    inviteTemplateId || "",
    normalizeText(inviteNoteText)
  ].join("|");
}

async function handleLinkedInInviteSent(context) {
  const profile = context?.profile;
  const linkedinProfileUrl = normalizeText(profile?.linkedinProfileUrl || context?.url || "");

  if (!linkedinProfileUrl) {
    return;
  }

  const inviteContext = await readInviteContext();
  const senderAccountId = await resolveSenderAccountId(inviteContext.senderAccountId);
  const inviteTemplateId = normalizeText(inviteContext.inviteTemplateId);
  const inviteNoteText = normalizeText(context?.inviteNoteText || inviteContext.inviteNoteText || "");
  const signature = buildSignature({
    profileUrl: linkedinProfileUrl,
    senderAccountId,
    inviteTemplateId,
    inviteNoteText
  });

  const lastAutoInviteAt = inviteContext.lastAutoInviteAt
    ? new Date(inviteContext.lastAutoInviteAt).getTime()
    : 0;
  const isRecentDuplicate =
    inviteContext.lastAutoInviteSignature === signature &&
    lastAutoInviteAt > 0 &&
    Date.now() - lastAutoInviteAt < 10000;

  if (isRecentDuplicate) {
    return;
  }

  if (!senderAccountId) {
    broadcastMessage({
      type: "AUTO_INVITE_LOG_FAILED",
      reason: "No sender account selected yet."
    });
    return;
  }

  let prospect = null;

  try {
    prospect = await fetchProspectByUrl(linkedinProfileUrl);
  } catch (error) {
    broadcastMessage({
      type: "AUTO_INVITE_LOG_FAILED",
      reason: error instanceof Error ? error.message : "Could not look up CRM prospect."
    });
    return;
  }

  if (!prospect?.id) {
    broadcastMessage({
      type: "AUTO_INVITE_LOG_FAILED",
      reason: "Prospect is not in CRM yet. Save the prospect first, then invite logging can auto-run."
    });
    return;
  }

  try {
    const result = await logInviteAttempt({
      prospectId: prospect.id,
      senderAccountId,
      inviteTemplateId,
      inviteNoteText
    });

    await saveAutoInviteMarker(signature);

    broadcastMessage({
      type: "AUTO_INVITE_LOGGED",
      prospect: result?.prospect ?? prospect,
      outreachAttempt: result?.outreachAttempt ?? null
    });
  } catch (error) {
    broadcastMessage({
      type: "AUTO_INVITE_LOG_FAILED",
      reason: error instanceof Error ? error.message : "Could not auto-log invite."
    });
  }
}

chrome.runtime.onInstalled.addListener(() => {
  console.log("Overtly GTM Helper installed");
});

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message?.type === "PING") {
    sendResponse({ ok: true });
    return;
  }

  if (message?.type === "LINKEDIN_INVITE_SENT") {
    void handleLinkedInInviteSent(message.context);
    sendResponse({ ok: true });
    return true;
  }
});
