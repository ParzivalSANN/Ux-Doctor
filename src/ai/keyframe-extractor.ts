/**
 * UX Doctor - Anahtar Kare Seçici (Keyframe Extractor)
 *
 * Kullanıcı oturumundaki yüzlerce olay ve DOM mutasyonundan
 * yalnızca 3-5 adet kritik ekran anını kanıt olarak filtreler:
 *  1. Kare 1: Sayfa ilk açılış hali (Above the Fold)
 *  2. Kare 2: İlk Rage / Dead Click anı (kırmızı halka vurgusu ile)
 *  3. Kare 3: En uzun duraksamanın (Hesitation) yaşandığı alan
 *  4. Kare 4: Sayfadan ayrılmadan önceki son durum (U-Turn / Exit)
 */

import { Session } from '../storage/sessions';
import { formatTimelineTimestamp } from './timeline-summarizer';
import { FrustrationEvent } from '../recorder/frustration-detector';

export type KeyframeReason = 'initial_load' | 'first_friction' | 'max_hesitation' | 'session_exit';

export interface KeyframeHighlight {
  x: number;
  y: number;
  radius: number;
  color: string;
  label?: string;
}

export interface Keyframe {
  id: string;
  frameIndex: number;
  title: string;
  reason: KeyframeReason;
  timestampMs: number;
  formattedTime: string;
  targetSelector?: string;
  description: string;
  badgeLabel: string;
  badgeColor: string;
  highlight?: KeyframeHighlight;
}

/**
 * Oturum verilerini analiz ederek en kritik 3-5 anahtar kareyi çıkarır.
 */
export function extractKeyframes(session: Session): Keyframe[] {
  const keyframes: Keyframe[] = [];
  const durationMs = session.duration || 10000;

  // 1. KARE: Sayfa İlk Açılış Hali (Above the Fold - t = 0)
  keyframes.push({
    id: 'kf_1_initial',
    frameIndex: 1,
    title: 'Kare 1: İlk Yükleme (Above the Fold)',
    reason: 'initial_load',
    timestampMs: 0,
    formattedTime: '0:00',
    description: `Kullanıcı "${session.title || 'Sayfa'}" sayfasına ilk giriş anı. İlk görünür alanın düzeni ve CTA hiyerarşisi.`,
    badgeLabel: 'İlk Giriş',
    badgeColor: '#7ee7c7', // Mint
  });

  // 2. KARE: İlk Rage veya Dead Click Anı (Sürtünme)
  const firstFriction = session.frustrations?.find(
    (f: FrustrationEvent) => f.type === 'rage_click' || f.type === 'dead_click'
  );

  if (firstFriction) {
    const relMs = Math.max(0, firstFriction.timestamp - session.startTime);
    keyframes.push({
      id: 'kf_2_friction',
      frameIndex: 2,
      title: `Kare 2: İlk ${firstFriction.type === 'rage_click' ? 'Öfkeli' : 'Ölü'} Tıklama`,
      reason: 'first_friction',
      timestampMs: relMs,
      formattedTime: formatTimelineTimestamp(relMs),
      targetSelector: firstFriction.selector,
      description: `${firstFriction.selector} elemanında sürtünme tespit edildi: ${firstFriction.description}`,
      badgeLabel: firstFriction.type === 'rage_click' ? 'Rage Click' : 'Dead Click',
      badgeColor: '#ff6b6b', // Red / Coral
      highlight: {
        x: firstFriction.coords?.x || 200,
        y: firstFriction.coords?.y || 250,
        radius: 36,
        color: '#ff6b6b',
        label: 'Tepkisiz / Çoklu Tıklama',
      },
    });
  }

  // 3. KARE: En Uzun Duraksama (Hesitation / Kararsızlık)
  const hesitations = session.frustrations?.filter((f: FrustrationEvent) => f.type === 'hesitation') || [];
  const maxHesitation = hesitations[0]; // İlk veya en belirgin duraksama

  if (maxHesitation) {
    const relMs = Math.max(0, maxHesitation.timestamp - session.startTime);
    keyframes.push({
      id: 'kf_3_hesitation',
      frameIndex: keyframes.length + 1,
      title: 'Kare 3: Kararsızlık & Duraksama Noktası',
      reason: 'max_hesitation',
      timestampMs: relMs,
      formattedTime: formatTimelineTimestamp(relMs),
      targetSelector: maxHesitation.selector,
      description: `Kullanıcı ${maxHesitation.selector} üzerinde 2.5 sn hareketsiz kaldı. Algısal sürtünme veya karar güçlüğü.`,
      badgeLabel: 'Duraksama (2.5s+)',
      badgeColor: '#fed668', // Yellow
      highlight: {
        x: maxHesitation.coords?.x || 300,
        y: maxHesitation.coords?.y || 180,
        radius: 42,
        color: '#fed668',
        label: 'Bilişsel Yük / Tereddüt',
      },
    });
  }

  // 4. KARE: Sayfadan Ayrılmadan Önceki Son Durum (Final / Exit)
  keyframes.push({
    id: 'kf_final_exit',
    frameIndex: keyframes.length + 1,
    title: `Kare ${keyframes.length + 1}: Ayrılış Anı (${firstFriction ? 'U-Turn' : 'Tamamlama'})`,
    reason: 'session_exit',
    timestampMs: durationMs,
    formattedTime: formatTimelineTimestamp(durationMs),
    description: firstFriction
      ? 'Kullanıcı sürtünme sonrasında görev akışını tamamlayamadan sayfayı terk etti.'
      : 'Kullanıcı sayfadaki aksiyonları tamamlayarak oturumu başarıyla sonlandırdı.',
    badgeLabel: firstFriction ? 'Terk Edildi' : 'Tamamlandı',
    badgeColor: firstFriction ? '#ff85a1' : '#7ee7c7',
  });

  return keyframes;
}
