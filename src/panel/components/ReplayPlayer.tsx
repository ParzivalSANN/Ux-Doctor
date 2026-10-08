import { useState, useEffect, useRef } from 'react';
import {
  Play,
  Pause,
  RotateCcw,
  Clock,
  Zap,
  Target,
} from 'lucide-react';
import rrwebPlayer from 'rrweb-player';
import 'rrweb-player/dist/style.css';
import { Session } from '../../storage/sessions';
import { formatTimelineTimestamp } from '../../ai/timeline-summarizer';

interface ReplayPlayerProps {
  session: Session | null;
  targetTimestampMs?: number;
  highlightSelector?: string;
  onClose?: () => void;
}

export function ReplayPlayer({
  session,
  targetTimestampMs,
  highlightSelector,
  onClose,
}: ReplayPlayerProps) {
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [playbackSpeed, setPlaybackSpeed] = useState<number>(1);
  const [currentTimeMs, setCurrentTimeMs] = useState<number>(0);
  const [activeHighlight, setActiveHighlight] = useState<string | null>(highlightSelector || null);
  const [isRrwebMounted, setIsRrwebMounted] = useState<boolean>(false);

  const rrwebMountRef = useRef<HTMLDivElement | null>(null);
  const rrwebPlayerInstance = useRef<any>(null);
  const animationFrameRef = useRef<number | null>(null);
  const lastTickTimeRef = useRef<number | null>(null);

  const durationMs = Math.max(session?.duration || 15000, 5000);

  // 1. rrweb-player Başlatma ve Temizleme
  useEffect(() => {
    if (!session || !rrwebMountRef.current) return;

    // Önceki örneği temizle
    if (rrwebPlayerInstance.current) {
      try {
        rrwebPlayerInstance.current.pause?.();
        rrwebPlayerInstance.current.$destroy?.();
      } catch (e) {
        // yoksay
      }
      rrwebPlayerInstance.current = null;
    }
    rrwebMountRef.current.innerHTML = '';

    const hasEvents = Boolean(
      session.rrwebEvents &&
      Array.isArray(session.rrwebEvents) &&
      session.rrwebEvents.length >= 2
    );

    if (hasEvents && rrwebMountRef.current) {
      try {
        const player = new rrwebPlayer({
          target: rrwebMountRef.current,
          props: {
            events: session.rrwebEvents as any,
            width: 320,
            height: 200,
            autoPlay: false,
            speed: playbackSpeed,
            showController: false,
          },
        });

        // Zaman güncellemelerini dinle
        player.addEventListener('ui-update-current-time', (payload: any) => {
          if (payload && typeof payload.payload === 'number') {
            setCurrentTimeMs(payload.payload);
          }
        });

        rrwebPlayerInstance.current = player;
        setIsRrwebMounted(true);
      } catch (err) {
        console.warn('[UX Doctor] rrweb-player başlatılamadı, görsel simülatöre geçiliyor:', err);
        setIsRrwebMounted(false);
      }
    } else {
      setIsRrwebMounted(false);
    }

    return () => {
      if (rrwebPlayerInstance.current) {
        try {
          rrwebPlayerInstance.current.pause?.();
          rrwebPlayerInstance.current.$destroy?.();
        } catch (e) {
          // yoksay
        }
        rrwebPlayerInstance.current = null;
      }
    };
  }, [session?.id]);

  // 2. Dışarıdan targetTimestampMs veya highlightSelector geldiğinde doğrudan o saniyeye atla
  useEffect(() => {
    if (typeof targetTimestampMs === 'number') {
      seekToTimestamp(targetTimestampMs / 1000);
      setIsPlaying(true);
    }
    if (highlightSelector) {
      setActiveHighlight(highlightSelector);
      applyIframeHighlight(highlightSelector);
    }
  }, [targetTimestampMs, highlightSelector]);

  // 3. iframe içindeki elemana kırmızı/sarı dikkat çerçevesi uygula
  const applyIframeHighlight = (selector: string) => {
    if (!rrwebMountRef.current) return;
    try {
      const iframe = rrwebMountRef.current.querySelector('iframe');
      if (iframe && iframe.contentDocument) {
        // Önceki vurguları temizle
        const oldHighlighted = iframe.contentDocument.querySelectorAll('.ux-doctor-highlight-pulse');
        oldHighlighted.forEach((el) => {
          (el as HTMLElement).style.outline = '';
          (el as HTMLElement).style.boxShadow = '';
          el.classList.remove('ux-doctor-highlight-pulse');
        });

        const targetEl = iframe.contentDocument.querySelector(selector) as HTMLElement | null;
        if (targetEl) {
          targetEl.classList.add('ux-doctor-highlight-pulse');
          targetEl.style.outline = '3px solid #ff6b6b';
          targetEl.style.boxShadow = '0 0 25px rgba(255, 107, 107, 0.9)';
          targetEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
      }
    } catch (e) {
      console.warn('[UX Doctor] iframe highlight uygulanamadı:', e);
    }
  };

  // 4. Zaman akışı (Oynat / Duraklat döngüsü - hem rrweb hem simüle ekran için)
  useEffect(() => {
    if (isPlaying) {
      lastTickTimeRef.current = performance.now();
      const loop = (now: number) => {
        if (lastTickTimeRef.current !== null) {
          const delta = now - lastTickTimeRef.current;
          setCurrentTimeMs((prev) => {
            const next = prev + delta * playbackSpeed;
            if (next >= durationMs) {
              setIsPlaying(false);
              rrwebPlayerInstance.current?.pause?.();
              return durationMs;
            }
            return next;
          });
        }
        lastTickTimeRef.current = now;
        animationFrameRef.current = requestAnimationFrame(loop);
      };
      animationFrameRef.current = requestAnimationFrame(loop);
    } else {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
      lastTickTimeRef.current = null;
    }

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [isPlaying, playbackSpeed, durationMs]);

  /**
   * Doğrudan verilen saniyeye atlar ve oynatır
   * @param seconds Saniye cinsinden hedef zaman (örn: 7)
   */
  const seekToTimestamp = (seconds: number) => {
    const targetMs = Math.max(0, Math.min(seconds * 1000, durationMs));
    setCurrentTimeMs(targetMs);

    if (rrwebPlayerInstance.current) {
      try {
        rrwebPlayerInstance.current.goto(targetMs, true);
      } catch (err) {
        console.warn('[UX Doctor] rrwebPlayer goto hatası:', err);
      }
    }

    setIsPlaying(true);

    if (activeHighlight) {
      setTimeout(() => applyIframeHighlight(activeHighlight), 200);
    }
  };

  // Oynat / Duraklat Butonu
  const handlePlayToggle = () => {
    if (isPlaying) {
      setIsPlaying(false);
      rrwebPlayerInstance.current?.pause?.();
    } else {
      if (currentTimeMs >= durationMs) {
        seekToTimestamp(0);
      } else {
        setIsPlaying(true);
        rrwebPlayerInstance.current?.play?.();
      }
    }
  };

  // Scrubber Kaydırma
  const handleScrubberChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const pct = parseFloat(e.target.value);
    const targetMs = (pct / 100) * durationMs;
    seekToTimestamp(targetMs / 1000);
  };

  // Hız Değiştirme (1x / 2x)
  const toggleSpeed = () => {
    const nextSpeed = playbackSpeed === 1 ? 2 : 1;
    setPlaybackSpeed(nextSpeed);
    if (rrwebPlayerInstance.current) {
      try {
        rrwebPlayerInstance.current.setSpeed(nextSpeed);
      } catch (e) {
        // yoksay
      }
    }
  };

  if (!session) {
    return (
      <div className="p-8 text-center bg-background-card rounded-2xl border border-background-surface text-pastel-muted text-xs flex flex-col items-center gap-2">
        <Clock className="w-8 h-8 text-pastel-lavender/40" />
        <span>Oynatılacak oturum seçilmedi.</span>
      </div>
    );
  }

  // Scrubber üzerindeki Renkli Uyarı İşaretçileri:
  // Kırmızı nokta: Rage click anı
  // Sarı nokta: Hesitation (duraksama) anı
  // Mor nokta: Konsol hatası / Dead click anı
  const markers = (session.frustrations || []).map((f, idx) => {
    const relMs = Math.max(0, f.timestamp - session.startTime);
    const leftPct = Math.min(100, Math.max(0, (relMs / durationMs) * 100));

    let dotColor = 'bg-pastel-yellow shadow-[0_0_8px_#fed668]'; // Hesitation
    let typeName = 'Hesitation (Duraksama)';

    if (f.type === 'rage_click') {
      dotColor = 'bg-pastel-red shadow-[0_0_8px_#ff6b6b]'; // Rage click
      typeName = 'Rage Click (Öfkeli Tıklama)';
    } else if (f.type === 'dead_click') {
      dotColor = 'bg-purple-400 shadow-[0_0_8px_#c084fc]'; // Dead click / Konsol hatası
      typeName = 'Dead Click / Konsol Hatası';
    }

    return {
      id: `marker_${idx}`,
      relMs,
      leftPct,
      dotColor,
      typeName,
      selector: f.selector,
    };
  });

  const progressPct = Math.min(100, (currentTimeMs / durationMs) * 100);

  return (
    <div className="p-4 rounded-3xl bg-background-card border border-background-surface/90 shadow-card-glow flex flex-col gap-3.5 relative overflow-hidden animate-in fade-in duration-200">
      {/* 1. Üst Bilgi Barı */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-xl bg-pastel-coral/20 border border-pastel-coral/40 flex items-center justify-center text-pastel-coral">
            <Zap className="w-4 h-4 fill-current" />
          </div>
          <div>
            <h4 className="text-xs font-black text-white truncate max-w-[190px]">
              {session.taskName || 'Oturum Replay'}
            </h4>
            <span className="text-[10px] text-pastel-muted font-mono">
              {new Date(session.startTime).toLocaleTimeString()} • {Math.round(durationMs / 1000)} sn
            </span>
          </div>
        </div>

        <div className="flex items-center gap-1.5">
          {/* 1x / 2x Hız Seçeneği */}
          <button
            onClick={toggleSpeed}
            title="Oynatma Hızı (1x / 2x)"
            className="px-2.5 py-1 rounded-lg bg-background-deep text-pastel-mint font-mono font-black text-[11px] border border-white/5 cursor-pointer hover:bg-background-surface active:scale-95 transition-all shadow-sm"
          >
            {playbackSpeed}x
          </button>
          {onClose && (
            <button
              onClick={onClose}
              className="text-xs text-pastel-muted hover:text-white px-2 py-1 rounded-lg hover:bg-background-surface cursor-pointer"
            >
              Kapat
            </button>
          )}
        </div>
      </div>

      {/* 2. Oynatıcı Önizleme Ekranı (rrweb-player veya Simüle DOM Tuvali) */}
      <div className="w-full h-52 bg-[#120b1f] rounded-2xl border border-white/10 relative overflow-hidden flex flex-col items-center justify-center select-none shadow-inner">
        {/* Canlı Simüle Edilmiş Tarayıcı Başlık Çubuğu */}
        <div className="absolute top-0 left-0 right-0 h-7 bg-background-deep/90 border-b border-white/5 px-3 flex items-center justify-between text-[10px] text-pastel-muted font-mono z-10">
          <span className="truncate max-w-[200px] flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-pastel-mint/80" />
            {session.url}
          </span>
          <span className="text-pastel-mint font-bold">{formatTimelineTimestamp(currentTimeMs)}</span>
        </div>

        {/* Gerçek rrweb-player Konteyneri (Eğer rrweb verisi varsa buraya render edilir) */}
        <div
          ref={rrwebMountRef}
          className={`w-full h-full pt-7 flex items-center justify-center overflow-hidden ${
            isRrwebMounted ? 'block' : 'hidden'
          }`}
        />

        {/* Görsel Simülasyon Ekranı (rrweb henüz yoksa veya yedek olarak devrede) */}
        {!isRrwebMounted && (
          <div className="w-full max-w-[280px] p-3 rounded-xl bg-background-deep/95 border border-white/10 flex flex-col gap-2 relative mt-5 shadow-2xl">
            <div className="flex items-center justify-between">
              <div className="h-3 w-20 bg-white/10 rounded-md" />
              <div className="h-2 w-12 bg-white/5 rounded-md" />
            </div>

            {/* Vurgulanan Eleman (Kırmızı / Sarı Parıldayan Dikkat Çerçevesi) */}
            <div
              className={`p-2.5 rounded-xl border text-[11px] font-mono transition-all duration-300 relative ${
                activeHighlight
                  ? 'border-2 border-pastel-coral bg-pastel-coral/20 text-white shadow-[0_0_25px_rgba(255,107,107,0.85)] animate-pulse'
                  : 'border-white/10 bg-white/5 text-pastel-muted'
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="font-black truncate max-w-[170px] text-white">
                  {activeHighlight || 'button.price-toggle'}
                </span>
                {activeHighlight && (
                  <span className="text-[9px] font-black uppercase text-[#2b1207] bg-pastel-coral px-2 py-0.5 rounded-full shadow-sm">
                    Odak
                  </span>
                )}
              </div>
              <div className="text-[9px] text-pastel-lavender/90 mt-1 truncate">
                {activeHighlight ? '🚨 Dikkat Çerçevesi: Sürtünmenin Yaşandığı Alan' : 'Normal sayfa etkileşimi'}
              </div>
            </div>

            <div className="h-2 w-28 bg-white/5 rounded-md" />
          </div>
        )}

        {/* Oynatma Duraklatma Katmanı */}
        {!isPlaying && (
          <div className="absolute inset-0 bg-black/45 backdrop-blur-[1px] flex items-center justify-center z-20">
            <button
              onClick={handlePlayToggle}
              title="Oynat"
              className="w-12 h-12 rounded-full bg-pastel-mint text-pastel-mint-dark flex items-center justify-center shadow-chunky-mint cursor-pointer hover:scale-105 active:scale-95 transition-all"
            >
              <Play className="w-5 h-5 fill-current ml-0.5" />
            </button>
          </div>
        )}
      </div>

      {/* 3. Zaman Çubuğu (Scrubber) & Renkli Uyarı İşaretçileri */}
      <div className="flex flex-col gap-1.5 pt-1">
        <div className="relative w-full flex items-center py-1">
          {/* Arka Plan Çubuğu */}
          <div className="w-full h-3 bg-background-deep rounded-full overflow-hidden relative border border-white/10">
            <div
              className="h-full bg-gradient-to-r from-pastel-mint via-pastel-yellow to-pastel-coral transition-all duration-75"
              style={{ width: `${progressPct}%` }}
            />
          </div>

          {/* HTML Range Input (Etkileşimli Kaydırma) */}
          <input
            type="range"
            min="0"
            max="100"
            step="0.1"
            value={progressPct}
            onChange={handleScrubberChange}
            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-30"
          />

          {/* Renkli Uyarı İşaretçileri:
              - Kırmızı nokta: Rage click anı
              - Sarı nokta: Hesitation (duraksama) anı
              - Mor nokta: Konsol hatası anı
          */}
          {markers.map((m) => (
            <button
              key={m.id}
              onClick={() => {
                seekToTimestamp(m.relMs / 1000);
                if (m.selector) {
                  setActiveHighlight(m.selector);
                  applyIframeHighlight(m.selector);
                }
              }}
              title={`${m.typeName} (${formatTimelineTimestamp(m.relMs)}) - Tıkla ve Bu Ana Atla`}
              className={`absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-3.5 h-3.5 rounded-full ${m.dotColor} border-2 border-background-deep z-20 cursor-pointer hover:scale-150 transition-transform active:scale-95`}
              style={{ left: `${m.leftPct}%` }}
            />
          ))}
        </div>

        {/* Zaman Etiketleri ve Renk Açıklaması */}
        <div className="flex items-center justify-between text-[10px] font-mono text-pastel-muted">
          <span className="text-white font-bold">{formatTimelineTimestamp(currentTimeMs)}</span>
          <div className="flex items-center gap-2.5">
            <span className="flex items-center gap-1 text-[9px] text-pastel-red font-bold">
              <span className="w-2 h-2 rounded-full bg-pastel-red shadow-[0_0_4px_#ff6b6b]" /> Rage
            </span>
            <span className="flex items-center gap-1 text-[9px] text-pastel-yellow font-bold">
              <span className="w-2 h-2 rounded-full bg-pastel-yellow shadow-[0_0_4px_#fed668]" /> Hesitation
            </span>
            <span className="flex items-center gap-1 text-[9px] text-purple-400 font-bold">
              <span className="w-2 h-2 rounded-full bg-purple-400 shadow-[0_0_4px_#c084fc]" /> Hata
            </span>
          </div>
          <span className="text-pastel-lavender">{formatTimelineTimestamp(durationMs)}</span>
        </div>
      </div>

      {/* 4. Alt Kontrol Barı & Dikkat Çerçevesi Bildirimi */}
      <div className="flex items-center justify-between pt-1 border-t border-background-surface/80">
        <div className="flex items-center gap-2">
          {/* Oynat / Duraklat Butonu */}
          <button
            onClick={handlePlayToggle}
            className="px-3 py-1.5 rounded-xl bg-pastel-mint text-pastel-mint-dark font-black text-xs flex items-center gap-1.5 shadow-chunky-mint active:translate-y-0.5 cursor-pointer hover:bg-[#6edcbb] transition-all"
          >
            {isPlaying ? <Pause className="w-3.5 h-3.5 fill-current" /> : <Play className="w-3.5 h-3.5 fill-current" />}
            <span>{isPlaying ? 'Duraklat' : 'Oynat'}</span>
          </button>

          {/* Başa Sar */}
          <button
            onClick={() => seekToTimestamp(0)}
            title="Başa Sar"
            className="p-1.5 rounded-xl bg-background-deep text-pastel-muted hover:text-white cursor-pointer transition-colors"
          >
            <RotateCcw className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Aktif Odak Elemanı Rozeti */}
        {activeHighlight && (
          <div className="flex items-center gap-1.5 bg-pastel-coral/15 px-2.5 py-1 rounded-xl border border-pastel-coral/30 max-w-[170px]">
            <Target className="w-3 h-3 text-pastel-coral shrink-0 animate-spin" />
            <span className="text-[10px] text-pastel-coral font-mono truncate font-bold">
              {activeHighlight}
            </span>
          </div>
        )}
      </div>
    </div>
  );
}
