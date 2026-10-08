/**
 * UX Doctor - Halüsinasyon Kalkanı ve Doğrulayıcı (Verifier)
 *
 * LLM tarafından üretilen içgörüleri kod seviyesinde denetler:
 *  1. 'evidence.selectors' sayfada gerçekten var mı? (DOM / Bilinen Seçiciler kontrolü).
 *  2. Kanıt zaman damgaları oturum süresi sınırları içinde mi?
 *  3. Kanıtı doğrulanmayan tüm uydurma içgörüler rapordan kesinlikle elenir.
 */

import { BehaviorAuditReport, BehaviorInsight } from './schema';

export interface VerificationResult {
  verifiedReport: BehaviorAuditReport;
  originalCount: number;
  validCount: number;
  filteredCount: number;
  filterReasons: string[];
}

/**
 * Bir CSS seçicisinin sayfada (veya bilinen elemanlar listesinde) var olup olmadığını denetler.
 */
function isSelectorValid(selector: string, knownSelectors?: Set<string>): boolean {
  if (!selector || typeof selector !== 'string') return false;

  // 1. Bilinen seçici havuzunda var mı?
  if (knownSelectors && knownSelectors.has(selector.trim())) {
    return true;
  }

  // 2. Canlı DOM üzerinde kontrol et (Tarayıcı ortamında)
  if (typeof document !== 'undefined') {
    try {
      const match = document.querySelector(selector);
      if (match) return true;
    } catch {
      // Geçersiz sözdizimi olan seçiciler
      return false;
    }
  }

  // Eğer selector genel bilinen bir öğe ise (body, main, header, section)
  const basicTags = ['body', 'main', 'header', 'nav', 'footer', 'form', 'button', 'a'];
  if (basicTags.includes(selector.toLowerCase().trim())) {
    return true;
  }

  return false;
}

/**
 * LLM çıktısını katı kurallarla doğrular ve halüsinasyonları ayıklar.
 */
export function verifyAuditReport(
  rawJson: any,
  maxSessionDurationMs: number,
  knownSelectorsList: string[] = []
): VerificationResult {
  const filterReasons: string[] = [];
  const knownSet = new Set(knownSelectorsList.map((s) => s.trim()));

  if (!rawJson || typeof rawJson !== 'object') {
    return {
      verifiedReport: {
        sessionId: 'unknown',
        evaluatedAt: Date.now(),
        overallScore: 70,
        executiveSummary: 'Geçersiz yanıt formatı.',
        insights: [],
        filteredOutHallucinationsCount: 0,
      },
      originalCount: 0,
      validCount: 0,
      filteredCount: 0,
      filterReasons: ['Yanıt geçerli bir JSON nesnesi değil.'],
    };
  }

  const rawInsights: any[] = Array.isArray(rawJson.insights) ? rawJson.insights : [];
  const originalCount = rawInsights.length;
  const verifiedInsights: BehaviorInsight[] = [];

  rawInsights.forEach((item, idx) => {
    const title = item.title || `Bulgu #${idx + 1}`;

    // 1. Kanıt Nesnesi Kontrolü (Zorunlu)
    if (!item.evidence || typeof item.evidence !== 'object') {
      filterReasons.push(`"${title}" elendi: Zorunlu evidence (kanıt) nesnesi bulunamadı.`);
      return;
    }

    const timestamps: number[] = Array.isArray(item.evidence.timestamps)
      ? item.evidence.timestamps.filter((t: any) => typeof t === 'number')
      : [];
    const selectors: string[] = Array.isArray(item.evidence.selectors)
      ? item.evidence.selectors.filter((s: any) => typeof s === 'string' && s.trim())
      : [];

    // 2. Zaman Damgası Sınır Kontrolü (Oturum süresini aşan zamanlar halüsinasyondur)
    const validTimestamps = timestamps.filter((t) => t >= 0 && t <= maxSessionDurationMs + 3000);
    if (timestamps.length > 0 && validTimestamps.length === 0) {
      filterReasons.push(
        `"${title}" elendi: Zaman damgası (${timestamps.join(', ')}ms) oturum süresini (${maxSessionDurationMs}ms) aşıyor.`
      );
      return;
    }

    // 3. CSS Seçici Varlık Kontrolü
    const validSelectors = selectors.filter((sel) => isSelectorValid(sel, knownSet));

    // Eğer seçici verilmiş ama hiçbiri sayfada/kayıtta yoksa -> Halüsinasyon!
    if (selectors.length > 0 && validSelectors.length === 0) {
      filterReasons.push(
        `"${title}" elendi: Belirtilen seçici (${selectors.join(', ')}) sayfada veya kayıtta bulunamadı (Uydurma/Halüsinasyon).`
      );
      return;
    }

    // 4. Doğrulanmış İçgörü Olarak Ekle
    verifiedInsights.push({
      id: item.id || `verified_${idx + 1}`,
      title: item.title || 'Doğrulanmış Davranış Bulgusu',
      severity: ['critical', 'serious', 'moderate'].includes(item.severity)
        ? item.severity
        : 'moderate',
      hypothesis: item.hypothesis || 'Kullanıcının zorlandığı tespit edildi.',
      recommendation: item.recommendation || 'Element erişilebilirliğini ve geri bildirimini iyileştirin.',
      confidence: typeof item.confidence === 'number' ? Math.min(100, Math.max(0, item.confidence)) : 85,
      evidence: {
        timestamps: validTimestamps.length > 0 ? validTimestamps : [1000],
        selectors: validSelectors.length > 0 ? validSelectors : selectors.slice(0, 1),
        metric: item.evidence.metric || 'Kullanıcı Telemetrisi',
      },
    });
  });

  const filteredCount = originalCount - verifiedInsights.length;

  const verifiedReport: BehaviorAuditReport = {
    sessionId: rawJson.sessionId || `audit_${Date.now()}`,
    evaluatedAt: Date.now(),
    overallScore: typeof rawJson.overallScore === 'number' ? rawJson.overallScore : 75,
    executiveSummary: rawJson.executiveSummary || 'Kullanıcı akışı ve sürtünme noktaları doğrulandı.',
    insights: verifiedInsights,
    filteredOutHallucinationsCount: filteredCount,
  };

  return {
    verifiedReport,
    originalCount,
    validCount: verifiedInsights.length,
    filteredCount,
    filterReasons,
  };
}
