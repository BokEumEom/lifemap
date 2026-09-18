import { Language, PlaceLog, DayLog, PhotoItem } from '../types';

export function getPlaceName(
  place?: { id?: string; name: string; nameKo?: string; nameJa?: string; nameEn?: string } | null,
  lang: Language = 'ko'
): string {
  if (!place) return '';
  if (lang === 'ko') {
    return place.nameKo || place.name || '';
  }
  if (lang === 'ja') {
    return place.nameJa || place.name || '';
  }
  if (lang === 'en') {
    return place.nameEn || place.name || '';
  }
  return place.nameKo || place.name || '';
}

export function getPlaceAddress(
  place?: { address?: string; addressKo?: string; addressJa?: string; addressEn?: string } | null,
  lang: Language = 'ko'
): string {
  if (!place) return '';
  if (lang === 'ko') {
    return place.addressKo || place.address || '';
  }
  if (lang === 'ja') {
    return place.addressJa || place.address || '';
  }
  if (lang === 'en') {
    return place.addressEn || place.address || '';
  }
  return place.addressKo || place.address || '';
}

export function getPlaceNote(
  place?: { note?: string; noteKo?: string; noteJa?: string; noteEn?: string } | null,
  lang: Language = 'ko'
): string {
  if (!place) return '';
  if (lang === 'ko') {
    return place.noteKo || place.note || '';
  }
  if (lang === 'ja') {
    return place.noteJa || place.note || '';
  }
  if (lang === 'en') {
    return place.noteEn || place.note || '';
  }
  return place.noteKo || place.note || '';
}

export function getPlaceNoteQuote(
  place?: { noteQuote?: string; noteQuoteKo?: string; noteQuoteJa?: string; noteQuoteEn?: string } | null,
  lang: Language = 'ko'
): string | undefined {
  if (!place) return undefined;
  if (lang === 'ko') {
    return place.noteQuoteKo || place.noteQuote;
  }
  if (lang === 'ja') {
    return place.noteQuoteJa || place.noteQuote;
  }
  if (lang === 'en') {
    return place.noteQuoteEn || place.noteQuote;
  }
  return place.noteQuoteKo || place.noteQuote;
}

export function getDayTitle(
  day?: { title?: string; titleKo?: string; titleJa?: string; titleEn?: string; date: string } | null,
  lang: Language = 'ko'
): string {
  if (!day) return '';
  if (lang === 'ko') {
    return day.titleKo || day.title || day.date || '';
  }
  if (lang === 'ja') {
    return day.titleJa || day.title || day.date || '';
  }
  if (lang === 'en') {
    return day.titleEn || day.title || day.date || '';
  }
  return day.titleKo || day.title || day.date || '';
}

export function getDayDailyNote(
  day?: { dailyNote?: string; dailyNoteKo?: string; dailyNoteJa?: string } | null,
  lang: Language = 'ko'
): string {
  if (!day) return '';
  if (lang === 'ko') {
    return day.dailyNoteKo || day.dailyNote || '';
  }
  if (lang === 'ja') {
    return day.dailyNoteJa || day.dailyNote || '';
  }
  return day.dailyNote || day.dailyNoteKo || '';
}

export function getDayPrefecture(
  prefecture?: string,
  prefectureKo?: string,
  lang: Language = 'ko',
  prefectureJa?: string
): string {
  if (lang === 'ko') return prefectureKo || prefecture || '';
  if (lang === 'ja') return prefectureJa || prefecture || '';
  return prefecture || prefectureKo || '';
}

export function getPhotoCaption(photo: PhotoItem, lang: Language = 'ko', fallback?: string): string {
  if (lang === 'ko' && photo.captionKo) return photo.captionKo;
  if (lang === 'en' && photo.captionEn) return photo.captionEn;
  return photo.caption || fallback || '';
}

export function getWeatherDesc(
  weather?: { descJa?: string; descKo?: string; descEn?: string } | null,
  lang: Language = 'ko'
): string {
  if (!weather) return '';
  if (lang === 'ko') return weather.descKo || weather.descEn || '';
  if (lang === 'ja') return weather.descJa || weather.descEn || '';
  return weather.descEn || weather.descKo || '';
}

export function getAiRecap(
  dayLog?: DayLog | null,
  lang: Language = 'ko'
): { recap: string; mood: string; highlight: string } {
  if (!dayLog?.aiRecap) {
    return { recap: '', mood: '', highlight: '' };
  }
  const ar = dayLog.aiRecap;
  if (lang === 'ko') {
    return {
      recap: ar.recapKo || ar.recap || '',
      mood: ar.moodKo || ar.mood || '',
      highlight: ar.highlightKo || ar.highlight || '',
    };
  }
  if (lang === 'ja') {
    return {
      recap: ar.recapJa || ar.recap || '',
      mood: ar.moodJa || ar.mood || '',
      highlight: ar.highlightJa || ar.highlight || '',
    };
  }
  return {
    recap: ar.recapEn || ar.recap || '',
    mood: ar.moodEn || ar.mood || '',
    highlight: ar.highlightEn || ar.highlight || '',
  };
}

export function formatDayStatsSummary(placeCount: number, photoCount: number, distanceKm: number, lang: Language = 'ko'): string {
  if (lang === 'ko') {
    return `${placeCount}곳 · 사진 ${photoCount}장 · ${distanceKm} km`;
  }
  if (lang === 'en') {
    return `${placeCount} ${placeCount === 1 ? 'place' : 'places'} · ${photoCount} ${photoCount === 1 ? 'photo' : 'photos'} · ${distanceKm} km`;
  }
  return `${placeCount}ヶ所 · 写真${photoCount}枚 · ${distanceKm} km`;
}
