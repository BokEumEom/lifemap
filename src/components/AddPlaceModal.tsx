import React, { useState } from 'react';
import {
  X,
  MapPin,
  Clock,
  Camera,
  Upload,
  Sparkles,
  Check,
  Crosshair,
  Loader2,
  Navigation,
} from 'lucide-react';
import { PlaceLog, Category, AppSettings, PhotoItem } from '../types';
import { translations } from '../i18n/translations';
import { PALETTES } from '../utils/geoUtils';
import {
  getCurrentGpsPosition,
  reverseGeocode,
  extractExifGps,
} from '../utils/locationService';

interface AddPlaceModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSavePlace: (newPlace: PlaceLog) => void;
  settings: AppSettings;
  initialCoords?: { lat: number; lng: number } | null;
  initialPhotos?: PhotoItem[] | null;
}

export const AddPlaceModal: React.FC<AddPlaceModalProps> = ({
  isOpen,
  onClose,
  onSavePlace,
  settings,
  initialCoords,
  initialPhotos,
}) => {
  const t = translations[settings.language];
  const activePalette = PALETTES[settings.colorTheme];

  const categories: Category[] = [
    'cafe',
    'restaurant',
    'nature',
    'culture',
    'work',
    'shopping',
    'transit',
    'stay',
    'other',
  ];

  const now = new Date();
  const defaultArrival = `${String(now.getHours()).padStart(2, '0')}:${String(
    now.getMinutes()
  ).padStart(2, '0')}`;

  const [name, setName] = useState('');
  const [nameEn, setNameEn] = useState('');
  const [category, setCategory] = useState<Category>('cafe');
  const [arrivalTime, setArrivalTime] = useState(defaultArrival);
  const [durationMinutes, setDurationMinutes] = useState(60);
  const [note, setNote] = useState('');
  const [lat, setLat] = useState(initialCoords?.lat || 37.545);
  const [lng, setLng] = useState(initialCoords?.lng || 127.045);
  const [address, setAddress] = useState('');
  const [photos, setPhotos] = useState<PhotoItem[]>(initialPhotos || []);
  const [isLocating, setIsLocating] = useState(false);
  const [locationNotice, setLocationNotice] = useState<string | null>(null);

  // If initial photos provided, set photos
  React.useEffect(() => {
    if (initialPhotos && initialPhotos.length > 0) {
      setPhotos(initialPhotos);
    }
  }, [initialPhotos]);

  // If initial coordinates were clicked on the map, auto-reverse-geocode address
  React.useEffect(() => {
    if (initialCoords) {
      setLat(initialCoords.lat);
      setLng(initialCoords.lng);
      reverseGeocode(initialCoords.lat, initialCoords.lng, settings.language).then((res) => {
        if (res.address) setAddress(res.address);
        if (res.name && !name) setName(res.name);
      });
    }
  }, [initialCoords]);

  // Handle Real-Time GPS Current Position with Auto-Reverse Geocoding
  const handleGetGps = async () => {
    setIsLocating(true);
    setLocationNotice(null);
    try {
      const pos = await getCurrentGpsPosition();
      setLat(pos.lat);
      setLng(pos.lng);

      // Reverse geocode to get real street address and place name
      const geo = await reverseGeocode(pos.lat, pos.lng, settings.language);
      if (geo.address) setAddress(geo.address);
      if (geo.name && !name) setName(geo.name);

      setLocationNotice(
        settings.language === 'ko'
          ? `📍 현재 위치 감지 완료 (${geo.name || geo.address || `${pos.lat}, ${pos.lng}`})`
          : `📍 Location detected (${geo.name || geo.address})`
      );
    } catch (err) {
      console.warn('Geolocation failed', err);
      setLocationNotice(
        settings.language === 'ko'
          ? '위치 권한을 확인해주세요.'
          : 'Could not acquire GPS position.'
      );
    } finally {
      setIsLocating(false);
    }
  };

  // Handle Real File Upload (supports multiple files, camera capture, and EXIF extraction)
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    let detectedGps = false;

    for (let i = 0; i < files.length; i++) {
      const file = files[i];

      // Try reading EXIF GPS & timestamp from the real photo
      try {
        const exif = await extractExifGps(file);
        if (exif && exif.lat && exif.lng && !detectedGps) {
          detectedGps = true;
          setLat(exif.lat);
          setLng(exif.lng);
          const geo = await reverseGeocode(exif.lat, exif.lng, settings.language);
          if (geo.address) setAddress(geo.address);
          if (geo.name && !name) setName(geo.name);
          setLocationNotice(
            settings.language === 'ko'
              ? `📷 사진 메타데이터(EXIF)에서 촬영 위치 감지: ${geo.name || geo.address || `${exif.lat}, ${exif.lng}`}`
              : `📷 Photo EXIF GPS location detected: ${geo.name || geo.address}`
          );
        }
      } catch (err) {
        console.warn('Could not extract EXIF', err);
      }

      // Read image as Data URL
      const reader = new FileReader();
      reader.onload = (event) => {
        const dataUrl = event.target?.result as string;
        setPhotos((prev) => [
          ...prev,
          {
            id: `photo-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
            url: dataUrl,
            caption: file.name.replace(/\.[^/.]+$/, ''),
            isCover: prev.length === 0,
          },
        ]);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    // Calculate departure time
    const [arrH, arrM] = arrivalTime.split(':').map(Number);
    const totalMinutes = arrH * 60 + arrM + durationMinutes;
    const depH = Math.floor((totalMinutes / 60) % 24);
    const depM = totalMinutes % 60;
    const departureTime = `${String(depH).padStart(2, '0')}:${String(depM).padStart(2, '0')}`;

    const newPlace: PlaceLog = {
      id: `place-${Date.now()}`,
      name: name.trim(),
      nameEn: nameEn.trim() || undefined,
      category,
      lat,
      lng,
      arrivalTime,
      departureTime,
      durationMinutes,
      address: address.trim() || undefined,
      note: note.trim(),
      photos,
      coverPhotoUrl: photos[0]?.url,
      weather: {
        icon: 'sunny',
        tempC: 24,
        descKo: '맑음',
        descEn: 'Clear',
      },
      isFirstVisit: true,
    };

    onSavePlace(newPlace);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-150">
      <div className="bg-white dark:bg-stone-900 rounded-3xl shadow-2xl border border-stone-200 dark:border-stone-800 w-full max-w-lg max-h-[92vh] flex flex-col overflow-hidden animate-in zoom-in-95 duration-200">
        {/* Modal Header */}
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-stone-100 dark:border-stone-800 flex-shrink-0">
          <div className="flex items-center gap-2">
            <div
              className="w-8 h-8 rounded-xl flex items-center justify-center text-white shadow-sm"
              style={{ backgroundColor: activePalette.primary }}
            >
              <MapPin className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm sm:text-base font-bold text-stone-900 dark:text-white">
                {t.addModal.title}
              </h3>
              <p className="text-[10px] text-stone-400">
                {settings.language === 'ko' ? '실제 방문한 장소와 사진 기록' : 'Log real visited places & photos'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full flex items-center justify-center text-stone-400 hover:text-stone-700 dark:hover:text-stone-200 hover:bg-stone-100 dark:hover:bg-stone-800 transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Modal Form Content */}
        <form onSubmit={handleSubmit} className="p-4 sm:p-5 overflow-y-auto space-y-3.5 flex-1">
          {/* Location Notice Banner */}
          {locationNotice && (
            <div className="p-2.5 rounded-xl bg-pink-50 dark:bg-pink-950/60 border border-pink-200 dark:border-pink-800/60 text-xs text-pink-700 dark:text-pink-300 flex items-center justify-between animate-in fade-in">
              <span className="truncate">{locationNotice}</span>
              <button
                type="button"
                onClick={() => setLocationNotice(null)}
                className="text-pink-500 hover:text-pink-800 ml-2"
              >
                ×
              </button>
            </div>
          )}

          {/* Place Name & Quick GPS Fetch */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="text-xs font-bold text-stone-700 dark:text-stone-300">
                {t.addModal.placeName} *
              </label>
              <button
                type="button"
                onClick={handleGetGps}
                disabled={isLocating}
                className="text-[11px] font-bold text-pink-600 dark:text-pink-400 flex items-center gap-1 hover:underline active:scale-95 disabled:opacity-50"
              >
                {isLocating ? (
                  <Loader2 className="w-3 h-3 animate-spin" />
                ) : (
                  <Crosshair className="w-3 h-3" />
                )}
                <span>{settings.language === 'ko' ? '현재 위치 자동 입력' : t.addModal.currentGps}</span>
              </button>
            </div>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder={t.addModal.placeNamePlaceholder}
              className="w-full text-xs sm:text-sm px-3.5 py-2.5 rounded-xl border border-stone-300 dark:border-stone-700 bg-stone-50 dark:bg-stone-800 text-stone-900 dark:text-stone-100 focus:outline-none focus:ring-2 focus:ring-pink-500"
            />
          </div>

          {/* Address / Location Details */}
          <div>
            <label className="block text-xs font-bold text-stone-700 dark:text-stone-300 mb-1">
              {settings.language === 'ko' ? '도로명 주소 / 위치 설명' : 'Address / Location'}
            </label>
            <input
              type="text"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              placeholder={settings.language === 'ko' ? '예: 서울특별시 종로구 삼청로 30' : 'e.g. 123 Main St'}
              className="w-full text-xs px-3 py-2 rounded-xl border border-stone-300 dark:border-stone-700 bg-stone-50 dark:bg-stone-800 text-stone-900 dark:text-stone-100"
            />
          </div>

          {/* Category Chips */}
          <div>
            <label className="block text-xs font-bold text-stone-700 dark:text-stone-300 mb-1.5">
              {t.addModal.category}
            </label>
            <div className="flex flex-wrap gap-1.5">
              {categories.map((cat) => {
                const isSelected = category === cat;
                return (
                  <button
                    key={cat}
                    type="button"
                    onClick={() => setCategory(cat)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-medium transition ${
                      isSelected
                        ? 'bg-pink-600 text-white font-bold shadow-xs'
                        : 'bg-stone-100 dark:bg-stone-800 text-stone-700 dark:text-stone-300 hover:bg-stone-200 dark:hover:bg-stone-700'
                    }`}
                  >
                    {t.categories[cat]}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Time & Duration */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-stone-700 dark:text-stone-300 mb-1">
                {t.addModal.time}
              </label>
              <input
                type="time"
                value={arrivalTime}
                onChange={(e) => setArrivalTime(e.target.value)}
                className="w-full text-xs px-3 py-2 rounded-xl border border-stone-300 dark:border-stone-700 bg-stone-50 dark:bg-stone-800 text-stone-900 dark:text-stone-100"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-stone-700 dark:text-stone-300 mb-1">
                {t.addModal.duration}
              </label>
              <input
                type="number"
                min="5"
                max="720"
                step="5"
                value={durationMinutes}
                onChange={(e) => setDurationMinutes(Number(e.target.value))}
                className="w-full text-xs px-3 py-2 rounded-xl border border-stone-300 dark:border-stone-700 bg-stone-50 dark:bg-stone-800 text-stone-900 dark:text-stone-100"
              />
            </div>
          </div>

          {/* Coordinates (Lat, Lng) */}
          <div>
            <label className="block text-xs font-bold text-stone-700 dark:text-stone-300 mb-1">
              {settings.language === 'ko' ? '지도 좌표 (위도, 경도)' : 'Coordinates (Lat, Lng)'}
            </label>
            <div className="grid grid-cols-2 gap-2">
              <input
                type="number"
                step="0.00001"
                value={lat}
                onChange={(e) => setLat(Number(e.target.value))}
                placeholder="Lat"
                className="text-xs px-3 py-2 rounded-xl border border-stone-300 dark:border-stone-700 bg-stone-50 dark:bg-stone-800 text-stone-900 dark:text-stone-100 font-mono"
              />
              <input
                type="number"
                step="0.00001"
                value={lng}
                onChange={(e) => setLng(Number(e.target.value))}
                placeholder="Lng"
                className="text-xs px-3 py-2 rounded-xl border border-stone-300 dark:border-stone-700 bg-stone-50 dark:bg-stone-800 text-stone-900 dark:text-stone-100 font-mono"
              />
            </div>
          </div>

          {/* REAL PHOTOS UPLOAD & CAMERA CAPTURE */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="text-xs font-bold text-stone-700 dark:text-stone-300">
                {settings.language === 'ko' ? '실제 사진 첨부 / 촬영' : 'Photos (Real Device Upload)'}
              </label>
              <span className="text-[10px] text-stone-400">
                {settings.language === 'ko' ? 'EXIF 촬영 위치 자동 인식' : 'Auto-reads EXIF location'}
              </span>
            </div>

            <div className="grid grid-cols-2 gap-2">
              {/* Option 1: File / Gallery Upload */}
              <label className="border-2 border-dashed border-stone-300 dark:border-stone-700 rounded-2xl p-3 text-center hover:bg-stone-50 dark:hover:bg-stone-800/60 transition cursor-pointer flex flex-col items-center justify-center gap-1 active:scale-98">
                <Upload className="w-5 h-5 text-pink-600 dark:text-pink-400" />
                <span className="text-xs font-bold text-stone-800 dark:text-stone-200">
                  {settings.language === 'ko' ? '갤러리 / 파일 선택' : 'Pick from Gallery'}
                </span>
                <span className="text-[10px] text-stone-400">
                  {settings.language === 'ko' ? '여러 장 선택 가능' : 'Multiple files'}
                </span>
                <input
                  type="file"
                  multiple
                  accept="image/*"
                  onChange={handleFileUpload}
                  className="hidden"
                />
              </label>

              {/* Option 2: Camera Capture */}
              <label className="border-2 border-dashed border-pink-300 dark:border-pink-800/80 rounded-2xl p-3 text-center bg-pink-50/40 dark:bg-pink-950/20 hover:bg-pink-50 dark:hover:bg-pink-950/40 transition cursor-pointer flex flex-col items-center justify-center gap-1 active:scale-98">
                <Camera className="w-5 h-5 text-pink-600 dark:text-pink-400" />
                <span className="text-xs font-bold text-stone-800 dark:text-stone-200">
                  {settings.language === 'ko' ? '카메라로 촬영' : 'Take Photo'}
                </span>
                <span className="text-[10px] text-stone-400">
                  {settings.language === 'ko' ? '즉시 사진 촬영' : 'Open Camera'}
                </span>
                <input
                  type="file"
                  accept="image/*"
                  capture="environment"
                  onChange={handleFileUpload}
                  className="hidden"
                />
              </label>
            </div>

            {/* Attached Photos Preview */}
            {photos.length > 0 && (
              <div className="mt-2.5">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-[11px] font-bold text-stone-600 dark:text-stone-400">
                    {settings.language === 'ko' ? '첨부된 사진' : 'Attached Photos'} ({photos.length})
                  </span>
                  <span className="text-[10px] text-stone-400">
                    {settings.language === 'ko' ? '첫 번째 사진이 대표 사진입니다' : '1st photo is cover'}
                  </span>
                </div>
                <div className="flex gap-2 overflow-x-auto no-scrollbar pb-1">
                  {photos.map((ph, idx) => (
                    <div
                      key={ph.id}
                      className="relative w-16 h-16 rounded-xl overflow-hidden flex-shrink-0 border border-stone-200 dark:border-stone-700 shadow-xs group"
                    >
                      <img
                        src={ph.url}
                        alt={ph.caption || 'preview'}
                        referrerPolicy="no-referrer"
                        className="w-full h-full object-cover"
                      />
                      {idx === 0 && (
                        <span className="absolute bottom-0 inset-x-0 bg-pink-600/90 text-white text-[8px] font-bold text-center py-0.5">
                          대표
                        </span>
                      )}
                      <button
                        type="button"
                        onClick={() => setPhotos((prev) => prev.filter((_, i) => i !== idx))}
                        className="absolute top-0.5 right-0.5 w-4 h-4 bg-black/80 text-white rounded-full flex items-center justify-center text-[10px]"
                      >
                        ×
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Personal Note */}
          <div>
            <label className="block text-xs font-bold text-stone-700 dark:text-stone-300 mb-1">
              {t.addModal.note}
            </label>
            <textarea
              rows={2}
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder={t.addModal.notePlaceholder}
              className="w-full text-xs p-3 rounded-xl border border-stone-300 dark:border-stone-700 bg-stone-50 dark:bg-stone-800 text-stone-900 dark:text-stone-100 focus:outline-none focus:ring-2 focus:ring-pink-500"
            />
          </div>

          {/* Modal Footer Buttons */}
          <div className="flex items-center justify-end gap-2 pt-3 border-t border-stone-100 dark:border-stone-800">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold rounded-xl bg-stone-100 dark:bg-stone-800 text-stone-700 dark:text-stone-300 hover:bg-stone-200 transition"
            >
              {t.addModal.cancelButton}
            </button>
            <button
              type="submit"
              className="px-5 py-2 text-xs font-bold rounded-xl text-white shadow-md hover:shadow-lg transition active:scale-95"
              style={{ backgroundColor: activePalette.primary }}
            >
              {t.addModal.saveButton}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
