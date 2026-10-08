import { Stethoscope, Crosshair, Settings } from 'lucide-react';

interface HeaderProps {
  onTargetClick?: () => void;
  onSettingsClick?: () => void;
  isTargetingActive?: boolean;
}

export function Header({
  onTargetClick,
  onSettingsClick,
  isTargetingActive = false,
}: HeaderProps) {
  return (
    <header className="sticky top-0 z-50 px-4 py-3 bg-background-deep/95 backdrop-blur-md border-b border-background-surface/80 flex items-center justify-between">
      {/* Sol: Kalp/Stetoskop İkonlu Yuvarlak Rozet + Çift Renkli Başlık */}
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-[#3d2e61] to-[#251b3d] border border-white/10 flex items-center justify-center shadow-chunky-sm relative">
          <Stethoscope className="w-5 h-5 text-pastel-coral" strokeWidth={2.4} />
          <span className="absolute -top-1 -right-1 w-3 h-3 bg-pastel-mint rounded-full border-2 border-background-deep" />
        </div>
        <div>
          <div className="flex items-center gap-1.5">
            <span className="font-extrabold text-xl tracking-tight text-white">UX</span>
            <span className="font-extrabold text-xl tracking-tight text-pastel-coral">Doctor</span>
            <span className="text-[10px] font-black uppercase tracking-wider bg-background-surface/80 px-2 py-0.5 rounded-full text-pastel-lavender border border-white/5 ml-1">
              v2.0
            </span>
          </div>
          <p className="text-[11px] text-pastel-muted -mt-0.5 font-medium">Sayfa Ergonomisi & Teşhis</p>
        </div>
      </div>

      {/* Sağ: Hedefleme İkonu (Nane Yeşili) + Ayarlar İkonu (Sarı) */}
      <div className="flex items-center gap-2">
        {/* Hedefleme / Sniper Butonu */}
        <button
          onClick={onTargetClick}
          title={isTargetingActive ? "Hedefleme Modunu Durdur" : "Element Hedefleme Modu (Sniper)"}
          className={`w-9 h-9 rounded-full flex items-center justify-center font-bold transition-all cursor-pointer shadow-chunky-sm ${
            isTargetingActive
              ? 'bg-pastel-pink text-pastel-pink-dark scale-105 ring-2 ring-pastel-pink animate-pulse'
              : 'bg-pastel-mint text-pastel-mint-dark hover:scale-105 active:scale-95'
          }`}
        >
          <Crosshair className="w-4 h-4" strokeWidth={2.5} />
        </button>

        {/* Ayarlar Butonu */}
        <button
          onClick={onSettingsClick}
          title="Ayarlar & Yapılandırma"
          className="w-9 h-9 rounded-full bg-pastel-yellow text-pastel-yellow-dark flex items-center justify-center font-bold hover:scale-105 active:scale-95 transition-all cursor-pointer shadow-chunky-sm"
        >
          <Settings className="w-4 h-4" strokeWidth={2.5} />
        </button>
      </div>
    </header>
  );
}
