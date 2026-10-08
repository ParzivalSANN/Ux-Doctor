/**
 * UX Doctor - Yapay Zeka Şeması ve Kanıt Odaklı Prompt Şablonu
 *
 * Her iddianın kesinlikle zaman damgası ve DOM seçici kanıtına
 * dayanmasını zorunlu kılan katı JSON şeması.
 */

import { TimelineSummary } from './timeline-summarizer';
import { Keyframe } from './keyframe-extractor';
import { BehavioralScoreResult } from '../engine/behavioral-scorer';

export type InsightSeverity = 'critical' | 'serious' | 'moderate';

export interface InsightEvidence {
  timestamps: number[]; // Milisaniye cinsinden kanıt zamanları
  selectors: string[]; // İlgili CSS seçicileri
  metric?: string; // "Rage Click (3x)", "Dwell (3.2s)" vb.
}

export interface BehaviorInsight {
  id: string;
  title: string;
  severity: InsightSeverity;
  hypothesis: string; // Neden olabilir? (Bilişsel / Teknik kök neden)
  recommendation: string; // Somut çözüm önerisi
  confidence: number; // 0 - 100
  evidence: InsightEvidence; // ZORUNLU KANIT ALANI
}

export interface BehaviorAuditReport {
  sessionId: string;
  evaluatedAt: number;
  overallScore: number;
  executiveSummary: string;
  insights: BehaviorInsight[];
  filteredOutHallucinationsCount?: number;
}

/**
 * Katı Kanıt Kuralı İçeren Sistem Promptu
 */
export const UX_DOCTOR_SYSTEM_PROMPT = `Sen kıdemli bir Kullanıcı Deneyimi (UX), İnsan-Bilgisayar Etkileşimi (HCI) ve Web Ergonomisi Uzmanısın.
Adın: UX Doctor.

GÖREVİN:
Kullanıcının yerel tarayıcısından gelen 'Metin Zaman Çizelgesi', 'Anahtar Kareler' ve 'Telemetri Metrikleri' verilerini inceleyerek somut UX sürtünmelerini teşhis etmek.

KATI KANIT KURALI (HALÜSİNASYON YASAĞI):
1. HER İDDİANI KANITLAMAK ZORUNDASIN.
2. Kanıtı (verilen verideki kesin zaman damgası ve CSS seçicisi) OLMAYAN HİÇBİR varsayımı veya genel-geçer tavsiyeyi çıktıya EKLEME.
3. Asla sayfada var olmayan uydurma selector (seçici) veya oturum süresini aşan zaman damgası üretme.
4. Yanıtını YALNIZCA geçerli JSON formatında döndür. Hiçbir giriş/gelişme metni veya markdown backtick bloğu ekleme, doğrudan saf JSON nesnesi ver.

JSON ÇIKTI FORMATI:
{
  "executiveSummary": "1-2 cümlelik vurucu yönetici özeti",
  "overallScore": 75,
  "insights": [
    {
      "id": "insight_1",
      "title": "Kısa ve net bulgu başlığı",
      "severity": "critical" | "serious" | "moderate",
      "hypothesis": "Kullanıcının neden zorlandığına dair bilişsel veya teknik hipotez",
      "recommendation": "Geliştirici veya tasarımcı için somut, uygulanabilir çözüm adımı",
      "confidence": 92,
      "evidence": {
        "timestamps": [7200, 7600],
        "selectors": ["button.price-toggle"],
        "metric": "Rage Click (3x art arda)"
      }
    }
  ]
}`;

/**
 * Kullanıcı Değerlendirme Promptunu İnşa Eder
 */
export function buildEvaluationPrompt(
  timeline: TimelineSummary,
  keyframes: Keyframe[],
  scoreResult?: BehavioralScoreResult | null,
  taskName?: string
): string {
  return `Lütfen aşağıdaki oturum kanıt paketini incele ve UX Doctor formatında JSON raporu üret:

GÖREV HEDEFİ: "${taskName || 'Genel Sayfa Keşfi'}"
OTURUM SÜRESİ: ${timeline.totalDurationSeconds} saniye (${timeline.formattedDuration})

--- METİN ZAMAN ÇİZELGESİ ---
${timeline.textLog}

--- ANAHTAR KARE KANITLARI ---
${keyframes
  .map(
    (kf) =>
      `• [${kf.formattedTime}] ${kf.title}: ${kf.description} (Seçici: ${kf.targetSelector || 'Belirtilmedi'})`
  )
  .join('\n')}

--- METRİKLER VE SÜRTÜNMELER ---
• Öfkeli Tıklama (Rage Click): ${timeline.stats.rageClicks}
• Ölü Tıklama (Dead Click): ${timeline.stats.deadClicks}
• Kararsızlık / Duraksama (Hesitation): ${timeline.stats.hesitations}
• Maksimum Scroll Derinliği: %${timeline.stats.maxScrollDepth}
${scoreResult ? `• Davranış Skoru: ${scoreResult.overallBehaviorScore}/100 (${scoreResult.confidenceLabel})` : ''}

Lütfen yalnızca yukarıda geçen kanıtlanmış seçiciler ve zaman damgalarıyla eşleşen içgörüler (insights) üret.`;
}
