/**
 * UX Doctor - Bileşik Skorlama Motoru (Composite Scoring Engine)
 *
 * Ödev Rubriği Kapsamında Skorlama Modeli:
 * 1. Deterministik Katman (WCAG 2.2 AA & Kod Kontrolleri): %50 Ağırlık
 * 2. Yorumsal Katman (Don Norman'ın 6 Temel İlkesi): %50 Ağırlık
 *
 * FORMÜL:
 * Toplam UX Skoru = (Deterministik Skor * 0.50) + (Norman İlkeleri Skoru * 0.50)
 *
 * GEREKÇE:
 * - Deterministik Katman (%50): Nesnel, matematiksel, yasal ve uluslararası standartlara
 *   (WCAG 2.2 AA) dayalı fiziksel erişilebilirlik ve ergonomi kurallarını ölçer.
 * - Yorumsal Katman (%50): Kullanıcının bilişsel zihinsel modelini, etkileşim akıcılığını,
 *   algısal sağlarlık ve geri bildirim kalitesini (Don Norman) ölçer.
 * - Bu iki katmanın eşit ağırlıklı dengesi, hem teknik kusursuzluğu hem de insan odaklı
 *   kullanılabilirlik kalitesini tek bir güvenilir ve gerekçeli puanda birleştirir.
 */

import { DeterministicAuditResult } from '../deterministic/deterministic-engine';
import { NormanAuditReport } from '../../ai/norman-engine';

export interface CompositeUXScoreResult {
  overallUXScore: number; // 0 - 100
  deterministicScore: number; // 0 - 100 (%50 ağırlık)
  interpretiveScore: number; // 0 - 100 (%50 ağırlık)
  weights: {
    deterministic: number; // 0.50
    interpretive: number; // 0.50
  };
  scoreGrade: 'Mükemmel' | 'İyi' | 'Orta' | 'Zayıf' | 'Kritik';
  gradeColor: string; // Tailwind hex
  formulaExplanation: string;
  totalFindingsCount: number;
  criticalCount: number;
  highCount: number;
  mediumCount: number;
  lowCount: number;
  evaluatedAt: number;
}

export function calculateCompositeScore(
  deterministic: DeterministicAuditResult,
  norman: NormanAuditReport
): CompositeUXScoreResult {
  const detScore = deterministic.score;
  const normScore = norman.overallScore;

  // %50 Deterministik + %50 Norman
  const composite = Math.round(detScore * 0.5 + normScore * 0.5);
  const boundedScore = Math.max(0, Math.min(100, composite));

  let scoreGrade: CompositeUXScoreResult['scoreGrade'] = 'Orta';
  let gradeColor = '#fed668'; // Pastel sarı

  if (boundedScore >= 90) {
    scoreGrade = 'Mükemmel';
    gradeColor = '#7ee7c7'; // Nane yeşili
  } else if (boundedScore >= 75) {
    scoreGrade = 'İyi';
    gradeColor = '#a7f3d0';
  } else if (boundedScore >= 60) {
    scoreGrade = 'Orta';
    gradeColor = '#fed668';
  } else if (boundedScore >= 40) {
    scoreGrade = 'Zayıf';
    gradeColor = '#ff9f76'; // Mercan
  } else {
    scoreGrade = 'Kritik';
    gradeColor = '#ff6b6b'; // Hata kırmızısı
  }

  // Toplam şiddet sayıları
  let criticalCount = deterministic.criticalCount;
  let highCount = deterministic.highCount;
  let mediumCount = deterministic.mediumCount;
  let lowCount = deterministic.lowCount;

  norman.findings.forEach((f) => {
    if (f.severity === 'Kritik') criticalCount++;
    else if (f.severity === 'Yüksek') highCount++;
    else if (f.severity === 'Orta') mediumCount++;
    else if (f.severity === 'Düşük') lowCount++;
  });

  const totalFindingsCount = deterministic.totalFindingsCount + norman.findings.length;

  return {
    overallUXScore: boundedScore,
    deterministicScore: detScore,
    interpretiveScore: normScore,
    weights: {
      deterministic: 0.5,
      interpretive: 0.5,
    },
    scoreGrade,
    gradeColor,
    formulaExplanation:
      'Genel UX Skoru = (0.50 × WCAG 2.2 AA Deterministik Skor) + (0.50 × Don Norman 6 İlke Skoru)',
    totalFindingsCount,
    criticalCount,
    highCount,
    mediumCount,
    lowCount,
    evaluatedAt: Date.now(),
  };
}
