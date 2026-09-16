import React, { useRef, useState } from 'react';
import {
  Download,
  Upload,
  FileCode,
  FileSpreadsheet,
  MapPin,
  Calendar,
  Compass,
  Camera,
  CheckCircle2,
  HardDrive,
  Share2,
  ChevronRight,
} from 'lucide-react';
import { DayLog, AppSettings } from '../types';
import { translations, formatDayTitle } from '../i18n/translations';
import { generateGpx, generateCsv, downloadFile } from '../utils/exportUtils';
import { PALETTES } from '../utils/geoUtils';

interface DataViewProps {
  days: Record<string, DayLog>;
  currentDate: string;
  onSelectDate: (date: string) => void;
  onRestoreAllDays: (restored: Record<string, DayLog>) => void;
  settings: AppSettings;
}

export const DataView: React.FC<DataViewProps> = ({
  days,
  currentDate,
  onSelectDate,
  onRestoreAllDays,
  settings,
}) => {
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const t = translations[settings.language];
  const activePalette = PALETTES[settings.colorTheme];

  const currentDayLog = days[currentDate] || {
    date: currentDate,
    places: [],
    routePoints: [],
    steps: 0,
    totalDistanceKm: 0,
  };

  // Overall statistics
  const dayKeys = Object.keys(days).sort().reverse();
  const totalDaysCount = dayKeys.length;
  const totalPlacesCount = dayKeys.reduce((acc, d) => acc + days[d].places.length, 0);
  const totalDistanceCount = Number(
    dayKeys.reduce((acc, d) => acc + (days[d].totalDistanceKm || 0), 0).toFixed(1)
  );
  const totalPhotosCount = dayKeys.reduce(
    (acc, d) => acc + days[d].places.reduce((pAcc, p) => pAcc + p.photos.length, 0),
    0
  );

  // Category breakdown
  const categoryTotals: Record<string, number> = {};
  dayKeys.forEach((d) => {
    days[d].places.forEach((p) => {
      categoryTotals[p.category] = (categoryTotals[p.category] || 0) + 1;
    });
  });

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  // Export GPX for current day
  const handleExportGpx = () => {
    const gpxContent = generateGpx(currentDayLog);
    downloadFile(gpxContent, `lifemap-${currentDate}.gpx`, 'application/gpx+xml');
    showToast(`${currentDate}.gpx exported`);
  };

  // Export CSV for current day
  const handleExportCsv = () => {
    const csvContent = generateCsv(currentDayLog);
    downloadFile(csvContent, `lifemap-places-${currentDate}.csv`, 'text/csv;charset=utf-8;');
    showToast(`${currentDate}.csv exported`);
  };

  // Export full JSON backup
  const handleExportJson = () => {
    const fullBackup = {
      app: 'LifeMap',
      version: '1.0',
      exportedAt: new Date().toISOString(),
      days,
      settings,
    };
    const jsonStr = JSON.stringify(fullBackup, null, 2);
    downloadFile(jsonStr, `lifemap-backup-${new Date().toISOString().split('T')[0]}.json`, 'application/json');
    showToast('Full backup JSON exported');
  };

  // Import JSON backup
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const parsed = JSON.parse(event.target?.result as string);
        if (parsed && parsed.days) {
          onRestoreAllDays(parsed.days);
          showToast(t.dataView.importSuccess);
        } else {
          alert('Invalid LifeMap backup file format.');
        }
      } catch (err) {
        alert('Failed to parse JSON file.');
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  return (
    <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6 max-w-3xl mx-auto w-full">
      {/* Toast */}
      {toastMessage && (
        <div className="fixed top-16 left-1/2 -translate-x-1/2 z-50 bg-stone-900 text-white dark:bg-white dark:text-stone-900 px-4 py-2 rounded-full text-xs font-semibold shadow-xl flex items-center gap-2 animate-in fade-in slide-in-from-top-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Header */}
      <div>
        <h2 className="text-xl font-bold text-stone-900 dark:text-white">
          {t.dataView.title}
        </h2>
        <p className="text-xs text-stone-500 dark:text-stone-400 mt-0.5">
          {t.dataView.subtitle}
        </p>
      </div>

      {/* Cumulative Stats Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
        <div className="bg-white dark:bg-stone-900 rounded-2xl p-3.5 border border-stone-200/80 dark:border-stone-800/80 shadow-sm">
          <Calendar className="w-4 h-4 text-emerald-600 dark:text-emerald-400 mb-1" />
          <p className="text-[10px] uppercase font-bold text-stone-400">{t.dataView.totalDays}</p>
          <p className="text-lg font-bold text-stone-900 dark:text-white">{totalDaysCount}일</p>
        </div>

        <div className="bg-white dark:bg-stone-900 rounded-2xl p-3.5 border border-stone-200/80 dark:border-stone-800/80 shadow-sm">
          <MapPin className="w-4 h-4 text-cyan-600 dark:text-cyan-400 mb-1" />
          <p className="text-[10px] uppercase font-bold text-stone-400">{t.dataView.totalPlaces}</p>
          <p className="text-lg font-bold text-stone-900 dark:text-white">{totalPlacesCount}곳</p>
        </div>

        <div className="bg-white dark:bg-stone-900 rounded-2xl p-3.5 border border-stone-200/80 dark:border-stone-800/80 shadow-sm">
          <Compass className="w-4 h-4 text-amber-600 dark:text-amber-400 mb-1" />
          <p className="text-[10px] uppercase font-bold text-stone-400">{t.dataView.totalDistance}</p>
          <p className="text-lg font-bold text-stone-900 dark:text-white">{totalDistanceCount} km</p>
        </div>

        <div className="bg-white dark:bg-stone-900 rounded-2xl p-3.5 border border-stone-200/80 dark:border-stone-800/80 shadow-sm">
          <Camera className="w-4 h-4 text-rose-600 dark:text-rose-400 mb-1" />
          <p className="text-[10px] uppercase font-bold text-stone-400">{t.dataView.totalPhotos}</p>
          <p className="text-lg font-bold text-stone-900 dark:text-white">{totalPhotosCount}장</p>
        </div>
      </div>

      {/* Export & Import Tools */}
      <div className="bg-white dark:bg-stone-900 rounded-3xl p-5 border border-stone-200/80 dark:border-stone-800/80 shadow-sm space-y-3">
        <h3 className="text-xs font-bold uppercase tracking-wider text-stone-400 dark:text-stone-500 mb-2">
          {settings.language === 'ko' ? '데이터 내보내기 및 백업' : 'Data Export & Backup'}
        </h3>

        {/* GPX Export */}
        <div className="flex items-center justify-between p-3 rounded-2xl bg-stone-50 dark:bg-stone-800/50 hover:bg-stone-100 dark:hover:bg-stone-800 transition">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-emerald-100 dark:bg-emerald-950/80 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
              <Compass className="w-4 h-4" />
            </div>
            <div>
              <p className="text-xs font-bold text-stone-900 dark:text-white">
                {t.dataView.exportGpx} ({currentDate})
              </p>
              <p className="text-[11px] text-stone-400">{t.dataView.exportGpxDesc}</p>
            </div>
          </div>
          <button
            id="btn-export-gpx"
            onClick={handleExportGpx}
            className="px-3 py-1.5 rounded-lg bg-white dark:bg-stone-700 shadow-sm border border-stone-200 dark:border-stone-600 text-xs font-semibold text-stone-800 dark:text-stone-100 hover:bg-emerald-50 dark:hover:bg-emerald-950 transition"
          >
            GPX
          </button>
        </div>

        {/* CSV Export */}
        <div className="flex items-center justify-between p-3 rounded-2xl bg-stone-50 dark:bg-stone-800/50 hover:bg-stone-100 dark:hover:bg-stone-800 transition">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-cyan-100 dark:bg-cyan-950/80 text-cyan-600 dark:text-cyan-400 flex items-center justify-center">
              <FileSpreadsheet className="w-4 h-4" />
            </div>
            <div>
              <p className="text-xs font-bold text-stone-900 dark:text-white">
                {t.dataView.exportCsv}
              </p>
              <p className="text-[11px] text-stone-400">{t.dataView.exportCsvDesc}</p>
            </div>
          </div>
          <button
            id="btn-export-csv"
            onClick={handleExportCsv}
            className="px-3 py-1.5 rounded-lg bg-white dark:bg-stone-700 shadow-sm border border-stone-200 dark:border-stone-600 text-xs font-semibold text-stone-800 dark:text-stone-100 hover:bg-cyan-50 dark:hover:bg-cyan-950 transition"
          >
            CSV
          </button>
        </div>

        {/* JSON Full Backup */}
        <div className="flex items-center justify-between p-3 rounded-2xl bg-stone-50 dark:bg-stone-800/50 hover:bg-stone-100 dark:hover:bg-stone-800 transition">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-amber-100 dark:bg-amber-950/80 text-amber-600 dark:text-amber-400 flex items-center justify-center">
              <FileCode className="w-4 h-4" />
            </div>
            <div>
              <p className="text-xs font-bold text-stone-900 dark:text-white">
                {t.dataView.exportJson}
              </p>
              <p className="text-[11px] text-stone-400">{t.dataView.exportJsonDesc}</p>
            </div>
          </div>
          <button
            id="btn-export-json"
            onClick={handleExportJson}
            className="px-3 py-1.5 rounded-lg bg-white dark:bg-stone-700 shadow-sm border border-stone-200 dark:border-stone-600 text-xs font-semibold text-stone-800 dark:text-stone-100 hover:bg-amber-50 dark:hover:bg-amber-950 transition"
          >
            JSON
          </button>
        </div>

        {/* JSON Restore / Import */}
        <div className="flex items-center justify-between p-3 rounded-2xl bg-stone-50 dark:bg-stone-800/50 hover:bg-stone-100 dark:hover:bg-stone-800 transition">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-rose-100 dark:bg-rose-950/80 text-rose-600 dark:text-rose-400 flex items-center justify-center">
              <Upload className="w-4 h-4" />
            </div>
            <div>
              <p className="text-xs font-bold text-stone-900 dark:text-white">
                {t.dataView.importBackup}
              </p>
              <p className="text-[11px] text-stone-400">
                {settings.language === 'ko' ? '백업된 JSON 파일 선택하여 복원' : 'Restore from existing JSON backup'}
              </p>
            </div>
          </div>
          <div>
            <input
              type="file"
              ref={fileInputRef}
              accept=".json,application/json"
              onChange={handleFileChange}
              className="hidden"
            />
            <button
              id="btn-import-backup-file"
              onClick={() => fileInputRef.current?.click()}
              className="px-3 py-1.5 rounded-lg bg-white dark:bg-stone-700 shadow-sm border border-stone-200 dark:border-stone-600 text-xs font-semibold text-stone-800 dark:text-stone-100 hover:bg-rose-50 dark:hover:bg-rose-950 transition"
            >
              Restore
            </button>
          </div>
        </div>
      </div>

      {/* Category Breakdown list */}
      <div className="bg-white dark:bg-stone-900 rounded-3xl p-5 border border-stone-200/80 dark:border-stone-800/80 shadow-sm">
        <h3 className="text-xs font-bold uppercase tracking-wider text-stone-400 dark:text-stone-500 mb-3">
          {t.dataView.categoryBreakdown}
        </h3>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
          {Object.entries(categoryTotals).map(([cat, count]) => (
            <div
              key={cat}
              className="flex items-center justify-between p-2.5 rounded-xl bg-stone-50 dark:bg-stone-800/50 border border-stone-200/50 dark:border-stone-700/50 text-xs"
            >
              <span className="font-medium text-stone-700 dark:text-stone-300">
                {t.categories[cat as keyof typeof t.categories] || cat}
              </span>
              <span className="font-bold text-stone-900 dark:text-white bg-stone-200/80 dark:bg-stone-700 px-2 py-0.5 rounded-full text-[11px]">
                {count}곳
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Date History Jump List */}
      <div className="bg-white dark:bg-stone-900 rounded-3xl p-5 border border-stone-200/80 dark:border-stone-800/80 shadow-sm">
        <h3 className="text-xs font-bold uppercase tracking-wider text-stone-400 dark:text-stone-500 mb-3">
          {t.dataView.recentLogs}
        </h3>

        <div className="space-y-2">
          {dayKeys.map((dateStr) => {
            const day = days[dateStr];
            const isSelected = dateStr === currentDate;
            return (
              <button
                key={dateStr}
                id={`btn-date-log-${dateStr}`}
                onClick={() => onSelectDate(dateStr)}
                className={`w-full flex items-center justify-between p-3 rounded-2xl border transition text-left ${
                  isSelected
                    ? 'bg-emerald-50 dark:bg-emerald-950/50 border-emerald-300 dark:border-emerald-800'
                    : 'bg-stone-50 dark:bg-stone-800/50 border-stone-200/60 dark:border-stone-700/60 hover:bg-stone-100 dark:hover:bg-stone-800'
                }`}
              >
                <div>
                  <p className="text-xs font-bold text-stone-900 dark:text-white">
                    {formatDayTitle(dateStr, settings.language)}
                  </p>
                  <p className="text-[11px] text-stone-500 dark:text-stone-400 mt-0.5">
                    {day.places.length} places • {day.totalDistanceKm} km • {day.steps.toLocaleString()} steps
                  </p>
                </div>
                <div className="flex items-center gap-1.5 text-stone-400">
                  {isSelected && (
                    <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400">
                      Active
                    </span>
                  )}
                  <ChevronRight className="w-4 h-4" />
                </div>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
};
