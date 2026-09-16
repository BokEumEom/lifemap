import { Language, PlaceLog, DayLog, PhotoItem } from '../types';

const FALLBACK_KO_NAMES: Record<string, string> = {
  'place-oita-1': '성 프란치스코 하비에르 동상',
  '聖フランシスコザビエル像': '성 프란치스코 하비에르 동상',
  'place-oita-2': '카페 드 BGM',
  'カフェ・ド BGM': '카페 드 BGM',
  'place-oita-3': '고코도 (오향당)',
  '五香堂': '고코도 (오향당)',
  'place-oita-4': '니코 도넛 타케니시 테라스점',
  'nico ドーナツ 竹西テラス店': '니코 도넛 타케니시 테라스점',
  'place-oita-5': '오이타시 주오마치 골목길',
  '大分市中央町3丁目5-15': '오이타시 주오마치 골목길',
  '中央町2丁目': '오이타시 주오마치 2초메',
  'place-oita-6': '오이타 아트 플라자 (이소자키 아라타)',
  'アートプラザ': '오이타 아트 플라자 (이소자키 아라타)',
  'place-oita-7': '마제루 (스프 카레 & 바)',
  'mazeru': '마제루 (스프 카레 & 바)',
  'place-oita-8': '오이타 은행 빨간 벽돌관',
  '大分銀行 赤レンガ館': '오이타 은행 빨간 벽돌관',
  'place-oita-9': '후나이 아쿠아 파크',
  'ふないアクアパーク': '후나이 아쿠아 파크',
  'place-oita-10': '도토루 커피 오이타 중앙점',
  'ドトールコーヒーショップ 大分中央町店': '도토루 커피 오이타 중앙점',
  'place-oita-11': '아케무 레코드 & 카페',
  'Akemu Records & Cafe': '아케무 레코드 & 카페',
  'place-oita-12': 'JR 오이타역 시계탑 앞',
  '大分駅 府内中央口 (北口)': 'JR 오이타역 시계탑 앞',
  '大分市街地 散策 & アートプラザ・カフェ巡り': '오이타 도심 산책 & 아트 플라자·카페 투어',
};

export function getPlaceName(place?: { id?: string; name: string; nameKo?: string; nameEn?: string } | null, lang?: Language): string {
  if (!place) return '';
  if (lang === 'ko') {
    if (place.nameKo) return place.nameKo;
    if (place.id && FALLBACK_KO_NAMES[place.id]) return FALLBACK_KO_NAMES[place.id];
    if (place.name && FALLBACK_KO_NAMES[place.name]) return FALLBACK_KO_NAMES[place.name];
  }
  if (lang === 'en' && place.nameEn) return place.nameEn;
  return place.name || '';
}

export function getPlaceAddress(place?: { address?: string; addressKo?: string; addressEn?: string } | null, lang?: Language): string {
  if (!place) return '';
  if (lang === 'ko' && place.addressKo) return place.addressKo;
  if (lang === 'en' && place.addressEn) return place.addressEn;
  return place.address || '';
}

export function getPlaceNote(place?: { note?: string; noteKo?: string; noteEn?: string } | null, lang?: Language): string {
  if (!place) return '';
  if (lang === 'ko' && place.noteKo) return place.noteKo;
  if (lang === 'en' && place.noteEn) return place.noteEn;
  return place.note || '';
}

export function getPlaceNoteQuote(place?: { noteQuote?: string; noteQuoteKo?: string; noteQuoteEn?: string } | null, lang?: Language): string | undefined {
  if (!place) return undefined;
  if (lang === 'ko' && place.noteQuoteKo) return place.noteQuoteKo;
  if (lang === 'en' && place.noteQuoteEn) return place.noteQuoteEn;
  return place.noteQuote;
}

export function getDayTitle(day?: { title?: string; titleKo?: string; titleEn?: string; date: string } | null, lang?: Language): string {
  if (!day) return '';
  if (lang === 'ko' && day.titleKo) return day.titleKo;
  if (lang === 'en' && day.titleEn) return day.titleEn;
  return day.title || day.date || '';
}

export function getDayPrefecture(prefecture: string | undefined, prefectureKo: string | undefined, lang: Language): string {
  if (lang === 'ko' && prefectureKo) return prefectureKo;
  return prefecture || '';
}

export function getPhotoCaption(photo: PhotoItem, lang: Language, fallback?: string): string {
  if (lang === 'ko' && photo.captionKo) return photo.captionKo;
  if (lang === 'en' && photo.captionEn) return photo.captionEn;
  return photo.caption || fallback || '';
}

export function formatDayStatsSummary(placeCount: number, photoCount: number, distanceKm: number, lang: Language): string {
  if (lang === 'ko') {
    return `${placeCount}곳 · 사진 ${photoCount}장 · ${distanceKm} km`;
  }
  if (lang === 'en') {
    return `${placeCount} ${placeCount === 1 ? 'place' : 'places'} · ${photoCount} ${photoCount === 1 ? 'photo' : 'photos'} · ${distanceKm} km`;
  }
  return `${placeCount}ヶ所 · 写真${photoCount}枚 · ${distanceKm} km`;
}
