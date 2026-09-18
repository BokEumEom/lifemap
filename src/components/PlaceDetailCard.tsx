import React, { useState } from 'react';
import {
  X,
  Heart,
  Clock,
  MapPin,
  Calendar,
  CloudSun,
  Camera,
  Trash2,
  Check,
  Star,
  Plus,
  MessageSquareQuote,
  ChevronLeft,
  ChevronRight,
  ChevronUp,
  ChevronDown,
  Crosshair,
  Maximize2,
  Minimize2,
} from 'lucide-react';
import { PlaceLog, AppSettings } from '../types';
import { translations } from '../i18n/translations';
import { PALETTES } from '../utils/geoUtils';
import { getPlaceName, getPlaceAddress, getPlaceNote, getPlaceNoteQuote } from '../utils/localeUtils';

interface PlaceDetailCardProps {
  place: PlaceLog;
  settings: AppSettings;
  onClose: () => void;
  onUpdatePlace: (updated: PlaceLog) => void;
  onDeletePlace: (id: string) => void;
  onSelectPhoto: (url: string, caption?: string) => void;
  onPrevPlace?: () => void;
  onNextPlace?: () => void;
  onCenterMap?: () => void;
  currentIndex?: number;
  totalPlaces?: number;
}

export const PlaceDetailCard: React.FC<PlaceDetailCardProps> = ({
  place,
  settings,
  onClose,
  onUpdatePlace,
  onDeletePlace,
  onSelectPhoto,
  onPrevPlace,
  onNextPlace,
  onCenterMap,
  currentIndex,
  totalPlaces,
}) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [isEditingNote, setIsEditingNote] = useState(false);
  const [noteText, setNoteText] = useState(place.noteKo || place.note || '');
  const [newPhotoUrl, setNewPhotoUrl] = useState('');
  const [showAddPhotoInput, setShowAddPhotoInput] = useState(false);

  const t = translations[settings.language];
  const activePalette = PALETTES[settings.colorTheme] || PALETTES.magenta;

  const displayName = getPlaceName(place, settings.language);
  const displayAddress = getPlaceAddress(place, settings.language);
  const displayNote = getPlaceNote(place, settings.language);
  const displayQuote = getPlaceNoteQuote(place, settings.language);

  const safePhotos = Array.isArray(place.photos) ? place.photos : [];

  const handleToggleFavorite = () => {
    onUpdatePlace({ ...place, isFavorite: !place.isFavorite });
  };

  const handleIncrementLikes = () => {
    onUpdatePlace({ ...place, likesCount: (place.likesCount || 0) + 1 });
  };

  const handleSaveNote = () => {
    if (settings.language === 'ko') {
      onUpdatePlace({ ...place, noteKo: noteText, note: place.note || noteText });
    } else {
      onUpdatePlace({ ...place, note: noteText });
    }
    setIsEditingNote(false);
  };

  const handleSetCoverPhoto = (photoUrl: string) => {
    onUpdatePlace({
      ...place,
      coverPhotoUrl: photoUrl,
      photos: safePhotos.map((p) => ({
        ...p,
        isCover: p.url === photoUrl,
      })),
    });
  };

  const handleDeletePhoto = (photoId: string) => {
    const updatedPhotos = safePhotos.filter((p) => p.id !== photoId);
    let updatedCover = place.coverPhotoUrl;
    if (place.coverPhotoUrl && !updatedPhotos.some((p) => p.url === place.coverPhotoUrl)) {
      updatedCover = updatedPhotos[0]?.url;
    }
    onUpdatePlace({
      ...place,
      photos: updatedPhotos,
      coverPhotoUrl: updatedCover,
    });
  };

  const handleAddPhotoSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPhotoUrl.trim()) return;
    const newPhoto = {
      id: `photo-${Date.now()}`,
      url: newPhotoUrl.trim(),
      caption: displayName,
      captionKo: displayName,
      isCover: safePhotos.length === 0,
    };
    onUpdatePlace({
      ...place,
      photos: [...safePhotos, newPhoto],
      coverPhotoUrl: safePhotos.length === 0 ? newPhoto.url : place.coverPhotoUrl,
    });
    setNewPhotoUrl('');
    setShowAddPhotoInput(false);
  };

  const formatDuration = (mins: number) => {
    if (mins < 60) {
      return settings.language === 'ko' ? `${mins}분` : `${mins}m`;
    }
    const h = Math.floor(mins / 60);
    const m = mins % 60;
    if (settings.language === 'ko') {
      return m > 0 ? `${h}시간 ${m}분` : `${h}시간`;
    }
    return m > 0 ? `${h}h ${m}m` : `${h}h`;
  };

  const weatherDesc =
    settings.language === 'ja'
      ? place.weather?.descJa || place.weather?.descKo
      : settings.language === 'ko'
      ? place.weather?.descKo || place.weather?.descJa
      : place.weather?.descEn;

  return (
    <div
      id="place-detail-card"
      className={`bg-white/98 dark:bg-stone-900/98 backdrop-blur-xl border border-stone-200/90 dark:border-stone-800/90 rounded-t-[28px] shadow-2xl overflow-hidden transition-all duration-300 flex flex-col w-full ${
        isExpanded ? 'max-h-[85vh]' : 'max-h-[50vh] sm:max-h-[54vh]'
      }`}
    >
      {/* Mobile Drag Handle Bar */}
      <button
        type="button"
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full py-2 flex items-center justify-center cursor-pointer group active:opacity-60 focus:outline-none"
        title={isExpanded ? (settings.language === 'ko' ? '지도 함께 보기 (접기)' : 'Collapse') : (settings.language === 'ko' ? '상세 전체 보기 (펼치기)' : 'Expand')}
      >
        <div className="w-12 h-1.5 bg-stone-300 dark:bg-stone-600 rounded-full group-hover:bg-stone-400 dark:group-hover:bg-stone-500 transition" />
      </button>

      {/* Header Bar */}
      <div className="flex items-center justify-between px-4 pb-2.5 pt-0 border-b border-stone-100 dark:border-stone-800 flex-shrink-0">
        <div className="flex items-center gap-1.5 min-w-0">
          <span
            className="text-[11px] font-bold px-2.5 py-0.5 rounded-full uppercase tracking-wider text-white flex-shrink-0"
            style={{ backgroundColor: activePalette.primary || '#FF2D55' }}
          >
            {t.categories[place.category] || place.category}
          </span>
          {place.isFirstVisit && (
            <span className="text-[10px] font-bold bg-pink-50 dark:bg-pink-950/60 text-pink-600 dark:text-pink-400 px-2 py-0.5 rounded-full flex-shrink-0">
              {t.timeline.firstVisitBadge || (settings.language === 'ko' ? '처음' : '初めて')}
            </span>
          )}
          {typeof currentIndex === 'number' && typeof totalPlaces === 'number' && (
            <span className="text-[10px] font-mono text-stone-400 dark:text-stone-500 flex-shrink-0">
              {currentIndex + 1}/{totalPlaces}
            </span>
          )}
        </div>

        <div className="flex items-center gap-1 flex-shrink-0">
          {/* Previous / Next Place navigation buttons */}
          {onPrevPlace && onNextPlace && (
            <div className="flex items-center gap-0.5 bg-stone-100 dark:bg-stone-800/80 rounded-full p-0.5 mr-0.5">
              <button
                type="button"
                onClick={onPrevPlace}
                className="w-6 h-6 rounded-full flex items-center justify-center text-stone-600 dark:text-stone-300 hover:bg-white dark:hover:bg-stone-700 transition active:scale-95"
                title={settings.language === 'ko' ? '이전 장소' : '前の場所'}
              >
                <ChevronLeft className="w-3.5 h-3.5" />
              </button>
              <button
                type="button"
                onClick={onNextPlace}
                className="w-6 h-6 rounded-full flex items-center justify-center text-stone-600 dark:text-stone-300 hover:bg-white dark:hover:bg-stone-700 transition active:scale-95"
                title={settings.language === 'ko' ? '다음 장소' : '次の場所'}
              >
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>
          )}

          {/* Center on map button */}
          {onCenterMap && (
            <button
              type="button"
              onClick={onCenterMap}
              className="w-7 h-7 rounded-full flex items-center justify-center text-stone-500 hover:text-pink-600 dark:hover:text-pink-400 bg-stone-100 dark:bg-stone-800 transition active:scale-95"
              title={settings.language === 'ko' ? '지도 중앙에 표시' : '地図で確認'}
            >
              <Crosshair className="w-3.5 h-3.5" />
            </button>
          )}

          {/* Expand/Collapse Mode Toggle */}
          <button
            type="button"
            onClick={() => setIsExpanded(!isExpanded)}
            className="w-7 h-7 rounded-full flex items-center justify-center text-stone-500 hover:text-stone-800 dark:hover:text-stone-200 bg-stone-100 dark:bg-stone-800 transition active:scale-95"
            title={isExpanded ? (settings.language === 'ko' ? '지도 더 보기 (축소)' : 'Collapse to peek') : (settings.language === 'ko' ? '상세 전체 보기 (확대)' : 'Expand full details')}
          >
            {isExpanded ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}
          </button>

          {/* Close button */}
          <button
            type="button"
            id="btn-place-close"
            onClick={onClose}
            className="w-7 h-7 rounded-full flex items-center justify-center text-stone-400 hover:text-stone-700 dark:hover:text-stone-200 hover:bg-stone-100 dark:hover:bg-stone-800 transition active:scale-95"
            title={settings.language === 'ko' ? '닫기' : 'Close'}
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Content scroll area */}
      <div className="p-4 overflow-y-auto space-y-3.5 flex-1">
        {/* Title and Quick Reaction (Likes & Favorite) */}
        <div>
          <div className="flex items-start justify-between gap-2">
            <div>
              <h3 className="text-base sm:text-lg font-black text-stone-900 dark:text-white leading-snug">
                {displayName}
              </h3>
              {place.rating && (
                <div className="mt-1 inline-flex items-center gap-1 text-xs font-bold text-amber-500 bg-amber-50 dark:bg-amber-950/40 px-2 py-0.5 rounded-full">
                  <Star className="w-3 h-3 fill-current" />
                  <span>{place.rating.toFixed(1)}</span>
                </div>
              )}
            </div>

            {/* Reactions: Likes & Favorite Star */}
            <div className="flex items-center gap-1.5 flex-shrink-0">
              <button
                type="button"
                onClick={handleIncrementLikes}
                className="flex items-center gap-1 text-xs font-bold text-rose-500 hover:scale-105 transition active:scale-95 px-2.5 py-1 rounded-full bg-rose-50 dark:bg-rose-950/40"
                title={settings.language === 'ko' ? '좋아요' : 'Like'}
              >
                <Heart className="w-3.5 h-3.5 fill-rose-500" />
                <span>{place.likesCount || 0}</span>
              </button>

              <button
                type="button"
                id="btn-place-favorite"
                onClick={handleToggleFavorite}
                className={`w-7 h-7 rounded-full flex items-center justify-center transition active:scale-95 ${
                  place.isFavorite
                    ? 'text-amber-500 bg-amber-50 dark:bg-amber-950/50'
                    : 'text-stone-400 hover:text-stone-600 dark:hover:text-stone-300 bg-stone-100 dark:bg-stone-800'
                }`}
                title={t.placeDetail.favorite}
              >
                <Star className={`w-3.5 h-3.5 ${place.isFavorite ? 'fill-current' : ''}`} />
              </button>
            </div>
          </div>

          {displayQuote && (
            <div className="mt-2 inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-stone-100 dark:bg-stone-800 text-xs font-semibold text-stone-700 dark:text-stone-200">
              <MessageSquareQuote className="w-3.5 h-3.5 text-stone-400" />
              <span>{displayQuote}</span>
            </div>
          )}

          <div className="flex flex-wrap items-center gap-2.5 mt-2.5 text-xs text-stone-500 dark:text-stone-400">
            <div className="flex items-center gap-1">
              <Clock className="w-3.5 h-3.5 text-stone-400" />
              <span>
                {place.arrivalTime} ~ {place.departureTime || place.arrivalTime} ({formatDuration(place.durationMinutes || 15)})
              </span>
            </div>

            {place.weather && (
              <div className="flex items-center gap-1 bg-stone-100 dark:bg-stone-800 px-2 py-0.5 rounded-full">
                <CloudSun className="w-3.5 h-3.5 text-amber-500" />
                <span>
                  {place.weather.tempC}°C {weatherDesc ? `· ${weatherDesc}` : ''}
                </span>
              </div>
            )}
          </div>

          {displayAddress && (
            <p className="text-[11px] text-stone-400 dark:text-stone-500 mt-1.5 flex items-center gap-1">
              <MapPin className="w-3 h-3 flex-shrink-0" />
              <span className="truncate">{displayAddress}</span>
            </p>
          )}

          {/* Quick Expand/Collapse Mode Banner */}
          <div className="mt-2.5">
            {!isExpanded ? (
              <button
                type="button"
                onClick={() => setIsExpanded(true)}
                className="w-full py-1.5 px-3 rounded-xl bg-pink-50 dark:bg-pink-950/40 text-pink-600 dark:text-pink-400 font-bold text-[11px] flex items-center justify-center gap-1.5 hover:bg-pink-100 dark:hover:bg-pink-950/60 transition active:scale-[0.99]"
              >
                <span>{settings.language === 'ko' ? '상세 메모 및 사진 전체 보기' : 'View full notes & photos'}</span>
                <ChevronUp className="w-3 h-3" />
              </button>
            ) : (
              <button
                type="button"
                onClick={() => setIsExpanded(false)}
                className="w-full py-1.5 px-3 rounded-xl bg-stone-100 dark:bg-stone-800 text-stone-600 dark:text-stone-300 font-medium text-[11px] flex items-center justify-center gap-1.5 hover:bg-stone-200 dark:hover:bg-stone-700 transition"
              >
                <span>{settings.language === 'ko' ? '지도 함께 보기 (축소)' : 'Show map (collapse)'}</span>
                <ChevronDown className="w-3 h-3" />
              </button>
            )}
          </div>
        </div>

        {/* Photos Grid & Carousel */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold text-stone-700 dark:text-stone-300 flex items-center gap-1">
              <Camera className="w-3.5 h-3.5" />
              {t.placeDetail.photos} ({safePhotos.length})
            </span>
            <button
              onClick={() => setShowAddPhotoInput(!showAddPhotoInput)}
              className="text-xs text-pink-600 dark:text-pink-400 font-semibold hover:underline flex items-center gap-0.5"
            >
              <Plus className="w-3 h-3" />
              {t.placeDetail.addPhoto}
            </button>
          </div>

          {showAddPhotoInput && (
            <form onSubmit={handleAddPhotoSubmit} className="mb-3 flex gap-2">
              <input
                type="url"
                value={newPhotoUrl}
                onChange={(e) => setNewPhotoUrl(e.target.value)}
                placeholder="https://images.unsplash.com/..."
                className="flex-1 text-xs px-2.5 py-1.5 rounded-lg border border-stone-300 dark:border-stone-700 bg-stone-50 dark:bg-stone-800 text-stone-900 dark:text-stone-100 focus:outline-none focus:ring-1 focus:ring-pink-500"
              />
              <button
                type="submit"
                className="text-xs px-3 py-1.5 bg-pink-600 text-white rounded-lg font-medium hover:bg-pink-700 transition"
              >
                {t.placeDetail.save}
              </button>
            </form>
          )}

          {safePhotos.length > 0 ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {safePhotos.map((photo) => {
                const isCover = photo.url === (place.coverPhotoUrl || safePhotos[0]?.url);
                return (
                  <div
                    key={photo.id}
                    className="relative group rounded-2xl overflow-hidden aspect-video bg-stone-100 dark:bg-stone-800 cursor-pointer shadow-xs border border-stone-200/50 dark:border-stone-700/50"
                  >
                    <img
                      src={photo.url}
                      alt={photo.captionKo || photo.caption || displayName}
                      referrerPolicy="no-referrer"
                      onClick={() => onSelectPhoto(photo.url, photo.captionKo || photo.caption || displayName)}
                      className="w-full h-full object-cover transition duration-300 group-hover:scale-105"
                    />

                    {/* Cover badge */}
                    {isCover && (
                      <span className="absolute top-1.5 left-1.5 bg-black/70 backdrop-blur-sm text-white text-[9px] font-semibold px-1.5 py-0.5 rounded-md flex items-center gap-0.5">
                        <Star className="w-2.5 h-2.5 fill-amber-400 text-amber-400" />
                        {t.placeDetail.isCover}
                      </span>
                    )}

                    {/* Action overlay on hover */}
                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-1.5 p-1">
                      {!isCover && (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleSetCoverPhoto(photo.url);
                          }}
                          className="bg-white/90 dark:bg-stone-900/90 text-stone-900 dark:text-stone-100 text-[10px] font-medium px-2 py-1 rounded shadow hover:bg-white"
                        >
                          {t.placeDetail.setCover}
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeletePhoto(photo.id);
                        }}
                        className="p-1 rounded bg-rose-600 text-white hover:bg-rose-700 shadow"
                        title={t.placeDetail.deletePhoto}
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="text-center py-6 bg-stone-50 dark:bg-stone-800/40 rounded-2xl border border-dashed border-stone-200 dark:border-stone-800 text-stone-400 text-xs">
              {t.placeDetail.photos}: 0
            </div>
          )}
        </div>

        {/* Notes / Reflection */}
        <div className="bg-stone-50 dark:bg-stone-800/60 rounded-2xl p-3.5 border border-stone-200/50 dark:border-stone-700/50">
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-xs font-bold text-stone-700 dark:text-stone-300">
              {t.placeDetail.memo}
            </span>
            <button
              onClick={() => {
                if (isEditingNote) {
                  handleSaveNote();
                } else {
                  setNoteText(displayNote);
                  setIsEditingNote(true);
                }
              }}
              className="text-xs text-pink-600 dark:text-pink-400 font-semibold hover:underline"
            >
              {isEditingNote ? t.placeDetail.save : t.placeDetail.editMemo}
            </button>
          </div>

          {isEditingNote ? (
            <div className="space-y-2">
              <textarea
                value={noteText}
                onChange={(e) => setNoteText(e.target.value)}
                rows={3}
                className="w-full text-xs p-2.5 rounded-xl bg-white dark:bg-stone-900 border border-stone-300 dark:border-stone-700 text-stone-800 dark:text-stone-200 focus:outline-none focus:ring-1 focus:ring-pink-500"
              />
              <div className="flex justify-end">
                <button
                  onClick={handleSaveNote}
                  className="px-3 py-1 bg-pink-600 text-white text-xs font-semibold rounded-lg hover:bg-pink-700 transition"
                >
                  {t.placeDetail.save}
                </button>
              </div>
            </div>
          ) : (
            <p className="text-xs text-stone-600 dark:text-stone-300 leading-relaxed whitespace-pre-wrap">
              {displayNote || (
                <span className="text-stone-400 italic">
                  {settings.language === 'ja'
                    ? 'メモはありません。'
                    : settings.language === 'ko'
                    ? '남겨진 메모가 없습니다.'
                    : 'No notes added.'}
                </span>
              )}
            </p>
          )}
        </div>
      </div>

      {/* Footer Actions */}
      <div className="p-3 border-t border-stone-100 dark:border-stone-800 bg-stone-50/50 dark:bg-stone-900/50 flex items-center justify-between flex-shrink-0">
        <button
          onClick={() => {
            if (window.confirm(t.placeDetail.deleteConfirm)) {
              onDeletePlace(place.id);
            }
          }}
          className="text-xs text-rose-500 hover:text-rose-700 dark:hover:text-rose-400 flex items-center gap-1 px-2 py-1 rounded transition font-medium"
        >
          <Trash2 className="w-3.5 h-3.5" />
          <span>{t.placeDetail.deletePlace}</span>
        </button>

        <button
          onClick={onClose}
          className="px-4 py-1.5 text-xs font-bold bg-stone-200 dark:bg-stone-800 hover:bg-stone-300 dark:hover:bg-stone-700 text-stone-800 dark:text-stone-200 rounded-xl transition"
        >
          {t.placeDetail.close}
        </button>
      </div>
    </div>
  );
};

