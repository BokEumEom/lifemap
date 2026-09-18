import React, { useState } from 'react';
import {
  Heart,
  Plus,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  Info,
  Star,
  MessageSquareQuote,
  Check,
  RefreshCw,
  Camera,
  Footprints,
  MapPin,
  Compass,
} from 'lucide-react';
import { DayLog, PlaceLog, AppSettings } from '../types';
import { translations, formatDayTitle } from '../i18n/translations';
import {
  getPlaceName,
  getPlaceNoteQuote,
  getDayPrefecture,
  getPhotoCaption,
} from '../utils/localeUtils';

interface TimelineViewProps {
  dayLog?: DayLog;
  settings: AppSettings;
  onSelectPlace: (id: string) => void;
  onUpdateDayLog: (updated: DayLog) => void;
  onOpenAddModal: () => void;
  onSelectPhoto: (url: string, caption?: string) => void;
  onPrevDay?: () => void;
  onNextDay?: () => void;
}

export const TimelineView: React.FC<TimelineViewProps> = ({
  dayLog,
  settings,
  onSelectPlace,
  onUpdateDayLog,
  onOpenAddModal,
  onSelectPhoto,
  onPrevDay,
  onNextDay,
}) => {
  const [memoInput, setMemoInput] = useState(dayLog?.dailyNote || '');
  const [activeBottomCard, setActiveBottomCard] = useState<'memory' | 'overview' | 'map'>('memory');

  React.useEffect(() => {
    setMemoInput(dayLog?.dailyNote || '');
  }, [dayLog?.date, dayLog?.dailyNote]);

  const t = translations[settings.language];

  if (!dayLog || dayLog.places.length === 0) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-8 text-center max-w-sm mx-auto">
        <div className="w-16 h-16 rounded-3xl bg-stone-100 dark:bg-stone-800 flex items-center justify-center text-stone-400 mb-4 shadow-inner">
          <Footprints className="w-8 h-8 text-pink-500" />
        </div>
        <h3 className="text-base font-bold text-stone-900 dark:text-stone-100 mb-1">
          {t.timeline.emptyTimeline}
        </h3>
        <p className="text-xs text-stone-500 dark:text-stone-400 mb-5 leading-relaxed">
          {t.timeline.emptyTimelineDesc}
        </p>
        <button
          onClick={onOpenAddModal}
          className="flex items-center gap-2 px-5 py-2.5 rounded-full text-xs font-bold text-white bg-pink-600 hover:bg-pink-700 shadow-md transition active:scale-95"
        >
          <Plus className="w-4 h-4" />
          <span>{t.header.addPlace}</span>
        </button>
      </div>
    );
  }

  // Count totals
  const totalPhotos = dayLog.places.reduce((acc, p) => acc + (p.photos?.length || 0), 0);
  const spotsCount = dayLog.places.length;
  const stepsCount = dayLog.steps || 10738;
  const distanceKm = dayLog.totalDistanceKm || 6.5;
  const movementKm = dayLog.summaryMeta?.movementKm || 3.2;
  const movementRange = dayLog.summaryMeta?.movementTimeRange || '12:14~19:32';

  // Toggle Like Heart on Place
  const handleToggleLike = (placeId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const updated = dayLog.places.map((p) => {
      if (p.id === placeId) {
        const currentLikes = p.likesCount || 0;
        return {
          ...p,
          likesCount: currentLikes + 1,
        };
      }
      return p;
    });

    onUpdateDayLog({
      ...dayLog,
      places: updated,
    });
  };

  const formattedDate = formatDayTitle(dayLog.date, settings.language);

  // Helper for category label
  const getCategoryLabel = (category: string) => {
    switch (category) {
      case 'shrine_temple':
        return { icon: '⛩️', text: t.categories.shrine_temple || '神社・仏閣' };
      case 'cafe':
        return { icon: '☕', text: t.categories.cafe || 'カフェ' };
      case 'restaurant':
        return { icon: '🍱', text: t.categories.restaurant || 'レストラン' };
      case 'step':
        return { icon: '👟', text: t.categories.step || 'ステップ' };
      case 'culture':
        return { icon: '🏛️', text: t.categories.culture || '美術館・博物館' };
      case 'spot':
        return { icon: '📍', text: t.categories.spot || 'ピン' };
      default:
        return { icon: '📍', text: t.categories.other || 'スポット' };
    }
  };

  return (
    <div className="flex-1 overflow-y-auto bg-stone-50 dark:bg-stone-950 text-stone-900 dark:text-stone-100 select-none pb-24">
      {/* 1. STICKY TOP HEADER (Matching Video 00:03 - 00:06) */}
      <div className="sticky top-0 z-20 bg-stone-50/95 dark:bg-stone-950/95 backdrop-blur-md border-b border-stone-200/60 dark:border-stone-800/60 px-4 pt-3 pb-3">
        {/* Date Row: < 2026 9月12日(土) ⌄ > */}
        <div className="flex items-center justify-between max-w-lg mx-auto mb-3">
          <button
            onClick={onPrevDay}
            className="w-8 h-8 rounded-full bg-stone-100 dark:bg-stone-800 flex items-center justify-center text-stone-600 dark:text-stone-300 hover:bg-stone-200 transition active:scale-95"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>

          <button className="flex items-center gap-1.5 px-3 py-1 rounded-full hover:bg-stone-100 dark:hover:bg-stone-800 transition">
            <span className="text-base font-extrabold text-stone-900 dark:text-white tracking-tight">
              {formattedDate}
            </span>
            <ChevronDown className="w-4 h-4 text-stone-400" />
          </button>

          <button
            onClick={onNextDay}
            className="w-8 h-8 rounded-full bg-stone-100 dark:bg-stone-800 flex items-center justify-center text-stone-600 dark:text-stone-300 hover:bg-stone-200 transition active:scale-95"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>

        {/* 4 Stats Columns: [12 스팟] [74 장] [10,738 걸음] [6.5 km] */}
        <div className="grid grid-cols-4 gap-2 max-w-lg mx-auto text-center">
          <div className="bg-white dark:bg-stone-900 rounded-2xl py-2 px-1 border border-stone-200/60 dark:border-stone-800/60 shadow-xs">
            <div className="text-lg font-black text-stone-900 dark:text-white leading-tight">
              {spotsCount}
            </div>
            <div className="text-[10px] font-semibold text-stone-600 dark:text-stone-300">
              {settings.language === 'ko' ? '스팟' : settings.language === 'ja' ? 'スポット' : 'Spots'}
            </div>
            <div className="text-[9px] text-stone-400 dark:text-stone-500">
              {settings.language === 'ko' ? '방문 장소' : settings.language === 'ja' ? '訪れた場所' : 'Spots'}
            </div>
          </div>

          <div className="bg-white dark:bg-stone-900 rounded-2xl py-2 px-1 border border-stone-200/60 dark:border-stone-800/60 shadow-xs">
            <div className="text-lg font-black text-stone-900 dark:text-white leading-tight">
              {totalPhotos}
            </div>
            <div className="text-[10px] font-semibold text-stone-600 dark:text-stone-300">
              {settings.language === 'ko' ? '장' : settings.language === 'ja' ? '枚' : 'Photos'}
            </div>
            <div className="text-[9px] text-stone-400 dark:text-stone-500">
              {settings.language === 'ko' ? '촬영한 사진' : settings.language === 'ja' ? '撮った写真' : 'Photos'}
            </div>
          </div>

          <div className="bg-white dark:bg-stone-900 rounded-2xl py-2 px-1 border border-stone-200/60 dark:border-stone-800/60 shadow-xs">
            <div className="text-lg font-black text-stone-900 dark:text-white leading-tight">
              {stepsCount.toLocaleString()}
            </div>
            <div className="text-[10px] font-semibold text-stone-600 dark:text-stone-300">
              {settings.language === 'ko' ? '걸음' : settings.language === 'ja' ? '歩' : 'Steps'}
            </div>
            <div className="text-[9px] text-stone-400 dark:text-stone-500">
              {settings.language === 'ko' ? '걸은 걸음' : settings.language === 'ja' ? '歩いた数' : 'Steps'}
            </div>
          </div>

          <div className="bg-white dark:bg-stone-900 rounded-2xl py-2 px-1 border border-stone-200/60 dark:border-stone-800/60 shadow-xs">
            <div className="text-lg font-black text-stone-900 dark:text-white leading-tight">
              {distanceKm}
            </div>
            <div className="text-[10px] font-semibold text-stone-600 dark:text-stone-300">
              km
            </div>
            <div className="text-[9px] text-stone-400 dark:text-stone-500">
              {settings.language === 'ko' ? '이동 거리' : settings.language === 'ja' ? '歩いた距離' : 'Distance'}
            </div>
          </div>
        </div>

        {/* Movement Row: 👟 移動 3.2 km 12:14~19:32 > */}
        <div className="flex items-center justify-between max-w-lg mx-auto mt-2.5 px-3 py-1.5 rounded-xl bg-stone-100/80 dark:bg-stone-900/80 text-xs font-semibold text-stone-700 dark:text-stone-300 cursor-pointer hover:bg-stone-200/70 transition">
          <div className="flex items-center gap-2">
            <span>👟</span>
            <span className="font-bold">{t.timeline.movement || '移動'}</span>
            <span>{movementKm} km</span>
            <span className="text-stone-400 text-[11px] font-normal">{movementRange}</span>
          </div>
          <ChevronRight className="w-4 h-4 text-stone-400" />
        </div>
      </div>

      {/* 2. CHRONOLOGICAL FEED OF PLACES (Matching Video 00:07 - 00:23) */}
      <div className="max-w-lg mx-auto px-4 pt-4 space-y-5">
        {dayLog.places.map((place, index) => {
          const categoryInfo = getCategoryLabel(place.category);
          const timeDisplay = place.departureTime && place.departureTime !== place.arrivalTime
            ? `${place.arrivalTime}~${place.departureTime}`
            : place.arrivalTime;

          return (
            <div
              key={place.id}
              onClick={() => onSelectPlace(place.id)}
              className="bg-white dark:bg-stone-900 rounded-3xl p-4 border border-stone-200/70 dark:border-stone-800/70 shadow-xs hover:shadow-md transition cursor-pointer"
            >
              {/* Top Row: Time & Weather */}
              <div className="flex items-center justify-between mb-3 text-xs">
                <div className="flex items-center gap-2 font-bold text-stone-800 dark:text-stone-200">
                  <span className="text-[13px]">{timeDisplay}</span>
                  {place.weather && (
                    <span className="flex items-center gap-1 text-[11px] font-normal text-stone-500 dark:text-stone-400">
                      <span>⛅</span>
                      <span>{place.weather.tempC}°C</span>
                    </span>
                  )}
                </div>

                {place.isFirstVisit && (
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-pink-50 dark:bg-pink-950/60 text-pink-600 dark:text-pink-400">
                    {t.timeline.firstVisitBadge || '初めて'}
                  </span>
                )}
              </div>

              {/* Horizontal Photo Scroll with rounded thumbnails + "+" button */}
              <div className="flex items-center gap-2.5 overflow-x-auto no-scrollbar pb-2">
                {(place.photos || []).map((photo) => {
                  const caption = getPhotoCaption(photo, settings.language, getPlaceName(place, settings.language));
                  return (
                    <div
                      key={photo.id}
                      onClick={(e) => {
                        e.stopPropagation();
                        onSelectPhoto(photo.url, caption);
                      }}
                      className="relative w-32 h-32 sm:w-36 sm:h-36 rounded-2xl overflow-hidden flex-shrink-0 bg-stone-100 dark:bg-stone-800 group shadow-xs"
                    >
                      <img
                        src={photo.url}
                        alt={caption}
                        referrerPolicy="no-referrer"
                        className="w-full h-full object-cover group-hover:scale-105 transition duration-300"
                      />
                    </div>
                  );
                })}

                {/* Add Photo Rounded Box Button */}
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onOpenAddModal();
                  }}
                  className="w-32 h-32 sm:w-36 sm:h-36 rounded-2xl border-2 border-dashed border-stone-200 dark:border-stone-800 flex flex-col items-center justify-center text-stone-400 hover:text-stone-600 hover:border-stone-300 transition flex-shrink-0 bg-stone-50/50 dark:bg-stone-900/50"
                  title="Add photos"
                >
                  <Plus className="w-6 h-6 mb-1 text-stone-400" />
                  <span className="text-[11px] font-medium">
                    {settings.language === 'ko' ? '추가' : settings.language === 'ja' ? '追加' : 'Add'}
                  </span>
                </button>
              </div>

              {/* Special Note Quote (e.g. mazeru "また来たい") */}
              {getPlaceNoteQuote(place, settings.language) && (
                <div className="mt-2.5 inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-stone-100 dark:bg-stone-800 text-xs font-semibold text-stone-700 dark:text-stone-200">
                  <MessageSquareQuote className="w-3.5 h-3.5 text-stone-400" />
                  <span>{getPlaceNoteQuote(place, settings.language)}</span>
                </div>
              )}

              {/* Rating stars if available (e.g. 寿司処ばた八番 4.0, mazeru 3.5) */}
              {place.rating && (
                <div className="mt-2 flex items-center gap-1 text-xs font-bold text-amber-500">
                  <Star className="w-3.5 h-3.5 fill-current" />
                  <span>{place.rating.toFixed(1)}</span>
                </div>
              )}

              {/* Bottom Row: ❤️ 83 Place Name Category */}
              <div className="flex items-center justify-between mt-3 pt-2.5 border-t border-stone-100 dark:border-stone-800/80">
                <div className="flex items-center gap-2.5 min-w-0">
                  {/* Heart like button with counter */}
                  <button
                    onClick={(e) => handleToggleLike(place.id, e)}
                    className="flex items-center gap-1 text-xs font-bold text-rose-500 hover:scale-110 transition active:scale-95 flex-shrink-0"
                  >
                    <Heart className="w-4 h-4 fill-rose-500" />
                    <span>{place.likesCount || 0}</span>
                  </button>

                  {/* Place Name */}
                  <h4 className="text-sm font-extrabold text-stone-900 dark:text-white truncate">
                    {getPlaceName(place, settings.language)}
                  </h4>
                </div>

                {/* Category Badge */}
                <div className="flex items-center gap-1 text-xs font-medium text-stone-500 dark:text-stone-400 flex-shrink-0">
                  <span>{categoryInfo.icon}</span>
                  <span>{categoryInfo.text}</span>
                </div>
              </div>
            </div>
          );
        })}

        {/* 3. DAY SUMMARY & APPLE INTELLIGENCE (Matching Video 00:24 - 00:31) */}
        <div className="bg-white dark:bg-stone-900 rounded-3xl p-5 border border-stone-200/80 dark:border-stone-800/80 shadow-md space-y-4 mt-8">
          {/* Header: 1日のまとめ ⓘ */}
          <div className="flex items-center justify-between">
            <h3 className="text-base font-extrabold text-stone-900 dark:text-white flex items-center gap-1.5">
              <span>{t.timeline.summaryTitle || '1日のまとめ'}</span>
              <Info className="w-4 h-4 text-stone-400 cursor-pointer" />
            </h3>
          </div>

          {/* Memo Input Field: この日のメモ */}
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <input
                type="text"
                value={memoInput}
                onChange={(e) => setMemoInput(e.target.value)}
                onBlur={() => {
                  if (memoInput !== (dayLog.dailyNote || '')) {
                    onUpdateDayLog({
                      ...dayLog,
                      dailyNote: memoInput,
                    });
                  }
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    onUpdateDayLog({
                      ...dayLog,
                      dailyNote: memoInput,
                    });
                  }
                }}
                placeholder={t.timeline.dailyMemoPlaceholder || (settings.language === 'ko' ? '이 날의 하루 메모 남기기...' : 'この日のメモを書く...')}
                className="flex-1 text-xs p-3 rounded-2xl bg-stone-50 dark:bg-stone-800/60 border border-stone-200 dark:border-stone-700/60 text-stone-800 dark:text-stone-200 placeholder:text-stone-400 focus:outline-none focus:ring-2 focus:ring-pink-500"
              />
              {memoInput !== (dayLog.dailyNote || '') && (
                <button
                  type="button"
                  onClick={() => {
                    onUpdateDayLog({
                      ...dayLog,
                      dailyNote: memoInput,
                    });
                  }}
                  className="px-3.5 py-2.5 rounded-2xl bg-pink-500 text-white font-bold text-xs hover:bg-pink-600 transition active:scale-95 flex-shrink-0"
                >
                  {settings.language === 'ko' ? '저장' : '保存'}
                </button>
              )}
            </div>
          </div>

          {/* Daily Note (User's personal note) Display if saved */}
          {dayLog.dailyNote && (
            <div className="bg-stone-50 dark:bg-stone-800/40 rounded-2xl p-3.5 border border-stone-200/60 dark:border-stone-700/60 flex items-start gap-2.5">
              <MessageSquareQuote className="w-4 h-4 text-pink-500 flex-shrink-0 mt-0.5" />
              <div className="flex-1">
                <p className="text-xs text-stone-800 dark:text-stone-200 leading-relaxed font-medium">
                  {dayLog.dailyNote}
                </p>
                <span className="text-[10px] text-stone-400 mt-1 block">
                  {settings.language === 'ko' ? '나의 하루 메모' : 'マイメモ'}
                </span>
              </div>
            </div>
          )}

          {/* Summary Chips (Video Matching): 大分県, カフェ 3か所, ステップ 3か所, レストラン 2か所, 3.2 km, 初めて 12か所 */}
          <div className="flex flex-wrap gap-1.5 pt-1">
            <span className="text-[11px] font-semibold px-3 py-1 rounded-full bg-stone-100 dark:bg-stone-800 text-stone-700 dark:text-stone-300">
              {getDayPrefecture(dayLog.summaryMeta?.prefecture, dayLog.summaryMeta?.prefectureKo, settings.language) || (settings.language === 'ko' ? '오이타현' : '大分県')}
            </span>
            <span className="text-[11px] font-semibold px-3 py-1 rounded-full bg-stone-100 dark:bg-stone-800 text-stone-700 dark:text-stone-300">
              {t.categories.cafe || '카페'} {dayLog.summaryMeta?.cafesCount || 3}{settings.language === 'ko' ? '곳' : 'か所'}
            </span>
            <span className="text-[11px] font-semibold px-3 py-1 rounded-full bg-stone-100 dark:bg-stone-800 text-stone-700 dark:text-stone-300">
              {t.categories.step || '산책로'} {dayLog.summaryMeta?.stepsCount || 3}{settings.language === 'ko' ? '곳' : 'か所'}
            </span>
            <span className="text-[11px] font-semibold px-3 py-1 rounded-full bg-stone-100 dark:bg-stone-800 text-stone-700 dark:text-stone-300">
              {t.categories.restaurant || '레스토랑'} {dayLog.summaryMeta?.restaurantsCount || 2}{settings.language === 'ko' ? '곳' : 'か所'}
            </span>
            <span className="text-[11px] font-semibold px-3 py-1 rounded-full bg-stone-100 dark:bg-stone-800 text-stone-700 dark:text-stone-300">
              {movementKm} km
            </span>
            <span className="text-[11px] font-semibold px-3 py-1 rounded-full bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 border border-amber-200/60 dark:border-amber-900/60">
              {settings.language === 'ko' ? '처음' : '初めて'} {dayLog.summaryMeta?.firstVisitCount || 12}{settings.language === 'ko' ? '곳' : 'か所'}
            </span>
          </div>

          {/* 3 Mini Bottom Cards (Matching Video 00:30): [メモリー] [概要] [地図] */}
          <div className="grid grid-cols-3 gap-2 pt-2">
            <button
              onClick={() => setActiveBottomCard('memory')}
              className={`py-2.5 px-2 rounded-2xl text-xs font-bold text-center border transition ${
                activeBottomCard === 'memory'
                  ? 'bg-pink-50 dark:bg-pink-950/60 border-pink-300 dark:border-pink-800 text-pink-600 dark:text-pink-400'
                  : 'bg-stone-50 dark:bg-stone-800/60 border-stone-200/60 dark:border-stone-700/60 text-stone-600 dark:text-stone-400'
              }`}
            >
              {t.timeline.cards?.memory || 'メモリー'}
            </button>

            <button
              onClick={() => setActiveBottomCard('overview')}
              className={`py-2.5 px-2 rounded-2xl text-xs font-bold text-center border transition ${
                activeBottomCard === 'overview'
                  ? 'bg-pink-50 dark:bg-pink-950/60 border-pink-300 dark:border-pink-800 text-pink-600 dark:text-pink-400'
                  : 'bg-stone-50 dark:bg-stone-800/60 border-stone-200/60 dark:border-stone-700/60 text-stone-600 dark:text-stone-400'
              }`}
            >
              {t.timeline.cards?.overview || '概要'}
            </button>

            <button
              onClick={() => setActiveBottomCard('map')}
              className={`py-2.5 px-2 rounded-2xl text-xs font-bold text-center border transition ${
                activeBottomCard === 'map'
                  ? 'bg-pink-50 dark:bg-pink-950/60 border-pink-300 dark:border-pink-800 text-pink-600 dark:text-pink-400'
                  : 'bg-stone-50 dark:bg-stone-800/60 border-stone-200/60 dark:border-stone-700/60 text-stone-600 dark:text-stone-400'
              }`}
            >
              {t.timeline.cards?.map || '地図'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
