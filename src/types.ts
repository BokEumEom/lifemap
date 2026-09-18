export type Language = 'ja' | 'ko' | 'en';

export type Category =
  | 'cafe'
  | 'restaurant'
  | 'nature'
  | 'culture'
  | 'shrine_temple'
  | 'step'
  | 'work'
  | 'shopping'
  | 'transit'
  | 'spot'
  | 'stay'
  | 'other';

export interface PhotoItem {
  id: string;
  url: string;
  caption?: string;
  captionKo?: string;
  captionEn?: string;
  timestamp?: string; // ISO string
  isCover?: boolean;
}

export interface PlaceLog {
  id: string;
  name: string;
  nameKo?: string;
  nameJa?: string;
  nameEn?: string;
  category: Category;
  lat: number;
  lng: number;
  arrivalTime: string; // e.g., "11:29"
  departureTime?: string; // e.g., "11:53"
  durationMinutes?: number;
  address?: string;
  addressKo?: string;
  addressJa?: string;
  addressEn?: string;
  weather?: {
    icon: string; // e.g., 'sunny' | 'cloudy' | 'rain'
    tempC: number;
    descKo?: string;
    descJa?: string;
    descEn?: string;
  };
  photos: PhotoItem[];
  coverPhotoUrl?: string;
  note?: string;
  noteKo?: string;
  noteJa?: string;
  noteEn?: string;
  noteQuote?: string; // e.g. "また来たい"
  noteQuoteKo?: string;
  noteQuoteJa?: string;
  noteQuoteEn?: string;
  likesCount?: number; // e.g. 83, 87
  rating?: number; // e.g. 3.5, 4.0
  isFavorite?: boolean;
  isFirstVisit?: boolean;
}

export interface RoutePoint {
  lat: number;
  lng: number;
  timestamp: string; // "10:15"
  speedKmh?: number;
}

export interface DaySummaryMeta {
  prefecture?: string; // e.g. "大分県"
  prefectureKo?: string; // e.g. "오이타현"
  prefectureJa?: string;
  prefectureEn?: string;
  cafesCount?: number; // e.g. 3
  stepsCount?: number; // e.g. 3
  restaurantsCount?: number; // e.g. 2
  firstVisitCount?: number; // e.g. 12
  movementKm?: number; // e.g. 3.2
  movementTimeRange?: string; // e.g. "12:14~19:32"
}

export interface DayLog {
  date: string; // "YYYY-MM-DD" e.g. "2026-09-12"
  title?: string;
  titleKo?: string;
  titleJa?: string;
  titleEn?: string;
  places: PlaceLog[];
  routePoints: RoutePoint[];
  steps: number;
  totalDistanceKm: number;
  dailyNote?: string;
  dailyNoteKo?: string;
  dailyNoteJa?: string;
  dailyNoteEn?: string;
  summaryMeta?: DaySummaryMeta;
  aiRecap?: {
    recap: string;
    recapKo?: string;
    recapJa?: string;
    recapEn?: string;
    mood: string;
    moodKo?: string;
    moodJa?: string;
    moodEn?: string;
    highlight: string;
    highlightKo?: string;
    highlightJa?: string;
    highlightEn?: string;
    generatedAt?: string;
    isAppleIntelligence?: boolean;
  };
}

export type ColorTheme = 'emerald' | 'indigo' | 'tangerine' | 'cyan' | 'rose' | 'magenta';

export type MapStyle = 'osm' | 'osm_hot' | 'dark' | 'satellite' | 'positron' | 'voyager';

export type PrivacyPrecision = 'exact' | 'approximate';

export interface AppSettings {
  language: Language;
  theme: 'light' | 'dark' | 'system';
  colorTheme: ColorTheme;
  mapStyle: MapStyle;
  privacyPrecision: PrivacyPrecision;
  syncOption: 'local' | 'icloud' | 'gdrive';
  autoTrackLocation: boolean;
  threeDBuildingView: boolean;
}

