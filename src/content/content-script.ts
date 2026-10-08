/**
 * UX Doctor - Content Script (Sayfa İçi Analiz ve Vurgulayıcı Köprüsü)
 *
 * Side Panel ile canlı sayfa arasındaki köprü:
 *  1. Deterministik WCAG 2.2 AA Analizi Yürütme
 *  2. Don Norman Zeminleme DOM Ağacını Çıkarma
 *  3. Etik ve Gizlilik Taraması (Parola/Ödeme Alanları Tespiti)
 *  4. Sayfa İçi Canlı Öğe Vurgulama (Highlight on Click)
 */

import { runDeterministicAudit, DeterministicAuditResult } from '../engine/deterministic/deterministic-engine';
import { extractInteractiveNodes, ExtractionSummary } from '../engine/dom/page-extractor';
import { auditPagePrivacy } from '../engine/privacy/privacy-shield';
import { EventRecorder, RecordingData } from '../recorder/event-recorder';
import { mountHeatmapOverlay, unmountHeatmapOverlay, isHeatmapMounted } from '../heatmap/renderer';
import { aggregateHeatmapData } from '../heatmap/aggregator';

let activeRecorder: EventRecorder | null = null;

// Canlı Vurgulayıcı Rozeti ve Çerçevesi
let activeHighlightBadge: HTMLElement | null = null;

function removeHighlightBadge() {
  if (activeHighlightBadge && activeHighlightBadge.parentNode) {
    activeHighlightBadge.parentNode.removeChild(activeHighlightBadge);
    activeHighlightBadge = null;
  }
}

function showHighlightOnElement(el: HTMLElement, label?: string) {
  removeHighlightBadge();

  el.scrollIntoView({ behavior: 'smooth', block: 'center' });

  const origTransition = el.style.transition;
  const origOutline = el.style.outline;
  const origBoxShadow = el.style.boxShadow;

  el.style.transition = 'all 0.25s cubic-bezier(0.175, 0.885, 0.32, 1.275)';
  el.style.outline = '3px solid #7ee7c7';
  el.style.boxShadow = '0 0 30px rgba(126, 231, 199, 0.85), inset 0 0 15px rgba(126, 231, 199, 0.2)';

  // Bilgi rozeti oluştur
  const rect = el.getBoundingClientRect();
  const badge = document.createElement('div');
  badge.id = 'ux-doctor-highlight-badge';
  badge.textContent = `🩺 UX Doctor: ${label || 'İncelenen Öğe'}`;
  badge.style.position = 'fixed';
  badge.style.top = `${Math.max(10, rect.top - 34)}px`;
  badge.style.left = `${Math.max(10, rect.left)}px`;
  badge.style.backgroundColor = '#1e1730';
  badge.style.color = '#7ee7c7';
  badge.style.border = '2px solid #7ee7c7';
  badge.style.borderRadius = '8px';
  badge.style.padding = '4px 10px';
  badge.style.fontSize = '12px';
  badge.style.fontWeight = 'bold';
  badge.style.zIndex = '2147483647';
  badge.style.pointerEvents = 'none';
  badge.style.boxShadow = '0 4px 12px rgba(0,0,0,0.5)';
  badge.style.fontFamily = 'system-ui, -apple-system, sans-serif';

  document.documentElement.appendChild(badge);
  activeHighlightBadge = badge;

  setTimeout(() => {
    el.style.outline = origOutline;
    el.style.boxShadow = origBoxShadow;
    el.style.transition = origTransition;
    removeHighlightBadge();
  }, 3500);
}

// Mesaj Dinleyicisi
chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  // 1. TAM ANALİZ YÜRÜT (DETERMİNİSTİK + DOM ZEMİNLEME + GİZLİLİK)
  if (message.type === 'CALISTIR_TAM_ANALIZ') {
    try {
      const privacyResult = auditPagePrivacy(document);

      // Kullanıcı açık onay vermediyse ve hassas sayfa ise önce uyar
      if (privacyResult.requiresExplicitConsent && !message.userExplicitConsent) {
        sendResponse({
          status: 'PRIVACY_WARNING',
          privacyResult,
          message: 'Sayfa hassas form verisi veya açık oturum içerebilir. Kullanıcı onayı gereklidir.',
        });
        return true;
      }

      // Deterministik analiz
      const deterministicResult: DeterministicAuditResult = runDeterministicAudit(document);

      // Zeminleme için budanmış DOM düğümleri
      const domSummary: ExtractionSummary = extractInteractiveNodes(document);

      sendResponse({
        status: 'SUCCESS',
        deterministic: deterministicResult,
        domNodes: domSummary.nodes,
        privacyResult,
        pageTitle: document.title,
        pageUrl: window.location.href,
      });
    } catch (err: any) {
      console.error('[UX Doctor] Analiz yürütülürken hata:', err);
      sendResponse({ status: 'ERROR', error: err.message });
    }
    return true;
  }

  // 2. SAYFADA ELEMAN VURGULA (HIGHLIGHT)
  if (message.type === 'ELEMENTI_VURGULA') {
    const sel = message.selector;
    if (sel) {
      try {
        const el = document.querySelector(sel) as HTMLElement;
        if (el) {
          showHighlightOnElement(el, message.label);
          sendResponse({ status: 'HIGHLIGHTED', found: true });
        } else {
          // Kapsayıcı veya ID bazlı alternatif arama
          const fallback = document.getElementById(sel.replace('#', ''));
          if (fallback) {
            showHighlightOnElement(fallback, message.label);
            sendResponse({ status: 'HIGHLIGHTED', found: true });
          } else {
            sendResponse({ status: 'NOT_FOUND', found: false });
          }
        }
      } catch (err) {
        sendResponse({ status: 'INVALID_SELECTOR', found: false });
      }
    }
    return true;
  }

  // 3. GİZLİLİK VE ETİK KONTROLÜ
  if (message.type === 'GIZLILIK_KONTROLU') {
    const privacy = auditPagePrivacy(document);
    sendResponse({ status: 'SUCCESS', privacy });
    return true;
  }

  // 4. OTURUM KAYDEDİCİ VE ISI HARİTASI İŞLEMLERİ (Geriye Uyumluluk)
  if (message.type === 'KAYIT_BASLAT') {
    if (!activeRecorder) {
      activeRecorder = new EventRecorder((event) => {
        chrome.runtime
          .sendMessage({
            type: 'KAYIT_OLAY_BILDIRIMI',
            eventType: event.type,
          })
          .catch(() => {});
      });
      activeRecorder.start();
    }
    sendResponse({ status: 'STARTED', time: Date.now() });
    return true;
  }

  if (message.type === 'KAYIT_DURDUR') {
    let data: RecordingData | null = null;
    if (activeRecorder) {
      data = activeRecorder.stop();
      activeRecorder = null;
    }
    sendResponse({ status: 'STOPPED', data });
    return true;
  }

  if (message.type === 'ISIHARTASI_TOGGLE') {
    if (isHeatmapMounted()) {
      unmountHeatmapOverlay();
      sendResponse({ status: 'UNMOUNTED', isMounted: false });
    } else {
      const heatmapData = aggregateHeatmapData(message.sessions || []);
      mountHeatmapOverlay(heatmapData);
      sendResponse({ status: 'MOUNTED', isMounted: true });
    }
    return true;
  }

  return true;
});
