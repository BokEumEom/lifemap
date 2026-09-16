import React from 'react';
import { MapPin, BookOpen, BarChart2, Settings, Search } from 'lucide-react';
import { translations } from '../i18n/translations';
import { Language } from '../types';

export type TabType = 'map' | 'timeline' | 'data' | 'settings';

interface BottomTabBarProps {
  currentTab: TabType;
  onSelectTab: (tab: TabType) => void;
  language: Language;
  onOpenSearch: () => void;
}

export const BottomTabBar: React.FC<BottomTabBarProps> = ({
  currentTab,
  onSelectTab,
  language,
  onOpenSearch,
}) => {
  const t = translations[language];

  const tabs: { id: TabType; label: string; icon: React.ReactNode }[] = [
    {
      id: 'map',
      label: t.tabs.map,
      icon: <MapPin className="w-4 h-4" />,
    },
    {
      id: 'timeline',
      label: t.tabs.timeline,
      icon: <BookOpen className="w-4 h-4" />,
    },
    {
      id: 'data',
      label: t.tabs.data,
      icon: <BarChart2 className="w-4 h-4" />,
    },
    {
      id: 'settings',
      label: t.tabs.settings,
      icon: <Settings className="w-4 h-4" />,
    },
  ];

  return (
    <div className="relative z-30 flex-shrink-0 px-3 py-1.5 bg-white/95 dark:bg-stone-900/95 backdrop-blur-xl border-t border-stone-200/70 dark:border-stone-800/70 select-none">
      <div className="max-w-md mx-auto flex items-center justify-between gap-1">
        {/* 4 Main Tabs */}
        <div className="flex items-center justify-around flex-1">
          {tabs.map((tab) => {
            const isActive = currentTab === tab.id;
            return (
              <button
                key={tab.id}
                id={`tab-${tab.id}`}
                onClick={() => onSelectTab(tab.id)}
                className={`relative flex flex-col items-center py-1 px-3 rounded-2xl transition-all duration-200 active:scale-95 ${
                  isActive
                    ? 'text-pink-600 dark:text-pink-400 font-bold'
                    : 'text-stone-400 dark:text-stone-500 hover:text-stone-700 dark:hover:text-stone-300'
                }`}
              >
                <div className="relative flex items-center justify-center">
                  {tab.icon}
                  {isActive && (
                    <span className="absolute -bottom-1.5 w-1.5 h-1.5 bg-pink-600 dark:bg-pink-400 rounded-full" />
                  )}
                </div>
                <span className="text-[10px] mt-1.5 tracking-tight font-medium">
                  {tab.label}
                </span>
              </button>
            );
          })}
        </div>

        {/* Vertical Divider */}
        <div className="h-6 w-px bg-stone-200 dark:bg-stone-800 mx-1" />

        {/* Search Circular Button (Video Matching) */}
        <button
          id="btn-search-dock"
          onClick={onOpenSearch}
          className="w-9 h-9 rounded-full bg-stone-100 dark:bg-stone-800 hover:bg-stone-200 dark:hover:bg-stone-700 text-stone-600 dark:text-stone-300 flex items-center justify-center shadow-inner transition active:scale-95 flex-shrink-0"
          title="Search spots and dates"
        >
          <Search className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};
