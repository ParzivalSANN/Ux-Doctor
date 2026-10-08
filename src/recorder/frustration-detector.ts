/**
 * UX Doctor - Kullanıcı Sürtünme ve Hayal Kırıklığı Dedektörü (Frustration Detector)
 *
 * 1. Rage Click: 1 saniye içinde aynı elemana veya 30px çapında alana ≥3 tıklama.
 * 2. Dead Click: Tıklamadan sonra 500ms içinde DOM, URL veya ağ isteği değişmemesi.
 * 3. Hesitation: Bir buton/link üzerinde fare >2.5 saniye duraksaması.
 */

import { generateStableSelector } from './selector-generator';

export type FrustrationType = 'rage_click' | 'dead_click' | 'hesitation';

export interface FrustrationEvent {
  type: FrustrationType;
  selector: string;
  targetTag: string;
  timestamp: number;
  description: string;
  coords: { x: number; y: number };
  metadata?: Record<string, any>;
}

export type FrustrationCallback = (event: FrustrationEvent) => void;

interface ClickRecord {
  el: Element;
  x: number;
  y: number;
  time: number;
}

export class FrustrationDetector {
  private onFrustration: FrustrationCallback;
  private clickHistory: ClickRecord[] = [];
  private lastRageAlertTime = 0;

  // Dead click takibi için
  private mutationObserver: MutationObserver | null = null;
  private lastDomMutationTime = 0;
  private originalFetch: typeof window.fetch | null = null;
  private lastNetworkTime = 0;
  private pendingDeadClickCheck: number | null = null;

  // Hesitation (Duraksama) takibi için
  private hesitationTimer: number | null = null;
  private currentHesitationTarget: HTMLElement | null = null;

  private isRunning = false;

  constructor(callback: FrustrationCallback) {
    this.onFrustration = callback;
  }

  public start(): void {
    if (this.isRunning || typeof window === 'undefined') return;
    this.isRunning = true;

    // DOM Değişikliklerini İzle (Dead Click için referans)
    this.mutationObserver = new MutationObserver(() => {
      this.lastDomMutationTime = Date.now();
    });
    this.mutationObserver.observe(document.body || document.documentElement, {
      childList: true,
      subtree: true,
      attributes: true,
    });

    // Ağ İsteklerini İzle (Fetch interceptor)
    this.interceptNetwork();

    // Dinleyicileri Ekle
    document.addEventListener('click', this.handleClick, true);
    document.addEventListener('mouseover', this.handleMouseOver, true);
    document.addEventListener('mouseout', this.handleMouseOut, true);
  }

  public stop(): void {
    if (!this.isRunning) return;
    this.isRunning = false;

    if (this.mutationObserver) {
      this.mutationObserver.disconnect();
      this.mutationObserver = null;
    }

    if (this.originalFetch) {
      window.fetch = this.originalFetch;
      this.originalFetch = null;
    }

    if (this.pendingDeadClickCheck) {
      clearTimeout(this.pendingDeadClickCheck);
      this.pendingDeadClickCheck = null;
    }

    if (this.hesitationTimer) {
      clearTimeout(this.hesitationTimer);
      this.hesitationTimer = null;
    }

    document.removeEventListener('click', this.handleClick, true);
    document.removeEventListener('mouseover', this.handleMouseOver, true);
    document.removeEventListener('mouseout', this.handleMouseOut, true);

    this.clickHistory = [];
  }

  /**
   * Fetch çağrılarını dinleyerek ağ aktivitesinin zamanını günceller.
   */
  private interceptNetwork(): void {
    if (typeof window.fetch === 'function') {
      this.originalFetch = window.fetch;
      const self = this;
      window.fetch = async function (...args) {
        self.lastNetworkTime = Date.now();
        return self.originalFetch!.apply(this, args);
      };
    }
  }

  /**
   * Tıklama Olayı Değerlendirmesi (Rage Click & Dead Click)
   */
  private handleClick = (e: MouseEvent): void => {
    const target = e.target as HTMLElement;
    if (!target) return;

    const now = Date.now();
    const x = e.clientX;
    const y = e.clientY;

    // Hesitation timer'ını tıklama anında sıfırla (Kullanıcı tıkladığı için tereddüt sona erdi)
    if (this.hesitationTimer) {
      clearTimeout(this.hesitationTimer);
      this.hesitationTimer = null;
    }

    // 1. RAGE CLICK ANALİZİ
    this.clickHistory.push({ el: target, x, y, time: now });
    // 1000ms'den eski tıklamaları temizle
    this.clickHistory = this.clickHistory.filter((c) => now - c.time <= 1000);

    // Aynı öğe veya 30px yarıçap içindeki tıklamaları say
    const nearbyClicks = this.clickHistory.filter((c) => {
      const isSameEl = c.el === target || target.contains(c.el) || c.el.contains(target);
      const dist = Math.hypot(c.x - x, c.y - y);
      return isSameEl || dist <= 30;
    });

    if (nearbyClicks.length >= 3 && now - this.lastRageAlertTime > 1500) {
      this.lastRageAlertTime = now;
      this.onFrustration({
        type: 'rage_click',
        selector: generateStableSelector(target),
        targetTag: target.tagName.toLowerCase(),
        timestamp: now,
        description: `1 saniyede ${nearbyClicks.length} kez ardışık öfkeli tıklama yapıldı.`,
        coords: { x, y },
        metadata: { clickCount: nearbyClicks.length },
      });
    }

    // 2. DEAD CLICK ANALİZİ
    // Yalnızca etkileşimli olması beklenen öğeler üzerinde dead click ara
    const isInteractiveCandidate =
      target.closest('button, a, input, select, textarea, [role="button"], [role="link"], [tabindex]') ||
      window.getComputedStyle(target).cursor === 'pointer';

    if (isInteractiveCandidate) {
      const clickTime = now;
      const initialUrl = window.location.href;
      const clickedSelector = generateStableSelector(target);

      // 500ms sonra DOM veya URL değişti mi kontrol et
      if (this.pendingDeadClickCheck) {
        clearTimeout(this.pendingDeadClickCheck);
      }

      this.pendingDeadClickCheck = window.setTimeout(() => {
        const domChanged = this.lastDomMutationTime >= clickTime;
        const networkTriggered = this.lastNetworkTime >= clickTime;
        const urlChanged = window.location.href !== initialUrl;

        // Hiçbir görsel veya sistemsel tepki verilmediyse Dead Click say
        if (!domChanged && !networkTriggered && !urlChanged) {
          this.onFrustration({
            type: 'dead_click',
            selector: clickedSelector,
            targetTag: target.tagName.toLowerCase(),
            timestamp: clickTime,
            description: 'Tıklamadan sonra 500ms içinde hiçbir DOM, URL veya ağ yanıtı oluşmadı.',
            coords: { x, y },
          });
        }
      }, 500);
    }
  };

  /**
   * Hesitation (Tereddüt / Kararsızlık) Tespiti
   * Buton veya link üzerinde fare >2.5 saniye beklerse tetiklenir.
   */
  private handleMouseOver = (e: MouseEvent): void => {
    const target = (e.target as HTMLElement)?.closest('button, a, [role="button"], input[type="submit"]') as HTMLElement;
    if (!target || target === this.currentHesitationTarget) return;

    // Yeni bir buton/link hedefine girildi
    this.currentHesitationTarget = target;
    if (this.hesitationTimer) {
      clearTimeout(this.hesitationTimer);
    }

    const hoverStartTime = Date.now();
    const selector = generateStableSelector(target);
    const x = e.clientX;
    const y = e.clientY;

    this.hesitationTimer = window.setTimeout(() => {
      if (this.currentHesitationTarget === target) {
        this.onFrustration({
          type: 'hesitation',
          selector,
          targetTag: target.tagName.toLowerCase(),
          timestamp: hoverStartTime,
          description: 'Kullanıcı bu etkileşimli öğe üzerinde 2.5 saniyeden uzun süre duraksadı.',
          coords: { x, y },
          metadata: { dwellSeconds: 2.5 },
        });
      }
    }, 2500);
  };

  private handleMouseOut = (e: MouseEvent): void => {
    const related = e.relatedTarget as HTMLElement;
    if (this.currentHesitationTarget && (!related || !this.currentHesitationTarget.contains(related))) {
      this.currentHesitationTarget = null;
      if (this.hesitationTimer) {
        clearTimeout(this.hesitationTimer);
        this.hesitationTimer = null;
      }
    }
  };
}
