import { useState, useEffect } from 'react';
import {
  ShieldCheck,
  Sparkles,
  X,
  Clock,
  Layers3,
  Key,
  Check,
} from 'lucide-react';
import { TimelineSummary } from '../../ai/timeline-summarizer';
import { Keyframe } from '../../ai/keyframe-extractor';
import { getStoredApiKey, setStoredApiKey } from '../../ai/llm-client';

interface AuditPreviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  timeline: TimelineSummary | null;
  keyframes: Keyframe[];
  taskName?: string;
  isEvaluating?: boolean;
}

export function AuditPreviewModal({
  isOpen,
  onClose,
  onConfirm,
  timeline,
  keyframes,
  taskName,
  isEvaluating = false,
}: AuditPreviewModalProps) {
  const [apiKey, setApiKey] = useState<string>('');
  const [showKeyInput, setShowKeyInput] = useState<boolean>(false);
  const [isKeySaved, setIsKeySaved] = useState<boolean>(false);

  useEffect(() => {
    if (isOpen) {
      getStoredApiKey().then((key) => {
        if (key) {
          setApiKey(key);
        } else {
          setShowKeyInput(true);
        }
      });
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSaveKey = async () => {
    await setStoredApiKey(apiKey);
    setIsKeySaved(true);
    setTimeout(() => setIsKeySaved(false), 2000);
  };

  // Tahmini Token ve Maliyet Hesabı
  const estimatedInputTokens = Math.round(
    450 + (timeline ? timeline.textLog.length / 3.5 : 200) + keyframes.length * 80
  );
  const estimatedCost = (estimatedInputTokens / 1000) * 0.003; // ~$0.003 per 1K tokens

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-black/75 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="w-full max-w-sm rounded-3xl bg-background-card border border-background-surface/90 shadow-2xl p-4 flex flex-col gap-3.5 max-h-[90vh] overflow-y-auto">
        {/* Modal Başlık */}
        <div className="flex items-center justify-between pb-2 border-b border-background-surface">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-pastel-coral/20 border border-pastel-coral/40 flex items-center justify-center text-pastel-coral">
              <Sparkles className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-black text-white">Gönderim Önizleme & Onay</h3>
              <p className="text-[10px] text-pastel-muted">
                Görev: <strong className="text-pastel-lavender">{taskName || 'Genel Sayfa Keşfi'}</strong> • Claude 3.5 Sonnet
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-pastel-muted hover:text-white transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* 1. Maskelenmiş Veri Onayı & Gizlilik Rozeti */}
        <div className="p-3 rounded-2xl bg-pastel-mint/10 border border-pastel-mint/30 flex items-start gap-2.5">
          <ShieldCheck className="w-5 h-5 text-pastel-mint shrink-0 mt-0.5" />
          <div className="text-[11px] text-pastel-lavender leading-snug">
            <strong className="text-pastel-mint block font-bold mb-0.5">Gizlilik Garantisi (%100 Maskeli)</strong>
            Şifreler, kredi kartları, e-postalar ve kişisel form alanları <code className="text-pastel-mint font-mono bg-background-deep/60 px-1 rounded">••••••</code> olarak maskelenmiştir. Asla ham veri gönderilmez.
          </div>
        </div>

        {/* 2. Gönderilecek Anahtar Kareler (Mini Önizleme Kartları) */}
        <div className="flex flex-col gap-1.5">
          <span className="text-[11px] font-bold text-pastel-muted flex items-center gap-1.5">
            <Layers3 className="w-3.5 h-3.5 text-pastel-coral" />
            Gönderilecek Anahtar Kareler ({keyframes.length} Adet)
          </span>
          <div className="grid grid-cols-2 gap-2">
            {keyframes.slice(0, 4).map((kf) => (
              <div
                key={kf.id}
                className="p-2 rounded-xl bg-background-deep/80 border border-white/5 flex flex-col gap-1 text-[10px]"
              >
                <div className="flex items-center justify-between">
                  <span
                    className="font-bold px-1.5 py-0.2 rounded-full text-[9px]"
                    style={{ backgroundColor: `${kf.badgeColor}20`, color: kf.badgeColor }}
                  >
                    {kf.badgeLabel}
                  </span>
                  <span className="font-mono text-pastel-muted">{kf.formattedTime}</span>
                </div>
                <span className="text-white font-medium truncate">{kf.title}</span>
              </div>
            ))}
          </div>
        </div>

        {/* 3. Gönderilecek Metin Zaman Çizelgesi Özeti */}
        {timeline && (
          <div className="flex flex-col gap-1.5">
            <span className="text-[11px] font-bold text-pastel-muted flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5 text-pastel-yellow" />
              Metin Zaman Çizelgesi ({timeline.entries.length} Dönüm Noktası)
            </span>
            <div className="p-2.5 rounded-xl bg-background-deep/80 border border-white/5 font-mono text-[10px] text-pastel-lavender/90 max-h-24 overflow-y-auto no-scrollbar flex flex-col gap-1">
              {timeline.entries.map((e) => (
                <div key={e.id} className="truncate">
                  <span className="text-pastel-mint font-bold">{e.formattedTime}</span> {e.description}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* 4. Tahmini Token ve Maliyet Göstergesi */}
        <div className="p-2.5 rounded-xl bg-background-deep/60 border border-white/5 flex items-center justify-between text-[11px]">
          <div>
            <span className="text-pastel-muted block text-[10px]">Tahmini İstek Boyutu</span>
            <span className="font-mono font-bold text-white">~{estimatedInputTokens} Token</span>
          </div>
          <div className="text-right">
            <span className="text-pastel-muted block text-[10px]">Tahmini Maliyet (Claude)</span>
            <span className="font-mono font-bold text-pastel-mint">~${estimatedCost.toFixed(4)}</span>
          </div>
        </div>

        {/* 5. API Anahtarı Ayarı (İsteğe Bağlı / Saklı) */}
        <div className="flex flex-col gap-1">
          <div className="flex items-center justify-between">
            <button
              type="button"
              onClick={() => setShowKeyInput(!showKeyInput)}
              className="text-[10px] text-pastel-lavender hover:underline flex items-center gap-1 font-bold cursor-pointer"
            >
              <Key className="w-3 h-3 text-pastel-yellow" />
              <span>{apiKey ? 'API Anahtarını Değiştir' : 'Anthropic API Anahtarı Ekle'}</span>
            </button>
            {!apiKey && (
              <span className="text-[9px] text-pastel-yellow bg-pastel-yellow/10 px-1.5 py-0.5 rounded-full">
                Boşsa Yerel Demo Modu
              </span>
            )}
          </div>

          {showKeyInput && (
            <div className="flex items-center gap-1.5 mt-1">
              <input
                type="password"
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                placeholder="sk-ant-api03-..."
                className="flex-1 px-2.5 py-1.5 rounded-xl bg-background-deep border border-background-surface text-white text-xs font-mono focus:outline-none focus:border-pastel-coral"
              />
              <button
                type="button"
                onClick={handleSaveKey}
                className="px-2.5 py-1.5 rounded-xl bg-pastel-mint text-pastel-mint-dark font-bold text-xs cursor-pointer"
              >
                {isKeySaved ? <Check className="w-3.5 h-3.5" /> : 'Kaydet'}
              </button>
            </div>
          )}
        </div>

        {/* 6. Aksiyon Butonları */}
        <div className="grid grid-cols-2 gap-2 pt-2 border-t border-background-surface">
          <button
            type="button"
            onClick={onClose}
            disabled={isEvaluating}
            className="py-2.5 rounded-xl bg-background-surface text-pastel-muted hover:text-white font-bold text-xs cursor-pointer transition-colors"
          >
            İptal
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={isEvaluating}
            className="py-2.5 rounded-xl bg-pastel-coral text-[#2b1207] font-black text-xs shadow-chunky-coral active:translate-y-0.5 cursor-pointer transition-all flex items-center justify-center gap-1.5 disabled:opacity-60"
          >
            <Sparkles className="w-3.5 h-3.5 fill-current" />
            <span>{isEvaluating ? 'Doğrulanıyor...' : 'Onayla & Analiz Et'}</span>
          </button>
        </div>
      </div>
    </div>
  );
}
