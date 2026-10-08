import {
  AlertTriangle,
  Lightbulb,
  Eye,
  CheckCircle2,
  ShieldCheck,
  HelpCircle,
  Copy,
  Check,
  Clock,
} from 'lucide-react';
import { useState } from 'react';
import { BehaviorAuditReport, BehaviorInsight, InsightSeverity } from '../../ai/schema';
import { formatTimelineTimestamp } from '../../ai/timeline-summarizer';

interface InsightListProps {
  report: BehaviorAuditReport | null;
  onHighlightElement?: (selector: string) => void;
  onTimestampClick?: (timestampMs: number, selector?: string) => void;
  onReAudit?: () => void;
}

export function InsightList({
  report,
  onHighlightElement,
  onTimestampClick,
  onReAudit,
}: InsightListProps) {
  const [copiedSelector, setCopiedSelector] = useState<string | null>(null);

  if (!report || report.insights.length === 0) {
    return (
      <div className="p-8 text-center bg-background-card rounded-2xl border border-background-surface flex flex-col items-center gap-3">
        <HelpCircle className="w-10 h-10 text-pastel-lavender/40" />
        <div className="text-xs text-pastel-muted max-w-[240px]">
          Henüz oluşturulmuş doğrulanmış bir AI raporu bulunmuyor.
        </div>
        {onReAudit && (
          <button
            onClick={onReAudit}
            className="mt-1 px-4 py-2 rounded-xl bg-pastel-coral text-[#2b1207] font-black text-xs shadow-chunky-coral active:translate-y-0.5 cursor-pointer"
          >
            AI ile Değerlendir
          </button>
        )}
      </div>
    );
  }

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedSelector(text);
    setTimeout(() => setCopiedSelector(null), 1500);
  };

  const getSeverityBadge = (severity: InsightSeverity) => {
    switch (severity) {
      case 'critical':
        return {
          label: 'Kritik Sürtünme',
          bg: 'bg-pastel-red/20 text-pastel-red border-pastel-red/40',
        };
      case 'serious':
        return {
          label: 'Ciddi Engel',
          bg: 'bg-pastel-coral/20 text-pastel-coral border-pastel-coral/40',
        };
      case 'moderate':
      default:
        return {
          label: 'Orta Düzey',
          bg: 'bg-pastel-yellow/20 text-pastel-yellow border-pastel-yellow/40',
        };
    }
  };

  return (
    <div className="flex flex-col gap-3.5 animate-in fade-in duration-200">
      {/* Yönetici Özeti & Skor Kartı */}
      <div className="p-4 rounded-2xl bg-gradient-to-br from-[#352754] to-[#251b3d] border border-pastel-mint/30 shadow-card-glow flex flex-col gap-2.5">
        <div className="flex items-center justify-between">
          <span className="text-[11px] font-black uppercase text-pastel-mint tracking-wider flex items-center gap-1.5">
            <CheckCircle2 className="w-4 h-4 text-pastel-mint" />
            Doğrulanmış Teşhis Raporu
          </span>
          <span className="text-[10px] font-mono font-bold text-pastel-lavender">
            Puan: {report.overallScore}/100
          </span>
        </div>

        <p className="text-xs text-white/95 leading-relaxed font-medium">
          {report.executiveSummary}
        </p>

        {/* Halüsinasyon Kalkanı Rozeti */}
        <div className="pt-2 border-t border-white/10 flex items-center justify-between text-[10px] text-pastel-lavender">
          <span className="flex items-center gap-1.5 text-pastel-mint font-bold">
            <ShieldCheck className="w-3.5 h-3.5 text-pastel-mint" />
            %100 Kod Seviyesinde Kanıt Doğrulandı
          </span>
          {report.filteredOutHallucinationsCount !== undefined && report.filteredOutHallucinationsCount > 0 && (
            <span className="text-pastel-pink font-semibold">
              {report.filteredOutHallucinationsCount} kanıtsız iddia ayıklandı
            </span>
          )}
        </div>
      </div>

      {/* Doğrulanmış İçgörü Kartları Listesi */}
      <div className="flex flex-col gap-3">
        {report.insights.map((insight: BehaviorInsight) => {
          const badge = getSeverityBadge(insight.severity);
          const firstSelector = insight.evidence.selectors[0] || '';

          return (
            <div
              key={insight.id}
              className="p-4 rounded-2xl bg-background-card border border-background-surface/90 hover:border-pastel-lavender/40 transition-all shadow-card-glow flex flex-col gap-3"
            >
              {/* Kart Üst Bilgi: Başlık & Önem Rozeti */}
              <div className="flex items-start justify-between gap-2">
                <div className="flex flex-col gap-1">
                  <div className="flex items-center gap-2">
                    <span className={`text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full border ${badge.bg}`}>
                      {badge.label}
                    </span>
                    <span className="text-[10px] font-mono text-pastel-lavender font-bold">
                      %{insight.confidence} Güven
                    </span>
                  </div>
                  <h4 className="text-xs font-black text-white leading-snug">
                    {insight.title}
                  </h4>
                </div>
              </div>

              {/* Tıklanabilir Kanıt Rozetleri (Zaman Damgaları & Seçici) */}
              <div className="flex flex-wrap items-center gap-1.5 bg-background-deep/70 p-2 rounded-xl border border-white/5 text-[11px]">
                <span className="text-[10px] font-bold text-pastel-muted uppercase">Kanıtlar:</span>

                {/* Zaman Damgası Kanıt Butonları (Replay Köprüsü) */}
                {insight.evidence.timestamps.map((t, idx) => (
                  <button
                    key={idx}
                    onClick={() => onTimestampClick && onTimestampClick(t, firstSelector)}
                    title={`Replay'de ${formatTimelineTimestamp(t)} anına atla ve elemanı vurgula`}
                    className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-pastel-mint/15 text-pastel-mint border border-pastel-mint/30 font-mono text-[10px] font-black hover:bg-pastel-mint/25 hover:border-pastel-mint cursor-pointer transition-all shadow-sm active:scale-95 group"
                  >
                    <Clock className="w-3 h-3 text-pastel-mint group-hover:rotate-45 transition-transform" />
                    <span>⏱ {formatTimelineTimestamp(t)}</span>
                    <span className="text-[9px] text-pastel-mint/80 bg-pastel-mint/10 px-1 rounded font-sans font-bold">
                      Replay ➔
                    </span>
                  </button>
                ))}

                {/* Metrik Rozeti */}
                {insight.evidence.metric && (
                  <span className="px-2 py-0.5 rounded-lg bg-pastel-yellow/15 text-pastel-yellow font-bold text-[10px]">
                    {insight.evidence.metric}
                  </span>
                )}
              </div>

              {/* Hipotez (Neden Olabilir?) */}
              <div className="flex items-start gap-2 bg-[#251c3d]/60 p-2.5 rounded-xl border border-white/5">
                <AlertTriangle className="w-4 h-4 text-pastel-coral shrink-0 mt-0.5" />
                <div>
                  <span className="text-[10px] font-bold uppercase text-pastel-coral block">
                    Neden Olabilir? (Hipotez)
                  </span>
                  <p className="text-[11px] text-pastel-lavender leading-relaxed mt-0.5">
                    {insight.hypothesis}
                  </p>
                </div>
              </div>

              {/* Somut Çözüm Önerisi */}
              <div className="flex items-start gap-2 bg-[#1b2b27]/60 p-2.5 rounded-xl border border-pastel-mint/20">
                <Lightbulb className="w-4 h-4 text-pastel-mint shrink-0 mt-0.5" />
                <div>
                  <span className="text-[10px] font-bold uppercase text-pastel-mint block">
                    Somut Çözüm Önerisi
                  </span>
                  <p className="text-[11px] text-white/95 leading-relaxed mt-0.5">
                    {insight.recommendation}
                  </p>
                </div>
              </div>

              {/* Seçici Yolu & Sayfada Vurgula Butonu */}
              {firstSelector && (
                <div className="flex items-center justify-between gap-2 pt-1 border-t border-background-surface/80">
                  <div className="flex items-center gap-1.5 min-w-0">
                    <code className="text-[10px] font-mono text-pastel-muted truncate max-w-[190px]">
                      {firstSelector}
                    </code>
                    <button
                      onClick={() => copyToClipboard(firstSelector)}
                      title="Seçiciyi Kopyala"
                      className="text-pastel-muted hover:text-white p-0.5 cursor-pointer"
                    >
                      {copiedSelector === firstSelector ? <Check className="w-3 h-3 text-pastel-mint" /> : <Copy className="w-3 h-3" />}
                    </button>
                  </div>

                  {/* Sayfadaki Elemanı Vurgula Butonu */}
                  <button
                    onClick={() => onHighlightElement && onHighlightElement(firstSelector)}
                    className="px-2.5 py-1 rounded-xl bg-pastel-mint text-pastel-mint-dark font-extrabold text-[10px] flex items-center gap-1 shadow-chunky-sm active:translate-y-0.5 cursor-pointer hover:bg-[#6edcbb] transition-all shrink-0"
                  >
                    <Eye className="w-3 h-3" />
                    <span>Sayfada Vurgula 👁️</span>
                  </button>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
