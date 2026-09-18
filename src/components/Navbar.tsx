import React, { useState } from 'react';
import { ChevronLeft, ChevronRight, Calendar, Plus, ImagePlus, Globe, Sun, Moon, Footprints } from 'lucide-react';
import { AppSettings, Language } from '../types';
import { translations, formatDayTitle } from '../i18n/translations';

interface NavbarProps {
  currentDate: string;
  onSelectDate: (date: string) => void;
  availableDates: string[];
  settings: AppSettings;
  onUpdateSettings: (newSettings: Partial<AppSettings>) => void;
  onOpenAddModal: () => void;
  onOpenPhotoImportModal: () => void;
  isSimulating: boolean;
  onToggleSimulate: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  currentDate,
  onSelectDate,
  availableDates,
  settings,
  onUpdateSettings,
  onOpenAddModal,
  onOpenPhotoImportModal,
  isSimulating,
  onToggleSimulate,
}) => {
  const [showDatePicker, setShowDatePicker] = useState(false);
  const t = translations[settings.language];

  // Navigate to previous day (preferring logged dates with spots)
  const handlePrevDay = () => {
    const idx = availableDates.indexOf(currentDate);
    if (idx !== -1 && idx < availableDates.length - 1) {
      onSelectDate(availableDates[idx + 1]);
      return;
    }
    const d = new Date(currentDate);
    d.setDate(d.getDate() - 1);
    const prevStr = d.toISOString().split('T')[0];
    onSelectDate(prevStr);
  };

  // Navigate to next day (preferring logged dates with spots)
  const handleNextDay = () => {
    const idx = availableDates.indexOf(currentDate);
    if (idx > 0) {
      onSelectDate(availableDates[idx - 1]);
      return;
    }
    const d = new Date(currentDate);
    d.setDate(d.getDate() + 1);
    const nextStr = d.toISOString().split('T')[0];
    onSelectDate(nextStr);
  };

  const toggleLanguage = () => {
    const sequence: Language[] = ['ja', 'ko', 'en'];
    const nextIdx = (sequence.indexOf(settings.language) + 1) % sequence.length;
    onUpdateSettings({ language: sequence[nextIdx] });
  };

  const toggleTheme = () => {
    const nextTheme = settings.theme === 'dark' ? 'light' : 'dark';
    onUpdateSettings({ theme: nextTheme });
  };

  const formattedDate = formatDayTitle(currentDate, settings.language);

  return (
    <header className="relative z-30 flex-shrink-0 bg-white/90 dark:bg-stone-900/90 backdrop-blur-md border-b border-stone-200/80 dark:border-stone-800/80 px-3 sm:px-4 py-2 transition-colors select-none">
      <div className="max-w-7xl mx-auto flex items-center justify-between gap-2">
        {/* Left: Brand & Date Navigator */}
        <div className="flex items-center gap-2 sm:gap-3 min-w-0">
          <div className="flex items-center gap-1.5 flex-shrink-0">
            <div className="w-7 h-7 rounded-xl bg-gradient-to-tr from-pink-600 to-rose-400 flex items-center justify-center text-white shadow-xs">
              <span className="font-black text-xs tracking-tighter">R</span>
            </div>
            <div className="hidden sm:block">
              <h1 className="text-xs font-black tracking-tight text-stone-900 dark:text-white leading-none">
                RONDO
              </h1>
              <p className="text-[9px] text-stone-400 dark:text-stone-500 font-medium">
                {t.appSubtitle || 'ライフログ'}
              </p>
            </div>
          </div>

          <div className="h-4 w-px bg-stone-200 dark:bg-stone-800 hidden sm:block" />

          {/* Date Navigator */}
          <div className="flex items-center bg-stone-100 dark:bg-stone-800/80 rounded-full p-0.5 border border-stone-200/60 dark:border-stone-700/60">
            <button
              id="btn-prev-day"
              onClick={handlePrevDay}
              className="w-6 h-6 flex items-center justify-center rounded-full text-stone-600 dark:text-stone-300 hover:bg-white dark:hover:bg-stone-700 transition"
              title={t.header.yesterday}
            >
              <ChevronLeft className="w-3.5 h-3.5" />
            </button>

            <button
              id="btn-date-picker-toggle"
              onClick={() => setShowDatePicker(!showDatePicker)}
              className="flex items-center gap-1 px-2 text-xs font-bold text-stone-800 dark:text-stone-200 hover:text-pink-600 dark:hover:text-pink-400 transition"
            >
              <Calendar className="w-3 h-3 text-pink-500" />
              <span className="whitespace-nowrap truncate max-w-[120px] sm:max-w-none text-[11px] sm:text-xs">
                {formattedDate}
              </span>
            </button>

            <button
              id="btn-next-day"
              onClick={handleNextDay}
              className="w-6 h-6 flex items-center justify-center rounded-full text-stone-600 dark:text-stone-300 hover:bg-white dark:hover:bg-stone-700 transition"
              title={t.header.tomorrow}
            >
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Quick Date Picker Dropdown */}
          {showDatePicker && (
            <div className="absolute top-12 left-4 sm:left-36 bg-white dark:bg-stone-900 rounded-3xl shadow-2xl border border-stone-200 dark:border-stone-800 p-3 z-50 w-64 animate-in fade-in zoom-in-95 duration-150">
              <div className="flex items-center justify-between pb-2 mb-2 border-b border-stone-100 dark:border-stone-800">
                <span className="text-xs font-semibold text-stone-500 dark:text-stone-400">
                  {settings.language === 'ja' ? '記録された日付' : settings.language === 'ko' ? '기록된 날짜 선택' : 'Logged Dates'}
                </span>
                <input
                  type="date"
                  value={currentDate}
                  onChange={(e) => {
                    if (e.target.value) {
                      onSelectDate(e.target.value);
                      setShowDatePicker(false);
                    }
                  }}
                  className="text-xs bg-stone-100 dark:bg-stone-800 text-stone-800 dark:text-stone-200 rounded-lg px-2 py-0.5 border-0 focus:ring-1 focus:ring-pink-500"
                />
              </div>
              <div className="space-y-1 max-h-48 overflow-y-auto pr-1">
                {availableDates.map((d) => (
                  <button
                    key={d}
                    onClick={() => {
                      onSelectDate(d);
                      setShowDatePicker(false);
                    }}
                    className={`w-full text-left px-2.5 py-1.5 rounded-xl text-xs font-medium flex items-center justify-between transition ${
                      d === currentDate
                        ? 'bg-pink-50 dark:bg-pink-950/60 text-pink-700 dark:text-pink-300 font-bold'
                        : 'hover:bg-stone-100 dark:hover:bg-stone-800 text-stone-700 dark:text-stone-300'
                    }`}
                  >
                    <span>{formatDayTitle(d, settings.language)}</span>
                    {d === '2026-09-12' && (
                      <span className="text-[10px] font-bold bg-pink-100 dark:bg-pink-900/60 text-pink-700 dark:text-pink-300 px-2 py-0.5 rounded-full">
                        {settings.language === 'ko' ? '오이타 12곳' : settings.language === 'ja' ? '大分 12ヶ所' : 'Oita (12)'}
                      </span>
                    )}
                    {d === '2026-09-15' && (
                      <span className="text-[10px] font-bold bg-amber-100 dark:bg-amber-900/60 text-amber-700 dark:text-amber-300 px-2 py-0.5 rounded-full">
                        {settings.language === 'ko' ? '벳푸 온천 4곳' : settings.language === 'ja' ? '別府温泉 4ヶ所' : 'Beppu (4)'}
                      </span>
                    )}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Right: Quick Action Controls */}
        <div className="flex items-center gap-1 sm:gap-1.5 flex-shrink-0">
          {/* Import Real Photos Button - Available on Mobile & Desktop */}
          <button
            id="btn-import-photos-top"
            onClick={onOpenPhotoImportModal}
            className="flex items-center gap-1 px-2 sm:px-2.5 py-1.5 rounded-full text-xs font-semibold bg-stone-100 dark:bg-stone-800 text-stone-700 dark:text-stone-300 hover:bg-stone-200 dark:hover:bg-stone-700 border border-stone-200/60 dark:border-stone-700/60 transition active:scale-95"
            title={t.header.importPhotos}
          >
            <ImagePlus className="w-3.5 h-3.5 text-pink-600 dark:text-pink-400" />
            <span className="hidden sm:inline">{t.header.importPhotos}</span>
            <span className="inline sm:hidden text-[11px] font-medium">{settings.language === 'ko' ? '사진' : 'Photo'}</span>
          </button>

          {/* Add Place Button - Prominent Accent */}
          <button
            id="btn-add-place-top"
            onClick={onOpenAddModal}
            className="flex items-center gap-1 px-2.5 sm:px-3 py-1.5 rounded-full text-xs font-bold bg-pink-600 hover:bg-pink-700 text-white shadow-xs transition active:scale-95"
            title={t.header.addPlace}
          >
            <Plus className="w-3.5 h-3.5" />
            <span className="text-[11px] sm:text-xs">{t.header.addPlace}</span>
          </button>

          {/* Language Switch */}
          <button
            id="btn-lang-toggle"
            onClick={toggleLanguage}
            className="flex items-center gap-1 px-2 py-1.5 rounded-full text-xs font-bold bg-stone-100 dark:bg-stone-800 hover:bg-stone-200 dark:hover:bg-stone-700 text-stone-700 dark:text-stone-300 transition"
            title="Toggle Japanese / Korean / English"
          >
            <Globe className="w-3.5 h-3.5 text-stone-400" />
            <span className="text-[10px] sm:text-xs">{settings.language.toUpperCase()}</span>
          </button>

          {/* Dark / Light Mode Switch */}
          <button
            id="btn-theme-toggle"
            onClick={toggleTheme}
            className="w-7 h-7 flex items-center justify-center rounded-full bg-stone-100 dark:bg-stone-800 text-stone-600 dark:text-stone-300 hover:bg-stone-200 dark:hover:bg-stone-700 transition"
            title="Toggle theme"
          >
            {settings.theme === 'dark' ? (
              <Sun className="w-3.5 h-3.5 text-amber-400" />
            ) : (
              <Moon className="w-3.5 h-3.5 text-stone-600" />
            )}
          </button>
        </div>
      </div>
    </header>
  );
};
