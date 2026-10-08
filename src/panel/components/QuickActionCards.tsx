import { Crosshair, Sparkles, AlertOctagon, ChevronRight } from 'lucide-react';

interface QuickActionCardsProps {
  onDiagnoseElement: () => void;
  onFullPageAnalysis: () => void;
  onViewFrictions: () => void;
  isLoading?: boolean;
}

export function QuickActionCards({
  onDiagnoseElement,
  onFullPageAnalysis,
  onViewFrictions,
  isLoading = false,
}: QuickActionCardsProps) {
  return (
    <div className="flex flex-col gap-2.5">
      <div className="flex items-center justify-between px-1">
        <span className="text-[11px] font-black uppercase tracking-wider text-pastel-muted">
          Hızlı Teşhis ve Aksiyonlar
        </span>
        <span className="text-[10px] text-pastel-lavender/70 font-semibold">Tek Tıkla Tetikleme</span>
      </div>

      {/* Kart 1: Element Teşhisi (Sniper Modu) */}
      <button
        onClick={onDiagnoseElement}
        disabled={isLoading}
        className="p-3.5 rounded-2xl bg-background-card border border-background-surface/80 hover:border-pastel-mint/50 active:scale-[0.98] transition-all flex items-center justify-between text-left group cursor-pointer shadow-card-glow disabled:opacity-60"
      >
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-pastel-mint/15 border border-pastel-mint/30 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
            <Crosshair className="w-5 h-5 text-pastel-mint" strokeWidth={2.4} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-black text-white group-hover:text-pastel-mint transition-colors">
                Element Teşhisi (Sniper)
              </span>
            </div>
            <p className="text-[11px] text-pastel-muted mt-0.5 font-medium">
              Sayfada tıklanan tek bir öğeyi derinlemesine incele
            </p>
          </div>
        </div>

        <div className="flex items-center gap-1.5 shrink-0 ml-2">
          <span className="text-[10px] font-black uppercase tracking-wide bg-pastel-mint/20 text-pastel-mint border border-pastel-mint/40 px-2 py-0.5 rounded-full">
            Hızlı
          </span>
          <ChevronRight className="w-4 h-4 text-pastel-muted group-hover:text-white transition-colors" />
        </div>
      </button>

      {/* Kart 2: Tam Sayfa Analizi (Alibaba PageAgent) */}
      <button
        onClick={onFullPageAnalysis}
        disabled={isLoading}
        className="p-3.5 rounded-2xl bg-background-card border border-background-surface/80 hover:border-pastel-yellow/50 active:scale-[0.98] transition-all flex items-center justify-between text-left group cursor-pointer shadow-card-glow disabled:opacity-60"
      >
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-pastel-yellow/15 border border-pastel-yellow/30 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
            <Sparkles className="w-5 h-5 text-pastel-yellow" strokeWidth={2.4} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-black text-white group-hover:text-pastel-yellow transition-colors">
                Tam Sayfa Analizi (Radar)
              </span>
            </div>
            <p className="text-[11px] text-pastel-muted mt-0.5 font-medium">
              PageAgent budama algoritması ile tüm DOM'u tara
            </p>
          </div>
        </div>

        <div className="flex items-center gap-1.5 shrink-0 ml-2">
          <span className="text-[10px] font-black uppercase tracking-wide bg-pastel-yellow/20 text-pastel-yellow border border-pastel-yellow/40 px-2 py-0.5 rounded-full">
            Tek Tıkla
          </span>
          <ChevronRight className="w-4 h-4 text-pastel-muted group-hover:text-white transition-colors" />
        </div>
      </button>

      {/* Kart 3: Oturum Listesi ve Sürtünmeler */}
      <button
        onClick={onViewFrictions}
        disabled={isLoading}
        className="p-3.5 rounded-2xl bg-background-card border border-background-surface/80 hover:border-pastel-pink/50 active:scale-[0.98] transition-all flex items-center justify-between text-left group cursor-pointer shadow-card-glow disabled:opacity-60"
      >
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-pastel-pink/15 border border-pastel-pink/30 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
            <AlertOctagon className="w-5 h-5 text-pastel-pink" strokeWidth={2.4} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-black text-white group-hover:text-pastel-pink transition-colors">
                Oturum Listesi ve Sürtünmeler
              </span>
            </div>
            <p className="text-[11px] text-pastel-muted mt-0.5 font-medium">
              Rage-click, dead-click ve kullanıcı sürtünme noktaları
            </p>
          </div>
        </div>

        <div className="flex items-center gap-1.5 shrink-0 ml-2">
          <span className="text-[10px] font-black uppercase tracking-wide bg-pastel-pink/20 text-pastel-pink border border-pastel-pink/40 px-2 py-0.5 rounded-full">
            Davranış
          </span>
          <ChevronRight className="w-4 h-4 text-pastel-muted group-hover:text-white transition-colors" />
        </div>
      </button>
    </div>
  );
}
