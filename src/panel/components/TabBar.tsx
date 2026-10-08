import {
  Stethoscope,
  BarChart3,
  Brain,
  Flame,
  PlayCircle,
  Bot,
  type LucideIcon
} from 'lucide-react';

export type TabId = 'diagnosis' | 'findings' | 'behavior' | 'heatmap' | 'sessions' | 'aiReport';

interface TabItem {
  id: TabId;
  label: string;
  icon: LucideIcon;
  badge?: string;
}

const TABS: TabItem[] = [
  { id: 'diagnosis', label: 'Teşhis', icon: Stethoscope },
  { id: 'findings', label: 'Bulgular', icon: BarChart3 },
  { id: 'behavior', label: 'Davranış', icon: Brain, badge: 'v2' },
  { id: 'heatmap', label: 'Isı Haritası', icon: Flame },
  { id: 'sessions', label: 'Oturumlar', icon: PlayCircle },
  { id: 'aiReport', label: 'AI Raporu', icon: Bot },
];

interface TabBarProps {
  activeTab: TabId;
  onTabChange: (tabId: TabId) => void;
  findingsCount?: number;
}

export function TabBar({ activeTab, onTabChange, findingsCount = 0 }: TabBarProps) {
  return (
    <div className="px-4 pt-3 pb-1">
      <div className="bg-background-card/95 border border-background-surface/90 p-1.5 rounded-2xl flex items-center gap-1.5 overflow-x-auto no-scrollbar shadow-inner">
        {TABS.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;

          return (
            <button
              key={tab.id}
              onClick={() => onTabChange(tab.id)}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs whitespace-nowrap transition-all duration-150 cursor-pointer shrink-0 select-none ${
                isActive
                  ? 'bg-pastel-mint text-pastel-mint-dark font-extrabold shadow-sm scale-[1.02]'
                  : 'text-pastel-muted hover:text-white hover:bg-background-surface/60 font-semibold'
              }`}
            >
              <Icon className="w-3.5 h-3.5 shrink-0" strokeWidth={isActive ? 2.8 : 2.2} />
              <span>{tab.label}</span>

              {/* Sekme Özel Rozeti */}
              {tab.badge && (
                <span
                  className={`text-[9px] font-black uppercase px-1.5 py-0.2 rounded-full ${
                    isActive
                      ? 'bg-pastel-mint-dark/20 text-pastel-mint-dark'
                      : 'bg-pastel-pink/20 text-pastel-pink border border-pastel-pink/30'
                  }`}
                >
                  {tab.badge}
                </span>
              )}

              {/* Bulgular Sayacı */}
              {tab.id === 'findings' && findingsCount > 0 && (
                <span
                  className={`text-[10px] font-extrabold px-1.5 py-0.2 rounded-full ${
                    isActive
                      ? 'bg-pastel-mint-dark text-pastel-mint'
                      : 'bg-background-surface text-pastel-yellow'
                  }`}
                >
                  {findingsCount}
                </span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
