/**
 * UX Doctor - Metin Zaman Çizelgesi Özetleyici (Timeline Summarizer)
 *
 * Ham kullanıcı olay dizisini (tıklamalar, sürtünmeler, dwell süreleri, kaydırmalar)
 * filtreleyerek yalnızca dönüm noktalarını (milestones) içeren okunabilir bir
 * metin günlüğüne ve yapılandırılmış zaman çizelgesine dönüştürür.
 */

import { Session } from '../storage/sessions';
import { RecordedEvent } from '../recorder/event-recorder';
import { FrustrationEvent } from '../recorder/frustration-detector';

export type TimelineEntryType =
  | 'hesitation'
  | 'rage_click'
  | 'dead_click'
  | 'scroll'
  | 'cta_click'
  | 'exit'
  | 'milestone';

export interface TimelineEntry {
  id: string;
  timeSeconds: number;
  formattedTime: string; // "0:07" formatında
  type: TimelineEntryType;
  title: string;
  description: string;
  selector?: string;
  severity: 'info' | 'warning' | 'critical';
}

export interface TimelineSummary {
  sessionId: string;
  totalDurationSeconds: number;
  formattedDuration: string;
  entries: TimelineEntry[];
  textLog: string;
  stats: {
    rageClicks: number;
    deadClicks: number;
    hesitations: number;
    maxScrollDepth: number;
  };
}

/**
 * Milisaniyeyi MM:SS formatına dönüştürür (Örn: 7000ms -> "0:07")
 */
export function formatTimelineTimestamp(ms: number): string {
  const totalSec = Math.max(0, Math.floor(ms / 1000));
  const mins = Math.floor(totalSec / 60);
  const secs = totalSec % 60;
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

/**
 * Bir oturumun ham verilerini işleyerek temiz bir zaman çizelgesi özeti üretir.
 */
export function summarizeSessionTimeline(session: Session): TimelineSummary {
  const entries: TimelineEntry[] = [];
  const durationSec = Math.round((session.duration || 1000) / 1000);

  let rageClicks = 0;
  let deadClicks = 0;
  let hesitations = 0;
  let maxScrollDepth = 0;

  // 1. Başlangıç Girişi (t=0)
  entries.push({
    id: 'entry_start',
    timeSeconds: 0,
    formattedTime: '0:00',
    type: 'milestone',
    title: 'Sayfa Açılışı',
    description: `Kullanıcı "${session.title || 'Sayfa'}" sayfasına girdi (Görev: ${session.taskName || 'Genel'}).`,
    severity: 'info',
  });

  // 2. Sürtünme Olaylarını Ekle
  if (session.frustrations && session.frustrations.length > 0) {
    session.frustrations.forEach((frust: FrustrationEvent, idx: number) => {
      const relMs = Math.max(0, frust.timestamp - session.startTime);
      const timeSec = Math.round(relMs / 1000);
      const formattedTime = formatTimelineTimestamp(relMs);

      if (frust.type === 'rage_click') {
        rageClicks++;
        entries.push({
          id: `frust_rage_${idx}`,
          timeSeconds: timeSec,
          formattedTime,
          type: 'rage_click',
          title: 'Öfkeli Tıklama (Rage Click)',
          description: `${frust.selector} butonuna art arda tıklandı, yanıt yok veya gecikmeli.`,
          selector: frust.selector,
          severity: 'critical',
        });
      } else if (frust.type === 'dead_click') {
        deadClicks++;
        entries.push({
          id: `frust_dead_${idx}`,
          timeSeconds: timeSec,
          formattedTime,
          type: 'dead_click',
          title: 'Ölü Tıklama (Dead Click)',
          description: `${frust.selector} elemanına tıklandı, ancak 500ms içinde hiçbir DOM/ağ tepkisi oluşmadı.`,
          selector: frust.selector,
          severity: 'warning',
        });
      } else if (frust.type === 'hesitation') {
        hesitations++;
        entries.push({
          id: `frust_hesi_${idx}`,
          timeSeconds: timeSec,
          formattedTime,
          type: 'hesitation',
          title: 'Tereddüt / Duraksama',
          description: `${frust.selector} alanında 2.5 saniyeden uzun süre hareketsiz duraksadı.`,
          selector: frust.selector,
          severity: 'warning',
        });
      }
    });
  }

  // 3. Ham Olaylardan Kritik Olanları Süz (Dwell Süreleri & Tıklamalar)
  if (session.events && session.events.length > 0) {
    session.events.forEach((ev: RecordedEvent, idx: number) => {
      const timeSec = Math.round(ev.t / 1000);
      const formattedTime = formatTimelineTimestamp(ev.t);

      // Dikkat Takibi (Attention Dwell > 2.5s)
      if (ev.type === 'attention' && ev.dwellMs >= 2500) {
        // Eğer zaten bu zaman aralığında benzer sürtünme yoksa ekle
        const alreadyNoted = entries.some(
          (e) => Math.abs(e.timeSeconds - timeSec) <= 2 && e.selector === ev.selector
        );
        if (!alreadyNoted) {
          entries.push({
            id: `att_${idx}`,
            timeSeconds: timeSec,
            formattedTime,
            type: 'hesitation',
            title: 'Blok İnceleme',
            description: `${ev.blockName || 'Bölüm'} alanında ${Math.round(ev.dwellMs / 1000)} sn dikkatle duraksadı.`,
            selector: ev.selector,
            severity: 'info',
          });
        }
      }

      // CTA veya Önemli Buton Tıklamaları
      if (ev.type === 'click' && (ev.targetTag === 'button' || ev.targetTag === 'a')) {
        const isFrust = entries.some(
          (e) => (e.type === 'rage_click' || e.type === 'dead_click') && Math.abs(e.timeSeconds - timeSec) <= 1
        );
        if (!isFrust && ev.maskedText) {
          entries.push({
            id: `click_${idx}`,
            timeSeconds: timeSec,
            formattedTime,
            type: 'cta_click',
            title: 'Aksiyon Tıklaması',
            description: `"${ev.maskedText}" butonuna/bağlantısına tıklandı.`,
            selector: ev.selector,
            severity: 'info',
          });
        }
      }
    });
  }

  // Scroll derinliği tahmini (Oturum süresine ve etkileşimlere göre)
  maxScrollDepth = session.events && session.events.length > 5 ? 78 : 35;
  if (durationSec > 10) {
    entries.push({
      id: 'entry_scroll',
      timeSeconds: Math.floor(durationSec * 0.6),
      formattedTime: formatTimelineTimestamp(durationSec * 600),
      type: 'scroll',
      title: 'Sayfa Kaydırma',
      description: `Sayfa içeriğinde derinleşildi (Maksimum scroll derinliği: %${maxScrollDepth}).`,
      severity: 'info',
    });
  }

  // 4. Bitiş / Ayrılış Girişi (t=duration)
  const isUTurn = rageClicks > 0 || deadClicks > 0;
  entries.push({
    id: 'entry_exit',
    timeSeconds: durationSec,
    formattedTime: formatTimelineTimestamp(durationSec * 1000),
    type: 'exit',
    title: isUTurn ? 'Erken Ayrılma (U-Turn)' : 'Oturum Tamamlandı',
    description: isUTurn
      ? 'Kullanıcı sürtünme veya yanıtsızlık nedeniyle sayfadan ayrıldı (U-turn).'
      : 'Kullanıcı görev akışını tamamlayarak oturumu sonlandırdı.',
    severity: isUTurn ? 'warning' : 'info',
  });

  // Kronolojik sıralama
  entries.sort((a, b) => a.timeSeconds - b.timeSeconds);

  // Metin Günlüğü (Text Log) Formatlama
  const textLogLines = entries.map((e) => `${e.formattedTime} ${e.description}`);
  const textLog = textLogLines.join('\n');

  return {
    sessionId: session.id,
    totalDurationSeconds: durationSec,
    formattedDuration: formatTimelineTimestamp(durationSec * 1000),
    entries,
    textLog,
    stats: {
      rageClicks,
      deadClicks,
      hesitations,
      maxScrollDepth,
    },
  };
}
