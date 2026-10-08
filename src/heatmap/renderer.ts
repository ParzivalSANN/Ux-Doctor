/**
 * UX Doctor - Shadow DOM & Canvas Isı Haritası Çizici (Heatmap Renderer)
 *
 * 1. Sayfa üzerine Shadow DOM içinde izole bir overlay bağlar.
 * 2. Tıklama Haritası: Mavi -> Sarı -> Kırmızı radial gradient yoğunluk noktaları.
 * 3. Sürtünme Noktaları: Parlak mercan ve kırmızı vurgu halkaları.
 * 4. Scroll Katlama Çizgileri: %100, %75, %50 kesikli çizgiler ve etiketler.
 */

import { AggregatedHeatmapData, HeatPoint } from './aggregator';

const OVERLAY_CONTAINER_ID = 'ux-doctor-heatmap-root';

let hostElement: HTMLElement | null = null;
let shadowRoot: ShadowRoot | null = null;
let activeCanvas: HTMLCanvasElement | null = null;

/**
 * Verilen bir HTMLCanvasElement üzerine ısı haritasını çizer.
 * Hem sayfa içi Shadow DOM overlay'de hem de Side Panel mini önizlemesinde kullanılabilir.
 */
export function drawHeatmap(
  canvas: HTMLCanvasElement,
  data: AggregatedHeatmapData,
  options: { showClicks?: boolean; showFrustrations?: boolean; showScrollFolds?: boolean } = {}
) {
  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  const { showClicks = true, showFrustrations = true, showScrollFolds = true } = options;
  const width = canvas.width;
  const height = canvas.height;

  ctx.clearRect(0, 0, width, height);

  // 1. TIKLAMA ISI NOKTALARI (Mavi -> Sarı -> Kırmızı Radyal Gradyan)
  if (showClicks && data.points.length > 0) {
    data.points.forEach((point: HeatPoint) => {
      const radius = 28;
      const intensity = Math.min(1, Math.max(0.2, point.weight / (data.maxWeight || 1)));

      const grad = ctx.createRadialGradient(point.x, point.y, 2, point.x, point.y, radius);

      // Yoğunluğa göre renk spektrumu
      if (intensity > 0.6) {
        // Yüksek yoğunluk: Kırmızı - Turuncu
        grad.addColorStop(0, 'rgba(255, 60, 60, 0.85)');
        grad.addColorStop(0.4, 'rgba(254, 214, 104, 0.6)');
        grad.addColorStop(1, 'rgba(254, 214, 104, 0)');
      } else if (intensity > 0.3) {
        // Orta yoğunluk: Sarı - Nane Yeşili
        grad.addColorStop(0, 'rgba(254, 214, 104, 0.75)');
        grad.addColorStop(0.5, 'rgba(126, 231, 199, 0.4)');
        grad.addColorStop(1, 'rgba(126, 231, 199, 0)');
      } else {
        // Düşük yoğunluk: Mavi - Camgöbeği
        grad.addColorStop(0, 'rgba(80, 160, 255, 0.65)');
        grad.addColorStop(0.5, 'rgba(126, 231, 199, 0.3)');
        grad.addColorStop(1, 'rgba(80, 160, 255, 0)');
      }

      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.arc(point.x, point.y, radius, 0, Math.PI * 2);
      ctx.fill();
    });
  }

  // 2. SÜRTÜNME NOKTALARI (Parlak Mercan / Kırmızı Halkalar)
  if (showFrustrations && data.frustrationPoints.length > 0) {
    data.frustrationPoints.forEach((fPoint: HeatPoint) => {
      ctx.save();
      ctx.strokeStyle = '#ff9f76';
      ctx.lineWidth = 3;
      ctx.setLineDash([4, 4]);

      // Dış halka
      ctx.beginPath();
      ctx.arc(fPoint.x, fPoint.y, 24, 0, Math.PI * 2);
      ctx.stroke();

      // İç dolgu ve merkez nokta
      ctx.fillStyle = 'rgba(255, 107, 107, 0.4)';
      ctx.beginPath();
      ctx.arc(fPoint.x, fPoint.y, 8, 0, Math.PI * 2);
      ctx.fill();

      ctx.restore();
    });
  }

  // 3. SCROLL KATLAMA ÇİZGİLERİ (Fold Lines: %100, %75, %50)
  if (showScrollFolds && data.scrollFolds.length > 0) {
    data.scrollFolds.forEach((fold) => {
      ctx.save();
      ctx.strokeStyle = fold.percentage === 100 ? '#7ee7c7' : '#fed668';
      ctx.lineWidth = 2;
      ctx.setLineDash([8, 6]);

      // Yatay kesikli çizgi
      ctx.beginPath();
      ctx.moveTo(0, fold.pixelY);
      ctx.lineTo(width, fold.pixelY);
      ctx.stroke();

      // Sol etiket kutucuğu
      ctx.setLineDash([]);
      ctx.fillStyle = '#1e1730';
      ctx.fillRect(16, fold.pixelY - 12, 110, 24);

      ctx.strokeStyle = fold.percentage === 100 ? '#7ee7c7' : '#fed668';
      ctx.lineWidth = 1.5;
      ctx.strokeRect(16, fold.pixelY - 12, 110, 24);

      ctx.fillStyle = fold.percentage === 100 ? '#7ee7c7' : '#fed668';
      ctx.font = 'bold 11px system-ui, sans-serif';
      ctx.textBaseline = 'middle';
      ctx.fillText(`%${fold.percentage} Erişim`, 24, fold.pixelY);

      ctx.restore();
    });
  }
}

/**
 * Sayfa üzerine izole bir Shadow DOM içinde ısı haritası katmanı bağlar.
 */
export function mountHeatmapOverlay(data: AggregatedHeatmapData): void {
  if (typeof document === 'undefined') return;

  // Varsa eskisini kaldır
  unmountHeatmapOverlay();

  hostElement = document.createElement('div');
  hostElement.id = OVERLAY_CONTAINER_ID;
  hostElement.style.position = 'absolute';
  hostElement.style.top = '0';
  hostElement.style.left = '0';
  hostElement.style.width = '100%';
  hostElement.style.height = `${data.pageHeight}px`;
  hostElement.style.pointerEvents = 'none';
  hostElement.style.zIndex = '2147483646';

  shadowRoot = hostElement.attachShadow({ mode: 'open' });

  // Canvas oluştur
  activeCanvas = document.createElement('canvas');
  activeCanvas.width = data.pageWidth || window.innerWidth;
  activeCanvas.height = data.pageHeight || window.innerHeight;
  activeCanvas.style.width = '100%';
  activeCanvas.style.height = '100%';
  activeCanvas.style.display = 'block';

  // Kapatma butonu & bilgi kartı (Shadow DOM içinde)
  const infoBadge = document.createElement('div');
  infoBadge.style.position = 'fixed';
  infoBadge.style.bottom = '20px';
  infoBadge.style.right = '20px';
  infoBadge.style.backgroundColor = '#1e1730';
  infoBadge.style.color = '#f1edfa';
  infoBadge.style.border = '2px solid #7ee7c7';
  infoBadge.style.padding = '10px 16px';
  infoBadge.style.borderRadius = '16px';
  infoBadge.style.fontFamily = 'system-ui, sans-serif';
  infoBadge.style.fontSize = '12px';
  infoBadge.style.fontWeight = 'bold';
  infoBadge.style.pointerEvents = 'auto';
  infoBadge.style.cursor = 'pointer';
  infoBadge.style.boxShadow = '0 8px 24px rgba(0,0,0,0.5)';
  infoBadge.innerHTML = `🔥 UX Doctor Isı Haritası (Kapatmak için tıkla)`;
  infoBadge.onclick = () => unmountHeatmapOverlay();

  shadowRoot.appendChild(activeCanvas);
  shadowRoot.appendChild(infoBadge);
  document.body.appendChild(hostElement);

  // Çizimi gerçekleştir
  drawHeatmap(activeCanvas, data);
}

/**
 * Sayfadaki ısı haritası katmanını kaldırır.
 */
export function unmountHeatmapOverlay(): void {
  if (hostElement && hostElement.parentNode) {
    hostElement.parentNode.removeChild(hostElement);
  }
  hostElement = null;
  shadowRoot = null;
  activeCanvas = null;
}

export function isHeatmapMounted(): boolean {
  return hostElement !== null;
}
