// Bridge between the extension and the page-context processor script
(function () {
  if (window.__vamContentLoaded) return;
  window.__vamContentLoaded = true;

  // Messages from popup / background -> page script
  chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === "applySettings") {
      window.postMessage({
        type: 'VAM_FROM_EXTENSION',
        action: 'applySettings',
        settings: request.settings
      }, '*');
      sendResponse({ success: true });
    }
    return true;
  });

  // Messages from page script -> extension
  window.addEventListener('message', (event) => {
    if (event.source !== window || !event.data) return;

    if (event.data.type === 'VAM_FROM_PAGE' && event.data.action === 'ready') {
      chrome.runtime.sendMessage({ action: "getSettings" }, (response) => {
        if (chrome.runtime.lastError || !response) return;
        window.postMessage({
          type: 'VAM_FROM_EXTENSION',
          action: 'applySettings',
          settings: response
        }, '*');
      });
    }
  });

  // Inject processor script into the page context
  const script = document.createElement('script');
  script.src = chrome.runtime.getURL('content/video-audio-processor.js');
  script.addEventListener('load', () => script.remove());
  (document.head || document.documentElement).appendChild(script);
})();
