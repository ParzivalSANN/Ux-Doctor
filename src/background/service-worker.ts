// UX Doctor - Background Service Worker (Manifest V3)

chrome.runtime.onInstalled.addListener(() => {
  console.log('[UX Doctor] Service Worker hazır.');

  // Eklenti ikonuna tıklandığında yan paneli aç
  if (chrome.sidePanel && chrome.sidePanel.setPanelBehavior) {
    chrome.sidePanel
      .setPanelBehavior({ openPanelOnActionClick: true })
      .catch((error) => console.error('[UX Doctor] Panel davranışı ayarlanamadı:', error));
  }
});

// Panel ve Content Script arasındaki köprü mesaj dinleyicisi
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  // Canlı kayıt olay bildirimleri veya Sniper bildirimleri
  if (message.type === 'KAYIT_OLAY_BILDIRIMI' || message.type === 'SNIPER_ELEMENT_SELECTED') {
    // Paneli haberdar etmek için runtime üzerinden yayınla
    return false;
  }

  if (message.type === 'PING') {
    sendResponse({ status: 'PONG', sender: sender.id });
    return true;
  }

  return true;
});
