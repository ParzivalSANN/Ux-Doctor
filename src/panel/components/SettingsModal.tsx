import { useState, useEffect } from 'react';
import { Key, ShieldCheck, Check } from 'lucide-react';
import { getStoredApiKey, setStoredApiKey } from '../../ai/llm-client';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function SettingsModal({ isOpen, onClose }: SettingsModalProps) {
  const [apiKey, setApiKey] = useState<string>('');
  const [savedSuccess, setSavedSuccess] = useState<boolean>(false);

  useEffect(() => {
    if (isOpen) {
      getStoredApiKey().then((k) => {
        if (k) setApiKey(k);
      });
    }
  }, [isOpen]);

  const handleSave = async () => {
    await setStoredApiKey(apiKey.trim());
    setSavedSuccess(true);
    setTimeout(() => {
      setSavedSuccess(false);
      onClose();
    }, 1200);
  };

  const handleClear = async () => {
    await setStoredApiKey('');
    setApiKey('');
    setSavedSuccess(true);
    setTimeout(() => {
      setSavedSuccess(false);
    }, 1200);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm">
      <div className="w-full max-w-sm rounded-3xl bg-background-card border border-background-surface p-5 space-y-4 shadow-chunky">
        <div className="flex items-center justify-between border-b border-white/10 pb-3">
          <h3 className="text-sm font-black text-white flex items-center gap-2">
            <Key className="w-4 h-4 text-pastel-yellow" />
            <span>LLM Yapılandırması & API Anahtarı</span>
          </h3>
          <button
            onClick={onClose}
            className="text-pastel-muted hover:text-white font-bold text-sm cursor-pointer"
          >
            ✕
          </button>
        </div>

        <div className="space-y-3 text-xs">
          <p className="text-pastel-lavender">
            Don Norman ilkeleri analizinde doğrudan Anthropic Claude Messages API (3.5 Sonnet) kullanmak isterseniz API anahtarınızı girebilirsiniz.
          </p>

          <div className="space-y-1">
            <label className="text-[11px] font-bold text-pastel-muted block">
              Anthropic API Key (sk-ant-...)
            </label>
            <input
              type="password"
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              placeholder="sk-ant-api03-..."
              className="w-full px-3 py-2 rounded-xl bg-background-deep border border-white/10 text-white font-mono text-xs focus:outline-none focus:border-pastel-mint"
            />
          </div>

          <div className="p-3 rounded-2xl bg-background-deep/60 border border-white/5 space-y-1.5 text-[11px] text-pastel-muted">
            <div className="flex items-center gap-1.5 text-pastel-mint font-bold">
              <ShieldCheck className="w-4 h-4" />
              <span>Etik & Güvenlik Güvencesi:</span>
            </div>
            <p>
              • API anahtarı repoya commit edilmez, yalnızca yerel tarayıcı belleğinde (<code className="text-pastel-yellow">chrome.storage.local</code>) tutulur.
            </p>
            <p>
              • Anahtar girilmediğinde sistem tamamen çalışan <strong>Yerel Doğrulanmış Tanı Motoru</strong> ile kesintisiz ve sıfır halüsinasyonla çalışır.
            </p>
          </div>

          {savedSuccess && (
            <div className="p-2 rounded-xl bg-pastel-mint/20 border border-pastel-mint/40 text-pastel-mint text-center font-bold flex items-center justify-center gap-1.5">
              <Check className="w-4 h-4" />
              <span>Ayarlar Başarıyla Kaydedildi!</span>
            </div>
          )}

          <div className="flex items-center gap-2 pt-2">
            <button
              onClick={handleSave}
              className="flex-1 py-2.5 rounded-xl bg-pastel-mint text-pastel-mint-dark font-black cursor-pointer hover:scale-[1.02] active:scale-[0.98] transition-all"
            >
              Kaydet
            </button>
            {apiKey && (
              <button
                onClick={handleClear}
                className="px-3 py-2.5 rounded-xl bg-background-surface text-pastel-pink font-bold cursor-pointer hover:bg-background-surface/80"
              >
                Sil
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
