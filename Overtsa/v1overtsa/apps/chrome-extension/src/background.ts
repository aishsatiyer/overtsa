chrome.runtime.onInstalled.addListener(() => {
  console.log("Overtly GTM Helper installed");
});

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message?.type === "PING") {
    sendResponse({ ok: true });
  }
});
