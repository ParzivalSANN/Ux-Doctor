import { AlertTriangle, ShieldCheck } from 'lucide-react';
import { PrivacyCheckResult } from '../../engine/privacy/privacy-shield';

interface PrivacyConsentModalProps {
  isOpen: boolean;
  privacyResult: PrivacyCheckResult | null;
  onConfirm: () => void;
  onCancel: () => void;
}

export function PrivacyConsentModal({
  isOpen,
  privacyResult,
  onConfirm,
  onCancel,
}: PrivacyConsentModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
      <div className="w-full max-w-sm rounded-3xl bg-background-card border-2 border-pastel-pink p-5 space-y-4 shadow-chunky">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-pastel-pink/20 border border-pastel-pink/40 flex items-center justify-center shrink-0">
            <AlertTriangle className="w-5 h-5 text-pastel-pink" />
          </div>
          <div>
            <h3 className="text-sm font-black text-white">Hassas Sayfa / Gizlilik Uyarısı</h3>
            <p className="text-[11px] text-pastel-muted">Etik ve Güvenlik Kuralı #5</p>
          </div>
        </div>

        <div className="text-xs text-pastel-lavender space-y-2 leading-relaxed">
          <p>
            Bu sayfada potansiyel olarak hassas veriler tespit edildi:
          </p>

          <ul className="list-disc list-inside p-2.5 rounded-xl bg-background-deep font-mono text-[11px] text-pastel-yellow space-y-1 border border-white/5">
            {privacyResult?.detectedSensitivities.map((s, idx) => (
              <li key={idx}>{s}</li>
            ))}
          </ul>

          <div className="p-2.5 rounded-xl bg-pastel-mint/10 border border-pastel-mint/30 text-[11px] text-pastel-mint space-y-1">
            <div className="flex items-center gap-1.5 font-bold">
              <ShieldCheck className="w-4 h-4" />
              <span>Sıfır Veri Sızıntısı Garantisi:</span>
            </div>
            <p className="text-[10px] text-pastel-lavender">
              Tüm form giriş değerleri (<code className="text-pastel-mint">value</code>) otomatik olarak <code className="text-pastel-yellow">[MASKED]</code> şeklinde filtrelenir. Kişisel veri veya parola asla analiz edilmez ya da dışarı gönderilmez.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 pt-1">
          <button
            onClick={onCancel}
            className="flex-1 py-2.5 rounded-xl bg-background-surface hover:bg-background-surface/80 text-white font-bold text-xs cursor-pointer"
          >
            Vazgeç
          </button>
          <button
            onClick={onConfirm}
            className="flex-1 py-2.5 rounded-xl bg-pastel-pink text-pastel-pink-dark font-black text-xs cursor-pointer hover:scale-[1.02] active:scale-[0.98] transition-all"
          >
            Onayla ve Başlat
          </button>
        </div>
      </div>
    </div>
  );
}
