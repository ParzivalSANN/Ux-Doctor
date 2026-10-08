/**
 * UX Doctor - Davranış Skoru ve Güven Kuralı Motoru (Behavioral Scorer)
 *
 * 1. Alt Metrikler:
 *    - Görev Tamamlama: %30
 *    - Sürtünme Yoğunluğu: %25
 *    - CTA Etkinliği: %20
 *    - Scroll Verimi: %10
 *    - Form Tamamlama: %10
 *    - Hata Maruziyeti: %5
 *
 * 2. 5 Oturum Kuralı:
 *    - Oturum Sayısı < 5: "Düşük Güven (Yön Gösterici)"
 *    - Oturum Sayısı ≥ 5: "Yüksek Güven (İstatistiki Desen)"
 *
 * 3. Genel Skora Etkisi:
 *    - Davranış verisi varsa %25 ağırlıkla genel UX skoruna katılır.
 *    - Yoksa hariç tutulup statik ergonomi skoru normalize edilir.
 */

import { Session } from '../storage/sessions';

export interface BehavioralSubScore {
  name: string;
  key: string;
  weight: number; // 0 - 1 (örn: 0.30)
  score: number; // 0 - 100
  weightedScore: number;
  description: string;
}

export type ConfidenceLevel = 'low' | 'high';

export interface BehavioralScoreResult {
  overallBehaviorScore: number; // 0 - 100
  confidence: ConfidenceLevel;
  confidenceLabel: string;
  confidenceDescription: string;
  sessionCount: number;
  hasBehaviorData: boolean;
  behaviorWeightInTotal: number; // 0.25 veya 0
  subScores: {
    taskCompletion: BehavioralSubScore;
    frustrationDensity: BehavioralSubScore;
    ctaEffectiveness: BehavioralSubScore;
    scrollEfficiency: BehavioralSubScore;
    formCompletion: BehavioralSubScore;
    errorExposure: BehavioralSubScore;
  };
  keyFindings: string[];
}

/**
 * Toplanan oturumları analiz ederek davranış skorunu ve güven düzeyini hesaplar.
 */
export function calculateBehavioralScore(sessions: Session[]): BehavioralScoreResult {
  const sessionCount = sessions.length;
  const hasBehaviorData = sessionCount > 0;

  // Veri yoksa nötr varsayılan değer
  if (!hasBehaviorData) {
    return {
      overallBehaviorScore: 80,
      confidence: 'low',
      confidenceLabel: 'Düşük Güven (Yön Gösterici)',
      confidenceDescription: 'Henüz kaydedilmiş oturum verisi yok. Skor ön kabul olarak belirlendi.',
      sessionCount: 0,
      hasBehaviorData: false,
      behaviorWeightInTotal: 0,
      subScores: createEmptySubScores(),
      keyFindings: ['Henüz kullanıcı oturumu kaydedilmedi.'],
    };
  }

  // 1. "5 Oturum Kuralı" Güven Seviyesi Değerlendirmesi
  const confidence: ConfidenceLevel = sessionCount >= 5 ? 'high' : 'low';
  const confidenceLabel =
    sessionCount >= 5 ? 'Yüksek Güven (İstatistiki Desen)' : 'Düşük Güven (Yön Gösterici)';
  const confidenceDescription =
    sessionCount >= 5
      ? `${sessionCount} oturum analiz edildi. Bulgular istatistiki olarak doğrulanmış kalıcı desenlerdir.`
      : `${sessionCount} oturum analiz edildi (<5). Bulgular genel eğilim gösterir ancak kesinlik için daha fazla oturum önerilir.`;

  // Metrik Hesaplamaları
  let totalFrustrations = 0;
  let totalDurationSec = 0;
  let rageClicks = 0;
  let deadClicks = 0;
  let hesitations = 0;
  let ctaClicks = 0;

  sessions.forEach((s) => {
    totalFrustrations += s.frustrationCount || (s.frustrations ? s.frustrations.length : 0);
    totalDurationSec += Math.round((s.duration || 1000) / 1000);

    if (s.frustrations) {
      s.frustrations.forEach((f) => {
        if (f.type === 'rage_click') rageClicks++;
        if (f.type === 'dead_click') deadClicks++;
        if (f.type === 'hesitation') hesitations++;
      });
    }

    if (s.events) {
      s.events.forEach((ev) => {
        if (ev.type === 'click' && (ev.targetTag === 'button' || ev.targetTag === 'a')) {
          ctaClicks++;
        }
      });
    }
  });

  const avgFrustrationsPerSession = totalFrustrations / sessionCount;

  // Alt Metrik 1: Görev Tamamlama (%30)
  // Sürtünme ve U-turn durumlarına göre tamamlama tahmini
  const taskCompletionScore = Math.max(20, Math.min(100, Math.round(100 - avgFrustrationsPerSession * 18)));

  // Alt Metrik 2: Sürtünme Yoğunluğu (%25)
  // Dakika başına düşen sürtünme sıklığı
  const totalMinutes = Math.max(totalDurationSec / 60, 0.5);
  const frustrationsPerMinute = totalFrustrations / totalMinutes;
  const frustrationDensityScore = Math.max(10, Math.min(100, Math.round(100 - frustrationsPerMinute * 25)));

  // Alt Metrik 3: CTA Etkinliği (%20)
  // Tıklanan buton sayısı ve dead click oranı
  const deadClickRatio = ctaClicks > 0 ? deadClicks / ctaClicks : 0;
  const ctaEffectivenessScore = Math.max(30, Math.min(100, Math.round(95 - deadClickRatio * 80)));

  // Alt Metrik 4: Scroll Verimi (%10)
  const scrollEfficiencyScore = Math.max(40, Math.min(100, 85 - (hesitations > 2 ? 15 : 0)));

  // Alt Metrik 5: Form Tamamlama (%10)
  const formCompletionScore = Math.max(30, Math.min(100, 90 - rageClicks * 10));

  // Alt Metrik 6: Hata Maruziyeti (%5)
  const errorExposureScore = Math.max(15, Math.min(100, Math.round(100 - (rageClicks + deadClicks) * 12)));

  const subScores = {
    taskCompletion: {
      name: 'Görev Tamamlama',
      key: 'taskCompletion',
      weight: 0.30,
      score: taskCompletionScore,
      weightedScore: Number((taskCompletionScore * 0.30).toFixed(1)),
      description: 'Kullanıcının hedefine sürtünmesiz ulaşabilme oranı',
    },
    frustrationDensity: {
      name: 'Sürtünme Yoğunluğu',
      key: 'frustrationDensity',
      weight: 0.25,
      score: frustrationDensityScore,
      weightedScore: Number((frustrationDensityScore * 0.25).toFixed(1)),
      description: 'Zaman birimi başına düşen öfkeli/ölü tıklama sıklığı',
    },
    ctaEffectiveness: {
      name: 'CTA Etkinliği',
      key: 'ctaEffectiveness',
      weight: 0.20,
      score: ctaEffectivenessScore,
      weightedScore: Number((ctaEffectivenessScore * 0.20).toFixed(1)),
      description: 'Aksiyon butonlarının tıklanma ve başarıyla tetiklenme oranı',
    },
    scrollEfficiency: {
      name: 'Scroll Verimi',
      key: 'scrollEfficiency',
      weight: 0.10,
      score: scrollEfficiencyScore,
      weightedScore: Number((scrollEfficiencyScore * 0.10).toFixed(1)),
      description: 'Kullanıcının sayfada aradığını bulma ve kaydırma dengesi',
    },
    formCompletion: {
      name: 'Form Tamamlama',
      key: 'formCompletion',
      weight: 0.10,
      score: formCompletionScore,
      weightedScore: Number((formCompletionScore * 0.10).toFixed(1)),
      description: 'Giriş alanlarındaki akıcılık ve tereddütsüz doldurma',
    },
    errorExposure: {
      name: 'Hata Maruziyeti',
      key: 'errorExposure',
      weight: 0.05,
      score: errorExposureScore,
      weightedScore: Number((errorExposureScore * 0.05).toFixed(1)),
      description: 'Kullanıcının yanıtsız kalan engellere denk gelme riski',
    },
  };

  // Toplam Ağırlıklı Davranış Skoru
  const overallBehaviorScore = Math.round(
    subScores.taskCompletion.weightedScore +
    subScores.frustrationDensity.weightedScore +
    subScores.ctaEffectiveness.weightedScore +
    subScores.scrollEfficiency.weightedScore +
    subScores.formCompletion.weightedScore +
    subScores.errorExposure.weightedScore
  );

  // Öne Çıkan Bulgular (Key Findings)
  const keyFindings: string[] = [];
  if (rageClicks > 0) {
    keyFindings.push(`Oturumlarda toplam ${rageClicks} öfkeli tıklama (rage click) tespit edildi.`);
  }
  if (deadClicks > 0) {
    keyFindings.push(`${deadClicks} kez tıklanabilir sanılan fakat tepki vermeyen öğeye tıklandı.`);
  }
  if (hesitations > 0) {
    keyFindings.push(`${hesitations} farklı alanda 2.5 saniyeyi aşan bilişsel duraksama görüldü.`);
  }
  if (keyFindings.length === 0) {
    keyFindings.push('Kullanıcı akışı genel olarak pürüzsüz ve sürtünmesiz ilerledi.');
  }

  return {
    overallBehaviorScore: Math.min(100, Math.max(0, overallBehaviorScore)),
    confidence,
    confidenceLabel,
    confidenceDescription,
    sessionCount,
    hasBehaviorData: true,
    behaviorWeightInTotal: 0.25,
    subScores,
    keyFindings,
  };
}

/**
 * Genel Bileşik UX Skorunu Hesaplar.
 * Davranış verisi varsa %25 ağırlıkla dahil eder; yoksa statik skoru %100 normalize eder.
 */
export function calculateCompositeUXScore(
  staticScore: number,
  behavioralResult?: BehavioralScoreResult
): { compositeScore: number; staticWeight: number; behaviorWeight: number } {
  if (behavioralResult && behavioralResult.hasBehaviorData) {
    const compositeScore = Math.round(staticScore * 0.75 + behavioralResult.overallBehaviorScore * 0.25);
    return {
      compositeScore,
      staticWeight: 0.75,
      behaviorWeight: 0.25,
    };
  }

  // Davranış verisi yoksa doğrudan statik skor
  return {
    compositeScore: Math.round(staticScore),
    staticWeight: 1.0,
    behaviorWeight: 0.0,
  };
}

function createEmptySubScores() {
  return {
    taskCompletion: { name: 'Görev Tamamlama', key: 'taskCompletion', weight: 0.30, score: 80, weightedScore: 24, description: 'Veri bekleniyor' },
    frustrationDensity: { name: 'Sürtünme Yoğunluğu', key: 'frustrationDensity', weight: 0.25, score: 80, weightedScore: 20, description: 'Veri bekleniyor' },
    ctaEffectiveness: { name: 'CTA Etkinliği', key: 'ctaEffectiveness', weight: 0.20, score: 80, weightedScore: 16, description: 'Veri bekleniyor' },
    scrollEfficiency: { name: 'Scroll Verimi', key: 'scrollEfficiency', weight: 0.10, score: 80, weightedScore: 8, description: 'Veri bekleniyor' },
    formCompletion: { name: 'Form Tamamlama', key: 'formCompletion', weight: 0.10, score: 80, weightedScore: 8, description: 'Veri bekleniyor' },
    errorExposure: { name: 'Hata Maruziyeti', key: 'errorExposure', weight: 0.05, score: 80, weightedScore: 4, description: 'Veri bekleniyor' },
  };
}
