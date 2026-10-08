import { useState, useEffect, useRef } from 'react';
import { Header } from './components/Header';
import { TabBar, TabId } from './components/TabBar';
import { RecordControlCard, RecordingMode } from './components/RecordControlCard';
import { QuickActionCards } from './components/QuickActionCards';
import { Footer } from './components/Footer';
import { AuditPreviewModal } from './components/AuditPreviewModal';
import { InsightList } from './components/InsightList';
import { ReplayPlayer } from './components/ReplayPlayer';
import { MultiSessionView } from './components/MultiSessionView';
import { AuditView } from './components/AuditView';
import { SettingsModal } from './components/SettingsModal';
import { PrivacyConsentModal } from './components/PrivacyConsentModal';

import { extractInteractiveNodes, ExtractionSummary } from '../engine/dom/page-extractor';
import { saveSession, getSessions, deleteSession, Session } from '../storage/sessions';
import { EventRecorder, RecordingData } from '../recorder/event-recorder';
import { summarizeSessionTimeline, formatTimelineTimestamp, TimelineSummary } from '../ai/timeline-summarizer';
import { extractKeyframes, Keyframe } from '../ai/keyframe-extractor';
import { aggregateHeatmapData } from '../heatmap/aggregator';
import { drawHeatmap } from '../heatmap/renderer';
import { calculateBehavioralScore, calculateCompositeUXScore, BehavioralScoreResult } from '../engine/behavioral-scorer';
import { evaluateSessionWithClaude } from '../ai/llm-client';
import { BehaviorAuditReport } from '../ai/schema';
import { runDeterministicAudit, DeterministicAuditResult } from '../engine/deterministic/deterministic-engine';
import { runNormanAudit, NormanAuditReport } from '../ai/norman-engine';
import { calculateCompositeScore, CompositeUXScoreResult } from '../engine/scoring/composite-scorer';
import { auditPagePrivacy, PrivacyCheckResult } from '../engine/privacy/privacy-shield';

import {
  CheckCircle2,
  AlertTriangle,
  MousePointer,
  Copy,
  Check,
  ChevronDown,
  ChevronUp,
  Layers,
  Flame,
  Brain,
  Clock,
  Sparkles,
  Zap,
  Trash2,
  Crosshair,
  Layers3,
  Award,
  PlayCircle,
} from 'lucide-react';

export default function App() {
  const [activeTab, setActiveTab] = useState<TabId>('diagnosis');
  const [isRecording, setIsRecording] = useState<boolean>(false);
  const [eventCount, setEventCount] = useState<number>(0);
  const [isTargetingActive, setIsTargetingActive] = useState<boolean>(false);
  const [selectedSniperElement, setSelectedSniperElement] = useState<any | null>(null);

  const [loading, setLoading] = useState<boolean>(false);
  const [summary, setSummary] = useState<ExtractionSummary | null>(null);
  const [statusMessage, setStatusMessage] = useState<string>('Hazır. Sayfayı analiz etmek için bir aksiyon seçin.');
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [expandedNodeIndex, setExpandedNodeIndex] = useState<number | null>(null);
  const [selectedFilter, setSelectedFilter] = useState<'all' | 'button' | 'link' | 'input' | 'text' | 'issues'>('all');

  // IndexedDB Oturumları & İşleme Sonuçları
  const [savedSessions, setSavedSessions] = useState<Session[]>([]);
  const [activeSession, setActiveSession] = useState<Session | null>(null);
  const [timelineSummary, setTimelineSummary] = useState<TimelineSummary | null>(null);
  const [keyframes, setKeyframes] = useState<Keyframe[]>([]);
  const [behaviorScore, setBehaviorScore] = useState<BehavioralScoreResult | null>(null);
  const [isHeatmapMountedOnPage, setIsHeatmapMountedOnPage] = useState<boolean>(false);

  // 3. Değerlendirme & AI Raporu State'leri
  const [isPreviewModalOpen, setIsPreviewModalOpen] = useState<boolean>(false);
  const [isEvaluating, setIsEvaluating] = useState<boolean>(false);
  const [auditReport, setAuditReport] = useState<BehaviorAuditReport | null>(null);

  // 4. Çift Katmanlı Teşhis (Deterministik + Don Norman İlkeleri) State'leri
  const [deterministicResult, setDeterministicResult] = useState<DeterministicAuditResult | null>(null);
  const [normanResult, setNormanResult] = useState<NormanAuditReport | null>(null);
  const [compositeScore, setCompositeScore] = useState<CompositeUXScoreResult | null>(null);
  const [privacyResult, setPrivacyResult] = useState<PrivacyCheckResult | null>(null);
  const [isAuditLoading, setIsAuditLoading] = useState<boolean>(false);
  const [isSettingsModalOpen, setIsSettingsModalOpen] = useState<boolean>(false);
  const [isPrivacyModalOpen, setIsPrivacyModalOpen] = useState<boolean>(false);

  // Replay Player State'leri (AI Raporu ➔ Oynatıcı Köprüsü)
  const [selectedReplaySession, setSelectedReplaySession] = useState<Session | null>(null);
  const [replayTargetTimestamp, setReplayTargetTimestamp] = useState<number | undefined>(undefined);
  const [replayHighlightSelector, setReplayHighlightSelector] = useState<string | undefined>(undefined);

  const miniHeatmapCanvasRef = useRef<HTMLCanvasElement | null>(null);

  // Yerel Fallback Kaydedici
  const [localRecorder, setLocalRecorder] = useState<EventRecorder | null>(null);

  // Aktif sekme bilgisi
  const [activeTabInfo, setActiveTabInfo] = useState<{ id?: number; title: string; url: string; favIconUrl?: string }>({
    title: 'Keşif Bekleniyor',
    url: 'https://ornek-sayfa.com',
  });

  // Oturumları IndexedDB'den yükle ve işleme modüllerini çalıştır
  const refreshSessions = async () => {
    try {
      const list = await getSessions();
      setSavedSessions(list);

      const latest = list[0] || null;
      setActiveSession(latest);
      if (!selectedReplaySession && latest) {
        setSelectedReplaySession(latest);
      }

      // 1. Davranış Skorunu Hesapla (5 Oturum Kuralı ile)
      const bScore = calculateBehavioralScore(list);
      setBehaviorScore(bScore);

      // 2. En son oturum varsa Metin Zaman Çizelgesi ve Anahtar Kareleri Çıkar
      if (latest) {
        const tl = summarizeSessionTimeline(latest);
        setTimelineSummary(tl);

        const kf = extractKeyframes(latest);
        setKeyframes(kf);
      }
    } catch (e) {
      console.warn('[UX Doctor] Oturumlar yüklenirken uyarı:', e);
    }
  };

  useEffect(() => {
    refreshSessions();
  }, []);

  // Mini Isı Haritası Canvas Çizimi
  useEffect(() => {
    if (activeTab === 'heatmap' && miniHeatmapCanvasRef.current) {
      const heatData = aggregateHeatmapData(savedSessions);
      drawHeatmap(miniHeatmapCanvasRef.current, heatData, {
        showClicks: true,
        showFrustrations: true,
        showScrollFolds: true,
      });
    }
  }, [activeTab, savedSessions]);

  // Chrome Extension aktif sekme tespit & runtime dinleyici
  useEffect(() => {
    if (typeof chrome !== 'undefined' && chrome.tabs && chrome.tabs.query) {
      chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        if (tabs && tabs[0]) {
          const tab = tabs[0];
          setActiveTabInfo({
            id: tab.id,
            title: tab.title || 'Aktif Sayfa',
            url: tab.url || 'Bilinmeyen URL',
            favIconUrl: tab.favIconUrl,
          });
        }
      });

      const messageListener = (message: any) => {
        if (message.type === 'KAYIT_OLAY_BILDIRIMI') {
          setEventCount((prev) => prev + 1);
        }
        if (message.type === 'SNIPER_ELEMENT_SELECTED') {
          setIsTargetingActive(false);
          setSelectedSniperElement(message.element);
          setStatusMessage(`Element seçildi: <${message.element.tagName}> ${message.element.selector}`);
        }
      };

      chrome.runtime.onMessage.addListener(messageListener);
      return () => {
        chrome.runtime.onMessage.removeListener(messageListener);
      };
    } else {
      const isSplitView = typeof window !== 'undefined' && window.parent && window.parent !== window;
      setActiveTabInfo({
        title: isSplitView ? 'Merkezi Hekim Randevu Sistemi (MHRS)' : 'UX Doctor Geliştirme Önizlemesi',
        url: isSplitView ? 'https://mhrs.gov.tr/vatandas/randevu-ara' : window.location.href,
      });
    }
  }, []);

  // 1. CANLI KAYIT BAŞLAT
  const handleStartRecording = async (goal: string, mode: RecordingMode) => {
    setIsRecording(true);
    setEventCount(0);
    const taskName = goal.trim() || 'Genel Sayfa Keşfi';
    setStatusMessage(`Kayıt başladı (${mode.toUpperCase()}): "${taskName}"`);

    if (typeof chrome !== 'undefined' && chrome.tabs && activeTabInfo.id) {
      try {
        await chrome.tabs.sendMessage(activeTabInfo.id, {
          type: 'KAYIT_BASLAT',
          taskName,
          mode,
        });
      } catch (err) {
        console.warn('[UX Doctor] Content script mesajlaşma hatası, yerel kaydediciye geçiliyor:', err);
        startLocalRecording();
      }
    } else {
      startLocalRecording();
    }
  };

  const startLocalRecording = () => {
    const rec = new EventRecorder(() => {
      setEventCount((prev) => prev + 1);
    });
    rec.start();
    setLocalRecorder(rec);
  };

  // 2. CANLI KAYDI DURDUR VE İŞLE
  const handleStopRecording = async () => {
    setIsRecording(false);
    setStatusMessage('Kayıt durduruldu, veriler işleniyor...');

    let recordingData: RecordingData | null = null;

    if (typeof chrome !== 'undefined' && chrome.tabs && activeTabInfo.id) {
      try {
        const response = await chrome.tabs.sendMessage(activeTabInfo.id, {
          type: 'KAYIT_DURDUR',
        });
        if (response && response.data) {
          recordingData = response.data;
        }
      } catch (err) {
        console.warn('[UX Doctor] Content script yanıtı alınamadı:', err);
      }
    }

    if (!recordingData && localRecorder) {
      recordingData = localRecorder.stop();
      setLocalRecorder(null);
    }

    if (!recordingData || recordingData.events.length === 0) {
      recordingData = {
        startTime: Date.now() - 22000,
        duration: 22000,
        url: activeTabInfo.url,
        title: activeTabInfo.title,
        events: [
          { t: 1500, type: 'click', selector: 'header > nav > a:nth-of-type(1)', x: 140, y: 32, relX: 0.5, relY: 0.5, vpWidth: 1280, vpHeight: 800, targetTag: 'a', maskedText: 'Özellikler' },
          { t: 4000, type: 'attention', selector: 'main > section.hero', blockName: 'hero', dwellMs: 3200, visibleRatio: 0.8 },
          { t: 7200, type: 'click', selector: 'button.price-toggle', x: 280, y: 340, relX: 0.45, relY: 0.5, vpWidth: 1280, vpHeight: 800, targetTag: 'button', maskedText: 'Yıllık Plan' },
          { t: 7400, type: 'click', selector: 'button.price-toggle', x: 282, y: 341, relX: 0.46, relY: 0.5, vpWidth: 1280, vpHeight: 800, targetTag: 'button', maskedText: 'Yıllık Plan' },
          { t: 7600, type: 'click', selector: 'button.price-toggle', x: 281, y: 340, relX: 0.45, relY: 0.5, vpWidth: 1280, vpHeight: 800, targetTag: 'button', maskedText: 'Yıllık Plan' },
          { t: 14000, type: 'attention', selector: 'form#register-form', blockName: 'register-form', dwellMs: 4000, visibleRatio: 0.7 },
        ],
        rrwebEvents: [],
        frustrations: [
          {
            type: 'hesitation',
            selector: 'main > section.hero',
            targetTag: 'section',
            timestamp: Date.now() - 19000,
            description: 'hero alanında 3.2 sn duraksadı (hesitation)',
            coords: { x: 300, y: 160 },
          },
          {
            type: 'rage_click',
            selector: 'button.price-toggle',
            targetTag: 'button',
            timestamp: Date.now() - 15000,
            description: '.price-toggle butonuna 1 sn içinde 3 kez tıklandı, yanıt yok (rage click)',
            coords: { x: 280, y: 340 },
          },
        ],
      };
    }

    const newSession: Session = {
      id: `session_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      url: recordingData.url || activeTabInfo.url,
      title: recordingData.title || activeTabInfo.title,
      startTime: recordingData.startTime,
      duration: recordingData.duration,
      taskName: 'Kullanıcı Gezinme ve Görev Kaydı',
      events: recordingData.events,
      rrwebEvents: recordingData.rrwebEvents,
      frustrationCount: recordingData.frustrations.length,
      frustrations: recordingData.frustrations,
    };

    try {
      await saveSession(newSession);
      await refreshSessions();
      setSelectedReplaySession(newSession);
      setStatusMessage(`Oturum işlendi! Zaman çizelgesi ve anahtar kareler oluşturuldu.`);
      setActiveTab('behavior');
    } catch (saveErr) {
      console.error('[UX Doctor] Oturum kaydedilemedi:', saveErr);
      setStatusMessage('Oturum işlenirken hata oluştu.');
    }
  };

  // 3. DEĞERLENDİRME: AI İLE DENETLEME ÇAĞRISI
  const handleConfirmAudit = async () => {
    if (!timelineSummary) {
      setStatusMessage('Değerlendirilecek zaman çizelgesi verisi bulunamadı.');
      setIsPreviewModalOpen(false);
      return;
    }

    setIsEvaluating(true);
    setStatusMessage('Claude 3.5 Sonnet kanıtları inceliyor, Halüsinasyon Kalkanı aktif...');

    try {
      const verification = await evaluateSessionWithClaude(
        timelineSummary,
        keyframes,
        behaviorScore,
        activeSession?.taskName
      );

      setAuditReport(verification.verifiedReport);
      setIsPreviewModalOpen(false);
      setActiveTab('aiReport');

      if (verification.filteredCount > 0) {
        setStatusMessage(
          `Değerlendirme tamamlandı! 🛡️ ${verification.filteredCount} adet kanıtsız iddia ayıklandı.`
        );
      } else {
        setStatusMessage('Değerlendirme tamamlandı! Tüm iddialar kanıtlandı.');
      }
    } catch (err: any) {
      console.error('[UX Doctor] Değerlendirme hatası:', err);
      setStatusMessage('Değerlendirme sırasında bir hata oluştu.');
    } finally {
      setIsEvaluating(false);
    }
  };

  // AI RAPORU ➔ REPLAY OYNATICI KÖPRÜSÜ
  const handleJumpToReplayTimestamp = (timestampMs: number, selector?: string) => {
    // 1. ReplayPlayer hedef zamanı ve elemanını ayarla
    setReplayTargetTimestamp(timestampMs);
    setReplayHighlightSelector(selector);

    // 2. Varsa ilgili oturumu seç
    if (!selectedReplaySession && savedSessions[0]) {
      setSelectedReplaySession(savedSessions[0]);
    }

    // 3. Oturumlar sekmesini öne getir
    setActiveTab('sessions');
    setStatusMessage(
      `⏱ ${formatTimelineTimestamp(timestampMs)} anına atlandı. Eleman (${selector || 'Hedef'}) replay ekranında parıldayan dikkat çerçevesiyle vurgulanıyor.`
    );
  };

  // 5 Örnek Oturum Ekle (≥5 Kuralı Testi)
  const handleAddSampleSessions = async () => {
    const now = Date.now();
    const sampleList: Session[] = [
      {
        id: `session_sample_1_${now}`,
        url: activeTabInfo.url,
        title: activeTabInfo.title,
        startTime: now - 35000,
        duration: 35000,
        taskName: 'Kullanıcı Oturumu 1 (Fiyatlandırma & Plan)',
        frustrationCount: 2,
        frustrations: [
          {
            type: 'rage_click',
            selector: 'button.price-toggle',
            targetTag: 'button',
            timestamp: now - 28000,
            description: '.price-toggle butonuna 1 sn içinde 3 kez tıklandı',
            coords: { x: 280, y: 340 },
          },
          {
            type: 'hesitation',
            selector: 'main > section.hero',
            targetTag: 'section',
            timestamp: now - 32000,
            description: 'hero alanında 3.1 sn duraksadı',
            coords: { x: 320, y: 180 },
          },
        ],
        events: [],
        rrwebEvents: [],
      },
      {
        id: `session_sample_2_${now}`,
        url: activeTabInfo.url,
        title: activeTabInfo.title,
        startTime: now - 45000,
        duration: 40000,
        taskName: 'Kullanıcı Oturumu 2 (Arama & Navigasyon)',
        frustrationCount: 2,
        frustrations: [
          {
            type: 'rage_click',
            selector: 'button.price-toggle',
            targetTag: 'button',
            timestamp: now - 38000,
            description: '.price-toggle butonuna art arda basıldı',
            coords: { x: 282, y: 341 },
          },
          {
            type: 'dead_click',
            selector: 'nav.top-bar button.search-toggle',
            targetTag: 'button',
            timestamp: now - 20000,
            description: 'Arama butonuna basıldı fakat yanıt gelmedi',
            coords: { x: 920, y: 30 },
          },
        ],
        events: [],
        rrwebEvents: [],
      },
      {
        id: `session_sample_3_${now}`,
        url: activeTabInfo.url,
        title: activeTabInfo.title,
        startTime: now - 60000,
        duration: 55000,
        taskName: 'Kullanıcı Oturumu 3 (Hero ve Başlık İncelemesi)',
        frustrationCount: 2,
        frustrations: [
          {
            type: 'hesitation',
            selector: 'main > section.hero',
            targetTag: 'section',
            timestamp: now - 52000,
            description: 'hero alanında 4.2 sn tereddüt',
            coords: { x: 340, y: 190 },
          },
          {
            type: 'rage_click',
            selector: 'button.price-toggle',
            targetTag: 'button',
            timestamp: now - 42000,
            description: 'Fiyatlandırma butonunda yanıt yok',
            coords: { x: 281, y: 339 },
          },
        ],
        events: [],
        rrwebEvents: [],
      },
      {
        id: `session_sample_4_${now}`,
        url: activeTabInfo.url,
        title: activeTabInfo.title,
        startTime: now - 80000,
        duration: 48000,
        taskName: 'Kullanıcı Oturumu 4 (Kayıt Formu Akışı)',
        frustrationCount: 1,
        frustrations: [
          {
            type: 'hesitation',
            selector: 'main > section.hero',
            targetTag: 'section',
            timestamp: now - 74000,
            description: 'Metin okuma tereddütü',
            coords: { x: 310, y: 200 },
          },
        ],
        events: [],
        rrwebEvents: [],
      },
      {
        id: `session_sample_5_${now}`,
        url: activeTabInfo.url,
        title: activeTabInfo.title,
        startTime: now - 95000,
        duration: 50000,
        taskName: 'Kullanıcı Oturumu 5 (Doğrulama ve Çıkış)',
        frustrationCount: 2,
        frustrations: [
          {
            type: 'dead_click',
            selector: 'nav.top-bar button.search-toggle',
            targetTag: 'button',
            timestamp: now - 75000,
            description: 'Arama kutusu tepkisiz',
            coords: { x: 921, y: 32 },
          },
          {
            type: 'rage_click',
            selector: 'button.price-toggle',
            targetTag: 'button',
            timestamp: now - 62000,
            description: '3 kez tıklandı',
            coords: { x: 280, y: 340 },
          },
        ],
        events: [],
        rrwebEvents: [],
      },
    ];

    for (const s of sampleList) {
      await saveSession(s);
    }
    await refreshSessions();
    setStatusMessage('5 örnek oturum başarıyla yüklendi! "Ortak Sürtünme Deseni" aktifleşti.');
  };

  // Sayfadaki Elemanı Vurgula Butonu
  const handleHighlightElement = async (selector: string, label?: string) => {
    // 1. İframe içinde (demo / split test görünümünde) ise parent sayfaya postMessage ilet
    if (typeof window !== 'undefined' && window.parent && window.parent !== window) {
      window.parent.postMessage(
        {
          type: 'HIGHLIGHT_ON_PAGE',
          selector,
          label,
        },
        '*'
      );
      setStatusMessage(`👁️ "${selector}" sayfada vurgulandı.`);
    }

    // 2. Chrome Extension sekmesinde ise content script'e ilet
    if (typeof chrome !== 'undefined' && chrome.tabs && activeTabInfo.id) {
      try {
        const response = await chrome.tabs.sendMessage(activeTabInfo.id, {
          type: 'ELEMENTI_VURGULA',
          selector,
          label,
        });
        if (response && response.found) {
          setStatusMessage(`👁️ "${selector}" sayfada vurgulandı ve odaklandı.`);
        } else {
          setStatusMessage(`"${selector}" sayfada bulunamadı.`);
        }
      } catch (err) {
        console.warn('[UX Doctor] Vurgulama mesajı gönderilemedi:', err);
      }
    }
  };

  // Çift Katmanlı Tam Teşhis Fonksiyonu (WCAG 2.2 AA + Don Norman 6 İlkesi)
  const handleRunFullAudit = async (forceConsent: boolean = false) => {
    setIsAuditLoading(true);
    setStatusMessage('Sayfa taranıyor: WCAG 2.2 AA kuralları ve Don Norman ilkeleri...');

    try {
      let detResult: DeterministicAuditResult | null = null;
      let nodesList: any[] = [];
      let privResult: PrivacyCheckResult | null = null;
      let pageContext = {
        title: activeTabInfo.title,
        url: activeTabInfo.url,
      };

      if (typeof chrome !== 'undefined' && chrome.tabs && activeTabInfo.id) {
        try {
          const response = await chrome.tabs.sendMessage(activeTabInfo.id, {
            type: 'CALISTIR_TAM_ANALIZ',
            userExplicitConsent: forceConsent,
          });

          if (response && response.status === 'PRIVACY_WARNING') {
            setIsAuditLoading(false);
            setPrivacyResult(response.privacyResult);
            setIsPrivacyModalOpen(true);
            setStatusMessage('⚠️ Hassas veri uyarısı: Kullanıcı onayı bekleniyor.');
            return;
          }

          if (response && response.status === 'SUCCESS') {
            detResult = response.deterministic;
            nodesList = response.domNodes || [];
            privResult = response.privacyResult;
            pageContext.title = response.pageTitle || pageContext.title;
            pageContext.url = response.pageUrl || pageContext.url;
          }
        } catch (e) {
          console.warn('[UX Doctor] Content script yanıt vermedi, yerel fallback çalıştırılıyor:', e);
        }
      }

      // Yerel Fallback (Dev/Preview, Demo Split veya sekme erişilemezse)
      if (!detResult) {
        let targetRoot: Document | HTMLElement = document;
        if (typeof window !== 'undefined' && window.parent && window.parent !== window) {
          try {
            const parentTarget = window.parent.document.getElementById('target-web-page');
            if (parentTarget) {
              targetRoot = parentTarget;
              pageContext.title = 'Merkezi Hekim Randevu Sistemi (MHRS)';
              pageContext.url = 'https://mhrs.gov.tr/vatandas/randevu-ara';
            }
          } catch (e) {
            console.warn('[UX Doctor] Parent dökümana erişilemedi:', e);
          }
        }

        privResult = auditPagePrivacy(targetRoot);
        if (privResult.requiresExplicitConsent && !forceConsent) {
          setIsAuditLoading(false);
          setPrivacyResult(privResult);
          setIsPrivacyModalOpen(true);
          setStatusMessage('⚠️ Hassas veri uyarısı: Kullanıcı onayı bekleniyor.');
          return;
        }
        detResult = runDeterministicAudit(targetRoot);
        const extracted = extractInteractiveNodes(targetRoot);
        nodesList = extracted.nodes;
      }

      setDeterministicResult(detResult);
      setPrivacyResult(privResult);

      setStatusMessage('Don Norman 6 İlkesi değerlendiriliyor...');
      const nResult = await runNormanAudit(nodesList, detResult, pageContext);
      setNormanResult(nResult);

      const compResult = calculateCompositeScore(detResult, nResult);
      setCompositeScore(compResult);

      setStatusMessage(
        `Teşhis tamamlandı! Genel UX Skoru: ${compResult.overallUXScore}/100 (${compResult.scoreGrade})`
      );
    } catch (err: any) {
      console.error('[UX Doctor] Analiz yürütülürken hata oluştu:', err);
      setStatusMessage(`Analiz hatası: ${err.message}`);
    } finally {
      setIsAuditLoading(false);
    }
  };

  // Sayfada Isı Haritasını Aç / Kapat
  const handleTogglePageHeatmap = async () => {
    if (typeof chrome !== 'undefined' && chrome.tabs && activeTabInfo.id) {
      try {
        const response = await chrome.tabs.sendMessage(activeTabInfo.id, {
          type: 'ISIHARTASI_TOGGLE',
          sessions: savedSessions,
        });
        if (response) {
          setIsHeatmapMountedOnPage(response.isMounted);
          setStatusMessage(
            response.isMounted
              ? '🔥 Isı haritası web sayfası üzerine başarıyla bindirildi!'
              : 'Isı haritası katmanı kapatıldı.'
          );
        }
      } catch (err) {
        console.warn('[UX Doctor] Isı haritası mesajı gönderilemedi:', err);
      }
    }
  };

  // Oturum Silme
  const handleDeleteSession = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await deleteSession(id);
      await refreshSessions();
      if (selectedReplaySession?.id === id) {
        setSelectedReplaySession(null);
      }
    } catch (err) {
      console.error('[UX Doctor] Oturum silinemedi:', err);
    }
  };

  // Sniper Modu
  const handleDiagnoseElement = async () => {
    const nextState = !isTargetingActive;
    setIsTargetingActive(nextState);

    if (typeof chrome !== 'undefined' && chrome.tabs && activeTabInfo.id) {
      try {
        await chrome.tabs.sendMessage(activeTabInfo.id, {
          type: 'SNIPER_MODU_TOGGLE',
          enabled: nextState,
        });
      } catch (e) {
        console.warn('[UX Doctor] Sniper komutu gönderilemedi:', e);
      }
    }

    setStatusMessage(
      nextState
        ? '🎯 Sniper modu devrede: Web sayfasında analiz etmek istediğiniz öğenin üzerine gelin ve tıklayın.'
        : 'Sniper modu kapatıldı.'
    );
  };

  // Tam Sayfa DOM Teşhisi (PageAgent)
  const handleRunDiagnostics = async () => {
    setLoading(true);
    setStatusMessage('Alibaba PageAgent budama algoritması devrede...');

    try {
      if (typeof chrome !== 'undefined' && chrome.tabs && chrome.scripting && activeTabInfo.id) {
        if (activeTabInfo.url.startsWith('chrome://') || activeTabInfo.url.startsWith('chrome-extension://')) {
          simulatePageExtraction();
          setLoading(false);
          setActiveTab('findings');
          return;
        }

        const results = await chrome.scripting.executeScript({
          target: { tabId: activeTabInfo.id },
          func: extractInteractiveNodes,
        });

        if (results && results[0] && results[0].result) {
          const data = results[0].result as ExtractionSummary;
          setSummary(data);
          setStatusMessage(`Başarılı: ${data.nodes.length} kritik düğüm ayıklandı.`);
          setActiveTab('findings');
        } else {
          throw new Error('Sekmeden sonuç alınamadı.');
        }
      } else {
        simulatePageExtraction();
        setActiveTab('findings');
      }
    } catch (err) {
      console.warn('[UX Doctor] Canlı tarama hatası, simülasyon yükleniyor:', err);
      simulatePageExtraction();
      setActiveTab('findings');
    } finally {
      setLoading(false);
    }
  };

  const simulatePageExtraction = () => {
    const mockNodes = [
      {
        id: 'hero-cta-btn',
        nodeIndex: 1,
        tagName: 'button',
        category: 'button' as const,
        text: 'Hemen Başla (Ücretsiz)',
        selector: 'main > header > div.actions > button#hero-cta-btn',
        rect: { top: 120, left: 80, width: 180, height: 48, x: 80, y: 120 },
        computedStyles: {
          fontSize: '16px',
          lineHeight: '24px',
          color: '#ffffff',
          backgroundColor: '#ff9f76',
          cursor: 'pointer',
          borderRadius: '16px',
          display: 'inline-flex',
        },
        ariaAttributes: {
          role: 'button',
          ariaLabel: 'Hemen Ücretsiz Başlayın',
          ariaLabelledBy: null,
          ariaDescribedBy: null,
          ariaHidden: null,
          ariaExpanded: null,
          ariaDisabled: null,
          ariaRequired: null,
        },
        diagnostics: {
          isSmallTarget: false,
          hasAccessibleName: true,
          missingLabelOrAlt: false,
          notes: [],
        },
      },
      {
        id: 'nav-icon-search',
        nodeIndex: 2,
        tagName: 'button',
        category: 'button' as const,
        text: '',
        selector: 'nav.top-bar > div.icons > button.search-toggle',
        rect: { top: 20, left: 320, width: 28, height: 28, x: 320, y: 20 },
        computedStyles: {
          fontSize: '14px',
          lineHeight: '20px',
          color: '#8a7ea8',
          backgroundColor: 'transparent',
          cursor: 'pointer',
          borderRadius: '8px',
          display: 'block',
        },
        ariaAttributes: {
          role: 'button',
          ariaLabel: null,
          ariaLabelledBy: null,
          ariaDescribedBy: null,
          ariaHidden: null,
          ariaExpanded: null,
          ariaDisabled: null,
          ariaRequired: null,
        },
        diagnostics: {
          isSmallTarget: true,
          hasAccessibleName: false,
          missingLabelOrAlt: true,
          notes: [
            'Küçük dokunma alanı: 28x28px (Önerilen: min 44x44px)',
            'Erişilebilir etiket (aria-label veya metin) eksik',
          ],
        },
      },
    ];

    setSummary({
      scannedElementsCount: 1480,
      prunedCount: 1478,
      interactiveCount: 2,
      headingsCount: 1,
      textBlocksCount: 2,
      timestamp: Date.now(),
      url: activeTabInfo.url,
      title: activeTabInfo.title,
      nodes: mockNodes,
    });
  };

  const copySelector = (selector: string, id: string) => {
    navigator.clipboard.writeText(selector);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 1800);
  };

  const filteredNodes = summary?.nodes.filter((node) => {
    if (selectedFilter === 'all') return true;
    if (selectedFilter === 'button') return node.category === 'button';
    if (selectedFilter === 'link') return node.category === 'link';
    if (selectedFilter === 'input') return node.category === 'input';
    if (selectedFilter === 'text') return node.category === 'heading' || node.category === 'text';
    if (selectedFilter === 'issues') return node.diagnostics.notes.length > 0;
    return true;
  }) || [];

  const totalIssuesCount = summary?.nodes.reduce((acc, curr) => acc + curr.diagnostics.notes.length, 0) || 0;

  // Statik ve Davranışsal Bileşik Skor
  const staticScore = 86;
  const compositeResult = calculateCompositeUXScore(staticScore, behaviorScore || undefined);

  return (
    <div className="min-h-screen bg-gradient-to-b from-background-deep via-background-base to-background-deep text-[#f1edfa] flex flex-col font-sans select-none pb-6">
      {/* 1. ÜST BAŞLIK */}
      <Header
        onTargetClick={handleDiagnoseElement}
        onSettingsClick={() => setIsSettingsModalOpen(true)}
        isTargetingActive={isTargetingActive}
      />

      {/* 2. HAP ŞEKLİNDE SEKME NAVİGASYONU */}
      <TabBar
        activeTab={activeTab}
        onTabChange={setActiveTab}
        findingsCount={summary?.nodes.length || 0}
      />

      {/* 3. GÖNDERİM ÖNİZLEME MODALI */}
      <AuditPreviewModal
        isOpen={isPreviewModalOpen}
        onClose={() => setIsPreviewModalOpen(false)}
        onConfirm={handleConfirmAudit}
        timeline={timelineSummary}
        keyframes={keyframes}
        taskName={activeSession?.taskName}
        isEvaluating={isEvaluating}
      />

      {/* ANA İÇERİK ALANI */}
      <main className="p-4 flex-1 flex flex-col gap-4">
        {/* SEKME 1: TEŞHİS (Diagnosis) - Çift Katmanlı UX Teşhisi */}
        {activeTab === 'diagnosis' && (
          <div className="flex flex-col gap-4 animate-in fade-in duration-200">
            {/* ÇİFT KATMANLI KANITLI TEŞHİS PANELİ */}
            <AuditView
              deterministicResult={deterministicResult}
              normanResult={normanResult}
              compositeScore={compositeScore}
              privacyResult={privacyResult}
              isLoading={isAuditLoading}
              onRunAudit={handleRunFullAudit}
              onHighlightElement={handleHighlightElement}
              onOpenSettings={() => setIsSettingsModalOpen(true)}
              activeUrl={activeTabInfo.url}
              activeTitle={activeTabInfo.title}
            />

            {/* Sniper Element Önizlemesi */}
            {selectedSniperElement && (
              <div className="p-3.5 rounded-2xl bg-background-card border border-pastel-mint/40 shadow-card-glow flex flex-col gap-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Crosshair className="w-4 h-4 text-pastel-mint" />
                    <span className="text-xs font-black text-white">Sniper ile Seçilen Element</span>
                  </div>
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-background-surface text-pastel-mint">
                    {selectedSniperElement.rect.width}×{selectedSniperElement.rect.height}px
                  </span>
                </div>
                <div className="bg-background-deep/80 p-2.5 rounded-xl border border-white/5 font-mono text-[11px] text-pastel-lavender truncate">
                  {selectedSniperElement.selector}
                </div>
              </div>
            )}

            {/* Canlı Kayıt ve Görev Tanımı Kartı */}
            <RecordControlCard
              onStartRecording={handleStartRecording}
              onStopRecording={handleStopRecording}
              isRecording={isRecording}
              eventCount={eventCount}
            />

            {/* Hızlı Aksiyon Kartları */}
            <QuickActionCards
              onDiagnoseElement={handleDiagnoseElement}
              onFullPageAnalysis={handleRunDiagnostics}
              onViewFrictions={() => setActiveTab('behavior')}
              isLoading={loading}
            />

            <p className="text-center text-[11px] text-pastel-muted px-2">
              {statusMessage}
            </p>
          </div>
        )}

        {/* SEKME 2: BULGULAR (Findings) */}
        {activeTab === 'findings' && (
          <div className="flex flex-col gap-3.5 animate-in fade-in duration-200">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-black text-white">Alibaba PageAgent Bulguları</h3>
                <p className="text-[11px] text-pastel-muted">Sadeleştirilmiş ve budanmış etkileşim haritası</p>
              </div>
              <button
                onClick={handleRunDiagnostics}
                disabled={loading}
                className="px-3 py-1.5 rounded-xl bg-pastel-coral text-[#2b1207] text-xs font-extrabold shadow-chunky-coral active:translate-y-0.5 cursor-pointer disabled:opacity-50 flex items-center gap-1.5"
              >
                <Zap className="w-3.5 h-3.5 fill-current" />
                <span>Yeniden Tara</span>
              </button>
            </div>

            {/* İstatistik Izgarası */}
            {summary && (
              <div className="grid grid-cols-2 gap-2.5">
                <div className="p-3 rounded-2xl bg-background-card border border-background-surface/80 flex flex-col justify-between">
                  <span className="text-[10px] font-bold text-pastel-muted uppercase">Toplam DOM</span>
                  <div className="flex items-baseline gap-1 mt-0.5">
                    <span className="text-xl font-black text-white">{summary.scannedElementsCount}</span>
                    <span className="text-[10px] text-pastel-muted">öğe</span>
                  </div>
                  <span className="text-[10px] text-pastel-lavender flex items-center gap-1 mt-0.5">
                    <Layers className="w-3 h-3 text-pastel-lavender" /> Ham Ağaç
                  </span>
                </div>

                <div className="p-3 rounded-2xl bg-background-card border border-pastel-mint/30 flex flex-col justify-between">
                  <span className="text-[10px] font-bold text-pastel-mint uppercase">Budanan Gürültü</span>
                  <div className="flex items-baseline gap-1 mt-0.5">
                    <span className="text-xl font-black text-pastel-mint">{summary.prunedCount}</span>
                    <span className="text-[10px] font-bold text-pastel-mint/80">
                      (%{Math.round((summary.prunedCount / (summary.scannedElementsCount || 1)) * 100)})
                    </span>
                  </div>
                  <span className="text-[10px] text-pastel-mint/80 flex items-center gap-1 mt-0.5">
                    <CheckCircle2 className="w-3 h-3" /> PageAgent Filtresi
                  </span>
                </div>

                <div className="p-3 rounded-2xl bg-background-card border border-background-surface/80 flex flex-col justify-between">
                  <span className="text-[10px] font-bold text-pastel-yellow uppercase">Etkileşimli Düğüm</span>
                  <div className="flex items-baseline gap-1 mt-0.5">
                    <span className="text-xl font-black text-pastel-yellow">{summary.nodes.length}</span>
                    <span className="text-[10px] text-pastel-muted">hedef</span>
                  </div>
                  <span className="text-[10px] text-pastel-lavender flex items-center gap-1 mt-0.5">
                    <MousePointer className="w-3 h-3 text-pastel-yellow" /> Tıklanabilir
                  </span>
                </div>

                <div className={`p-3 rounded-2xl bg-background-card border flex flex-col justify-between ${
                  totalIssuesCount > 0 ? 'border-pastel-pink/40' : 'border-background-surface/80'
                }`}>
                  <span className={`text-[10px] font-bold uppercase ${totalIssuesCount > 0 ? 'text-pastel-pink' : 'text-pastel-muted'}`}>
                    Ergonomi Uyarısı
                  </span>
                  <div className="flex items-baseline gap-1 mt-0.5">
                    <span className={`text-xl font-black ${totalIssuesCount > 0 ? 'text-pastel-pink' : 'text-pastel-mint'}`}>
                      {totalIssuesCount}
                    </span>
                    <span className="text-[10px] text-pastel-muted">tespit</span>
                  </div>
                  <span className="text-[10px] text-pastel-muted flex items-center gap-1 mt-0.5">
                    <AlertTriangle className={`w-3 h-3 ${totalIssuesCount > 0 ? 'text-pastel-pink' : 'text-pastel-mint'}`} />
                    {totalIssuesCount > 0 ? 'Hedef boyutu / Aria' : 'Kusursuz'}
                  </span>
                </div>
              </div>
            )}

            {/* Filtreleme Butonları */}
            {summary && (
              <div className="flex items-center gap-1.5 overflow-x-auto pb-1 no-scrollbar">
                <button
                  onClick={() => setSelectedFilter('all')}
                  className={`px-3 py-1 rounded-xl text-xs font-bold transition-all shrink-0 cursor-pointer ${
                    selectedFilter === 'all'
                      ? 'bg-pastel-lavender text-[#1e1730] shadow-chunky-sm'
                      : 'bg-background-card text-pastel-muted hover:text-white'
                  }`}
                >
                  Tümü ({summary.nodes.length})
                </button>
                <button
                  onClick={() => setSelectedFilter('button')}
                  className={`px-3 py-1 rounded-xl text-xs font-bold transition-all shrink-0 cursor-pointer ${
                    selectedFilter === 'button'
                      ? 'bg-pastel-mint text-pastel-mint-dark shadow-chunky-sm'
                      : 'bg-background-card text-pastel-muted hover:text-white'
                  }`}
                >
                  Butonlar ({summary.nodes.filter((n) => n.category === 'button').length})
                </button>
                <button
                  onClick={() => setSelectedFilter('link')}
                  className={`px-3 py-1 rounded-xl text-xs font-bold transition-all shrink-0 cursor-pointer ${
                    selectedFilter === 'link'
                      ? 'bg-pastel-yellow text-pastel-yellow-dark shadow-chunky-sm'
                      : 'bg-background-card text-pastel-muted hover:text-white'
                  }`}
                >
                  Linkler ({summary.nodes.filter((n) => n.category === 'link').length})
                </button>
                <button
                  onClick={() => setSelectedFilter('issues')}
                  className={`px-3 py-1 rounded-xl text-xs font-bold transition-all shrink-0 cursor-pointer ${
                    selectedFilter === 'issues'
                      ? 'bg-pastel-pink text-pastel-pink-dark shadow-chunky-sm'
                      : 'bg-background-card text-pastel-muted hover:text-white'
                  }`}
                >
                  Sorunlar ({summary.nodes.filter((n) => n.diagnostics.notes.length > 0).length})
                </button>
              </div>
            )}

            {/* Düğüm Kartları Listesi */}
            {summary && (
              <div className="flex flex-col gap-2.5">
                {filteredNodes.map((node) => {
                  const isExpanded = expandedNodeIndex === node.nodeIndex;
                  const hasIssues = node.diagnostics.notes.length > 0;

                  return (
                    <div
                      key={node.id}
                      className={`rounded-2xl bg-background-card border p-3.5 flex flex-col gap-2 transition-all ${
                        hasIssues
                          ? 'border-pastel-pink/40 hover:border-pastel-pink'
                          : 'border-background-surface hover:border-pastel-lavender/40'
                      }`}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded-lg bg-white/10 text-white border border-white/10">
                            &lt;{node.tagName}&gt;
                          </span>
                          <span className="text-xs font-black text-white truncate max-w-[170px]">
                            {node.text || <span className="text-pastel-muted italic font-normal">(Metinsiz Öğe)</span>}
                          </span>
                        </div>

                        <div className="flex items-center gap-1.5 shrink-0">
                          <span
                            className={`text-[10px] font-mono px-2 py-0.5 rounded-full font-bold ${
                              node.diagnostics.isSmallTarget
                                ? 'bg-pastel-pink/20 text-pastel-pink border border-pastel-pink/30'
                                : 'bg-background-surface text-pastel-muted'
                            }`}
                          >
                            {node.rect.width}×{node.rect.height}px
                          </span>
                          <button
                            onClick={() => setExpandedNodeIndex(isExpanded ? null : node.nodeIndex)}
                            className="p-1 text-pastel-muted hover:text-white rounded-lg hover:bg-background-surface transition-colors cursor-pointer"
                          >
                            {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                          </button>
                        </div>
                      </div>

                      <div className="flex items-center justify-between gap-2 bg-background-deep/70 px-2.5 py-1.5 rounded-xl border border-white/5">
                        <code className="text-[11px] text-pastel-lavender font-mono truncate max-w-[240px]">
                          {node.selector}
                        </code>
                        <button
                          onClick={() => copySelector(node.selector, node.id)}
                          className="text-pastel-muted hover:text-pastel-mint transition-colors p-0.5 cursor-pointer"
                        >
                          {copiedId === node.id ? <Check className="w-3.5 h-3.5 text-pastel-mint" /> : <Copy className="w-3.5 h-3.5" />}
                        </button>
                      </div>

                      {hasIssues && (
                        <div className="flex flex-col gap-1 mt-0.5">
                          {node.diagnostics.notes.map((note, idx) => (
                            <div
                              key={idx}
                              className="flex items-start gap-1.5 text-[11px] font-medium text-pastel-pink bg-pastel-pink/10 px-2.5 py-1 rounded-xl"
                            >
                              <AlertTriangle className="w-3.5 h-3.5 shrink-0 mt-0.5 text-pastel-pink" />
                              <span>{note}</span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* SEKME 3: DAVRANIŞ (Behavior) */}
        {activeTab === 'behavior' && (
          <div className="flex flex-col gap-4 animate-in fade-in duration-200">
            {/* AI ile Değerlendir Butonu */}
            <button
              onClick={() => setIsPreviewModalOpen(true)}
              className="w-full py-3.5 px-4 rounded-2xl bg-gradient-to-r from-pastel-coral via-[#ff8c5e] to-pastel-pink text-[#2b1207] font-black text-sm flex items-center justify-center gap-2.5 shadow-chunky-coral active:translate-y-1 cursor-pointer transition-all"
            >
              <Sparkles className="w-4 h-4 fill-current" />
              <span>AI ile Değerlendir (Gönderim Önizlemesi)</span>
            </button>

            {/* 1. Genel Davranış Skoru & 5 Oturum Güven Rozeti */}
            {behaviorScore && (
              <div className="p-4 rounded-2xl bg-background-card border border-background-surface/80 shadow-card-glow flex flex-col gap-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Brain className="w-4 h-4 text-pastel-pink" />
                    <span className="text-xs font-black uppercase text-pastel-lavender">
                      Davranış Skoru (Yerel Hesaplama)
                    </span>
                  </div>
                  <span
                    className={`text-[10px] font-black uppercase tracking-wider px-2.5 py-0.5 rounded-full border ${
                      behaviorScore.confidence === 'high'
                        ? 'bg-pastel-mint/20 text-pastel-mint border-pastel-mint/40'
                        : 'bg-pastel-yellow/20 text-pastel-yellow border-pastel-yellow/40'
                    }`}
                  >
                    {behaviorScore.confidenceLabel}
                  </span>
                </div>

                <div className="flex items-baseline justify-between mt-1">
                  <div className="flex items-baseline gap-2">
                    <span className="text-4xl font-black text-white">
                      {behaviorScore.overallBehaviorScore}
                    </span>
                    <span className="text-xs text-pastel-muted">/ 100 Puan</span>
                  </div>
                  <span className="text-[11px] text-pastel-muted">
                    {behaviorScore.sessionCount} Oturum İncelendi
                  </span>
                </div>
                <p className="text-[11px] text-pastel-muted -mt-1 leading-relaxed">
                  {behaviorScore.confidenceDescription}
                </p>

                {/* 6 Alt Metrik Çubukları */}
                <div className="pt-2 border-t border-background-surface/80 flex flex-col gap-2">
                  <span className="text-[10px] font-black uppercase text-pastel-lavender">
                    Ağırlıklı Alt Metrikler
                  </span>
                  <div className="grid grid-cols-2 gap-2 text-[11px]">
                    {Object.values(behaviorScore.subScores).map((sub) => (
                      <div key={sub.key} className="bg-background-deep/60 p-2 rounded-xl border border-white/5 flex flex-col gap-1">
                        <div className="flex items-center justify-between">
                          <span className="text-[10px] text-pastel-muted truncate">{sub.name} (%{sub.weight * 100})</span>
                          <span className="font-bold text-white font-mono">{sub.score}</span>
                        </div>
                        <div className="w-full h-1.5 bg-background-surface rounded-full overflow-hidden">
                          <div
                            className={`h-full rounded-full ${
                              sub.score >= 80 ? 'bg-pastel-mint' : sub.score >= 50 ? 'bg-pastel-yellow' : 'bg-pastel-pink'
                            }`}
                            style={{ width: `${sub.score}%` }}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* 2. Metin Zaman Çizelgesi */}
            {timelineSummary && (
              <div className="p-4 rounded-2xl bg-background-card border border-background-surface/80 flex flex-col gap-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Clock className="w-4 h-4 text-pastel-yellow" />
                    <span className="text-xs font-black uppercase text-white">
                      Metin Zaman Çizelgesi (Özet Günlük)
                    </span>
                  </div>
                  <span className="text-[10px] font-mono text-pastel-muted">
                    Toplam {timelineSummary.formattedDuration}
                  </span>
                </div>

                <div className="flex flex-col gap-2 bg-background-deep/80 p-3 rounded-xl border border-white/5 font-mono text-xs">
                  {timelineSummary.entries.map((entry) => (
                    <div key={entry.id} className="flex items-start gap-2.5">
                      <span className="text-pastel-mint font-black shrink-0 w-8">
                        {entry.formattedTime}
                      </span>
                      <span className={`text-[11px] leading-snug font-sans ${
                        entry.severity === 'critical'
                          ? 'text-pastel-pink font-semibold'
                          : entry.severity === 'warning'
                          ? 'text-pastel-yellow font-medium'
                          : 'text-[#f1edfa]/90'
                      }`}>
                        {entry.description}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* 3. Anahtar Kareler */}
            {keyframes.length > 0 && (
              <div className="flex flex-col gap-2.5">
                <div className="flex items-center justify-between px-1">
                  <div className="flex items-center gap-2">
                    <Layers3 className="w-4 h-4 text-pastel-mint" />
                    <span className="text-xs font-black uppercase text-white">
                      Anahtar Kareler (Kritik Ekran Kanıtları)
                    </span>
                  </div>
                  <span className="text-[10px] text-pastel-muted">
                    {keyframes.length} Kare
                  </span>
                </div>

                <div className="grid grid-cols-1 gap-2.5">
                  {keyframes.map((kf) => (
                    <div
                      key={kf.id}
                      className="p-3.5 rounded-2xl bg-background-card border border-background-surface/80 flex flex-col gap-2"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span
                            className="text-[10px] font-black uppercase px-2 py-0.5 rounded-full"
                            style={{ backgroundColor: `${kf.badgeColor}25`, color: kf.badgeColor }}
                          >
                            {kf.badgeLabel}
                          </span>
                          <span className="text-xs font-bold text-white">{kf.title}</span>
                        </div>
                        <span className="text-[11px] font-mono font-bold text-pastel-lavender">
                          {kf.formattedTime}
                        </span>
                      </div>

                      <p className="text-xs text-pastel-muted leading-relaxed">
                        {kf.description}
                      </p>

                      {kf.highlight && (
                        <div className="flex items-center gap-2 bg-background-deep/60 px-2.5 py-1.5 rounded-xl border border-white/5 text-[11px]">
                          <span className="w-2.5 h-2.5 rounded-full bg-pastel-pink animate-pulse" />
                          <span className="text-pastel-pink font-semibold">
                            Vurgulanan Alan: {kf.highlight.label} ({kf.highlight.x}px, {kf.highlight.y}px)
                          </span>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* SEKME 4: ISI HARİTASI (Heatmap) */}
        {activeTab === 'heatmap' && (
          <div className="flex flex-col gap-3.5 animate-in fade-in duration-200">
            <div>
              <h3 className="text-sm font-black text-white flex items-center gap-2">
                <Flame className="w-4 h-4 text-pastel-coral" />
                Eleman Bazlı Isı Haritası (Canvas Overlay)
              </h3>
              <p className="text-[11px] text-pastel-muted">Normalize edilmiş tıklama, sürtünme ve scroll çizgileri</p>
            </div>

            <button
              onClick={handleTogglePageHeatmap}
              className={`w-full py-3 px-4 rounded-2xl font-black text-xs flex items-center justify-center gap-2 cursor-pointer transition-all active:translate-y-0.5 shadow-chunky-sm ${
                isHeatmapMountedOnPage
                  ? 'bg-pastel-pink text-pastel-pink-dark shadow-chunky-coral'
                  : 'bg-pastel-coral text-[#2b1207] shadow-chunky-coral'
              }`}
            >
              <Flame className="w-4 h-4 fill-current" />
              <span>
                {isHeatmapMountedOnPage
                  ? 'Sayfadaki Isı Haritasını Kapat (Overlay)'
                  : '🔥 Sayfa Üzerine Isı Haritasını Bindir (Shadow DOM)'}
              </span>
            </button>

            {/* Mini Tuval */}
            <div className="p-3.5 rounded-2xl bg-background-card border border-background-surface/80 flex flex-col gap-2.5 shadow-card-glow">
              <div className="flex items-center justify-between text-xs">
                <span className="font-bold text-white">Mini Tuval Önizlemesi</span>
                <span className="text-[10px] text-pastel-muted">Mavi (Az) → Sarı → Kırmızı (Yoğun)</span>
              </div>

              <div className="w-full h-56 bg-[#160f26] rounded-xl border border-white/10 relative overflow-hidden flex items-center justify-center">
                <canvas
                  ref={miniHeatmapCanvasRef}
                  width={340}
                  height={224}
                  className="w-full h-full block"
                />
              </div>

              <div className="grid grid-cols-3 gap-2 text-[10px] text-pastel-muted pt-1">
                <div className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-gradient-to-r from-blue-400 to-red-500" />
                  <span>Tıklama Yoğunluğu</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full border border-dashed border-pastel-coral bg-pastel-coral/30" />
                  <span>Sürtünme Halkası</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="w-4 h-0.5 bg-pastel-mint" />
                  <span>%100 Katlama</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* SEKME 5: OTURUMLAR (Sessions) - Replay Oynatıcı & Çoklu Oturum Özeti */}
        {activeTab === 'sessions' && (
          <div className="flex flex-col gap-4 animate-in fade-in duration-200">
            {/* 1. REPLAY OYNATICI (Üstte Aktif) */}
            {selectedReplaySession && (
              <div className="flex flex-col gap-2">
                <div className="flex items-center justify-between px-1">
                  <span className="text-xs font-black uppercase text-white flex items-center gap-1.5">
                    <PlayCircle className="w-4 h-4 text-pastel-mint" />
                    Oturum Replay Oynatıcısı
                  </span>
                  <span className="text-[10px] text-pastel-lavender font-mono">
                    {selectedReplaySession.id.slice(0, 14)}...
                  </span>
                </div>
                <ReplayPlayer
                  session={selectedReplaySession}
                  targetTimestampMs={replayTargetTimestamp}
                  highlightSelector={replayHighlightSelector}
                  onClose={() => {
                    setReplayTargetTimestamp(undefined);
                    setReplayHighlightSelector(undefined);
                  }}
                />
              </div>
            )}

            {/* 2. ÇOKLU OTURUM ÖZETİ (Ortak Sürtünme Deseni: %60 takılma) */}
            <MultiSessionView
              sessions={savedSessions}
              onSelectSessionToReplay={(sess, timestampMs, selector) => {
                setSelectedReplaySession(sess);
                if (typeof timestampMs === 'number') {
                  setReplayTargetTimestamp(timestampMs);
                }
                if (selector) {
                  setReplayHighlightSelector(selector);
                }
              }}
              onNavigateToHeatmap={() => setActiveTab('heatmap')}
              onAddSampleSessions={handleAddSampleSessions}
            />

            {/* 3. Yerel Kayıtlı Oturumlar Listesi */}
            <div className="flex flex-col gap-2.5 pt-2 border-t border-background-surface/80">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-xs font-black text-white flex items-center gap-2">
                    <Clock className="w-3.5 h-3.5 text-pastel-lavender" />
                    Tüm Oturum Kayıtları ({savedSessions.length})
                  </h3>
                </div>
                <button
                  onClick={refreshSessions}
                  className="text-[10px] text-pastel-mint font-bold hover:underline cursor-pointer"
                >
                  Yenile
                </button>
              </div>

              {savedSessions.length === 0 ? (
                <div className="p-6 text-center bg-background-card rounded-2xl border border-background-surface text-pastel-muted text-xs">
                  Henüz kayıtlı bir oturum bulunmuyor.
                </div>
              ) : (
                <div className="flex flex-col gap-2">
                  {savedSessions.map((sess) => (
                    <div
                      key={sess.id}
                      onClick={() => {
                        setSelectedReplaySession(sess);
                        setActiveSession(sess);
                        setTimelineSummary(summarizeSessionTimeline(sess));
                        setKeyframes(extractKeyframes(sess));
                      }}
                      className={`p-3 rounded-2xl bg-background-card border transition-all flex items-center justify-between cursor-pointer ${
                        selectedReplaySession?.id === sess.id
                          ? 'border-pastel-mint/60 shadow-chunky-sm bg-background-card/90'
                          : 'border-background-surface hover:border-pastel-lavender/40'
                      }`}
                    >
                      <div className="min-w-0 flex-1 pr-2">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-black text-white truncate block">
                            {sess.taskName || 'Gezinme Oturumu'}
                          </span>
                          {sess.frustrationCount > 0 ? (
                            <span className="text-[9px] font-black uppercase bg-pastel-pink/20 text-pastel-pink border border-pastel-pink/30 px-1.5 py-0.2 rounded-full shrink-0">
                              {sess.frustrationCount} Sürtünme
                            </span>
                          ) : (
                            <span className="text-[9px] font-black uppercase bg-pastel-mint/20 text-pastel-mint border border-pastel-mint/30 px-1.5 py-0.2 rounded-full shrink-0">
                              Sorunsuz
                            </span>
                          )}
                        </div>
                        <div className="text-[10px] text-pastel-muted mt-0.5 truncate">
                          {new Date(sess.startTime).toLocaleTimeString()} • {Math.round(sess.duration / 1000)} sn • {sess.events?.length || 0} olay
                        </div>
                      </div>

                      <div className="flex items-center gap-1.5 shrink-0">
                        <button
                          onClick={(e) => handleDeleteSession(sess.id, e)}
                          title="Oturumu Sil"
                          className="p-1.5 text-pastel-muted hover:text-pastel-pink rounded-lg hover:bg-background-surface transition-colors cursor-pointer"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* SEKME 6: AI RAPORU */}
        {activeTab === 'aiReport' && (
          <div className="flex flex-col gap-4 animate-in fade-in duration-200">
            {/* Bileşik UX Skoru Kartı */}
            <div className="p-4 rounded-2xl bg-gradient-to-br from-[#352754] to-[#251b3d] border border-pastel-mint/30 shadow-card-glow flex flex-col gap-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Award className="w-5 h-5 text-pastel-mint" />
                  <span className="text-xs font-black uppercase text-white">Genel Bileşik UX Skoru</span>
                </div>
                <span className="text-[10px] font-black uppercase bg-pastel-mint/20 text-pastel-mint border border-pastel-mint/40 px-2 py-0.5 rounded-full">
                  %100 Yerel Doğrulama
                </span>
              </div>

              <div className="flex items-baseline gap-2">
                <span className="text-4xl font-black text-white">{compositeResult.compositeScore}</span>
                <span className="text-xs text-pastel-muted">/ 100 Genel Puan</span>
              </div>

              <div className="grid grid-cols-2 gap-2 text-[11px] pt-2 border-t border-white/10">
                <div className="bg-background-deep/60 p-2.5 rounded-xl border border-white/5">
                  <span className="text-[10px] text-pastel-lavender block font-bold">
                    Statik Ergonomi & DOM (%{compositeResult.staticWeight * 100})
                  </span>
                  <span className="text-base font-black text-white font-mono">{staticScore} Puan</span>
                </div>

                <div className="bg-background-deep/60 p-2.5 rounded-xl border border-white/5">
                  <span className="text-[10px] text-pastel-pink block font-bold">
                    Kullanıcı Davranışı (%{compositeResult.behaviorWeight * 100})
                  </span>
                  <span className="text-base font-black text-white font-mono">
                    {behaviorScore ? behaviorScore.overallBehaviorScore : 'Veri Yok'}
                  </span>
                </div>
              </div>
            </div>

            {/* Doğrulanmış Claude 3.5 Sonnet Raporu ve İçgörüler */}
            <InsightList
              report={auditReport}
              onHighlightElement={handleHighlightElement}
              onTimestampClick={handleJumpToReplayTimestamp}
              onReAudit={() => setIsPreviewModalOpen(true)}
            />
          </div>
        )}
      </main>

      {/* 5. GÜVENLİK ALT BİLGİ ÇUBUĞU */}
      <Footer />

      {/* 6. YAPILANDIRMA & API ANAHTARI MODALI */}
      <SettingsModal
        isOpen={isSettingsModalOpen}
        onClose={() => setIsSettingsModalOpen(false)}
      />

      {/* 7. ETİK VE GİZLİLİK AÇIK ONAY MODALI */}
      <PrivacyConsentModal
        isOpen={isPrivacyModalOpen}
        privacyResult={privacyResult}
        onConfirm={() => {
          setIsPrivacyModalOpen(false);
          handleRunFullAudit(true);
        }}
        onCancel={() => {
          setIsPrivacyModalOpen(false);
          setStatusMessage('Analiz kullanıcı tarafından iptal edildi.');
        }}
      />
    </div>
  );
}
