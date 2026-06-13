const API_BASE_URL = "http://localhost:4000";

const form = document.getElementById("prospect-form");
const organizationForm = document.getElementById("organization-form");
const feedback = document.getElementById("feedback");
const refreshButton = document.getElementById("refresh-btn");
const saveButton = document.getElementById("save-btn");
const orgRefreshButton = document.getElementById("org-refresh-btn");
const saveOrgButton = document.getElementById("save-org-btn");
const pageStatus = document.getElementById("page-status");
const contextPageType = document.getElementById("context-page-type");
const contextUrl = document.getElementById("context-url");
const photoPreview = document.getElementById("photo-preview");
const previewName = document.getElementById("preview-name");
const previewTitle = document.getElementById("preview-title");
const previewOrg = document.getElementById("preview-org");
const previewLocation = document.getElementById("preview-location");
const previewLines = document.getElementById("preview-lines");
const existingProspectStatus = document.getElementById("existing-prospect-status");
const existingProspectLink = document.getElementById("existing-prospect-link");
const inviteActionState = document.getElementById("invite-action-state");
const currentSenderName = document.getElementById("current-sender-name");
const logInviteButton = document.getElementById("log-invite-btn");
const senderAccountSelect = document.getElementById("senderAccountId");
const inviteTemplateSelect = document.getElementById("inviteTemplateId");
const inviteNoteText = document.getElementById("inviteNoteText");
const peopleModeButton = document.getElementById("people-mode-btn");
const orgModeButton = document.getElementById("org-mode-btn");
const orgPreviewPhoto = document.getElementById("org-photo-preview");
const orgPreviewName = document.getElementById("org-preview-name");
const orgPreviewTitle = document.getElementById("org-preview-title");
const orgPreviewWebsite = document.getElementById("org-preview-website");
const orgPreviewLocation = document.getElementById("org-preview-location");
const peopleLocationSummary = document.getElementById("people-location-summary");
const peopleRegionSummary = document.getElementById("people-region-summary");
const orgLocationSummary = document.getElementById("org-location-summary");
const orgRegionSummary = document.getElementById("org-region-summary");
const modePanels = Array.from(document.querySelectorAll("[data-mode-panel]"));
const peopleLocationLibrary = document.getElementById("people-location-library");
const orgLocationLibrary = document.getElementById("org-location-library");
let currentProfile = null;
let currentProspect = null;
let senderAccounts = [];
let inviteTemplates = [];
let currentMode = "people";

const legacySenderNameMap = new Map([
  ["Founder LinkedIn", "Aishwarya LinkedIn"],
  ["Co-founder LinkedIn", "Sidharth LinkedIn"],
  ["Cofounder LinkedIn", "Sidharth LinkedIn"]
]);

const fieldIds = [
  "fullName",
  "linkedinProfileUrl",
  "organizationName",
  "organizationType",
  "title",
  "segment",
  "locationText",
  "region",
  "notes"
];

const locationLibrary = [
  { location: "London, United Kingdom", region: "Europe" },
  { location: "New York, United States", region: "North America" },
  { location: "San Francisco, United States", region: "North America" },
  { location: "Dubai, United Arab Emirates", region: "Middle East" },
  { location: "Singapore", region: "APAC" },
  { location: "Toronto, Canada", region: "North America" },
  { location: "Sydney, Australia", region: "APAC" },
  { location: "Bengaluru, India", region: "APAC" },
  { location: "Remote / Global", region: "Global" }
];

const storageKeys = {
  senderAccountId: "overtly_sender_account_id",
  inviteTemplateId: "overtly_invite_template_id",
  inviteNoteText: "overtly_invite_note_text",
  popupMode: "overtly_popup_mode"
};

function getDomainHost(value) {
  const normalized = normalizeValue(value);

  if (!normalized) {
    return "";
  }

  try {
    const url = normalized.startsWith("http")
      ? new URL(normalized)
      : new URL(`https://${normalized}`);
    return url.hostname.replace(/^www\./i, "").toLowerCase();
  } catch (_error) {
    return normalized
      .replace(/^https?:\/\//i, "")
      .replace(/^www\./i, "")
      .split("/")[0]
      .toLowerCase();
  }
}

function isLinkedInHost(value) {
  return /(^|\.)linkedin\.com$/i.test(normalizeValue(value));
}

function getOrganizationLogoCandidates(profile) {
  const directLogo = normalizeValue(profile.logoUrl || profile.photoUrl);
  const domain = getDomainHost(profile.domain || profile.websiteUrl);
  const candidates = [];

  if (directLogo && !isLinkedInHost(getDomainHost(directLogo))) {
    candidates.push(directLogo);
  }

  if (domain && !isLinkedInHost(domain)) {
    candidates.push(`https://logo.clearbit.com/${domain}?size=128`);
    candidates.push(`https://www.google.com/s2/favicons?domain=${domain}&sz=128`);
  }

  return [...new Set(candidates)];
}

function resetPreviewImage(element, fallbackToBrand = true) {
  if (!element) {
    return;
  }

  element.textContent = "";
  element.classList.add("empty");

  if (fallbackToBrand) {
    element.classList.add("logo-fallback");
    element.style.backgroundImage = 'url("icons/128.png")';
    element.style.backgroundSize = "contain";
    element.style.backgroundRepeat = "no-repeat";
    element.style.backgroundPosition = "center";
    return;
  }

  element.classList.remove("logo-fallback");
  element.style.backgroundImage = "none";
}

function applyPreviewImage(element, imageUrl) {
  if (!element || !imageUrl) {
    return;
  }

  element.textContent = "";
  element.classList.remove("empty");
  element.classList.remove("logo-fallback");
  element.style.backgroundImage = `url("${imageUrl}")`;
  element.style.backgroundSize = "cover";
  element.style.backgroundRepeat = "no-repeat";
  element.style.backgroundPosition = "center";
}

function loadFirstWorkingImage(element, candidates, fallbackToBrand = true) {
  const queue = Array.isArray(candidates) ? candidates.filter(Boolean) : [];

  if (!queue.length) {
    resetPreviewImage(element, fallbackToBrand);
    return;
  }

  const tryNext = (index) => {
    if (index >= queue.length) {
      resetPreviewImage(element, fallbackToBrand);
      return;
    }

    const img = new Image();
    img.onload = () => applyPreviewImage(element, queue[index]);
    img.onerror = () => tryNext(index + 1);
    img.src = queue[index];
  };

  tryNext(0);
}

function setFeedback(message, tone = "muted") {
  feedback.textContent = message;
  feedback.className = `feedback ${tone}`;
}

function playSuccessTone() {
  try {
    const AudioContextClass = window.AudioContext || window.webkitAudioContext;

    if (!AudioContextClass) {
      return;
    }

    const audioContext = new AudioContextClass();
    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();

    oscillator.type = "sine";
    oscillator.frequency.setValueAtTime(784, audioContext.currentTime);
    oscillator.frequency.exponentialRampToValueAtTime(988, audioContext.currentTime + 0.08);

    gainNode.gain.setValueAtTime(0.0001, audioContext.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.03, audioContext.currentTime + 0.02);
    gainNode.gain.exponentialRampToValueAtTime(0.0001, audioContext.currentTime + 0.16);

    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);
    oscillator.start();
    oscillator.stop(audioContext.currentTime + 0.18);

    oscillator.onended = () => {
      audioContext.close().catch(() => {});
    };
  } catch (_error) {
    // Best effort only.
  }
}

function updateStatus(pageType, isReady) {
  contextPageType.textContent = pageType;
  pageStatus.textContent = isReady ? "Page ready" : "Not on supported page";
  pageStatus.className = `status-badge ${isReady ? "ready" : "blocked"}`;
  document.body.setAttribute("data-linkedin-page-type", String(pageType || "unknown").toLowerCase());
}

function updateCrmMatch(prospect) {
  currentProspect = prospect || null;

  if (!existingProspectStatus || !existingProspectLink || !inviteActionState || !logInviteButton) {
    return;
  }

  if (!prospect) {
    existingProspectStatus.textContent = "Not in CRM yet";
    existingProspectLink.textContent = "Open dashboard after saving";
    existingProspectLink.href = "http://localhost:3002/linkedin-crm";
    inviteActionState.textContent = "Save prospect first";
    logInviteButton.disabled = true;
    return;
  }

  existingProspectStatus.textContent = "Found in CRM";
  existingProspectLink.textContent = `${prospect.fullName} in CRM`;
  existingProspectLink.href = `http://localhost:3002/linkedin-crm/${prospect.id}`;
  inviteActionState.textContent = "Auto-log armed";
  logInviteButton.disabled = false;

  if (senderAccountSelect && prospect.senderAccountId) {
    senderAccountSelect.value = prospect.senderAccountId;
  }

  if (inviteTemplateSelect && prospect.inviteTemplateId) {
    inviteTemplateSelect.value = prospect.inviteTemplateId;
  }

  if (inviteTemplateSelect && inviteNoteText && normalizeValue(inviteTemplateSelect.value)) {
    const selectedTemplate = inviteTemplates.find(
      (template) => template.id === inviteTemplateSelect.value
    );

    if (selectedTemplate && !normalizeValue(inviteNoteText.value)) {
      inviteNoteText.value = selectedTemplate.templateText || "";
    }
  }

  updateCurrentSenderSummary();

  void saveInviteContextContext({
    senderAccountId: senderAccountSelect?.value || "",
    inviteTemplateId: inviteTemplateSelect?.value || "",
    inviteNoteText: normalizeValue(inviteNoteText?.value) || "",
    popupMode: currentMode
  });
}

function updateCurrentSenderSummary() {
  if (!currentSenderName || !senderAccountSelect) {
    return;
  }

  const selectedSender = senderAccounts.find((account) => account.id === senderAccountSelect.value);
  currentSenderName.textContent = formatSenderDisplayName(selectedSender?.displayName) || "Not set";
}

function getFieldMap() {
  return Object.fromEntries(
    fieldIds.map((id) => [id, document.getElementById(id)])
  );
}

function getOrgFieldMap() {
  return {
    name: document.getElementById("orgName"),
    organizationType: document.getElementById("orgType"),
    domain: document.getElementById("orgDomain"),
    logoUrl: document.getElementById("orgLogoUrl"),
    employeeCountText: document.getElementById("orgEmployeeCountText"),
    linkedinCompanyUrl: document.getElementById("orgLinkedinCompanyUrl"),
    locationText: document.getElementById("orgLocationText"),
    region: document.getElementById("orgRegion"),
    notes: document.getElementById("orgNotes")
  };
}

function setLocationSummary(target, locationText, regionText) {
  const locationLabel = normalizeValue(locationText) || "-";
  const regionLabel = normalizeValue(regionText) || "-";

  if (target === "org") {
    if (orgLocationSummary) {
      orgLocationSummary.textContent = locationLabel;
    }

    if (orgRegionSummary) {
      orgRegionSummary.textContent = regionLabel;
    }

    return;
  }

  if (peopleLocationSummary) {
    peopleLocationSummary.textContent = locationLabel;
  }

  if (peopleRegionSummary) {
    peopleRegionSummary.textContent = regionLabel;
  }
}

function applyLocationSuggestion(target, suggestion) {
  const fields = target === "org" ? getOrgFieldMap() : getFieldMap();
  const container = target === "org" ? orgLocationLibrary : peopleLocationLibrary;

  if (fields.locationText) {
    fields.locationText.value = suggestion.location;
  }

  if (fields.region) {
    fields.region.value = suggestion.region;
  }

  if (container) {
    container.value = suggestion.location;
  }

  setLocationSummary(target, suggestion.location, suggestion.region);
}

function syncLocationLibrarySelection(target, locationText) {
  const container = target === "org" ? orgLocationLibrary : peopleLocationLibrary;
  const normalizedLocation = normalizeValue(locationText);

  if (!container) {
    return;
  }

  const matchedSuggestion = locationLibrary.find(
    (suggestion) => suggestion.location === normalizedLocation
  );

  container.value = matchedSuggestion ? matchedSuggestion.location : "";
}

function renderLocationLibrary(container, target) {
  if (!container) {
    return;
  }

  container.innerHTML = "";
  container.append(new Option("Choose a location", ""));
  locationLibrary.forEach((suggestion) => {
    const option = new Option(`${suggestion.location} - ${suggestion.region}`, suggestion.location);
    option.dataset.region = suggestion.region;
    container.append(option);
  });

  container.addEventListener("change", () => {
    const selected = locationLibrary.find((suggestion) => suggestion.location === container.value);
    if (selected) {
      applyLocationSuggestion(target, selected);
    } else {
      const fields = target === "org" ? getOrgFieldMap() : getFieldMap();

      if (fields.locationText) {
        fields.locationText.value = "";
      }

      if (fields.region) {
        fields.region.value = "";
      }

      setLocationSummary(target, "", "");
    }
  });
}

async function getStoredContext() {
  const stored = await chrome.storage.local.get([
    storageKeys.senderAccountId,
    storageKeys.inviteTemplateId,
    storageKeys.inviteNoteText,
    storageKeys.popupMode
  ]);

  return {
    senderAccountId: stored[storageKeys.senderAccountId] || "",
    inviteTemplateId: stored[storageKeys.inviteTemplateId] || "",
    inviteNoteText: stored[storageKeys.inviteNoteText] || "",
    popupMode: stored[storageKeys.popupMode] === "org" ? "org" : "people"
  };
}

async function saveInviteContextContext(nextContext) {
  await chrome.storage.local.set({
    [storageKeys.senderAccountId]: nextContext.senderAccountId,
    [storageKeys.inviteTemplateId]: nextContext.inviteTemplateId,
    [storageKeys.inviteNoteText]: nextContext.inviteNoteText,
    [storageKeys.popupMode]: nextContext.popupMode
  });
}

async function lookupExistingProspect(linkedinProfileUrl) {
  if (!linkedinProfileUrl) {
    updateCrmMatch(null);
    return;
  }

  try {
    const response = await fetch(
      `${API_BASE_URL}/v1/prospects/by-url?linkedinProfileUrl=${encodeURIComponent(linkedinProfileUrl)}`
    );

    if (response.status === 404) {
      updateCrmMatch(null);
      return;
    }

    if (!response.ok) {
      throw new Error("Could not check CRM for this profile.");
    }

    const data = await response.json();
    updateCrmMatch(data?.item ?? null);
  } catch (error) {
    updateCrmMatch(null);
    setFeedback(
      error instanceof Error ? error.message : "Could not check CRM for this profile.",
      "error"
    );
  }
}

async function readErrorMessage(response, fallbackMessage) {
  try {
    const contentType = response.headers.get("content-type") || "";

    if (contentType.includes("application/json")) {
      const body = await response.json();
      if (typeof body?.message === "string" && body.message.trim()) {
        return body.message.trim();
      }
      return JSON.stringify(body);
    }

    const text = await response.text();
    if (text.trim()) {
      return text.trim();
    }
  } catch (_error) {
    // Fall through to the fallback message.
  }

  return fallbackMessage;
}

function normalizeValue(value) {
  return value && value.trim().length > 0 ? value.trim() : "";
}

function formatSenderDisplayName(value) {
  const normalized = normalizeValue(value);
  return legacySenderNameMap.get(normalized) || normalized;
}

function limitText(value, maxLength) {
  const normalized = normalizeValue(value);
  return normalized.length > maxLength ? normalized.slice(0, maxLength) : normalized;
}

function populateForm(profile) {
  const fields = getFieldMap();
  const locationText = normalizeValue(profile.locationText);
  const regionText = normalizeValue(profile.region);

  fields.fullName.value = normalizeValue(profile.fullName);
  fields.linkedinProfileUrl.value = normalizeValue(profile.linkedinProfileUrl);
  fields.organizationName.value = normalizeValue(profile.organizationName);
  fields.title.value = normalizeValue(profile.title);
  fields.locationText.value = locationText;
  fields.region.value = regionText;

  if (!fields.organizationType.value) {
    fields.organizationType.value = "other";
  }

  syncLocationLibrarySelection("people", locationText);
  setLocationSummary("people", locationText, regionText);
}

function populateInviteContext(context) {
  if (senderAccountSelect) {
    senderAccountSelect.value = context.senderAccountId || "";
  }

  if (inviteTemplateSelect) {
    inviteTemplateSelect.value = context.inviteTemplateId || "";
  }

  if (inviteNoteText) {
    inviteNoteText.value = context.inviteNoteText || "";
  }
}

function populateOrgForm(profile) {
  const fields = getOrgFieldMap();
  const locationText = normalizeValue(profile.locationText);
  const regionText = normalizeValue(profile.region);

  fields.name.value = normalizeValue(profile.organizationName || profile.name);
  fields.domain.value = normalizeValue(profile.domain || profile.websiteUrl);
  fields.logoUrl.value = normalizeValue(profile.logoUrl || profile.photoUrl);
  fields.employeeCountText.value = normalizeValue(profile.employeeCountText);
  fields.locationText.value = locationText;
  fields.region.value = regionText;
  fields.linkedinCompanyUrl.value = normalizeValue(profile.linkedinCompanyUrl);

  if (!fields.organizationType.value) {
    fields.organizationType.value = "other";
  }

  syncLocationLibrarySelection("org", locationText);
  setLocationSummary("org", locationText, regionText);
}

function updateOrgPreview(profile) {
  const organizationName = normalizeValue(profile.organizationName || profile.name) || "-";
  const employeeCountText = normalizeValue(profile.employeeCountText) || "-";
  const websiteText = normalizeValue(profile.domain || profile.websiteUrl) || "-";
  const logoCandidates = getOrganizationLogoCandidates(profile);

  orgPreviewName.textContent = organizationName;
  orgPreviewTitle.textContent = employeeCountText;
  orgPreviewWebsite.textContent = websiteText;
  orgPreviewLocation.textContent = normalizeValue(profile.locationText) || "-";

  if (orgPreviewPhoto) {
    loadFirstWorkingImage(orgPreviewPhoto, logoCandidates, true);
  }
}

function setMode(nextMode) {
  currentMode = nextMode === "org" ? "org" : "people";

  modePanels.forEach((panel) => {
    const panelMode = panel.getAttribute("data-mode-panel");
    panel.classList.toggle("hidden-panel", panelMode !== currentMode);
  });

  if (peopleModeButton && orgModeButton) {
    const peopleActive = currentMode === "people";
    peopleModeButton.classList.toggle("active", peopleActive);
    orgModeButton.classList.toggle("active", !peopleActive);
    peopleModeButton.setAttribute("aria-selected", peopleActive ? "true" : "false");
    orgModeButton.setAttribute("aria-selected", peopleActive ? "false" : "true");
  }
}

async function loadInviteContextOptions(preferredMode = null) {
  try {
    const [senderResponse, templateResponse] = await Promise.all([
      fetch(`${API_BASE_URL}/v1/sender-accounts`),
      fetch(`${API_BASE_URL}/v1/invite-templates`)
    ]);

    if (!senderResponse.ok || !templateResponse.ok) {
      throw new Error("Could not load invite context.");
    }

    const senderData = await senderResponse.json();
    const templateData = await templateResponse.json();

    senderAccounts = Array.isArray(senderData?.items) ? senderData.items : [];
    inviteTemplates = Array.isArray(templateData?.items) ? templateData.items : [];

    const storedContext = await getStoredContext();
    const nextMode = preferredMode === "org" ? "org" : storedContext.popupMode;
    setMode(nextMode);

    senderAccountSelect.innerHTML = "";
    if (senderAccounts.length === 0) {
      senderAccountSelect.append(new Option("No sender accounts", ""));
    } else {
      senderAccountSelect.append(new Option("Select sender", ""));
      senderAccounts.forEach((account) => {
        senderAccountSelect.append(
          new Option(
            formatSenderDisplayName(account.displayName),
            account.id,
            false,
            storedContext.senderAccountId === account.id
          )
        );
      });

      if (!storedContext.senderAccountId) {
        const activeSenderAccounts = senderAccounts.filter((account) => account.isActive);
        if (activeSenderAccounts.length === 1) {
          senderAccountSelect.value = activeSenderAccounts[0].id;
          storedContext.senderAccountId = activeSenderAccounts[0].id;
        }
      }
    }

    inviteTemplateSelect.innerHTML = "";
    if (inviteTemplates.length === 0) {
      inviteTemplateSelect.append(new Option("No invite templates", ""));
    } else {
      inviteTemplateSelect.append(new Option("Select template", ""));
      inviteTemplates.forEach((template) => {
        inviteTemplateSelect.append(
          new Option(
            `${template.name} v${template.versionLabel}`,
            template.id,
            false,
            storedContext.inviteTemplateId === template.id
          )
        );
      });

      if (!storedContext.inviteTemplateId) {
        const activeInviteTemplates = inviteTemplates.filter((template) => template.isActive);
        if (activeInviteTemplates.length === 1) {
          inviteTemplateSelect.value = activeInviteTemplates[0].id;
          storedContext.inviteTemplateId = activeInviteTemplates[0].id;
        }
      }
    }

    if (storedContext.inviteNoteText) {
      inviteNoteText.value = storedContext.inviteNoteText;
    } else {
      const selectedTemplate = inviteTemplates.find(
        (template) => template.id === storedContext.inviteTemplateId
      );

      inviteNoteText.value = selectedTemplate?.templateText ?? "";
    }

    updateCurrentSenderSummary();
    await saveInviteContextContext({
      senderAccountId: senderAccountSelect.value || "",
      inviteTemplateId: inviteTemplateSelect.value || "",
      inviteNoteText: normalizeValue(inviteNoteText.value) || "",
      popupMode: nextMode
    });
  } catch (error) {
    senderAccountSelect.innerHTML = "";
    senderAccountSelect.append(new Option("Could not load senders", ""));
    inviteTemplateSelect.innerHTML = "";
    inviteTemplateSelect.append(new Option("Could not load templates", ""));
    setFeedback(
      error instanceof Error ? error.message : "Could not load invite context.",
      "error"
    );
  }
}

function updatePreview(profile) {
  const previewImageUrl = normalizeValue(profile.photoUrl || profile.logoUrl);

  previewName.textContent = normalizeValue(profile.fullName) || "-";
  previewTitle.textContent = normalizeValue(profile.title) || "-";
  previewOrg.textContent = normalizeValue(profile.organizationName) || "-";
  previewLocation.textContent = normalizeValue(profile.locationText) || "-";
  previewLines.textContent =
    Array.isArray(profile.debugNearbyLines) && profile.debugNearbyLines.length > 0
      ? profile.debugNearbyLines.join("\n")
      : "-";

  if (previewImageUrl) {
    loadFirstWorkingImage(photoPreview, [previewImageUrl], true);
  } else {
    resetPreviewImage(photoPreview, true);
  }
}

renderLocationLibrary(peopleLocationLibrary, "people");
renderLocationLibrary(orgLocationLibrary, "org");

chrome.runtime.onMessage.addListener((message) => {
  if (message?.type === "AUTO_INVITE_LOGGED") {
    if (message?.prospect) {
      updateCrmMatch(message.prospect);
    }

    setFeedback("Saved.", "success");
    playSuccessTone();
    return;
  }

  if (message?.type === "AUTO_INVITE_LOG_FAILED") {
    setFeedback(message.reason || "Could not auto-log invite.", "error");
  }
});

async function getActiveLinkedInContext() {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });

  if (!tab?.id) {
    throw new Error("No active tab found.");
  }

  const response = await chrome.tabs.sendMessage(tab.id, {
    type: "GET_LINKEDIN_CONTEXT"
  });

  return response;
}

async function hydrateFromPage() {
  try {
    setFeedback("Reading the visible LinkedIn page...", "muted");
    refreshButton.disabled = true;
    if (logInviteButton) {
      logInviteButton.disabled = true;
    }

    const response = await getActiveLinkedInContext();

    if (!response?.ok) {
      throw new Error("Could not read the current LinkedIn page.");
    }

    const { context } = response;
    contextUrl.textContent = context.url || "No profile URL";
    const isSupportedPage = context.pageType === "profile" || context.pageType === "company";
    updateStatus(context.pageType, isSupportedPage);

    if (!isSupportedPage) {
      updatePreview({});
      updateOrgPreview({});
      setFeedback("Open a LinkedIn profile or company page and refresh the popup.", "error");
      return;
    }

    if (context.pageType === "profile" && context.profile) {
      setMode("people");
      currentProfile = context.profile;
      populateForm(context.profile);
      populateOrgForm(context.profile);
      updatePreview(context.profile);
      updateOrgPreview(context.profile);
    } else if (context.pageType === "company" && context.organization) {
      setMode("org");
      currentProfile = null;
      updateCrmMatch(null);
      populateOrgForm(context.organization);
      updateOrgPreview(context.organization);
      updatePreview({});
    } else {
      throw new Error("Could not read the current LinkedIn page.");
    }

    await loadInviteContextOptions(context.pageType === "company" ? "org" : null);

    if (context.pageType === "profile" && context.inviteNoteText) {
      inviteNoteText.value = context.inviteNoteText;
      await saveInviteContextContext({
        senderAccountId: senderAccountSelect.value || "",
        inviteTemplateId: inviteTemplateSelect.value || "",
        inviteNoteText: normalizeValue(context.inviteNoteText) || "",
        popupMode: currentMode
      });
      if (currentProspect?.id) {
        updateCrmMatch(currentProspect);
      }
    }

    if (context.pageType === "profile" && context.profile) {
      await lookupExistingProspect(context.profile.linkedinProfileUrl);
      setFeedback(
        "Visible fields were pulled from the active LinkedIn profile. Tweak anything and save.",
        "success"
      );
    } else {
      setMode("org");
      setFeedback(
        "Visible organization fields were pulled from the active LinkedIn company page.",
        "success"
      );
    }
  } catch (error) {
    currentProfile = null;
    updateCrmMatch(null);
    updateStatus("Unknown", false);
    contextUrl.textContent = "Could not read page";
    updatePreview({});
    updateOrgPreview({});
    setFeedback(
      error instanceof Error ? error.message : "Could not talk to the LinkedIn page.",
      "error"
    );
  } finally {
    refreshButton.disabled = false;
  }
}

async function saveProspect(event) {
  event.preventDefault();

  const fields = getFieldMap();
  const payload = {
    fullName: normalizeValue(fields.fullName.value),
    linkedinProfileUrl: normalizeValue(fields.linkedinProfileUrl.value),
    photoUrl: currentProfile?.photoUrl || null,
    senderAccountId: senderAccountSelect.value || null,
    inviteTemplateId: inviteTemplateSelect.value || null,
    organizationName: normalizeValue(fields.organizationName.value),
    organizationType: fields.organizationType.value || "other",
    title: limitText(fields.title.value, 200),
    segment: fields.segment.value || null,
    locationText: normalizeValue(fields.locationText.value) || null,
    region: normalizeValue(fields.region.value) || null,
    icpType: null,
    notes: normalizeValue(fields.notes.value) || null
  };

  try {
    setFeedback("Saving researched prospect...", "muted");
    saveButton.disabled = true;

    await saveInviteContextContext({
      senderAccountId: senderAccountSelect.value || "",
      inviteTemplateId: inviteTemplateSelect.value || "",
      inviteNoteText: normalizeValue(inviteNoteText.value) || "",
      popupMode: currentMode
    });

    const response = await fetch(`${API_BASE_URL}/v1/prospects/researched`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify(payload)
    });

    if (!response.ok) {
      throw new Error(
        await readErrorMessage(response, "Save failed. Check the API and try again.")
      );
    }

    const data = await response.json();
    const prospectId = data?.item?.id;

    if (prospectId) {
      setFeedback("Saved.", "success");
      playSuccessTone();
      updateCrmMatch(data.item);
    } else {
      setFeedback("Saved.", "success");
      playSuccessTone();
    }
  } catch (error) {
    setFeedback(error instanceof Error ? error.message : "Save failed.", "error");
  } finally {
    saveButton.disabled = false;
  }
}

async function saveOrganization(event) {
  event.preventDefault();

  const fields = getOrgFieldMap();
  const payload = {
    name: normalizeValue(fields.name.value),
    domain: normalizeValue(fields.domain.value) || null,
    logoUrl: normalizeValue(fields.logoUrl.value) || null,
    linkedinCompanyUrl: normalizeValue(fields.linkedinCompanyUrl.value) || null,
    organizationType: fields.organizationType.value || "other",
    segment: null,
    region: normalizeValue(fields.region.value) || null,
    locationText: normalizeValue(fields.locationText.value) || null,
    currentStatus: null,
    employeeCountText: normalizeValue(fields.employeeCountText.value) || null,
    notes: normalizeValue(fields.notes.value) || null,
    isPreviousEmployer: false
  };

  try {
    setFeedback("Saving organization...", "muted");
    saveOrgButton.disabled = true;

    const response = await fetch(`${API_BASE_URL}/v1/organizations`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify(payload)
    });

    if (!response.ok) {
      throw new Error(
        await readErrorMessage(response, "Could not save organization.")
      );
    }

    setFeedback("Saved.", "success");
    playSuccessTone();
  } catch (error) {
    setFeedback(error instanceof Error ? error.message : "Could not save organization.", "error");
  } finally {
    saveOrgButton.disabled = false;
  }
}

async function logInvite() {
  if (!currentProspect?.id) {
    setFeedback("Save the prospect first, then log the invite.", "error");
    return;
  }

  try {
    setFeedback("Logging invite...", "muted");
    if (logInviteButton) {
      logInviteButton.disabled = true;
    }

    await saveInviteContextContext({
      senderAccountId: senderAccountSelect.value || "",
      inviteTemplateId: inviteTemplateSelect.value || "",
      inviteNoteText: normalizeValue(inviteNoteText.value) || "",
      popupMode: currentMode
    });

    const response = await fetch(`${API_BASE_URL}/v1/prospects/${currentProspect.id}/invites`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        senderAccountId: senderAccountSelect.value || "",
        inviteTemplateId: inviteTemplateSelect.value || null,
        sentAt: new Date().toISOString(),
        inviteNoteText: normalizeValue(inviteNoteText.value) || null,
        notes: null
      })
    });

    if (!response.ok) {
      throw new Error(await readErrorMessage(response, "Could not log invite."));
    }

    const data = await response.json();
    if (data?.prospect) {
      updateCrmMatch(data.prospect);
    }
    setFeedback("Saved.", "success");
    playSuccessTone();
  } catch (error) {
    setFeedback(error instanceof Error ? error.message : "Could not log invite.", "error");
  } finally {
    if (logInviteButton) {
      logInviteButton.disabled = !currentProspect?.id;
    }
  }
}

senderAccountSelect.addEventListener("change", () => {
  updateCurrentSenderSummary();
  void saveInviteContextContext({
    senderAccountId: senderAccountSelect.value || "",
    inviteTemplateId: inviteTemplateSelect.value || "",
    inviteNoteText: normalizeValue(inviteNoteText.value) || "",
    popupMode: currentMode
  });
});

inviteTemplateSelect.addEventListener("change", () => {
  const selectedTemplate = inviteTemplates.find(
    (template) => template.id === inviteTemplateSelect.value
  );

  if (selectedTemplate && !normalizeValue(inviteNoteText.value)) {
    inviteNoteText.value = selectedTemplate.templateText || "";
  }

  void saveInviteContextContext({
    senderAccountId: senderAccountSelect.value || "",
    inviteTemplateId: inviteTemplateSelect.value || "",
    inviteNoteText: normalizeValue(inviteNoteText.value) || "",
    popupMode: currentMode
  });
});

inviteNoteText.addEventListener("input", () => {
  void saveInviteContextContext({
    senderAccountId: senderAccountSelect.value || "",
    inviteTemplateId: inviteTemplateSelect.value || "",
    inviteNoteText: normalizeValue(inviteNoteText.value) || "",
    popupMode: currentMode
  });
});

peopleModeButton.addEventListener("click", () => {
  setMode("people");
  void saveInviteContextContext({
    senderAccountId: senderAccountSelect.value || "",
    inviteTemplateId: inviteTemplateSelect.value || "",
    inviteNoteText: normalizeValue(inviteNoteText.value) || "",
    popupMode: currentMode
  });
});

orgModeButton.addEventListener("click", () => {
  setMode("org");
  void saveInviteContextContext({
    senderAccountId: senderAccountSelect.value || "",
    inviteTemplateId: inviteTemplateSelect.value || "",
    inviteNoteText: normalizeValue(inviteNoteText.value) || "",
    popupMode: currentMode
  });
});

refreshButton.addEventListener("click", () => {
  void hydrateFromPage();
});

if (orgRefreshButton) {
  orgRefreshButton.addEventListener("click", () => {
    void hydrateFromPage();
  });
}

if (logInviteButton) {
  logInviteButton.addEventListener("click", () => {
    void logInvite();
  });
}

form.addEventListener("submit", (event) => {
  void saveProspect(event);
});

if (organizationForm) {
  organizationForm.addEventListener("submit", (event) => {
    void saveOrganization(event);
  });
}

void hydrateFromPage();
