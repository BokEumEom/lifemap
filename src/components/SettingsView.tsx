import React from 'react';
import {
  Globe,
  Sun,
  Moon,
  Palette,
  Shield,
  Cloud,
  RotateCcw,
  Sparkles,
  Check,
  Box,
} from 'lucide-react';
import { AppSettings, Language, ColorTheme, PrivacyPrecision } from '../types';
import { translations } from '../i18n/translations';
import { PALETTES } from '../utils/geoUtils';

interface SettingsViewProps {
  settings: AppSettings;
  onUpdateSettings: (newSettings: Partial<AppSettings>) => void;
  onResetDemoData: () => void;
}

export const SettingsView: React.FC<SettingsViewProps> = ({
  settings,
  onUpdateSettings,
  onResetDemoData,
}) => {
  const t = translations[settings.language];

  const colorThemes: { id: ColorTheme; label: string; primary: string }[] = [
    { id: 'magenta', label: t.settings.colorMagenta || 'RONDO Magenta', primary: PALETTES.magenta.primary },
    { id: 'emerald', label: t.settings.colorEmerald, primary: PALETTES.emerald.primary },
    { id: 'indigo', label: t.settings.colorIndigo, primary: PALETTES.indigo.primary },
    { id: 'tangerine', label: t.settings.colorTangerine, primary: PALETTES.tangerine.primary },
    { id: 'cyan', label: t.settings.colorCyan, primary: PALETTES.cyan.primary },
    { id: 'rose', label: t.settings.colorRose, primary: PALETTES.rose.primary },
  ];

  return (
    <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6 max-w-2xl mx-auto w-full select-none pb-24">
      {/* Header */}
      <div>
        <h2 className="text-xl font-black text-stone-900 dark:text-white">
          {t.settings.title}
        </h2>
        <p className="text-xs text-stone-500 dark:text-stone-400 mt-0.5 font-medium">
          RONDO / LifeMap v4.1 • iOS 17+ / Android 14+ Minimalist Lifelog
        </p>
      </div>

      {/* 1. Language Selection (JA, KO, EN) */}
      <div className="bg-white dark:bg-stone-900 rounded-3xl p-5 border border-stone-200/80 dark:border-stone-800/80 shadow-xs space-y-3">
        <div className="flex items-center gap-2">
          <Globe className="w-4 h-4 text-pink-600 dark:text-pink-400" />
          <h3 className="text-xs font-bold uppercase tracking-wider text-stone-700 dark:text-stone-300">
            {t.settings.language}
          </h3>
        </div>

        <div className="grid grid-cols-3 gap-2">
          <button
            id="btn-lang-ja"
            onClick={() => onUpdateSettings({ language: 'ja' })}
            className={`flex flex-col items-center justify-center p-3 rounded-2xl border text-xs font-bold transition active:scale-95 ${
              settings.language === 'ja'
                ? 'bg-pink-50 dark:bg-pink-950/50 border-pink-500 text-pink-600 dark:text-pink-400 shadow-xs'
                : 'bg-stone-50 dark:bg-stone-800/50 border-stone-200/80 dark:border-stone-700/80 text-stone-700 dark:text-stone-300 hover:bg-stone-100'
            }`}
          >
            <span>日本語</span>
            <span className="text-[10px] font-normal text-stone-400 mt-0.5">動画準拠</span>
          </button>

          <button
            id="btn-lang-ko"
            onClick={() => onUpdateSettings({ language: 'ko' })}
            className={`flex flex-col items-center justify-center p-3 rounded-2xl border text-xs font-bold transition active:scale-95 ${
              settings.language === 'ko'
                ? 'bg-pink-50 dark:bg-pink-950/50 border-pink-500 text-pink-600 dark:text-pink-400 shadow-xs'
                : 'bg-stone-50 dark:bg-stone-800/50 border-stone-200/80 dark:border-stone-700/80 text-stone-700 dark:text-stone-300 hover:bg-stone-100'
            }`}
          >
            <span>한국어</span>
            <span className="text-[10px] font-normal text-stone-400 mt-0.5">완전 지원</span>
          </button>

          <button
            id="btn-lang-en"
            onClick={() => onUpdateSettings({ language: 'en' })}
            className={`flex flex-col items-center justify-center p-3 rounded-2xl border text-xs font-bold transition active:scale-95 ${
              settings.language === 'en'
                ? 'bg-pink-50 dark:bg-pink-950/50 border-pink-500 text-pink-600 dark:text-pink-400 shadow-xs'
                : 'bg-stone-50 dark:bg-stone-800/50 border-stone-200/80 dark:border-stone-700/80 text-stone-700 dark:text-stone-300 hover:bg-stone-100'
            }`}
          >
            <span>English</span>
            <span className="text-[10px] font-normal text-stone-400 mt-0.5">Global UI</span>
          </button>
        </div>
      </div>

      {/* 2. Appearance & Theme */}
      <div className="bg-white dark:bg-stone-900 rounded-3xl p-5 border border-stone-200/80 dark:border-stone-800/80 shadow-xs space-y-3">
        <div className="flex items-center gap-2">
          <Sun className="w-4 h-4 text-amber-500" />
          <h3 className="text-xs font-bold uppercase tracking-wider text-stone-700 dark:text-stone-300">
            {t.settings.theme}
          </h3>
        </div>

        <div className="grid grid-cols-2 gap-2">
          <button
            id="btn-theme-light"
            onClick={() => onUpdateSettings({ theme: 'light' })}
            className={`flex items-center justify-between p-3.5 rounded-2xl border text-xs font-bold transition active:scale-95 ${
              settings.theme === 'light'
                ? 'bg-amber-50 dark:bg-amber-950/50 border-amber-500 text-amber-800 dark:text-amber-200'
                : 'bg-stone-50 dark:bg-stone-800/50 border-stone-200/80 dark:border-stone-700/80 text-stone-700 dark:text-stone-300'
            }`}
          >
            <div className="flex items-center gap-2">
              <Sun className="w-4 h-4 text-amber-500" />
              <span>{t.settings.themeLight}</span>
            </div>
            {settings.theme === 'light' && <Check className="w-4 h-4" />}
          </button>

          <button
            id="btn-theme-dark"
            onClick={() => onUpdateSettings({ theme: 'dark' })}
            className={`flex items-center justify-between p-3.5 rounded-2xl border text-xs font-bold transition active:scale-95 ${
              settings.theme === 'dark'
                ? 'bg-stone-800 border-stone-600 text-white'
                : 'bg-stone-50 dark:bg-stone-800/50 border-stone-200/80 dark:border-stone-700/80 text-stone-700 dark:text-stone-300'
            }`}
          >
            <div className="flex items-center gap-2">
              <Moon className="w-4 h-4 text-blue-400" />
              <span>{t.settings.themeDark}</span>
            </div>
            {settings.theme === 'dark' && <Check className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {/* 4. Route & Pin Color Palette */}
      <div className="bg-white dark:bg-stone-900 rounded-3xl p-5 border border-stone-200/80 dark:border-stone-800/80 shadow-xs space-y-3">
        <div className="flex items-center gap-2">
          <Palette className="w-4 h-4 text-pink-600 dark:text-pink-400" />
          <h3 className="text-xs font-bold uppercase tracking-wider text-stone-700 dark:text-stone-300">
            {t.settings.routeColor}
          </h3>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
          {colorThemes.map((ct) => {
            const isSelected = settings.colorTheme === ct.id;
            return (
              <button
                key={ct.id}
                onClick={() => onUpdateSettings({ colorTheme: ct.id })}
                className={`flex items-center gap-2.5 p-3 rounded-2xl border text-xs font-bold transition active:scale-95 ${
                  isSelected
                    ? 'bg-stone-100 dark:bg-stone-800 border-stone-900 dark:border-stone-100 text-stone-900 dark:text-white shadow-xs'
                    : 'bg-stone-50 dark:bg-stone-800/50 border-stone-200/80 dark:border-stone-700/80 text-stone-700 dark:text-stone-300'
                }`}
              >
                <div
                  className="w-4 h-4 rounded-full flex-shrink-0 shadow-xs"
                  style={{ backgroundColor: ct.primary }}
                />
                <span className="truncate">{ct.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* 5. 3D Building View */}
      <div className="bg-white dark:bg-stone-900 rounded-3xl p-5 border border-stone-200/80 dark:border-stone-800/80 shadow-xs space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Box className="w-4 h-4 text-pink-600 dark:text-pink-400" />
            <h3 className="text-xs font-bold uppercase tracking-wider text-stone-700 dark:text-stone-300">
              {settings.language === 'ko' ? '3D 건물 뷰 (3D Buildings)' : settings.language === 'ja' ? '3D建物ビュー' : '3D Building View'}
            </h3>
          </div>
          <button
            id="toggle-settings-3d-buildings"
            type="button"
            onClick={() => onUpdateSettings({ threeDBuildingView: !settings.threeDBuildingView })}
            className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
              settings.threeDBuildingView ? 'bg-pink-600' : 'bg-stone-200 dark:bg-stone-700'
            }`}
          >
            <span
              className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-md ring-0 transition duration-200 ease-in-out ${
                settings.threeDBuildingView ? 'translate-x-5' : 'translate-x-0'
              }`}
            />
          </button>
        </div>
        <p className="text-xs text-stone-500 dark:text-stone-400 leading-relaxed">
          {settings.language === 'ko'
            ? '지도에서 방문 스팟 및 도심 건물을 3차원 입체로 렌더링하고 건물의 층수와 높이, 옥상 구조를 감상합니다.'
            : settings.language === 'ja'
            ? '地図上で訪問スポットや街の建物を3D立体表示し、高さやフロア数を確認できます。'
            : 'Render 3D building extrusions on the map with architectural heights, roof types, and urban blocks.'}
        </p>
      </div>

      {/* 6. Privacy & GPS Precision */}
      <div className="bg-white dark:bg-stone-900 rounded-3xl p-5 border border-stone-200/80 dark:border-stone-800/80 shadow-xs space-y-3">
        <div className="flex items-center gap-2">
          <Shield className="w-4 h-4 text-cyan-600 dark:text-cyan-400" />
          <h3 className="text-xs font-bold uppercase tracking-wider text-stone-700 dark:text-stone-300">
            {t.settings.privacySection}
          </h3>
        </div>
        <p className="text-xs text-stone-500 dark:text-stone-400 leading-relaxed">
          {t.settings.privacyDesc}
        </p>

        <div className="space-y-2">
          <button
            onClick={() => onUpdateSettings({ privacyPrecision: 'exact' })}
            className={`w-full text-left p-3.5 rounded-2xl border transition active:scale-[0.99] ${
              settings.privacyPrecision === 'exact'
                ? 'bg-cyan-50 dark:bg-cyan-950/50 border-cyan-500'
                : 'bg-stone-50 dark:bg-stone-800/50 border-stone-200/80 dark:border-stone-700/80'
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-stone-900 dark:text-white">
                {t.settings.precisionExact}
              </span>
              {settings.privacyPrecision === 'exact' && (
                <Check className="w-4 h-4 text-cyan-600" />
              )}
            </div>
            <p className="text-[11px] text-stone-500 dark:text-stone-400 mt-1">
              {t.settings.precisionExactDesc}
            </p>
          </button>

          <button
            onClick={() => onUpdateSettings({ privacyPrecision: 'approximate' })}
            className={`w-full text-left p-3.5 rounded-2xl border transition active:scale-[0.99] ${
              settings.privacyPrecision === 'approximate'
                ? 'bg-cyan-50 dark:bg-cyan-950/50 border-cyan-500'
                : 'bg-stone-50 dark:bg-stone-800/50 border-stone-200/80 dark:border-stone-700/80'
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-stone-900 dark:text-white">
                {t.settings.precisionApproximate}
              </span>
              {settings.privacyPrecision === 'approximate' && (
                <Check className="w-4 h-4 text-cyan-600" />
              )}
            </div>
            <p className="text-[11px] text-stone-500 dark:text-stone-400 mt-1">
              {t.settings.precisionApproximateDesc}
            </p>
          </button>
        </div>
      </div>

      {/* 6. Reset to Demo Data */}
      <div className="bg-stone-100 dark:bg-stone-900 rounded-3xl p-5 border border-stone-200/80 dark:border-stone-800/80 space-y-3">
        <div className="flex items-center gap-2">
          <RotateCcw className="w-4 h-4 text-stone-500" />
          <h3 className="text-xs font-bold uppercase tracking-wider text-stone-700 dark:text-stone-300">
            {t.settings.resetDemo}
          </h3>
        </div>
        <p className="text-xs text-stone-500 dark:text-stone-400">
          {settings.language === 'ja'
            ? '動画で紹介された大分県（カフェ・ド BGM、アートプラザ等）のフルサンプルデータを再読み込みします。'
            : settings.language === 'ko'
            ? '영상 속 오이타현 12곳 장소 및 풀 사진 데이터를 다시 불러옵니다.'
            : 'Reload curated sample data from the video showcase (Oita spots, photos, AI summary).'}
        </p>
        <button
          id="btn-reset-demo"
          onClick={() => {
            if (window.confirm(t.settings.resetConfirm)) {
              onResetDemoData();
            }
          }}
          className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold transition active:scale-95 shadow-sm"
        >
          {t.settings.resetDemo}
        </button>
      </div>
    </div>
  );
};
