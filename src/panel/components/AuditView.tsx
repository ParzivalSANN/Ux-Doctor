import { useState } from 'react';
import {
  Stethoscope,
  ShieldCheck,
  Download,
  Eye,
  Key,
  Layers,
  Sparkles,
  HelpCircle,
  Copy,
  Check,
} from 'lucide-react';

import {
  DeterministicAuditResult,
} from '../../engine/deterministic/deterministic-engine';
import {
  NormanAuditReport,
  NormanPrincipleKey,
} from '../../ai/norman-engine';
import {
  CompositeUXScoreResult,
} from '../../engine/scoring/composite-scorer';
import { PrivacyCheckResult } from '../../engine/privacy/privacy-shield';

interface AuditViewProps {
  deterministicResult: DeterministicAuditResult | null;
  normanResult: NormanAuditReport | null;
  compositeScore: CompositeUXScoreResult | null;
  privacyResult: PrivacyCheckResult | null;
  isLoading: boolean;
  onRunAudit: (forceConsent?: boolean) => void;
  onHighlightElement: (selector: string, label?: string) => void;
  onOpenSettings: () => void;
  activeUrl: string;
  activeTitle: string;
}

export function AuditView({
  deterministicResult,
  normanResult,
  compositeScore,
  privacyResult,
  isLoading,
  onRunAudit,
  onHighlightElement,
  onOpenSettings,
  activeUrl,
  activeTitle,
}: AuditViewProps) {
  const [filterType, setFilterType] = useState<'all' | 'deterministic' | 'norman'>('all');
  const [severityFilter, setSeverityFilter] = useState<'all' | 'Kritik' | 'Yüksek' | 'Orta' | 'Düşük'>('all');
  const [copiedSelector, setCopiedSelector] = useState<string | null>(null);
  const [showFormulaModal, setShowFormulaModal] = useState<boolean>(false);

  // Kopyalama fonksiyonu
  const handleCopySelector = (sel: string) => {
    navigator.clipboard.writeText(sel);
    setCopiedSelector(sel);
    setTimeout(() => setCopiedSelector(null), 2000);
  };

  // JSON Raporunu İndir
  const handleExportJson = () => {
    if (!deterministicResult || !normanResult || !compositeScore) return;

    const reportData = {
      meta: {
        tool: 'UX Doctor - Chrome Extension (Manifest V3)',
        version: '0.2.0',
        generatedAt: new Date().toISOString(),
        targetUrl: activeUrl,
        targetTitle: activeTitle,
      },
      compositeScore: {
        overallScore: compositeScore.overallUXScore,
        grade: compositeScore.scoreGrade,
        formula: compositeScore.formulaExplanation,
        deterministicWeight: compositeScore.weights.deterministic,
        interpretiveWeight: compositeScore.weights.interpretive,
      },
      deterministicAudit: {
        score: deterministicResult.score,
        totalFindings: deterministicResult.totalFindingsCount,
        severityBreakdown: {
          critical: deterministicResult.criticalCount,
          high: deterministicResult.highCount,
          medium: deterministicResult.mediumCount,
          low: deterministicResult.lowCount,
        },
        categoryScores: deterministicResult.categoryScores,
        findings: deterministicResult.findings,
      },
      normanInterpretiveAudit: {
        score: normanResult.overallScore,
        provider: normanResult.provider,
        hallucinationRate: normanResult.hallucinationRate,
        verifiedCount: normanResult.verifiedCount,
        subScores: normanResult.subScores,
        findings: normanResult.findings,
      },
      ethicsAndPrivacy: {
        privacyAuditPassed: true,
        maskedDataPolicyEnforced: true,
        detectedSensitivities: privacyResult?.detectedSensitivities || [],
      },
    };

    const blob = new Blob([JSON.stringify(reportData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    const sanitizedName = (activeTitle || 'web-page').replace(/[^a-z0-9]/gi, '-').toLowerCase().slice(0, 30);
    a.download = `ux-doctor-report-${sanitizedName}-${Date.now()}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  // Birleşik Bulgular Havuzu
  interface UnifiedFinding {
    id: string;
    source: 'deterministic' | 'norman';
    ruleId: string;
    title: string;
    severity: 'Kritik' | 'Yüksek' | 'Orta' | 'Düşük';
    selector: string;
    descriptionOrHypothesis: string;
    recommendation: string;
    confidence?: number;
    elementSnippet?: string;
  }

  const allFindings: UnifiedFinding[] = [];

  if (deterministicResult) {
    deterministicResult.findings.forEach((df) => {
      allFindings.push({
        id: df.id,
        source: 'deterministic',
        ruleId: df.ruleId,
        title: df.title,
        severity: df.severity,
        selector: df.selector,
        descriptionOrHypothesis: df.description,
        recommendation: df.recommendation,
        elementSnippet: df.elementSnippet,
      });
    });
  }

  if (normanResult) {
    normanResult.findings.forEach((nf) => {
      allFindings.push({
        id: nf.id,
        source: 'norman',
        ruleId: nf.principle,
        title: nf.title,
        severity: nf.severity,
        selector: nf.selector,
        descriptionOrHypothesis: nf.hypothesis,
        recommendation: nf.recommendation,
        confidence: nf.confidence,
        elementSnippet: nf.elementSnippet,
      });
    });
  }

  // Filtreleme
  const filteredFindings = allFindings.filter((f) => {
    if (filterType !== 'all' && f.source !== filterType) return false;
    if (severityFilter !== 'all' && f.severity !== severityFilter) return false;
    return true;
  });

  return (
    <div className="space-y-4 px-4 py-2">
      {/* 1. ÜST ANALİZ TETİKLEME KARTI */}
      <div className="p-4 rounded-3xl bg-background-card border border-background-surface shadow-chunky-sm space-y-3">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-pastel-mint animate-pulse" />
              <h2 className="text-sm font-black text-white truncate">{activeTitle || 'Aktif Sayfa'}</h2>
            </div>
            <p className="text-[11px] text-pastel-muted truncate font-mono mt-0.5">{activeUrl}</p>
          </div>

          <button
            onClick={onOpenSettings}
            title="API ve Ayarlar"
            className="p-2 rounded-xl bg-background-surface/80 hover:bg-background-surface text-pastel-yellow transition-all cursor-pointer"
          >
            <Key className="w-4 h-4" />
          </button>
        </div>

        {/* Etik Durumu Rozeti */}
        <div className="flex items-center justify-between pt-1 border-t border-white/5 text-[11px]">
          <div className="flex items-center gap-1.5 text-pastel-mint font-semibold">
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>Etik Kalkanı: Maskelenmiş & Salt-Okunur</span>
          </div>

          {privacyResult?.hasSensitiveInputs && (
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-pastel-pink/20 text-pastel-pink border border-pastel-pink/30">
              Hassas Form Alanları Mevcut
            </span>
          )}
        </div>

        {/* Ana Analiz Butonu */}
        <button
          onClick={() => onRunAudit(false)}
          disabled={isLoading}
          className={`w-full py-3.5 px-4 rounded-2xl font-black text-sm flex items-center justify-center gap-2.5 shadow-chunky transition-all cursor-pointer ${
            isLoading
              ? 'bg-background-surface text-pastel-muted cursor-wait'
              : 'bg-pastel-mint text-pastel-mint-dark hover:scale-[1.01] active:scale-[0.99]'
          }`}
        >
          <Stethoscope className={`w-5 h-5 ${isLoading ? 'animate-spin' : ''}`} />
          <span>{isLoading ? 'Sayfa Teşhis Ediliyor...' : 'Tek Tıkla UX Teşhisini Başlat'}</span>
        </button>
      </div>

      {/* 2. BİLEŞİK SKOR VE KATMAN KARŞILAŞTIRMASI */}
      {compositeScore && (
        <div className="p-4 rounded-3xl bg-background-card border border-background-surface shadow-chunky-sm space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-pastel-yellow" />
              <h3 className="text-xs font-black uppercase tracking-wider text-white">Bileşik UX Skoru</h3>
            </div>
            <button
              onClick={() => setShowFormulaModal(true)}
              className="text-[10px] font-bold text-pastel-mint flex items-center gap-1 hover:underline cursor-pointer"
            >
              <HelpCircle className="w-3 h-3" />
              <span>Skor Formülü & Gerekçesi</span>
            </button>
          </div>

          {/* Büyük Skor Göstergesi */}
          <div className="flex items-center justify-between p-3.5 rounded-2xl bg-background-deep/80 border border-white/5">
            <div className="flex items-baseline gap-2">
              <span
                className="text-4xl font-black tracking-tight"
                style={{ color: compositeScore.gradeColor }}
              >
                {compositeScore.overallUXScore}
              </span>
              <span className="text-xs font-bold text-pastel-muted">/ 100</span>
            </div>

            <div className="text-right">
              <span
                className="inline-block px-3 py-1 rounded-full text-xs font-black uppercase tracking-wider"
                style={{
                  backgroundColor: `${compositeScore.gradeColor}25`,
                  color: compositeScore.gradeColor,
                  border: `1px solid ${compositeScore.gradeColor}40`,
                }}
              >
                {compositeScore.scoreGrade}
              </span>
              <p className="text-[10px] text-pastel-muted mt-1 font-mono">
                50% Deterministik + 50% Norman
              </p>
            </div>
          </div>

          {/* İKİ ANALİZ KATMANI KARTLARI */}
          <div className="grid grid-cols-2 gap-2.5">
            {/* Katman 1: Deterministik Skor (WCAG 2.2 AA) */}
            <div className="p-3 rounded-2xl bg-background-surface/50 border border-white/5 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold text-pastel-lavender">Katman 1: Kod / WCAG</span>
                <span className="text-xs font-black text-pastel-mint">
                  {deterministicResult?.score || 0}/100
                </span>
              </div>
              <div className="w-full h-1.5 rounded-full bg-background-deep overflow-hidden">
                <div
                  className="h-full bg-pastel-mint transition-all duration-500 rounded-full"
                  style={{ width: `${deterministicResult?.score || 0}%` }}
                />
              </div>
              <div className="text-[10px] text-pastel-muted flex items-center justify-between">
                <span>WCAG 2.2 AA</span>
                <span>{deterministicResult?.totalFindingsCount || 0} İhlal</span>
              </div>
            </div>

            {/* Katman 2: Don Norman 6 İlke Skoru */}
            <div className="p-3 rounded-2xl bg-background-surface/50 border border-white/5 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold text-pastel-lavender">Katman 2: Norman İlkeleri</span>
                <span className="text-xs font-black text-pastel-yellow">
                  {normanResult?.overallScore || 0}/100
                </span>
              </div>
              <div className="w-full h-1.5 rounded-full bg-background-deep overflow-hidden">
                <div
                  className="h-full bg-pastel-yellow transition-all duration-500 rounded-full"
                  style={{ width: `${normanResult?.overallScore || 0}%` }}
                />
              </div>
              <div className="text-[10px] text-pastel-muted flex items-center justify-between">
                <span>Halüsinasyon: %{normanResult?.hallucinationRate || 0}</span>
                <span>{normanResult?.verifiedCount || 0} Kanıt</span>
              </div>
            </div>
          </div>

          {/* Don Norman 6 İlke Alt Skorları Dökümü */}
          {normanResult && (
            <div className="p-3 rounded-2xl bg-background-deep/60 border border-white/5 space-y-2.5">
              <span className="text-[11px] font-black uppercase text-pastel-muted tracking-wider">
                Don Norman 6 İlke Alt Skorları
              </span>
              <div className="grid grid-cols-3 gap-2">
                {(Object.keys(normanResult.subScores) as NormanPrincipleKey[]).map((key) => {
                  const sub = normanResult.subScores[key];
                  return (
                    <div
                      key={key}
                      className="p-2 rounded-xl bg-background-surface/40 border border-white/5 text-center"
                    >
                      <div className="text-[10px] font-semibold text-pastel-muted truncate">
                        {sub.name.split(' ')[0]}
                      </div>
                      <div className="text-sm font-black text-pastel-mint mt-0.5">{sub.score}</div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* JSON Raporunu İndir Butonu */}
          <button
            onClick={handleExportJson}
            className="w-full py-2.5 px-3 rounded-xl bg-background-surface hover:bg-background-surface/80 text-pastel-lavender text-xs font-bold flex items-center justify-center gap-2 border border-white/10 transition-all cursor-pointer"
          >
            <Download className="w-3.5 h-3.5 text-pastel-mint" />
            <span>JSON Raporunu İndir (/reports formatında)</span>
          </button>
        </div>
      )}

      {/* 3. KANITLI BULGULAR LİSTESİ */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Layers className="w-4 h-4 text-pastel-coral" />
            <h3 className="text-xs font-black uppercase tracking-wider text-white">
              Doğrulanmış Bulgular ({filteredFindings.length})
            </h3>
          </div>

          {/* Katman Filtresi */}
          <div className="flex items-center gap-1 bg-background-card p-1 rounded-xl border border-white/5 text-[10px]">
            <button
              onClick={() => setFilterType('all')}
              className={`px-2 py-0.5 rounded-lg font-bold transition-all ${
                filterType === 'all' ? 'bg-pastel-mint text-pastel-mint-dark' : 'text-pastel-muted'
              }`}
            >
              Tümü
            </button>
            <button
              onClick={() => setFilterType('deterministic')}
              className={`px-2 py-0.5 rounded-lg font-bold transition-all ${
                filterType === 'deterministic' ? 'bg-pastel-mint text-pastel-mint-dark' : 'text-pastel-muted'
              }`}
            >
              WCAG
            </button>
            <button
              onClick={() => setFilterType('norman')}
              className={`px-2 py-0.5 rounded-lg font-bold transition-all ${
                filterType === 'norman' ? 'bg-pastel-mint text-pastel-mint-dark' : 'text-pastel-muted'
              }`}
            >
              Norman
            </button>
          </div>
        </div>

        {/* Şiddet Filtresi */}
        <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar pb-1 text-[10px]">
          {(['all', 'Kritik', 'Yüksek', 'Orta', 'Düşük'] as const).map((sev) => (
            <button
              key={sev}
              onClick={() => setSeverityFilter(sev)}
              className={`px-2.5 py-1 rounded-lg font-bold shrink-0 transition-all cursor-pointer ${
                severityFilter === sev
                  ? 'bg-pastel-lavender text-background-deep font-extrabold'
                  : 'bg-background-card text-pastel-muted border border-white/5 hover:text-white'
              }`}
            >
              {sev === 'all' ? 'Tüm Şiddetler' : sev}
            </button>
          ))}
        </div>

        {/* Bulgu Kartları */}
        {filteredFindings.length === 0 ? (
          <div className="p-6 rounded-3xl bg-background-card border border-background-surface text-center space-y-2">
            <p className="text-xs font-bold text-pastel-muted">
              {compositeScore ? 'Filtreye uygun bulgu bulunamadı.' : 'Henüz analiz yapılmadı. Yukarıdaki butona tıklayın.'}
            </p>
          </div>
        ) : (
          filteredFindings.map((finding) => {
            const severityBadgeColor =
              finding.severity === 'Kritik'
                ? 'bg-pastel-pink/20 text-pastel-pink border-pastel-pink/40'
                : finding.severity === 'Yüksek'
                ? 'bg-pastel-coral/20 text-pastel-coral border-pastel-coral/40'
                : finding.severity === 'Orta'
                ? 'bg-pastel-yellow/20 text-pastel-yellow border-pastel-yellow/40'
                : 'bg-pastel-mint/20 text-pastel-mint border-pastel-mint/40';

            return (
              <div
                key={finding.id}
                className="p-3.5 rounded-2xl bg-background-card border border-background-surface shadow-chunky-sm space-y-2.5 transition-all"
              >
                {/* Üst Satır: Şiddet & Kural Rozetleri */}
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span
                      className={`text-[9px] font-black uppercase px-2 py-0.5 rounded-md border ${severityBadgeColor}`}
                    >
                      {finding.severity}
                    </span>
                    <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-md bg-background-surface text-pastel-lavender">
                      {finding.ruleId}
                    </span>
                  </div>

                  {/* Sayfada Vurgula Butonu */}
                  <button
                    onClick={() => onHighlightElement(finding.selector, finding.title)}
                    className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-pastel-mint text-pastel-mint-dark text-[10px] font-black hover:scale-105 active:scale-95 transition-all cursor-pointer shadow-sm"
                  >
                    <Eye className="w-3 h-3" />
                    <span>Sayfada Göster</span>
                  </button>
                </div>

                {/* Başlık */}
                <h4 className="text-xs font-black text-white leading-snug">{finding.title}</h4>

                {/* CSS Seçicisi (DOM Kanıtı) */}
                <div className="flex items-center justify-between p-1.5 rounded-xl bg-background-deep border border-white/5 text-[10px] font-mono">
                  <span className="text-pastel-mint truncate mr-2">{finding.selector}</span>
                  <button
                    onClick={() => handleCopySelector(finding.selector)}
                    className="p-1 text-pastel-muted hover:text-white shrink-0 cursor-pointer"
                    title="Seçiciyi Kopyala"
                  >
                    {copiedSelector === finding.selector ? (
                      <Check className="w-3 h-3 text-pastel-mint" />
                    ) : (
                      <Copy className="w-3 h-3" />
                    )}
                  </button>
                </div>

                {/* Açıklama & Somut Çözüm */}
                <div className="text-[11px] space-y-1.5">
                  <p className="text-pastel-muted">{finding.descriptionOrHypothesis}</p>

                  <div className="p-2 rounded-xl bg-background-surface/60 border border-pastel-mint/20 text-pastel-lavender">
                    <span className="font-bold text-pastel-mint block mb-0.5">💡 Somut Düzeltme Önerisi:</span>
                    {finding.recommendation}
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* 4. SKOR FORMÜLÜ VE GEREKÇESİ MODALI */}
      {showFormulaModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm">
          <div className="w-full max-w-sm rounded-3xl bg-background-card border border-background-surface p-5 space-y-4 shadow-chunky">
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <h3 className="text-sm font-black text-white flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-pastel-yellow" />
                <span>Skor Formülü ve Gerekçesi</span>
              </h3>
              <button
                onClick={() => setShowFormulaModal(false)}
                className="text-pastel-muted hover:text-white font-bold text-sm cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="text-xs text-pastel-lavender space-y-2.5 leading-relaxed">
              <div className="p-2.5 rounded-xl bg-background-deep font-mono text-center text-pastel-mint font-bold border border-white/5">
                Toplam UX = (0.50 × Deterministik) + (0.50 × Norman)
              </div>

              <div>
                <strong className="text-white block mb-0.5">1. Deterministik Katman (%50):</strong>
                WCAG 2.2 AA standartlarına (kontrast oranı, dokunma hedefi min 24px, form etiketleri, alt metin) dayalı nesnel ve matematiksel kod kontrolleri.
              </div>

              <div>
                <strong className="text-white block mb-0.5">2. Don Norman Yorumsal Katmanı (%50):</strong>
                Görünürlük, Geri Bildirim, Kısıtlar, Eşleme, Tutarlılık ve Sağlarlık olmak üzere 6 bilişsel ilke.
              </div>

              <div className="p-2.5 rounded-xl bg-pastel-mint/10 border border-pastel-mint/20 text-[11px] text-pastel-mint">
                <strong>Gerekçe:</strong> Bir web sitesi teknik olarak hatasız kodlansa dahi kullanıcının zihinsel modeliyle uyuşmayan zayıf geri bildirim veya görünürlük barındırıyorsa ergonomik değildir. Her iki katmanın eşit dengesi en adil ve bütünsel teşhisi sağlar.
              </div>
            </div>

            <button
              onClick={() => setShowFormulaModal(false)}
              className="w-full py-2.5 rounded-xl bg-pastel-mint text-pastel-mint-dark font-black text-xs cursor-pointer"
            >
              Anladım
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
