import React, { useState, useMemo } from 'react';
import { Search, X, MapPin, Calendar, ArrowRight } from 'lucide-react';
import { DayLog, PlaceLog, AppSettings } from '../types';
import { translations, formatDayTitle } from '../i18n/translations';

interface SearchModalProps {
  isOpen: boolean;
  onClose: () => void;
  days: Record<string, DayLog>;
  settings: AppSettings;
  onSelectPlaceResult: (date: string, placeId: string) => void;
}

export const SearchModal: React.FC<SearchModalProps> = ({
  isOpen,
  onClose,
  days,
  settings,
  onSelectPlaceResult,
}) => {
  const [query, setQuery] = useState('');
  const [selectedFilter, setSelectedFilter] = useState<string>('all');

  const t = translations[settings.language];

  // Aggregate all places across all recorded days
  const allPlaces = useMemo(() => {
    const list: { date: string; place: PlaceLog }[] = [];
    (Object.values(days) as DayLog[]).forEach((dayLog) => {
      if (dayLog && Array.isArray(dayLog.places)) {
        dayLog.places.forEach((place) => {
          list.push({ date: dayLog.date, place });
        });
      }
    });
    return list;
  }, [days]);

  // Filtered results
  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return allPlaces.filter(({ date, place }) => {
      // Category filter
      if (selectedFilter !== 'all' && place.category !== selectedFilter) {
        return false;
      }
      if (!q) return true;
      const matchName = place.name.toLowerCase().includes(q) || (place.nameEn && place.nameEn.toLowerCase().includes(q));
      const matchNote = place.note && place.note.toLowerCase().includes(q);
      const matchAddr = place.address && place.address.toLowerCase().includes(q);
      const matchDate = date.includes(q);
      return matchName || matchNote || matchAddr || matchDate;
    });
  }, [allPlaces, query, selectedFilter]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-12 sm:pt-20 px-4 bg-black/40 backdrop-blur-sm animate-in fade-in duration-150">
      <div className="w-full max-w-lg bg-white dark:bg-stone-900 rounded-3xl shadow-2xl border border-stone-200 dark:border-stone-800 overflow-hidden flex flex-col max-h-[80vh]">
        {/* Search Input Bar */}
        <div className="flex items-center gap-3 p-4 border-b border-stone-100 dark:border-stone-800">
          <Search className="w-5 h-5 text-stone-400" />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={settings.language === 'ja' ? '場所、メモ、日付を検索...' : settings.language === 'ko' ? '장소, 메모, 날짜 검색...' : 'Search spots, notes, dates...'}
            autoFocus
            className="flex-1 bg-transparent text-sm font-medium text-stone-900 dark:text-stone-100 placeholder:text-stone-400 focus:outline-none"
          />
          {query && (
            <button
              onClick={() => setQuery('')}
              className="p-1 rounded-full text-stone-400 hover:bg-stone-100 dark:hover:bg-stone-800"
            >
              <X className="w-4 h-4" />
            </button>
          )}
          <button
            onClick={onClose}
            className="px-2.5 py-1 text-xs font-semibold text-stone-500 hover:text-stone-800 dark:hover:text-stone-200 transition"
          >
            {settings.language === 'ja' ? '閉じる' : settings.language === 'ko' ? '닫기' : 'Cancel'}
          </button>
        </div>

        {/* Quick Filter Chips */}
        <div className="flex items-center gap-1.5 p-3 overflow-x-auto no-scrollbar border-b border-stone-100 dark:border-stone-800 bg-stone-50/50 dark:bg-stone-950/40">
          {[
            { id: 'all', label: settings.language === 'ja' ? 'すべて' : settings.language === 'ko' ? '전체' : 'All' },
            { id: 'cafe', label: t.categories.cafe },
            { id: 'restaurant', label: t.categories.restaurant },
            { id: 'culture', label: t.categories.culture },
            { id: 'step', label: t.categories.step },
            { id: 'shrine_temple', label: t.categories.shrine_temple },
          ].map((chip) => (
            <button
              key={chip.id}
              onClick={() => setSelectedFilter(chip.id)}
              className={`text-xs px-3 py-1 rounded-full font-medium whitespace-nowrap transition ${
                selectedFilter === chip.id
                  ? 'bg-stone-900 dark:bg-stone-100 text-white dark:text-stone-900 font-semibold'
                  : 'bg-white dark:bg-stone-800 text-stone-600 dark:text-stone-300 border border-stone-200/60 dark:border-stone-700/60 hover:bg-stone-100'
              }`}
            >
              {chip.label}
            </button>
          ))}
        </div>

        {/* Results List */}
        <div className="flex-1 overflow-y-auto p-2 space-y-1 divide-y divide-stone-100 dark:divide-stone-800/60">
          {filtered.length === 0 ? (
            <div className="py-12 text-center text-stone-400 dark:text-stone-500 text-xs">
              {settings.language === 'ja' ? '一致する場所が見つかりませんでした。' : settings.language === 'ko' ? '검색 결과가 없습니다.' : 'No matching spots found.'}
            </div>
          ) : (
            filtered.map(({ date, place }) => {
              const cover = place.coverPhotoUrl || place.photos?.[0]?.url;
              return (
                <div
                  key={`${date}-${place.id}`}
                  onClick={() => {
                    onSelectPlaceResult(date, place.id);
                    onClose();
                  }}
                  className="flex items-center justify-between p-2.5 rounded-2xl hover:bg-stone-50 dark:hover:bg-stone-800/60 transition cursor-pointer group"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    {cover ? (
                      <img
                        src={cover}
                        alt={place.name}
                        className="w-11 h-11 rounded-xl object-cover flex-shrink-0 bg-stone-200 dark:bg-stone-800 shadow-sm"
                      />
                    ) : (
                      <div className="w-11 h-11 rounded-xl bg-stone-100 dark:bg-stone-800 flex items-center justify-center text-stone-400 flex-shrink-0">
                        <MapPin className="w-5 h-5" />
                      </div>
                    )}
                    <div className="min-w-0">
                      <h4 className="text-xs font-bold text-stone-900 dark:text-stone-100 truncate group-hover:text-pink-600 transition">
                        {place.name}
                      </h4>
                      <p className="text-[11px] text-stone-400 dark:text-stone-500 truncate flex items-center gap-1.5 mt-0.5">
                        <Calendar className="w-3 h-3" />
                        <span>{formatDayTitle(date, settings.language)}</span>
                        <span>·</span>
                        <span>{place.arrivalTime}</span>
                      </p>
                    </div>
                  </div>

                  <ArrowRight className="w-4 h-4 text-stone-300 dark:text-stone-600 group-hover:text-stone-700 dark:group-hover:text-stone-200 transition group-hover:translate-x-0.5 flex-shrink-0" />
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
};
