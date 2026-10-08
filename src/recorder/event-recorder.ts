/**
 * UX Doctor - Kapsamlı Olay Kaydedici (Event Recorder)
 *
 * 1. Tıklamalar (Click): Zaman damgası, seçici, relX, relY, koordinat, viewport, maskeleme.
 * 2. Fare Hareketi (MouseMove): 10Hz (100ms) throttle ile optimize edilmiş iz.
 * 3. Dikkat Takibi (Attention): IntersectionObserver ile kritik blokların dwell süresi.
 * 4. DOM Mutasyonları: rrweb.record ile tam DOM akışı kaydı.
 * 5. Sürtünme Olayları: FrustrationDetector entegrasyonu.
 */

import { record as rrwebRecord } from 'rrweb';
import { generateStableSelector, calculateRelativeCoords } from './selector-generator';
import { sanitizeElementValue, rrwebMaskInputOptions } from './masking';
import { FrustrationDetector, FrustrationEvent } from './frustration-detector';

export type RecordedEventType = 'click' | 'mousemove' | 'attention' | 'frustration';

export interface BaseRecordedEvent {
  t: number; // Başlangıçtan itibaren milisaniye (relative timestamp)
  type: RecordedEventType;
}

export interface ClickRecordedEvent extends BaseRecordedEvent {
  type: 'click';
  selector: string;
  x: number;
  y: number;
  relX: number;
  relY: number;
  vpWidth: number;
  vpHeight: number;
  targetTag: string;
  maskedText: string;
}

export interface MouseMoveRecordedEvent extends BaseRecordedEvent {
  type: 'mousemove';
  x: number;
  y: number;
}

export interface AttentionRecordedEvent extends BaseRecordedEvent {
  type: 'attention';
  selector: string;
  blockName: string;
  dwellMs: number;
  visibleRatio: number;
}

export interface FrustrationRecordedEvent extends BaseRecordedEvent {
  type: 'frustration';
  frustration: FrustrationEvent;
}

export type RecordedEvent =
  | ClickRecordedEvent
  | MouseMoveRecordedEvent
  | AttentionRecordedEvent
  | FrustrationRecordedEvent;

export interface RecordingData {
  startTime: number;
  duration: number;
  url: string;
  title: string;
  events: RecordedEvent[];
  rrwebEvents: any[];
  frustrations: FrustrationEvent[];
}

export class EventRecorder {
  private startTime = 0;
  private isRecording = false;

  private events: RecordedEvent[] = [];
  private rrwebEvents: any[] = [];
  private frustrations: FrustrationEvent[] = [];

  private rrwebStopFn: (() => void) | null = null;
  private frustrationDetector: FrustrationDetector | null = null;
  private attentionObserver: IntersectionObserver | null = null;
  private observedBlocks: Map<Element, { startTime: number; selector: string; name: string }> = new Map();

  // Mousemove 10Hz (100ms) throttle
  private lastMouseMoveTime = 0;

  private onEventCallback?: (event: RecordedEvent) => void;

  constructor(onEvent?: (event: RecordedEvent) => void) {
    this.onEventCallback = onEvent;
  }

  /**
   * Kaydı başlatır.
   */
  public start(): void {
    if (this.isRecording || typeof window === 'undefined') return;
    this.isRecording = true;
    this.startTime = Date.now();
    this.events = [];
    this.rrwebEvents = [];
    this.frustrations = [];

    // 1. rrweb DOM Snapshot & Mutation Kaydı (Maskeleme ile)
    try {
      this.rrwebStopFn = rrwebRecord({
        emit: (event) => {
          this.rrwebEvents.push(event);
        },
        ...rrwebMaskInputOptions(),
      }) || null;
    } catch (err) {
      console.warn('[UX Doctor] rrweb başlatılırken uyarı:', err);
    }

    // 2. Frustration Detector Başlat
    this.frustrationDetector = new FrustrationDetector((frustration) => {
      this.frustrations.push(frustration);
      const event: FrustrationRecordedEvent = {
        t: frustration.timestamp - this.startTime,
        type: 'frustration',
        frustration,
      };
      this.pushEvent(event);
    });
    this.frustrationDetector.start();

    // 3. Tıklama Dinleyicisi
    document.addEventListener('click', this.handleClick, true);

    // 4. Fare Hareketi Dinleyicisi (10Hz)
    document.addEventListener('mousemove', this.handleMouseMove, { passive: true });

    // 5. Dikkat Takibi (IntersectionObserver)
    this.initAttentionTracking();
  }

  /**
   * Kaydı durdurur ve toplanan verileri döndürür.
   */
  public stop(): RecordingData {
    if (!this.isRecording) {
      return {
        startTime: this.startTime,
        duration: 0,
        url: window.location.href,
        title: document.title,
        events: this.events,
        rrwebEvents: this.rrwebEvents,
        frustrations: this.frustrations,
      };
    }

    this.isRecording = false;
    const endTime = Date.now();
    const duration = endTime - this.startTime;

    // rrweb durdur
    if (this.rrwebStopFn) {
      this.rrwebStopFn();
      this.rrwebStopFn = null;
    }

    // Frustration durdur
    if (this.frustrationDetector) {
      this.frustrationDetector.stop();
      this.frustrationDetector = null;
    }

    // Event dinleyicileri kaldır
    document.removeEventListener('click', this.handleClick, true);
    document.removeEventListener('mousemove', this.handleMouseMove);

    // Dikkat takibini sonlandır ve son dwell zamanlarını hesapla
    if (this.attentionObserver) {
      this.observedBlocks.forEach((data) => {
        const dwellMs = endTime - data.startTime;
        if (dwellMs >= 1000) {
          this.pushEvent({
            t: endTime - this.startTime,
            type: 'attention',
            selector: data.selector,
            blockName: data.name,
            dwellMs,
            visibleRatio: 1,
          });
        }
      });
      this.attentionObserver.disconnect();
      this.attentionObserver = null;
      this.observedBlocks.clear();
    }

    return {
      startTime: this.startTime,
      duration,
      url: window.location.href,
      title: document.title,
      events: [...this.events],
      rrwebEvents: [...this.rrwebEvents],
      frustrations: [...this.frustrations],
    };
  }

  private pushEvent(event: RecordedEvent): void {
    this.events.push(event);
    if (this.onEventCallback) {
      this.onEventCallback(event);
    }
  }

  /**
   * Tıklama Olayı Yakalama
   */
  private handleClick = (e: MouseEvent): void => {
    if (!this.isRecording) return;

    const target = e.target as HTMLElement;
    if (!target) return;

    const now = Date.now();
    const relativeTime = now - this.startTime;
    const selector = generateStableSelector(target);
    const { relX, relY } = calculateRelativeCoords(target, e.clientX, e.clientY);
    const maskedText = sanitizeElementValue(target);

    const clickEvent: ClickRecordedEvent = {
      t: relativeTime,
      type: 'click',
      selector,
      x: Math.round(e.clientX),
      y: Math.round(e.clientY),
      relX,
      relY,
      vpWidth: window.innerWidth,
      vpHeight: window.innerHeight,
      targetTag: target.tagName.toLowerCase(),
      maskedText: maskedText.length > 80 ? maskedText.slice(0, 77) + '...' : maskedText,
    };

    this.pushEvent(clickEvent);
  };

  /**
   * Fare Hareketi (10Hz / 100ms Throttle)
   */
  private handleMouseMove = (e: MouseEvent): void => {
    if (!this.isRecording) return;

    const now = Date.now();
    // 100ms'den sık gelen hareketleri atla (10Hz)
    if (now - this.lastMouseMoveTime < 100) return;
    this.lastMouseMoveTime = now;

    const moveEvent: MouseMoveRecordedEvent = {
      t: now - this.startTime,
      type: 'mousemove',
      x: Math.round(e.clientX),
      y: Math.round(e.clientY),
    };

    this.pushEvent(moveEvent);
  };

  /**
   * Sayfadaki ana blokların dwell (ekranda kalma) süresini ölçer.
   */
  private initAttentionTracking(): void {
    if (typeof IntersectionObserver === 'undefined') return;

    const candidateSelectors = [
      'header',
      'main',
      'footer',
      'nav',
      'section',
      'form',
      '[id*="hero" i]',
      '[id*="pricing" i]',
      '[id*="features" i]',
      '[id*="faq" i]',
      '[id*="checkout" i]',
    ];

    const elementsToObserve = new Set<Element>();
    candidateSelectors.forEach((sel) => {
      document.querySelectorAll(sel).forEach((el) => elementsToObserve.add(el));
    });

    this.attentionObserver = new IntersectionObserver(
      (entries) => {
        const now = Date.now();

        entries.forEach((entry) => {
          const el = entry.target;
          const selector = generateStableSelector(el);
          const blockName = el.id || el.tagName.toLowerCase();

          if (entry.isIntersecting && entry.intersectionRatio >= 0.4) {
            // Ekrana girdi -> Başlangıç zamanını kaydet
            if (!this.observedBlocks.has(el)) {
              this.observedBlocks.set(el, { startTime: now, selector, name: blockName });
            }
          } else {
            // Ekrandan çıktı -> Süreyi hesapla
            const existing = this.observedBlocks.get(el);
            if (existing) {
              const dwellMs = now - existing.startTime;
              // 800ms'den uzun kalındıysa kayda değer dikkat olarak ekle
              if (dwellMs >= 800) {
                this.pushEvent({
                  t: now - this.startTime,
                  type: 'attention',
                  selector: existing.selector,
                  blockName: existing.name,
                  dwellMs,
                  visibleRatio: Number(entry.intersectionRatio.toFixed(2)),
                });
              }
              this.observedBlocks.delete(el);
            }
          }
        });
      },
      { threshold: [0.4] }
    );

    elementsToObserve.forEach((el) => {
      this.attentionObserver?.observe(el);
    });
  }
}
