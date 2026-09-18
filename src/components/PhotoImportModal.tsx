import React, { useState } from 'react';
import { X, ImagePlus, Upload, Check, Camera, Sparkles, MapPin, Plus } from 'lucide-react';
import { DayLog, PlaceLog, AppSettings, PhotoItem } from '../types';
import { translations } from '../i18n/translations';
import { PALETTES } from '../utils/geoUtils';
import { extractExifGps } from '../utils/locationService';
import { getPlaceName } from '../utils/localeUtils';

interface PhotoImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  dayLog?: DayLog;
  onAddPhotosToPlace: (placeId: string, photos: PhotoItem[]) => void;
  settings: AppSettings;
  onCreateNewPlaceWithPhotos?: (photos: PhotoItem[], coords?: { lat: number; lng: number }) => void;
}

export const PhotoImportModal: React.FC<PhotoImportModalProps> = ({
  isOpen,
  onClose,
  dayLog,
  onAddPhotosToPlace,
  settings,
  onCreateNewPlaceWithPhotos,
}) => {
  const t = translations[settings.language];
  const activePalette = PALETTES[settings.colorTheme];

  const places = dayLog?.places || [];
  const [selectedPlaceId, setSelectedPlaceId] = useState<string>(places[0]?.id || '');
  const [importedPhotos, setImportedPhotos] = useState<PhotoItem[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [detectedCoords, setDetectedCoords] = useState<{ lat: number; lng: number } | null>(null);

  const handleFiles = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setIsProcessing(true);
    const newItems: PhotoItem[] = [];
    const fileList = Array.from(files) as File[];

    // Extract EXIF from files
    for (const file of fileList) {
      const gps = await extractExifGps(file);
      if (gps && !detectedCoords) {
        setDetectedCoords(gps);
      }
    }

    fileList.forEach((file: File, idx: number) => {
      const reader = new FileReader();
      reader.onload = (event) => {
        newItems.push({
          id: `imported-${Date.now()}-${idx}`,
          url: event.target?.result as string,
          caption: file.name.replace(/\.[^/.]+$/, ''),
          timestamp: new Date().toISOString(),
          isCover: idx === 0,
        });

        if (newItems.length === fileList.length) {
          setImportedPhotos((prev) => [...prev, ...newItems]);
          setIsProcessing(false);
        }
      };
      reader.readAsDataURL(file);
    });
  };

  const handleConfirm = () => {
    if (!selectedPlaceId || importedPhotos.length === 0) return;
    onAddPhotosToPlace(selectedPlaceId, importedPhotos);
    onClose();
  };

  const handleCreateNewPlace = () => {
    if (importedPhotos.length === 0) return;
    if (onCreateNewPlaceWithPhotos) {
      onCreateNewPlaceWithPhotos(importedPhotos, detectedCoords || undefined);
    }
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-150">
      <div className="bg-white dark:bg-stone-900 rounded-3xl shadow-2xl border border-stone-200 dark:border-stone-800 w-full max-w-md max-h-[90vh] flex flex-col overflow-hidden animate-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-stone-100 dark:border-stone-800">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-rose-500 to-amber-400 text-white flex items-center justify-center shadow-sm">
              <Camera className="w-4 h-4" />
            </div>
            <h3 className="text-base font-bold text-stone-900 dark:text-white">
              {t.header.importPhotos}
            </h3>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full flex items-center justify-center text-stone-400 hover:text-stone-700 dark:hover:text-stone-200 hover:bg-stone-100 dark:hover:bg-stone-800 transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-5 overflow-y-auto space-y-4 flex-1">
          {/* Photo Dropzone & Camera Trigger */}
          <div className="border-2 border-dashed border-stone-300 dark:border-stone-700 rounded-2xl p-5 text-center hover:bg-stone-50 dark:hover:bg-stone-800/50 transition">
            <div className="flex items-center justify-center gap-3 mb-2">
              <label className="cursor-pointer px-3.5 py-2 rounded-xl bg-stone-100 dark:bg-stone-800 hover:bg-stone-200 text-stone-800 dark:text-stone-200 text-xs font-semibold flex items-center gap-1.5 transition active:scale-95">
                <Camera className="w-4 h-4 text-pink-500" />
                <span>{settings.language === 'ko' ? '카메라 촬영' : 'Camera'}</span>
                <input
                  type="file"
                  accept="image/*"
                  capture="environment"
                  onChange={handleFiles}
                  className="hidden"
                />
              </label>

              <label className="cursor-pointer px-3.5 py-2 rounded-xl bg-pink-50 dark:bg-pink-950/60 hover:bg-pink-100 text-pink-700 dark:text-pink-300 text-xs font-semibold flex items-center gap-1.5 transition active:scale-95">
                <Upload className="w-4 h-4 text-pink-600" />
                <span>{settings.language === 'ko' ? '앨범에서 선택' : 'Photo Library'}</span>
                <input
                  type="file"
                  multiple
                  accept="image/*"
                  onChange={handleFiles}
                  className="hidden"
                />
              </label>
            </div>
            <p className="text-[10px] text-stone-400">
              {settings.language === 'ko'
                ? '촬영하거나 기기에서 실제 사진을 선택하면 EXIF 위치 정보를 자동으로 인식합니다.'
                : 'Select real photos to automatically detect GPS location.'}
            </p>
          </div>

          {/* EXIF Location Detected Notice */}
          {detectedCoords && (
            <div className="flex items-center gap-2 p-2.5 rounded-xl bg-blue-50 dark:bg-blue-950/60 border border-blue-200 dark:border-blue-800/80 text-blue-700 dark:text-blue-300 text-xs animate-in fade-in">
              <MapPin className="w-4 h-4 flex-shrink-0 text-blue-600" />
              <div className="min-w-0 flex-1">
                <p className="font-bold">
                  {settings.language === 'ko' ? '사진에서 GPS 위치 발견!' : 'EXIF GPS detected!'}
                </p>
                <p className="text-[10px] font-mono opacity-80">
                  {detectedCoords.lat}, {detectedCoords.lng}
                </p>
              </div>
            </div>
          )}

          {/* Uploaded Thumbnails */}
          {importedPhotos.length > 0 && (
            <div>
              <p className="text-xs font-bold text-stone-700 dark:text-stone-300 mb-1.5">
                {settings.language === 'ko' ? '선택된 실제 사진' : 'Selected Photos'} ({importedPhotos.length})
              </p>
              <div className="grid grid-cols-3 gap-2">
                {importedPhotos.map((ph, idx) => (
                  <div
                    key={ph.id}
                    className="relative aspect-square rounded-xl overflow-hidden bg-stone-100 dark:bg-stone-800 border border-stone-200 dark:border-stone-700 group"
                  >
                    <img
                      src={ph.url}
                      alt={ph.caption || 'photo'}
                      referrerPolicy="no-referrer"
                      className="w-full h-full object-cover"
                    />
                    <button
                      type="button"
                      onClick={() =>
                        setImportedPhotos((prev) => prev.filter((_, i) => i !== idx))
                      }
                      className="absolute top-1 right-1 w-5 h-5 rounded-full bg-black/70 text-white flex items-center justify-center text-xs"
                    >
                      ×
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Target Place Selection */}
          <div className="pt-2 border-t border-stone-100 dark:border-stone-800">
            <label className="block text-xs font-bold text-stone-700 dark:text-stone-300 mb-1.5">
              {settings.language === 'ko' ? '기존 장소에 사진 연결' : settings.language === 'ja' ? '既存の場所に写真を紐付け' : 'Link to Existing Place'}
            </label>
            {places.length > 0 ? (
              <select
                value={selectedPlaceId}
                onChange={(e) => setSelectedPlaceId(e.target.value)}
                className="w-full text-xs px-3 py-2.5 rounded-xl border border-stone-300 dark:border-stone-700 bg-stone-50 dark:bg-stone-800 text-stone-900 dark:text-stone-100 focus:ring-2 focus:ring-pink-500 font-medium"
              >
                {places.map((p) => (
                  <option key={p.id} value={p.id}>
                    [{p.arrivalTime}] {getPlaceName(p, settings.language)}
                  </option>
                ))}
              </select>
            ) : (
              <p className="text-xs text-stone-400 italic">
                {settings.language === 'ko'
                  ? '기록된 기존 장소가 없습니다. 아래 버튼을 눌러 새 장소로 등록하세요.'
                  : settings.language === 'ja'
                  ? '記録された場所がありません。下のボタンから新しい場所を登録してください。'
                  : 'No existing places logged yet.'}
              </p>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between gap-2 p-4 border-t border-stone-100 dark:border-stone-800 bg-stone-50/50 dark:bg-stone-900/50">
          <button
            onClick={handleCreateNewPlace}
            disabled={importedPhotos.length === 0}
            className="px-3 py-2 text-xs font-bold rounded-xl border border-pink-300 dark:border-pink-800 text-pink-700 dark:text-pink-300 hover:bg-pink-50 dark:hover:bg-pink-950/50 transition active:scale-95 disabled:opacity-40 flex items-center gap-1"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>{settings.language === 'ko' ? '새 장소로 등록' : settings.language === 'ja' ? '新しい場所として登録' : 'New Place'}</span>
          </button>

          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              className="px-3.5 py-2 text-xs font-semibold rounded-xl bg-stone-100 dark:bg-stone-800 text-stone-700 dark:text-stone-300 hover:bg-stone-200 transition"
            >
              {t.addModal.cancelButton}
            </button>
            <button
              onClick={handleConfirm}
              disabled={importedPhotos.length === 0 || !selectedPlaceId}
              className="px-4 py-2 text-xs font-bold rounded-xl text-white shadow-md hover:shadow-lg transition active:scale-95 disabled:opacity-50"
              style={{ backgroundColor: activePalette.primary }}
            >
              {settings.language === 'ko' ? '연결 완료' : settings.language === 'ja' ? '追加完了' : 'Confirm'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
