import React, { useState, useEffect, useMemo } from 'react';
import { DayLog, PlaceLog, AppSettings, PhotoItem } from './types';
import { INITIAL_DAYS } from './data/initialData';
import { Navbar } from './components/Navbar';
import { BottomTabBar, TabType } from './components/BottomTabBar';
import { MapView } from './components/MapView';
import { TimelineView } from './components/TimelineView';
import { DataView } from './components/DataView';
import { SettingsView } from './components/SettingsView';
import { AddPlaceModal } from './components/AddPlaceModal';
import { PhotoImportModal } from './components/PhotoImportModal';
import { PhotoLightbox } from './components/PhotoLightbox';
import { SearchModal } from './components/SearchModal';
import { PlaceDetailCard } from './components/PlaceDetailCard';
import { calculateDistanceKm } from './utils/geoUtils';

const STORAGE_DAYS_KEY = 'lifemap_days_korea_v4';
const STORAGE_SETTINGS_KEY = 'lifemap_settings_v3';

export default function App() {
  // Load saved days or fallback to initial Korean tour demo days
  const [days, setDays] = useState<Record<string, DayLog>>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_DAYS_KEY);
      if (saved) {
        const parsed: Record<string, DayLog> = JSON.parse(saved);
        // Ensure Korean datasets exist
        Object.keys(INITIAL_DAYS).forEach((dateKey) => {
          if (!parsed[dateKey]) {
            parsed[dateKey] = INITIAL_DAYS[dateKey];
          }
        });
        return parsed;
      }
    } catch (e) {
      console.warn('Failed to parse saved days from localStorage', e);
    }
    return INITIAL_DAYS;
  });

  // Default to Korean Seongsu-dong tour: 2026-09-18
  const [currentDate, setCurrentDate] = useState<string>('2026-09-18');

  // Active Bottom Navigation Tab: 'map' (named '스팟' in Korean)
  const [activeTab, setActiveTab] = useState<TabType>('map');

  // App Settings
  const [settings, setSettings] = useState<AppSettings>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_SETTINGS_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        return {
          language: parsed.language || 'ko',
          theme: parsed.theme || 'light',
          colorTheme: parsed.colorTheme || 'magenta',
          mapStyle: parsed.mapStyle || 'positron',
          privacyPrecision: parsed.privacyPrecision || 'exact',
          syncOption: parsed.syncOption || 'local',
          autoTrackLocation: Boolean(parsed.autoTrackLocation),
          threeDBuildingView: Boolean(parsed.threeDBuildingView),
        };
      }
    } catch (e) {
      console.warn('Failed to parse settings from localStorage', e);
    }
    return {
      language: 'ko', // Default to Korean
      theme: 'light',
      colorTheme: 'magenta',
      mapStyle: 'positron',
      privacyPrecision: 'exact',
      syncOption: 'local',
      autoTrackLocation: false,
      threeDBuildingView: false,
    };
  });

  // Selected place ID (for detail popup)
  const [selectedPlaceId, setSelectedPlaceId] = useState<string | null>(null);

  // Modals state
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [addModalInitialCoords, setAddModalInitialCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [addModalInitialPhotos, setAddModalInitialPhotos] = useState<PhotoItem[] | null>(null);
  const [isPhotoImportModalOpen, setIsPhotoImportModalOpen] = useState(false);
  const [lightboxPhoto, setLightboxPhoto] = useState<{ url: string; caption?: string } | null>(null);
  const [isSearchOpen, setIsSearchOpen] = useState(false);

  // Walking simulation state
  const [isSimulating, setIsSimulating] = useState(false);

  // Persist days to localStorage
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_DAYS_KEY, JSON.stringify(days));
    } catch (e) {
      console.error('Failed to persist days to localStorage', e);
    }
  }, [days]);

  // Persist settings & sync theme class to document
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_SETTINGS_KEY, JSON.stringify(settings));
    } catch (e) {
      console.error('Failed to persist settings', e);
    }

    if (settings.theme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [settings]);

  // Available dates with logs
  const availableDates = useMemo(() => {
    return Object.keys(days).sort().reverse();
  }, [days]);

  // Get current day's log
  const currentDayLog: DayLog = useMemo(() => {
    if (days[currentDate]) {
      return days[currentDate];
    }
    return {
      date: currentDate,
      title: settings.language === 'ja' ? '新しい日' : settings.language === 'ko' ? '새로운 하루 기록' : 'New Day Log',
      places: [],
      routePoints: [],
      steps: 0,
      totalDistanceKm: 0,
      dailyNote: '',
    };
  }, [days, currentDate, settings.language]);

  // Update Settings
  const handleUpdateSettings = (newSettings: Partial<AppSettings>) => {
    setSettings((prev) => ({ ...prev, ...newSettings }));
  };

  // Update DayLog
  const handleUpdateDayLog = (updatedDay: DayLog) => {
    setDays((prev) => ({
      ...prev,
      [updatedDay.date]: updatedDay,
    }));
  };

  // Day navigation
  const handlePrevDay = () => {
    const dates = Object.keys(days).sort();
    const currIdx = dates.indexOf(currentDate);
    if (currIdx > 0) {
      setCurrentDate(dates[currIdx - 1]);
    } else {
      const d = new Date(currentDate);
      d.setDate(d.getDate() - 1);
      setCurrentDate(d.toISOString().split('T')[0]);
    }
    setSelectedPlaceId(null);
  };

  const handleNextDay = () => {
    const dates = Object.keys(days).sort();
    const currIdx = dates.indexOf(currentDate);
    if (currIdx >= 0 && currIdx < dates.length - 1) {
      setCurrentDate(dates[currIdx + 1]);
    } else {
      const d = new Date(currentDate);
      d.setDate(d.getDate() + 1);
      setCurrentDate(d.toISOString().split('T')[0]);
    }
    setSelectedPlaceId(null);
  };

  // Add or update single place in current day
  const handleSavePlace = (newPlace: PlaceLog) => {
    const existingPlaces = currentDayLog.places || [];
    const isEdit = existingPlaces.some((p) => p.id === newPlace.id);

    let updatedPlaces: PlaceLog[];
    if (isEdit) {
      updatedPlaces = existingPlaces.map((p) => (p.id === newPlace.id ? newPlace : p));
    } else {
      updatedPlaces = [...existingPlaces, newPlace];
    }

    updatedPlaces.sort((a, b) => a.arrivalTime.localeCompare(b.arrivalTime));

    let calculatedKm = 0;
    for (let i = 0; i < updatedPlaces.length - 1; i++) {
      calculatedKm += calculateDistanceKm(
        updatedPlaces[i].lat,
        updatedPlaces[i].lng,
        updatedPlaces[i + 1].lat,
        updatedPlaces[i + 1].lng
      );
    }

    const newRoutePoint = {
      lat: newPlace.lat,
      lng: newPlace.lng,
      timestamp: newPlace.arrivalTime,
    };
    const updatedRoute = [...(currentDayLog.routePoints || []), newRoutePoint];

    const updatedDay: DayLog = {
      ...currentDayLog,
      places: updatedPlaces,
      routePoints: updatedRoute,
      totalDistanceKm: Number(Math.max(currentDayLog.totalDistanceKm, calculatedKm).toFixed(1)),
      steps: currentDayLog.steps || Math.round(calculatedKm * 1400),
    };

    handleUpdateDayLog(updatedDay);
    setSelectedPlaceId(newPlace.id);
  };

  // Delete place
  const handleDeletePlace = (placeId: string) => {
    const updatedPlaces = currentDayLog.places.filter((p) => p.id !== placeId);
    handleUpdateDayLog({
      ...currentDayLog,
      places: updatedPlaces,
    });
    if (selectedPlaceId === placeId) {
      setSelectedPlaceId(null);
    }
  };

  // Add photos to existing place
  const handleAddPhotosToPlace = (placeId: string, newPhotos: PhotoItem[]) => {
    const updatedPlaces = currentDayLog.places.map((p) => {
      if (p.id === placeId) {
        return {
          ...p,
          photos: [...p.photos, ...newPhotos],
          coverPhotoUrl: p.coverPhotoUrl || newPhotos[0]?.url,
        };
      }
      return p;
    });

    handleUpdateDayLog({
      ...currentDayLog,
      places: updatedPlaces,
    });
  };

  // Reset to curated demo data matching the video
  const handleResetDemoData = () => {
    setDays(INITIAL_DAYS);
    setCurrentDate('2026-09-12');
    setSelectedPlaceId(null);
    localStorage.setItem(STORAGE_DAYS_KEY, JSON.stringify(INITIAL_DAYS));
  };

  // Restore from imported JSON
  const handleRestoreAllDays = (restored: Record<string, DayLog>) => {
    setDays(restored);
    const firstDate = Object.keys(restored).sort().reverse()[0] || '2026-09-12';
    setCurrentDate(firstDate);
  };

  // Selected place for bottom sheet
  const selectedPlace = currentDayLog?.places.find((p) => p.id === selectedPlaceId);
  const selectedPlaceIndex = currentDayLog && selectedPlaceId
    ? currentDayLog.places.findIndex((p) => p.id === selectedPlaceId)
    : -1;

  // Ensure selectedPlaceId is cleared if place doesn't exist on current day
  useEffect(() => {
    if (selectedPlaceId && currentDayLog) {
      const exists = currentDayLog.places.some((p) => p.id === selectedPlaceId);
      if (!exists) {
        setSelectedPlaceId(null);
      }
    }
  }, [selectedPlaceId, currentDayLog]);

  const handlePrevPlace = () => {
    if (!currentDayLog || currentDayLog.places.length === 0 || !selectedPlaceId) return;
    const idx = currentDayLog.places.findIndex((p) => p.id === selectedPlaceId);
    const prevIdx = idx > 0 ? idx - 1 : currentDayLog.places.length - 1;
    setSelectedPlaceId(currentDayLog.places[prevIdx].id);
  };

  const handleNextPlace = () => {
    if (!currentDayLog || currentDayLog.places.length === 0 || !selectedPlaceId) return;
    const idx = currentDayLog.places.findIndex((p) => p.id === selectedPlaceId);
    const nextIdx = idx < currentDayLog.places.length - 1 ? idx + 1 : 0;
    setSelectedPlaceId(currentDayLog.places[nextIdx].id);
  };

  return (
    <div className="w-full h-full min-h-[100dvh] max-h-[100dvh] flex flex-col items-center justify-center bg-stone-100 dark:bg-stone-950 overflow-hidden select-none">
      <div className="relative w-full h-full max-w-lg mx-auto flex flex-col bg-stone-50 dark:bg-stone-950 text-stone-900 dark:text-stone-100 overflow-hidden shadow-none sm:shadow-2xl sm:border-x sm:border-stone-200/80 dark:sm:border-stone-800/80 transition-colors">
        {/* Top Navigation Bar */}
        <Navbar
          currentDate={currentDate}
          onSelectDate={(date) => {
            setCurrentDate(date);
            setSelectedPlaceId(null);
          }}
          availableDates={availableDates}
          settings={settings}
          onUpdateSettings={handleUpdateSettings}
          onOpenAddModal={() => {
            setAddModalInitialCoords(null);
            setIsAddModalOpen(true);
          }}
          onOpenPhotoImportModal={() => setIsPhotoImportModalOpen(true)}
          isSimulating={isSimulating}
          onToggleSimulate={() => setIsSimulating(!isSimulating)}
        />

        {/* Main Viewport Container */}
        <main className="relative flex-1 flex flex-col overflow-hidden isolate z-0">
          {activeTab === 'map' && (
            <MapView
              dayLog={currentDayLog}
              settings={settings}
              onUpdateSettings={handleUpdateSettings}
              selectedPlaceId={selectedPlaceId}
              onSelectPlace={setSelectedPlaceId}
              onUpdatePlace={handleSavePlace}
              onDeletePlace={handleDeletePlace}
              onOpenAddModalWithCoords={(lat, lng) => {
                setAddModalInitialCoords({ lat, lng });
                setIsAddModalOpen(true);
              }}
              onSelectPhoto={(url, caption) => setLightboxPhoto({ url, caption })}
              isSimulating={isSimulating}
              onToggleSimulate={() => setIsSimulating(!isSimulating)}
              onExpandTimeline={() => setActiveTab('timeline')}
              onPrevDay={handlePrevDay}
              onNextDay={handleNextDay}
              onSelectDate={setCurrentDate}
              availableDates={availableDates}
            />
          )}

          {activeTab === 'timeline' && (
            <TimelineView
              dayLog={currentDayLog}
              settings={settings}
              onSelectPlace={(id) => {
                setSelectedPlaceId(id);
                setActiveTab('map');
              }}
              onUpdateDayLog={handleUpdateDayLog}
              onOpenAddModal={() => {
                setAddModalInitialCoords(null);
                setIsAddModalOpen(true);
              }}
              onSelectPhoto={(url, caption) => setLightboxPhoto({ url, caption })}
              onPrevDay={handlePrevDay}
              onNextDay={handleNextDay}
            />
          )}

          {activeTab === 'data' && (
            <DataView
              days={days}
              currentDate={currentDate}
              onSelectDate={(d) => {
                setCurrentDate(d);
                setActiveTab('map');
              }}
              onRestoreAllDays={handleRestoreAllDays}
              settings={settings}
            />
          )}

          {activeTab === 'settings' && (
            <SettingsView
              settings={settings}
              onUpdateSettings={handleUpdateSettings}
              onResetDemoData={handleResetDemoData}
            />
          )}
        </main>

        {/* Bottom Tab Bar (Video Dock Bar with Search) */}
        <BottomTabBar
          currentTab={activeTab}
          onSelectTab={(tab) => {
            setActiveTab(tab);
            if (tab !== 'map') {
              setIsSimulating(false);
            }
          }}
          language={settings.language}
          onOpenSearch={() => setIsSearchOpen(true)}
        />

        {/* Modals & Overlays */}
        {isAddModalOpen && (
          <AddPlaceModal
            isOpen={isAddModalOpen}
            onClose={() => {
              setIsAddModalOpen(false);
              setAddModalInitialCoords(null);
              setAddModalInitialPhotos(null);
            }}
            onSavePlace={handleSavePlace}
            settings={settings}
            initialCoords={addModalInitialCoords}
            initialPhotos={addModalInitialPhotos}
          />
        )}

        {isPhotoImportModalOpen && (
          <PhotoImportModal
            isOpen={isPhotoImportModalOpen}
            onClose={() => setIsPhotoImportModalOpen(false)}
            dayLog={currentDayLog}
            onAddPhotosToPlace={handleAddPhotosToPlace}
            settings={settings}
            onCreateNewPlaceWithPhotos={(photos, coords) => {
              setIsPhotoImportModalOpen(false);
              setAddModalInitialPhotos(photos);
              if (coords) {
                setAddModalInitialCoords(coords);
              }
              setIsAddModalOpen(true);
            }}
          />
        )}

        {lightboxPhoto && (
          <PhotoLightbox
            url={lightboxPhoto.url}
            caption={lightboxPhoto.caption}
            onClose={() => setLightboxPhoto(null)}
          />
        )}

        {isSearchOpen && (
          <SearchModal
            isOpen={isSearchOpen}
            onClose={() => setIsSearchOpen(false)}
            days={days}
            settings={settings}
            onSelectPlaceResult={(date, placeId) => {
              setCurrentDate(date);
              setSelectedPlaceId(placeId);
              setActiveTab('map');
            }}
          />
        )}

        {/* MOBILE BOTTOM SHEET FOR SELECTED PLACE */}
        {selectedPlace && (
          <div className="absolute inset-0 z-50 flex flex-col justify-end pointer-events-none">
            {/* Backdrop Scrim - Softened so map is clear and visible behind */}
            <div
              className="absolute inset-0 bg-black/25 backdrop-blur-[1px] transition-opacity duration-300 pointer-events-auto animate-in fade-in"
              onClick={(e) => {
                e.stopPropagation();
                setSelectedPlaceId(null);
              }}
            />
            {/* Sliding Bottom Sheet Card */}
            <div className="relative z-10 w-full animate-in slide-in-from-bottom duration-300 pointer-events-auto">
              <PlaceDetailCard
                place={selectedPlace}
                settings={settings}
                onClose={() => setSelectedPlaceId(null)}
                onUpdatePlace={handleSavePlace}
                onDeletePlace={(id) => {
                  handleDeletePlace(id);
                  setSelectedPlaceId(null);
                }}
                onSelectPhoto={(url, caption) => setLightboxPhoto({ url, caption })}
                onPrevPlace={handlePrevPlace}
                onNextPlace={handleNextPlace}
                onCenterMap={() => {
                  if (activeTab !== 'map') setActiveTab('map');
                }}
                currentIndex={selectedPlaceIndex}
                totalPlaces={currentDayLog?.places.length || 0}
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
