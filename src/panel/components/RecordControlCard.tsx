import { useState, useEffect } from 'react';
import { Target, Video, Code2, Play, Square, Activity, Clock } from 'lucide-react';

export type RecordingMode = 'dom' | 'video';

interface RecordControlCardProps {
  onStartRecording: (goal: string, mode: RecordingMode) => void;
  onStopRecording: () => void;
  isRecording: boolean;
  eventCount?: number;
}

export function RecordControlCard({
  onStartRecording,
  onStopRecording,
  isRecording,
  eventCount = 0,
}: RecordControlCardProps) {
  const [goal, setGoal] = useState<string>('');
  const [mode, setMode] = useState<RecordingMode>('dom');
  const [elapsedSeconds, setElapsedSeconds] = useState<number>(0);

  // Kayıt esnasında zaman sayacı
  useEffect(() => {
    let interval: any = null;
    if (isRecording) {
      interval = setInterval(() => {
        setElapsedSeconds((prev) => prev + 1);
      }, 1000);
    } else {
      setElapsedSeconds(0);
    }
    return () => clearInterval(interval);
  }, [isRecording]);

  // Zaman formatlayıcı (MM:SS)
  const formatTime = (totalSeconds: number) => {
    const mins = Math.floor(totalSeconds / 60);
    const secs = totalSeconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const handleToggleRecord = () => {
    if (isRecording) {
      onStopRecording();
    } else {
      onStartRecording(goal, mode);
    }
  };

  return (
    <div className="p-4 rounded-2xl bg-background-card border border-background-surface/80 shadow-card-glow flex flex-col gap-3.5 relative overflow-hidden transition-all">
      {/* Kayıt Aktifken Arka Plan Parıltısı */}
      {isRecording && (
        <div className="absolute -top-12 -right-12 w-32 h-32 bg-pastel-coral/10 rounded-full blur-2xl pointer-events-none animate-pulse" />
      )}

      {/* 1. Üst Kısım: Başlık & Canlı Durum Rozeti */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Target className="w-4 h-4 text-pastel-coral" />
          <span className="text-xs font-bold uppercase tracking-wider text-pastel-lavender">
            Kullanıcı Görevi & Kayıt
          </span>
        </div>

        {isRecording ? (
          <div className="inline-flex items-center gap-2 bg-pastel-coral/20 border border-pastel-coral/40 px-2.5 py-1 rounded-full">
            <span className="w-2 h-2 rounded-full bg-pastel-coral animate-ping" />
            <span className="text-[11px] font-black text-pastel-coral tracking-wide">CANLI KAYIT</span>
          </div>
        ) : (
          <span className="text-[11px] font-semibold text-pastel-muted">Kayıt Bekleniyor</span>
        )}
      </div>

      {/* 2. Görev Tanımı Girişi */}
      <div className="flex flex-col gap-1">
        <label className="text-[11px] font-bold text-pastel-muted">
          Görev Tanımı <span className="font-normal text-pastel-lavender/60">(Opsiyonel Hedef)</span>
        </label>
        <div className="relative">
          <input
            type="text"
            value={goal}
            onChange={(e) => setGoal(e.target.value)}
            disabled={isRecording}
            placeholder="Örn: Kullanıcı sepete ürün eklemeye çalışıyor"
            className="w-full px-3.5 py-2.5 rounded-xl bg-background-deep/80 border border-background-surface text-white placeholder-pastel-muted/60 text-xs focus:outline-none focus:border-pastel-coral focus:ring-1 focus:ring-pastel-coral transition-colors disabled:opacity-50"
          />
        </div>
      </div>

      {/* 3. Mod Seçimi */}
      <div className="flex flex-col gap-1.5">
        <span className="text-[11px] font-bold text-pastel-muted">Kayıt Modu</span>
        <div className="grid grid-cols-2 gap-2">
          {/* DOM Kaydı Butonu */}
          <button
            type="button"
            disabled={isRecording}
            onClick={() => setMode('dom')}
            className={`p-2 rounded-xl border text-xs font-bold flex items-center justify-center gap-2 transition-all cursor-pointer ${
              mode === 'dom'
                ? 'bg-pastel-mint/15 border-pastel-mint text-pastel-mint shadow-sm'
                : 'bg-background-deep/50 border-background-surface text-pastel-muted hover:text-white'
            } disabled:opacity-50`}
          >
            <Code2 className="w-3.5 h-3.5" />
            <span>DOM Kaydı</span>
            <span className="text-[9px] bg-pastel-mint/20 text-pastel-mint px-1.5 py-0.2 rounded-full">
              Önerilen
            </span>
          </button>

          {/* Video Modu Butonu */}
          <button
            type="button"
            disabled={isRecording}
            onClick={() => setMode('video')}
            className={`p-2 rounded-xl border text-xs font-bold flex items-center justify-center gap-2 transition-all cursor-pointer ${
              mode === 'video'
                ? 'bg-pastel-yellow/15 border-pastel-yellow text-pastel-yellow shadow-sm'
                : 'bg-background-deep/50 border-background-surface text-pastel-muted hover:text-white'
            } disabled:opacity-50`}
          >
            <Video className="w-3.5 h-3.5" />
            <span>Video Modu</span>
            <span className="text-[9px] bg-white/10 text-pastel-muted px-1.5 py-0.2 rounded-full">
              Opsiyonel
            </span>
          </button>
        </div>
      </div>

      {/* 4. Canlı Sayaç & Olay Göstergesi (Kayıttayken) */}
      {isRecording && (
        <div className="grid grid-cols-2 gap-2 bg-background-deep/80 p-2.5 rounded-xl border border-background-surface">
          <div className="flex items-center gap-2">
            <Clock className="w-4 h-4 text-pastel-yellow" />
            <div>
              <div className="text-[10px] text-pastel-muted uppercase font-bold">Geçen Süre</div>
              <div className="text-sm font-mono font-black text-white">{formatTime(elapsedSeconds)}</div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Activity className="w-4 h-4 text-pastel-mint animate-pulse" />
            <div>
              <div className="text-[10px] text-pastel-muted uppercase font-bold">Yakalanan Olay</div>
              <div className="text-sm font-mono font-black text-pastel-mint">{eventCount} etkileşim</div>
            </div>
          </div>
        </div>
      )}

      {/* 5. Büyük Pastel Aksiyon Butonu */}
      <button
        onClick={handleToggleRecord}
        className={`w-full py-3.5 px-5 rounded-2xl font-black text-sm flex items-center justify-center gap-2.5 cursor-pointer transition-all active:translate-y-1 select-none ${
          isRecording
            ? 'bg-pastel-coral text-[#2b1207] shadow-chunky-coral hover:bg-[#ff8f63]'
            : 'bg-pastel-mint text-pastel-mint-dark shadow-chunky-mint hover:bg-[#6edcbb]'
        }`}
      >
        {isRecording ? (
          <>
            <Square className="w-4 h-4 fill-current" />
            <span>Kaydı Durdur ve İşle</span>
          </>
        ) : (
          <>
            <Play className="w-4 h-4 fill-current" />
            <span>● Kaydı Başlat</span>
          </>
        )}
      </button>
    </div>
  );
}
