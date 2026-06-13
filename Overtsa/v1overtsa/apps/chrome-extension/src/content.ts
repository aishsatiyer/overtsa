function detectLinkedInContext() {
  const url = window.location.href;
  const title = document.title;

  return {
    url,
    title,
    pageType: url.includes("/in/") ? "profile" : url.includes("/messaging/") ? "messaging" : "other"
  };
}

function reportContext() {
  const context = detectLinkedInContext();
  console.log("Overtly GTM context", context);
}

reportContext();

const observer = new MutationObserver(() => {
  reportContext();
});

observer.observe(document.body, {
  childList: true,
  subtree: true
});
