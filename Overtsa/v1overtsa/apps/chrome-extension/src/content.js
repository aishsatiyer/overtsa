function cleanText(value) {
  return value.replace(/\s+/g, " ").trim();
}

const INVITE_NOTE_STORAGE_KEY = "overtly_invite_note_text";
let inviteConfirmationHandled = false;
let lastSeenProfileUrl = "";
let inviteComposerWasOpen = false;
let inviteComposerSeenAt = 0;
let inviteSendTriggeredAt = 0;

function getText(selectors) {
  for (const selector of selectors) {
    const elements = document.querySelectorAll(selector);

    for (const element of elements) {
      if (element?.textContent) {
        const value = cleanText(element.textContent);

        if (value.length > 0) {
          return value;
        }
      }
    }
  }

  return "";
}

function getCanonicalUrl() {
  const canonical = document.querySelector("link[rel='canonical']");

  if (canonical?.href) {
    return canonical.href.split("?")[0];
  }

  return window.location.href.split("?")[0];
}

function getMetaContent(property, attribute = "property") {
  const element = document.querySelector(`meta[${attribute}='${property}']`);
  const value = element?.getAttribute("content");
  return value ? cleanText(value) : "";
}

function extractUrlFromCssBackground(value) {
  if (!value) {
    return "";
  }

  const match = value.match(/url\(["']?(.*?)["']?\)/i);

  return match?.[1]?.trim() || "";
}

function splitDescriptionParts(description) {
  return description
    .split(/\s+[|Ã‚Â·Ã¢â‚¬Â¢]\s+/)
    .map((part) => cleanText(part))
    .filter(Boolean);
}

function getStructuredProfileData() {
  const scripts = Array.from(
    document.querySelectorAll("script[type='application/ld+json']")
  );

  for (const script of scripts) {
    const raw = script.textContent?.trim();

    if (!raw) {
      continue;
    }

    try {
      const parsed = JSON.parse(raw);
      const candidates = Array.isArray(parsed)
        ? parsed
        : parsed["@graph"] && Array.isArray(parsed["@graph"])
          ? parsed["@graph"]
          : [parsed];

      for (const candidate of candidates) {
        if (!candidate || typeof candidate !== "object") {
          continue;
        }

        const type = Array.isArray(candidate["@type"])
          ? candidate["@type"].join(" ")
          : candidate["@type"] || "";

        const isPerson =
          /person/i.test(String(type)) ||
          candidate.jobTitle ||
          candidate.worksFor ||
          candidate.image;

        if (!isPerson) {
          continue;
        }

        const organizationName =
          typeof candidate.worksFor === "object"
            ? candidate.worksFor?.name || ""
            : "";

        const address = candidate.address;
        const locationParts = [
          typeof address?.addressLocality === "string" ? address.addressLocality : "",
          typeof address?.addressRegion === "string" ? address.addressRegion : "",
          typeof address?.addressCountry === "string" ? address.addressCountry : ""
        ].filter(Boolean);

        return {
          fullName: typeof candidate.name === "string" ? cleanText(candidate.name) : "",
          title:
            typeof candidate.jobTitle === "string" ? cleanText(candidate.jobTitle) : "",
          organizationName:
            typeof organizationName === "string" ? cleanText(organizationName) : "",
          locationText: locationParts.join(", "),
          region:
            typeof address?.addressRegion === "string"
              ? cleanText(address.addressRegion)
              : typeof address?.addressCountry === "string"
                ? cleanText(address.addressCountry)
                : "",
          photoUrl:
            typeof candidate.image === "string"
              ? candidate.image
              : typeof candidate.image?.contentUrl === "string"
                ? candidate.image.contentUrl
                : ""
        };
      }
    } catch (_error) {
      // Ignore malformed JSON-LD blocks and keep scanning.
    }
  }

  return null;
}

function getNameFromTitle() {
  const title = cleanText(document.title);
  return title.replace(/\s*\|\s*LinkedIn\s*$/, "").trim();
}

function getHeadlineFromMeta() {
  const description = getMetaContent("og:description");
  if (!description) {
    return "";
  }

  return splitDescriptionParts(description)[0] ?? "";
}

function getLocationFromMeta() {
  const description = getMetaContent("og:description");
  if (!description) {
    return "";
  }

  const parts = splitDescriptionParts(description);
  return parts[parts.length - 1] ?? "";
}

function getNameFromDocumentTitle() {
  return cleanText(document.title).replace(/\s*\|\s*LinkedIn\s*$/, "").trim();
}

function normalizeOrganizationName(value) {
  return cleanText(value)
    .replace(/^\(\d+\)\s*/, "")
    .replace(/\s*:\s*Overview$/i, "")
    .replace(/\s*-\s*Overview$/i, "")
    .replace(/\s*\|\s*LinkedIn\s*$/i, "")
    .trim();
}

function parseExternalUrl(rawHref) {
  if (!rawHref) {
    return "";
  }

  try {
    const parsed = new URL(rawHref, window.location.href);
    const isLinkedInHost = /(^|\.)linkedin\.com$/i.test(parsed.hostname);

    if (isLinkedInHost) {
      const redirected = parsed.searchParams.get("url") || parsed.searchParams.get("target");
      if (!redirected) {
        return "";
      }

      return decodeURIComponent(redirected);
    }

    return parsed.href;
  } catch (_error) {
    return "";
  }
}

function getDomainFromUrl(value) {
  if (!value) {
    return "";
  }

  try {
    const parsed = new URL(value);
    return parsed.hostname.replace(/^www\./i, "");
  } catch (_error) {
    return value.replace(/^https?:\/\//i, "").replace(/^www\./i, "").replace(/\/.*$/, "");
  }
}

function isWithinProfilePhotoContainer(element) {
  return Boolean(
    element?.closest(
      [
        ".pv-top-card-profile-picture",
        ".pv-top-card-profile-picture__image",
        ".profile-photo-edit",
        ".presence-entity__image",
        "[data-anonymize='headshot-photo']"
      ].join(",")
    )
  );
}

function isLikelyProfilePhotoElement(image, fullName) {
  if (!image) {
    return false;
  }

  const alt = cleanText(image.getAttribute("alt") || "");
  const className = cleanText(typeof image.className === "string" ? image.className : "");

  if (
    /profile photo|headshot|avatar|member profile picture|profile picture/i.test(alt) ||
    (fullName && alt.toLowerCase().includes(fullName.toLowerCase())) ||
    /profile photo|headshot|avatar/i.test(className)
  ) {
    return true;
  }

  if (isWithinProfilePhotoContainer(image)) {
    return true;
  }

  const rect = image.getBoundingClientRect?.();
  const width = rect?.width || image.naturalWidth || 0;
  const height = rect?.height || image.naturalHeight || 0;

  if (!width || !height) {
    return false;
  }

  const ratio = width / height;
  return ratio >= 0.75 && ratio <= 1.35;
}

function getProfilePhotoCandidateFromElement(element, fullName) {
  if (!element) {
    return "";
  }

  if (element.tagName?.toLowerCase() === "img") {
    if (!isLikelyProfilePhotoElement(element, fullName)) {
      return "";
    }

    return getImageUrlCandidate(element);
  }

  if (element.tagName?.toLowerCase() === "source") {
    return getSourceUrlCandidate(element);
  }

  const backgroundCandidate = getBackgroundImageCandidate(element);
  if (backgroundCandidate && isWithinProfilePhotoContainer(element)) {
    return backgroundCandidate;
  }

  const descendants = Array.from(element.querySelectorAll("img, source, [style*='background-image']"));

  for (const descendant of descendants) {
    if (descendant.tagName?.toLowerCase() === "source") {
      const candidate = getSourceUrlCandidate(descendant);
      if (candidate) {
        return candidate;
      }
      continue;
    }

    const candidate =
      descendant.tagName?.toLowerCase() === "img"
        ? (isLikelyProfilePhotoElement(descendant, fullName) ? getImageUrlCandidate(descendant) : "")
        : getBackgroundImageCandidate(descendant);

    if (candidate && isLikelyProfilePhotoElement(descendant, fullName)) {
      return candidate;
    }
  }

  return "";
}

function getProfilePhotoUrl(fullName) {
  const selectors = [
    "main .pv-top-card",
    "main .pv-top-card__photo",
    "main .pv-top-card-profile-picture",
    "main .pv-top-card-profile-picture__image",
    "main img.pv-top-card-profile-picture__image",
    "main img[alt*='profile photo']",
    "img.pv-top-card-profile-picture__image",
    "main .pv-top-card-profile-picture img",
    "main .pv-top-card-profile-picture__image",
    "img[data-anonymize='headshot-photo']",
    "img[alt*='headshot']",
    "img[alt*='avatar']",
    "[data-anonymize='headshot-photo']",
    ".presence-entity__image"
  ];

  for (const selector of selectors) {
    const elements = Array.from(document.querySelectorAll(selector));

    for (const element of elements) {
      const candidate = getProfilePhotoCandidateFromElement(element, fullName);

      if (candidate) {
        return candidate;
      }
    }
  }

  const images = Array.from(document.querySelectorAll("main img, main source"));

  for (const image of images) {
    const candidate = getProfilePhotoCandidateFromElement(image, fullName);

    if (candidate) {
      return candidate;
    }
  }

  return "";
}

function getCoverPhotoUrl() {
  const selectors = [
    "main .pv-top-card .pv-top-card__background-image",
    "main .pv-top-card__background-image",
    "main [data-test-cover-photo]",
    "main .profile-background-image",
    "main [style*='background-image']"
  ];

  for (const selector of selectors) {
    const elements = Array.from(document.querySelectorAll(selector));

    for (const element of elements) {
      const candidate = getBackgroundImageCandidate(element);

      if (candidate) {
        return candidate;
      }
    }
  }

  return "";
}

function getSourceUrlCandidate(source) {
  if (!source) {
    return "";
  }

  const srcset = source.getAttribute("srcset") || source.getAttribute("data-srcset");
  if (!srcset) {
    return "";
  }

  const firstCandidate = srcset
    .split(",")
    .map((part) => part.trim().split(/\s+/)[0])
    .find((candidate) => candidate && !candidate.startsWith("data:"));

  return firstCandidate || "";
}

function getImageUrlCandidate(image) {
  if (!image) {
    return "";
  }

  const srcCandidates = [
    image.currentSrc,
    image.getAttribute("src"),
    image.getAttribute("data-src"),
    image.getAttribute("data-delayed-url"),
    image.getAttribute("data-delayed-src"),
    image.getAttribute("data-ghost-url"),
    image.getAttribute("data-lazy-src")
  ]
    .map((value) => (typeof value === "string" ? value.trim() : ""))
    .filter(Boolean);

  for (const candidate of srcCandidates) {
    if (!candidate || candidate.startsWith("data:")) {
      continue;
    }

    return candidate;
  }

  const srcset = image.getAttribute("srcset");
  if (srcset) {
    const firstCandidate = srcset
      .split(",")
      .map((part) => part.trim().split(/\s+/)[0])
      .find((candidate) => candidate && !candidate.startsWith("data:"));

    if (firstCandidate) {
      return firstCandidate;
    }
  }

  return "";
}

function getBackgroundImageCandidate(element) {
  if (!element) {
    return "";
  }

  const fromInlineStyle = extractUrlFromCssBackground(element.style?.backgroundImage || "");
  if (fromInlineStyle) {
    return fromInlineStyle;
  }

  const fromComputedStyle = extractUrlFromCssBackground(
    window.getComputedStyle(element).backgroundImage || ""
  );

  return fromComputedStyle;
}

function getPhotoUrlNearName(fullName) {
  const images = Array.from(document.querySelectorAll("img"));

  for (const image of images) {
    const alt = cleanText(image.getAttribute("alt") || "");
    const candidate = getImageUrlCandidate(image);

    if (!alt || !candidate) {
      continue;
    }

    if (fullName && alt.toLowerCase().includes(fullName.toLowerCase())) {
      return candidate;
    }

    if (/profile photo/i.test(alt)) {
      return candidate;
    }
  }

  return "";
}

function getOrganizationFromNearbyLines(nearbyLines, headline, locationText) {
  if (!hasEmploymentContext(headline, nearbyLines)) {
    return "";
  }

  for (const line of nearbyLines) {
    if (
      !line ||
      line === headline ||
      line === locationText ||
      /contact info/i.test(line) ||
      isOrganizationInterestLine(line) ||
      isLikelyLocationLine(line) ||
      isLikelyRoleLine(line)
    ) {
      continue;
    }

    return line;
  }

  return "";
}

function isOrganizationInterestLine(line) {
  return /interested in|following|follows|follower|member of|learning about|watching|supporting|interests/i.test(
    line
  );
}

function isLikelyIndustryLine(line) {
  return /\bservices\b|software development|technology|advertising|marketing|public relations|communications|financial services|it services|consulting|consultancy|healthcare|media production|staffing|hospitality|manufacturing|education administration|non-profit|venture capital|real estate|telecommunications|human resources|design services|consumer services/i.test(
    line
  );
}

function isLikelyProfileBlobLine(line) {
  return /contact info|mutual connection|highlights|get introduced|start a conversation|connections|1st|2nd|3rd|message|connect|about|adjunct professor|co-founder|principal|university of|smartfocus\.ai/i.test(
    line
  );
}

function isLikelyLocationLine(line) {
  if (
    !line ||
    line.length > 120 ||
    isLikelyIndustryLine(line) ||
    isLikelyProfileBlobLine(line) ||
    /employees?|followers?/i.test(line)
  ) {
    return false;
  }

  return (
    line.includes(",") ||
    /area|region|district|city|india|united states|united kingdom|uae|canada|australia|singapore|dubai/i.test(
      line
    )
  );
}

function isLikelyRoleLine(line) {
  return (
    !/@/.test(line) &&
    !/\bat\b/i.test(line) &&
    /\bhead of|chief|ceo|cto|cmo|coo|founder|co-founder|cofounder|director|manager|lead|specialist|consultant|advisor|strategist|coordinator|executive|president|vp|vice president|owner|partner\b/i.test(
      line
    )
  );
}

function hasEmploymentContext(headline, nearbyLines) {
  const candidates = [headline, ...(Array.isArray(nearbyLines) ? nearbyLines : [])]
    .map((candidate) => cleanText(candidate || ""))
    .filter(Boolean);

  return candidates.some((line) =>
    / at | @ |works at|work at|employed at|founder|co-founder|cofounder|ceo|chief|director|manager|lead|head of|owner|partner|president|vp of/i.test(
      line
    )
  );
}

function deriveOrganizationFromHeadline(headline) {
  const normalizedHeadline = cleanText(headline || "");

  if (!normalizedHeadline) {
    return "";
  }

  const atIndex = normalizedHeadline.lastIndexOf("@");

  if (atIndex >= 0) {
    return cleanText(normalizedHeadline.slice(atIndex + 1))
      .replace(/\s+\|\s+.*$/, "")
      .replace(/\s+[|·•-]\s+.*$/, "")
      .trim();
  }

  const match = normalizedHeadline.match(/\b(?:at|@)\s+(.+)$/i);

  if (!match) {
    return "";
  }

  return cleanText(match[1])
    .replace(/\s+\|\s+.*$/, "")
    .replace(/\s+[|·•-]\s+.*$/, "")
    .trim();
}

function deriveRegion(locationText) {
  if (!locationText) {
    return "";
  }

  const parts = locationText
    .split(",")
    .map((part) => cleanText(part))
    .filter(Boolean);

  return parts.length > 1 ? parts[parts.length - 1] : parts[0] ?? "";
}

function isVisibleElement(element) {
  if (!element) {
    return false;
  }

  const style = window.getComputedStyle(element);
  const rect = element.getBoundingClientRect();

  return (
    style.display !== "none" &&
    style.visibility !== "hidden" &&
    rect.width > 0 &&
    rect.height > 0
  );
}

function getVisibleInviteDialog() {
  const selectors = ["[role='dialog']", "[aria-modal='true']", ".artdeco-modal"];
  for (const selector of selectors) {
    const dialog = document.querySelector(selector);
    if (dialog && isVisibleElement(dialog)) {
      return dialog;
    }
  }

  return null;
}

function captureInviteSendIntent() {
  document.addEventListener(
    "click",
    (event) => {
      const target = event.target instanceof Element ? event.target : null;
      const button = target?.closest("button");

      if (!button || !isVisibleElement(button)) {
        return;
      }

      const dialog = button.closest("[role='dialog'], [aria-modal='true'], .artdeco-modal");
      if (!dialog || !isVisibleElement(dialog)) {
        return;
      }

      const buttonText = cleanText(button.textContent || "");
      if (!/^(send|send now|send invitation)$/i.test(buttonText)) {
        return;
      }

      inviteSendTriggeredAt = Date.now();
      inviteComposerWasOpen = true;
      inviteComposerSeenAt = inviteSendTriggeredAt;
    },
    true
  );
}

function getInviteNoteFromDialog() {
  const selectors = [
    "[role='dialog'] textarea",
    "[aria-modal='true'] textarea",
    ".artdeco-modal textarea",
    "[role='dialog'] [contenteditable='true']",
    "[aria-modal='true'] [contenteditable='true']",
    ".artdeco-modal [contenteditable='true']"
  ];

  for (const selector of selectors) {
    const elements = Array.from(document.querySelectorAll(selector));

    for (const element of elements) {
      if (!isVisibleElement(element)) {
        continue;
      }

      const rawValue =
        typeof element.value === "string"
          ? element.value
          : typeof element.textContent === "string"
            ? element.textContent
            : "";

      const value = cleanText(rawValue);

      if (value.length > 0) {
        return value;
      }
    }
  }

  return "";
}

async function persistInviteNoteDraft(inviteNoteText) {
  if (!inviteNoteText) {
    return;
  }

  try {
    await chrome.storage.local.set({
      [INVITE_NOTE_STORAGE_KEY]: inviteNoteText
    });
  } catch (_error) {
    // Best effort only.
  }
}

function getInviteSentConfirmationText() {
  const selectors = [
    "[role='status']",
    "[role='alert']",
    "[aria-live='polite']",
    "[aria-live='assertive']",
    ".artdeco-toast-item",
    ".artdeco-toast",
    "[data-test-toast]",
    "[data-test-toast-item]",
    ".artdeco-toast-item__content",
    ".artdeco-toast-item__message",
    ".artdeco-toast-content"
  ];

  for (const selector of selectors) {
    const elements = Array.from(document.querySelectorAll(selector));

    for (const element of elements) {
      if (!isVisibleElement(element)) {
        continue;
      }

      const value = cleanText(element.textContent || "");

      if (/invitation sent|connection request sent|invite sent|pending/i.test(value)) {
        return value;
      }
    }
  }

  const visibleBodyText = cleanText(document.body?.innerText || "");
  if (
    visibleBodyText &&
    /invitation sent|connection request sent|invite sent|pending/i.test(visibleBodyText)
  ) {
    return visibleBodyText;
  }

  if (inviteSendTriggeredAt && Date.now() - inviteSendTriggeredAt < 15000) {
    const visibleDialog = getVisibleInviteDialog();

    if (!visibleDialog) {
      return "Invite sent";
    }
  }

  if (!inviteComposerWasOpen || Date.now() - inviteComposerSeenAt > 15000) {
    return "";
  }

  const buttons = Array.from(document.querySelectorAll("main button"))
    .map((element) => cleanText(element.textContent || ""))
    .filter(Boolean);

  if (buttons.some((value) => /^pending$/i.test(value) || /^invited$/i.test(value))) {
    return "Pending";
  }

  return "";
}

function collectTopCardLines() {
  const nameElement =
    document.querySelector("main h1") ||
    document.querySelector("main .pv-text-details__left-panel h1") ||
    document.querySelector("h1");

  if (!nameElement) {
    return [];
  }

  const topCardRoot =
    nameElement.closest(".pv-top-card") ||
    nameElement.closest(".mt2") ||
    nameElement.closest("section") ||
    nameElement.parentElement;

  if (!topCardRoot) {
    return [];
  }

  const candidates = Array.from(topCardRoot.querySelectorAll("div, span, a"))
    .map((element) => cleanText(element.textContent || ""))
    .filter(Boolean);

  const uniqueLines = [];

  for (const line of candidates) {
    if (
      line.length < 3 ||
      uniqueLines.includes(line) ||
      /followers|connections|message|open to work|mutual connection/i.test(line)
    ) {
      continue;
    }

    uniqueLines.push(line);
  }

  return uniqueLines;
}

function collectMainTextLines() {
  const main = document.querySelector("main");

  if (!main?.innerText) {
    return [];
  }

  return main.innerText
    .split("\n")
    .map((line) => cleanText(line))
    .filter(Boolean);
}

function isNoiseLine(line) {
  return (
    /followers|connections|message|follow|connect|more|open to work|mutual connection|see all details/i.test(
      line
    ) ||
    /^[Ã‚Â·Ã¢â‚¬Â¢]?\s*\d+(st|nd|rd|th)\+?$/i.test(line) ||
    /^[Ã‚Â·Ã¢â‚¬Â¢]?\s*\d+(st|nd|rd|th)\s+degree connection$/i.test(line)
  );
}

function getProfileSequenceFromMainText(fullName) {
  const lines = collectMainTextLines();
  const nameIndex = lines.findIndex(
    (line) => line === fullName || line.startsWith(fullName)
  );

  if (nameIndex === -1) {
    return {
      headline: "",
      location: "",
      nearbyLines: lines.slice(0, 8)
    };
  }

  const windowLines = lines.slice(nameIndex + 1, nameIndex + 10).filter(
    (line) => !isNoiseLine(line) && line !== fullName
  );

  const headline = windowLines[0] ?? "";
  const location =
    windowLines.find(
      (line) =>
        line !== headline &&
        (line.includes(",") ||
          /area|region|district|city|india|united states|united kingdom|uae|canada|australia|singapore/i.test(
            line
          ))
    ) ?? "";

  return {
    headline,
    location,
    nearbyLines: windowLines
  };
}

function getHeadlineFromTopCard(fullName) {
  const lines = collectTopCardLines();

  for (const line of lines) {
    if (line === fullName) {
      continue;
    }

    if (
      / at | @ | founder|ceo|co-founder|manager|director|lead|consultant|specialist|head of/i.test(
        line
      )
    ) {
      return line;
    }
  }

  return "";
}

function getLocationFromTopCard(fullName, headline) {
  const lines = collectTopCardLines();

  for (const line of lines) {
    if (line === fullName || line === headline) {
      continue;
    }

    if (
      /area|region|district|city|india|united states|united kingdom|uae|canada|australia|singapore/i.test(
        line
      ) ||
      line.includes(",")
    ) {
      return line;
    }
  }

  return "";
}

function getOrganizationName(headline, nearbyLines = [], locationText = "") {
  const headlineOrganization = deriveOrganizationFromHeadline(headline);

  if (headlineOrganization) {
    return headlineOrganization;
  }

  const nearbyOrganization = getOrganizationFromNearbyLines(
    nearbyLines,
    headline,
    locationText
  );

  if (nearbyOrganization) {
    return nearbyOrganization;
  }

  return "";
}

function getOrganizationTopCardRoot() {
  return (
    document.querySelector("main .org-top-card") ||
    document.querySelector("main [data-test-id='org-top-card']") ||
    document.querySelector("main .org-top-card-primary-content")
  );
}

function collectOrganizationTopCardLines(root) {
  if (!root?.innerText) {
    return [];
  }

  const uniqueLines = [];

  for (const line of root.innerText.split("\n").map((value) => cleanText(value)).filter(Boolean)) {
    if (
      line.length < 3 ||
      line.length > 160 ||
      uniqueLines.includes(line) ||
      isLikelyProfileBlobLine(line) ||
      /follow|followers|message|connect|open to work|mutual connection|see all details/i.test(
        line
      )
    ) {
      continue;
    }

    uniqueLines.push(line);
  }

  return uniqueLines;
}

function getVisibleWebsiteUrl(scope = document) {
  const targetedSelectors = [
    "[data-test-id='about-us__website'] a[href]",
    "[data-test-id='about-us__website']",
    ".org-about-company-module__website a[href]",
    ".org-about-company-module a[href]"
  ];

  for (const selector of targetedSelectors) {
    const elements = Array.from(scope.querySelectorAll(selector));

    for (const element of elements) {
      if (!isVisibleElement(element)) {
        continue;
      }

      const hrefCandidate = parseExternalUrl(element.getAttribute("href") || "");
      if (hrefCandidate) {
        const normalizedHref = hrefCandidate.toLowerCase();
        if (
          !normalizedHref.includes("linkedin.com") &&
          !normalizedHref.startsWith("mailto:") &&
          !normalizedHref.startsWith("tel:")
        ) {
          return hrefCandidate;
        }
      }

      const textCandidate = cleanText(element.textContent || "");
      if (/^[a-z0-9.-]+\.[a-z]{2,}(\/.*)?$/i.test(textCandidate)) {
        return textCandidate;
      }
    }
  }

  const anchors = Array.from(scope.querySelectorAll("a[href]"));

  for (const anchor of anchors) {
    if (!isVisibleElement(anchor)) {
      continue;
    }

    const candidate = parseExternalUrl(anchor.getAttribute("href") || "");
    if (!candidate) {
      continue;
    }

    const normalized = candidate.toLowerCase();
    if (
      normalized.includes("linkedin.com") ||
      normalized.startsWith("mailto:") ||
      normalized.startsWith("tel:")
    ) {
      continue;
    }

    return candidate;
  }

  return "";
}

function getCompanyLocationFromLines(lines, companyName = "") {
  return (
    lines.find((line) =>
      line !== companyName &&
      isLikelyLocationLine(line)
    ) ?? ""
  );
}

function getCompanyLocationFromSelectors(scope, companyName = "") {
  const selectors = [
    ".org-top-card-summary-info-list__info-item",
    ".org-top-card-summary-info-list li",
    ".org-top-card-summary-info-list span",
    "[data-test-id='about-us__organization-details'] dd",
    "[data-test-id='about-us__organization-details'] div"
  ];

  for (const selector of selectors) {
    const elements = Array.from(scope.querySelectorAll(selector));

    for (const element of elements) {
      if (!isVisibleElement(element)) {
        continue;
      }

      const line = cleanText(element.textContent || "");

      if (
        !line ||
        line === companyName ||
        line.length > 120 ||
        isLikelyProfileBlobLine(line) ||
        !isLikelyLocationLine(line)
      ) {
        continue;
      }

      return line;
    }
  }

  return "";
}

function getCompanyEmployeeCountFromSelectors(scope) {
  const selectors = [
    ".org-top-card-summary-info-list__info-item",
    ".org-top-card-summary-info-list li",
    ".org-top-card-summary-info-list span",
    "[data-test-id='about-us__organization-details'] dd",
    "[data-test-id='about-us__organization-details'] div"
  ];

  for (const selector of selectors) {
    const elements = Array.from(scope.querySelectorAll(selector));

    for (const element of elements) {
      if (!isVisibleElement(element)) {
        continue;
      }

      const line = cleanText(element.textContent || "");

      if (line && /\bemployees?\b/i.test(line) && /\d/.test(line)) {
        return line;
      }
    }
  }

  return "";
}

function getCompanyEmployeeCountFromLines(lines) {
  return (
    lines.find((line) => /\b\d[\d,.\-–]*\s*(?:-\s*\d[\d,.\-–]*)?\s*employees?\b/i.test(line)) ??
    lines.find((line) => /\bemployees?\b/i.test(line) && /\d/.test(line)) ??
    ""
  );
}

function isLinkedInBrandCandidate(candidate, altText = "") {
  const normalizedCandidate = cleanText(candidate).toLowerCase();
  const normalizedAlt = cleanText(altText).toLowerCase();

  return (
    normalizedAlt === "linkedin" ||
    normalizedAlt === "linkedin logo" ||
    /linkedin/i.test(normalizedAlt) ||
    /linkedin\.(com|net)/i.test(normalizedCandidate) ||
    (/\/logos?\//i.test(normalizedCandidate) && /linkedin/i.test(normalizedCandidate))
  );
}

function isLikelySquareLogoElement(element) {
  if (!element) {
    return false;
  }

  const rect = element.getBoundingClientRect();

  if (!rect.width || !rect.height) {
    return false;
  }

  const aspectRatio = rect.width / rect.height;
  const isSquareish = aspectRatio >= 0.75 && aspectRatio <= 1.35;
  const isReasonableSize =
    rect.width >= 28 &&
    rect.height >= 28 &&
    rect.width <= 220 &&
    rect.height <= 220;

  return isSquareish && isReasonableSize;
}

function getCompanyLogoUrl(scope, companyName) {
  const visibleImages = Array.from(scope.querySelectorAll("img"))
    .filter((element) => isVisibleElement(element) && isLikelySquareLogoElement(element))
    .map((image) => {
      const candidate = getImageUrlCandidate(image);
      const alt = cleanText(image.getAttribute("alt") || "");
      return { image, candidate, alt };
    })
    .filter(({ candidate }) => Boolean(candidate))
    .sort(
      (left, right) =>
        left.image.getBoundingClientRect().width * left.image.getBoundingClientRect().height -
        right.image.getBoundingClientRect().width * right.image.getBoundingClientRect().height
    );

  for (const { candidate, alt } of visibleImages) {
    if (isLinkedInBrandCandidate(candidate, alt)) {
      continue;
    }

    if (companyName && alt.toLowerCase().includes(companyName.toLowerCase())) {
      return candidate;
    }
  }

  for (const { candidate, alt } of visibleImages) {
    if (isLinkedInBrandCandidate(candidate, alt)) {
      continue;
    }

    if (/logo/i.test(alt)) {
      return candidate;
    }
  }

  const selectors = [
    ".org-top-card__logo img",
    ".org-top-card-summary__logo img",
    ".org-top-card-primary-content__logo img",
    "[data-test-id='org-top-card-logo'] img",
    ".org-top-card__logo",
    ".org-top-card-summary__logo",
    ".org-top-card-primary-content__logo",
    "[data-test-id='org-top-card-logo']"
  ];

  const elements = selectors.flatMap((selector) => Array.from(scope.querySelectorAll(selector)));

  for (const element of elements) {
    if (!isVisibleElement(element)) {
      continue;
    }

    const candidate =
      element.tagName === "IMG"
        ? getImageUrlCandidate(element)
        : getBackgroundImageCandidate(element);

    if (!candidate) {
      continue;
    }

    const altText = cleanText(element.getAttribute?.("alt") || "");
    const matchesCompany =
      companyName && altText.toLowerCase().includes(companyName.toLowerCase());

    if (isLinkedInBrandCandidate(candidate, altText)) {
      continue;
    }

    if (matchesCompany || /logo/i.test(altText) || selectorIncludesLogoClass(element)) {
      return candidate;
    }
  }

  return "";
}

function getCompanyLogoFallback(websiteUrl) {
  const domain = getDomainFromUrl(websiteUrl);

  if (!domain) {
    return "";
  }

  return `https://logo.clearbit.com/${domain}?size=128`;
}

function selectorIncludesLogoClass(element) {
  const className = typeof element?.className === "string" ? element.className : "";
  return /logo/i.test(className);
}

function getCompanyTaglineFromLines(lines, companyName) {
  return (
    lines.find(
      (line) =>
        line &&
        line !== companyName &&
        !isLikelyLocationLine(line) &&
        !/employees?/i.test(line) &&
        !/followers|employees|see all/i.test(line)
    ) ?? ""
  );
}

function extractOrganizationPage() {
  const topCardRoot = getOrganizationTopCardRoot();
  const summaryLines = collectOrganizationTopCardLines(topCardRoot);
  const companyName = normalizeOrganizationName(
    getText([
      "main h1",
      "main .org-top-card-summary__title",
      "main [data-test-id='org-page-details-module__company-name']"
    ]) || getNameFromDocumentTitle()
  );
  const websiteUrl = getVisibleWebsiteUrl(document);
  const logoUrl =
    getCompanyLogoUrl(topCardRoot || document, companyName) ||
    getCompanyLogoFallback(websiteUrl);
  const employeeCountText =
    getCompanyEmployeeCountFromSelectors(document) ||
    getCompanyEmployeeCountFromLines(summaryLines);
  const locationText =
    getCompanyLocationFromSelectors(topCardRoot || document, companyName) ||
    summaryLines.find((line) => line !== companyName && isLikelyLocationLine(line)) ||
    getCompanyLocationFromLines(summaryLines, companyName);
  const tagline =
    getText([
      "main .org-top-card-summary__tagline",
      "main .break-words"
    ]) || getCompanyTaglineFromLines(summaryLines, companyName);

  return {
    organizationName: companyName,
    linkedinCompanyUrl: getCanonicalUrl(),
    domain: getDomainFromUrl(websiteUrl),
    websiteUrl,
    logoUrl,
    photoUrl: logoUrl,
    employeeCountText,
    title: tagline,
    locationText,
    region: deriveRegion(locationText),
    debugNearbyLines: summaryLines
  };
}

function extractProfile() {
  const structured = getStructuredProfileData();
  const fullName =
    getText(["main h1", "main .pv-text-details__left-panel h1", "h1"]) ||
    structured?.fullName ||
    getNameFromTitle();
  const mainTextSequence = getProfileSequenceFromMainText(fullName);

  const selectorHeadline = getText([
    "main .text-body-medium.break-words",
    "main .pv-text-details__left-panel .text-body-medium",
    "main .pv-text-details__left-panel .break-words",
    "main .text-body-medium"
  ]);

  const headline =
    selectorHeadline ||
    structured?.title ||
    getHeadlineFromTopCard(fullName) ||
    mainTextSequence.headline ||
    getHeadlineFromMeta();

  const selectorLocation = getText([
    "main .text-body-small.inline.t-black--light.break-words",
    "main .pv-text-details__left-panel .text-body-small",
    "main .text-body-small"
  ]);

  const locationText =
    selectorLocation ||
    structured?.locationText ||
    getLocationFromTopCard(fullName, headline) ||
    mainTextSequence.location ||
    getLocationFromMeta();
  const nearbyOrganization = getOrganizationFromNearbyLines(
    mainTextSequence.nearbyLines ?? [],
    headline,
    locationText
  );
  const employmentContext = hasEmploymentContext(headline, mainTextSequence.nearbyLines ?? []);

  return {
    fullName,
    linkedinProfileUrl: getCanonicalUrl(),
    organizationName:
      employmentContext
        ? getOrganizationName(headline, mainTextSequence.nearbyLines ?? [], locationText) ||
          nearbyOrganization ||
          structured?.organizationName ||
          ""
        : "",
    title: headline,
    locationText,
    region: structured?.region || deriveRegion(locationText),
    photoUrl:
      structured?.photoUrl ||
      getProfilePhotoUrl(fullName) ||
      getPhotoUrlNearName(fullName) ||
      getCoverPhotoUrl() ||
      getMetaContent("og:image") ||
      getMetaContent("twitter:image", "name"),
    debugNearbyLines: mainTextSequence.nearbyLines
  };
}

function detectLinkedInContext() {
  const url = window.location.href;
  const title = document.title;
  const pageType = url.includes("/company/")
    ? "company"
    : url.includes("/in/")
    ? "profile"
    : url.includes("/messaging/")
      ? "messaging"
      : "other";

  return {
    url,
    title,
    pageType,
    profile: pageType === "profile" ? extractProfile() : null,
    organization: pageType === "company" ? extractOrganizationPage() : null,
    inviteNoteText: getInviteNoteFromDialog()
  };
}

function reportContext() {
  const context = detectLinkedInContext();

  if (context.inviteNoteText) {
    inviteComposerWasOpen = true;
    inviteComposerSeenAt = Date.now();
    void persistInviteNoteDraft(context.inviteNoteText);
  }

  const profileUrl = context.profile?.linkedinProfileUrl || context.url.split("?")[0];

  if (profileUrl !== lastSeenProfileUrl) {
    lastSeenProfileUrl = profileUrl;
    inviteConfirmationHandled = false;
    inviteComposerWasOpen = false;
    inviteComposerSeenAt = 0;
    inviteSendTriggeredAt = 0;
  }

  if (
    context.pageType === "profile" &&
    context.profile?.linkedinProfileUrl &&
    !inviteConfirmationHandled
  ) {
    const confirmationText = getInviteSentConfirmationText();

    if (confirmationText) {
      inviteConfirmationHandled = true;

      void chrome.runtime.sendMessage({
        type: "LINKEDIN_INVITE_SENT",
        context: {
          ...context,
          confirmationText
        }
      });
    }
  }

  console.log("Overtly GTM context", context);
}

captureInviteSendIntent();

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message?.type === "GET_LINKEDIN_CONTEXT") {
    sendResponse({
      ok: true,
      context: detectLinkedInContext()
    });
  }
});

reportContext();

const observer = new MutationObserver(() => {
  reportContext();
});

observer.observe(document.body, {
  childList: true,
  subtree: true
});

