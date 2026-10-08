/**
 * UX Doctor - Isı Haritası Toplayıcı (Heatmap Aggregator)
 *
 * Kaydedilen oturumlardaki tıklama koordinatlarını, relX / relY oranlarını
 * ve sürtünme noktalarını toplayarak normalize edilmiş bir yoğunluk haritasına dönüştürür.
 */

import { Session } from '../storage/sessions';

export interface HeatPoint {
  x: number;
  y: number;
  weight: number;
  isFrustration?: boolean;
  selector?: string;
  count?: number;
}

export interface ScrollFoldLine {
  percentage: number; // 100, 75, 50, 25
  pixelY: number;
  userCountRatio: number; // 1.0, 0.75 vb.
}

export interface AggregatedHeatmapData {
  points: HeatPoint[];
  maxWeight: number;
  totalClicks: number;
  frustrationPoints: HeatPoint[];
  scrollFolds: ScrollFoldLine[];
  pageHeight: number;
  pageWidth: number;
}

/**
 * Birden fazla veya tek bir oturumdaki tıklamaları sayfadaki gerçek piksel konumlarına dönüştürür.
 */
export function aggregateHeatmapData(sessions: Session[]): AggregatedHeatmapData {
  const points: HeatPoint[] = [];
  const frustrationPoints: HeatPoint[] = [];

  const docHeight = typeof document !== 'undefined' ? Math.max(document.documentElement.scrollHeight, 1200) : 1200;
  const docWidth = typeof document !== 'undefined' ? Math.max(document.documentElement.scrollWidth, 1280) : 1280;

  let totalClicks = 0;
  let maxWeight = 1;

  // Koordinat kümeleme (aynı 15px yarıçapındaki tıklamaları birleştirerek ağırlık hesapla)
  const clusterMap = new Map<string, HeatPoint>();

  sessions.forEach((session) => {
    // 1. Tıklamaları Tara
    if (session.events) {
      session.events.forEach((ev) => {
        if (ev.type === 'click') {
          totalClicks++;
          let mappedX = ev.x;
          let mappedY = ev.y;

          // Eğer sayfadaki eleman bulunabiliyorsa relX ve relY ile mutlak konumu hesapla
          if (typeof document !== 'undefined' && ev.selector) {
            try {
              const el = document.querySelector(ev.selector);
              if (el) {
                const rect = el.getBoundingClientRect();
                const scrollY = window.scrollY || window.pageYOffset || 0;
                const scrollX = window.scrollX || window.pageXOffset || 0;

                mappedX = Math.round(rect.left + scrollX + ev.relX * rect.width);
                mappedY = Math.round(rect.top + scrollY + ev.relY * rect.height);
              }
            } catch {
              // Selector geçersizse ham koordinatları kullan
            }
          }

          // 15px ızgara kümeleme
          const clusterKey = `${Math.round(mappedX / 15) * 15}_${Math.round(mappedY / 15) * 15}`;
          const existing = clusterMap.get(clusterKey);

          if (existing) {
            existing.weight += 1;
            existing.count = (existing.count || 1) + 1;
            if (existing.weight > maxWeight) maxWeight = existing.weight;
          } else {
            const newPoint: HeatPoint = {
              x: mappedX,
              y: mappedY,
              weight: 1,
              selector: ev.selector,
              count: 1,
            };
            clusterMap.set(clusterKey, newPoint);
          }
        }
      });
    }

    // 2. Sürtünme Noktalarını Ekle (Rage / Dead Clicks)
    if (session.frustrations) {
      session.frustrations.forEach((frust) => {
        frustrationPoints.push({
          x: frust.coords?.x || 100,
          y: frust.coords?.y || 100,
          weight: 5,
          isFrustration: true,
          selector: frust.selector,
        });
      });
    }
  });

  clusterMap.forEach((p) => points.push(p));

  // 3. Scroll Katlama Çizgileri (%100, %75, %50, %25)
  const scrollFolds: ScrollFoldLine[] = [
    { percentage: 100, pixelY: Math.round(docHeight * 0.22), userCountRatio: 1.0 }, // Above the fold
    { percentage: 75, pixelY: Math.round(docHeight * 0.45), userCountRatio: 0.75 },
    { percentage: 50, pixelY: Math.round(docHeight * 0.70), userCountRatio: 0.50 },
    { percentage: 25, pixelY: Math.round(docHeight * 0.90), userCountRatio: 0.25 },
  ];

  return {
    points,
    maxWeight: Math.max(maxWeight, 1),
    totalClicks,
    frustrationPoints,
    scrollFolds,
    pageHeight: docHeight,
    pageWidth: docWidth,
  };
}
