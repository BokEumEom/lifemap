import React from 'react';
import { Smartphone, Maximize2 } from 'lucide-react';
import { AppSettings } from '../types';

interface DeviceFrameProps {
  children: React.ReactNode;
  settings: AppSettings;
  onToggleFrameMode: () => void;
  isSimulating: boolean;
}

export const DeviceFrame: React.FC<DeviceFrameProps> = ({
  children,
  settings,
  onToggleFrameMode,
}) => {
  const isMobileColumn = settings.frameMode !== 'fullscreen';

  return (
    <div className="relative w-screen h-screen overflow-hidden flex flex-col items-center justify-center bg-stone-100 dark:bg-stone-950 text-stone-800 dark:text-stone-200 transition-colors">
      {/* Optional Top Floating Viewport Toggle (Mobile App View vs Full Browser Width) */}
      <div className="hidden sm:flex absolute top-3 right-4 z-50 items-center gap-2">
        <button
          onClick={onToggleFrameMode}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/90 dark:bg-stone-900/90 backdrop-blur-md shadow-md border border-stone-200/80 dark:border-stone-800/80 text-[11px] font-semibold text-stone-700 dark:text-stone-300 hover:bg-white dark:hover:bg-stone-800 transition active:scale-95"
          title="모바일 뷰 / 전체 화면 전환"
        >
          {isMobileColumn ? (
            <>
              <Maximize2 className="w-3.5 h-3.5 text-stone-500" />
              <span>전체 화면</span>
            </>
          ) : (
            <>
              <Smartphone className="w-3.5 h-3.5 text-pink-500" />
              <span>모바일 뷰</span>
            </>
          )}
        </button>
      </div>

      {/* Main Mobile Service Container (No hardware iPhone 16 Pro frame, no dynamic island, no fake status bar) */}
      <div
        className={`relative w-full h-full flex flex-col overflow-hidden bg-stone-50 dark:bg-stone-950 transition-all duration-200 ${
          isMobileColumn
            ? 'sm:max-w-[440px] sm:shadow-2xl sm:border-x sm:border-stone-200/90 dark:sm:border-stone-800/90'
            : 'max-w-none'
        }`}
      >
        {children}
      </div>
    </div>
  );
};

