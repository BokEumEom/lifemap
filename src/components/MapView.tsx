import React, { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import {
  Compass,
  Layers,
  Crosshair,
  Maximize2,
  Box,
  Plus,
  Play,
  Pause,
  ChevronLeft,
  ChevronRight,
  ChevronUp,
  ChevronDown,
  MapPin,
  Loader2,
} from 'lucide-react';
import { DayLog, PlaceLog, AppSettings, MapStyle } from '../types';
import { translations, formatDayTitle } from '../i18n/translations';
import { PALETTES, applyPrivacyPrecision } from '../utils/geoUtils';
import { getPlaceName, formatDayStatsSummary } from '../utils/localeUtils';
import { getCurrentGpsPosition } from '../utils/locationService';

interface MapViewProps {
  dayLog?: DayLog;
  settings: AppSettings;
  onUpdateSettings: (newSettings: Partial<AppSettings>) => void;
  selectedPlaceId: string | null;
  onSelectPlace: (id: string | null) => void;
  onUpdatePlace: (updated: PlaceLog) => void;
  onDeletePlace: (id: string) => void;
  onOpenAddModalWithCoords?: (lat: number, lng: number) => void;
  onSelectPhoto: (url: string, caption?: string) => void;
  isSimulating: boolean;
  onToggleSimulate: () => void;
  onExpandTimeline: () => void;
  onPrevDay: () => void;
  onNextDay: () => void;
}

export const MapView: React.FC<MapViewProps> = ({
  dayLog,
  settings,
  onUpdateSettings,
  selectedPlaceId,
  onSelectPlace,
  onUpdatePlace,
  onDeletePlace,
  onOpenAddModalWithCoords,
  onSelectPhoto,
  isSimulating,
  onToggleSimulate,
  onExpandTimeline,
  onPrevDay,
  onNextDay,
}) => {
  const mapContainerRef = useRef<HTMLDivElement | null>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const tileLayerRef = useRef<L.TileLayer | null>(null);
  const polylineRef = useRef<L.Polyline | null>(null);
  const markersRef = useRef<{ [key: string]: L.Marker }>({});
  const simMarkerRef = useRef<L.Marker | null>(null);
  const userGpsMarkerRef = useRef<L.Marker | null>(null);

  const [is3DMode, setIs3DMode] = useState(settings.threeDBuildingView);
  const [showStyleMenu, setShowStyleMenu] = useState(false);
  const [isBottomDrawerExpanded, setIsBottomDrawerExpanded] = useState(false);
  const [clickedCoords, setClickedCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [userGpsLocation, setUserGpsLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [isLocating, setIsLocating] = useState(false);

  const t = translations[settings.language];
  const activePalette = PALETTES[settings.colorTheme] || PALETTES.magenta;

  // Center on place helper
  const handleCenterOnPlace = (place: PlaceLog) => {
    const map = mapInstanceRef.current;
    if (!map) return;
    const { lat, lng } = applyPrivacyPrecision(place.lat, place.lng, settings.privacyPrecision);
    map.flyTo([lat, lng], 17, { animate: true, duration: 0.8 });
  };

  // Auto-pan to selected place when selectedPlaceId changes
  useEffect(() => {
    if (!selectedPlaceId || !dayLog || !mapInstanceRef.current) return;
    const place = dayLog.places.find((p) => p.id === selectedPlaceId);
    if (place) {
      const { lat, lng } = applyPrivacyPrecision(place.lat, place.lng, settings.privacyPrecision);
      mapInstanceRef.current.panTo([lat, lng], { animate: true, duration: 0.5 });
    }
  }, [selectedPlaceId, dayLog, settings.privacyPrecision]);

  // Tile layer URLs
  const getTileUrl = (style: MapStyle, isDarkTheme: boolean): { url: string; attribution: string } => {
    switch (style) {
      case 'dark':
        return {
          url: 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png',
          attribution: '&copy; <a href="https://carto.com/">CARTO</a>',
        };
      case 'voyager':
        return {
          url: 'https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png',
          attribution: '&copy; <a href="https://carto.com/">CARTO</a>',
        };
      case 'satellite':
        return {
          url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
          attribution: '&copy; Esri',
        };
      case 'positron':
      default:
        return {
          url: isDarkTheme
            ? 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png'
            : 'https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png',
          attribution: '&copy; <a href="https://carto.com/">CARTO</a>',
        };
    }
  };

  // Initialize Map
  useEffect(() => {
    if (!mapContainerRef.current) return;

    // Default to Oita center coordinates if none provided
    const initialLat = dayLog?.places?.[0]?.lat || 33.236;
    const initialLng = dayLog?.places?.[0]?.lng || 127.045;

    const map = L.map(mapContainerRef.current, {
      center: [initialLat, initialLng],
      zoom: 16,
      zoomControl: false,
    });

    const isDark = settings.theme === 'dark';
    const tileConfig = getTileUrl(settings.mapStyle, isDark);
    const tileLayer = L.tileLayer(tileConfig.url, {
      maxZoom: 19,
      attribution: tileConfig.attribution,
      subdomains: 'abcd',
    }).addTo(map);

    tileLayerRef.current = tileLayer;
    mapInstanceRef.current = map;

    // Capture map click to allow adding spots at any point
    map.on('click', (e: L.LeafletMouseEvent) => {
      const lat = Number(e.latlng.lat.toFixed(5));
      const lng = Number(e.latlng.lng.toFixed(5));
      setClickedCoords({ lat, lng });
    });

    const resizeObserver = new ResizeObserver(() => {
      map.invalidateSize();
    });
    resizeObserver.observe(mapContainerRef.current);

    return () => {
      resizeObserver.disconnect();
      map.remove();
      mapInstanceRef.current = null;
    };
  }, []);

  // Update Tile Layer when mapStyle or theme changes
  useEffect(() => {
    if (!mapInstanceRef.current || !tileLayerRef.current) return;
    const isDark = settings.theme === 'dark';
    const tileConfig = getTileUrl(settings.mapStyle, isDark);

    mapInstanceRef.current.removeLayer(tileLayerRef.current);
    const newLayer = L.tileLayer(tileConfig.url, {
      maxZoom: 19,
      attribution: tileConfig.attribution,
      subdomains: 'abcd',
    }).addTo(mapInstanceRef.current);

    tileLayerRef.current = newLayer;
  }, [settings.mapStyle, settings.theme]);

  // Update Route Polyline and Photo Pin Markers
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map) return;

    // Clear old markers
    Object.values(markersRef.current).forEach((m: L.Marker) => m.remove());
    markersRef.current = {};

    if (polylineRef.current) {
      polylineRef.current.remove();
      polylineRef.current = null;
    }

    if (!dayLog || (!dayLog.places.length && !dayLog.routePoints.length)) {
      return;
    }

    // Prepare route latlngs
    const points: [number, number][] = [];
    if (dayLog.routePoints && dayLog.routePoints.length > 0) {
      dayLog.routePoints.forEach((pt) => {
        const { lat, lng } = applyPrivacyPrecision(pt.lat, pt.lng, settings.privacyPrecision);
        points.push([lat, lng]);
      });
    } else {
      dayLog.places.forEach((p) => {
        const { lat, lng } = applyPrivacyPrecision(p.lat, p.lng, settings.privacyPrecision);
        points.push([lat, lng]);
      });
    }

    // Draw route line in RONDO Hot Magenta
    if (points.length > 1) {
      const poly = L.polyline(points, {
        color: activePalette.primary || '#FF2D55',
        weight: 5,
        opacity: 0.9,
        smoothFactor: 1.1,
        lineCap: 'round',
        lineJoin: 'round',
      }).addTo(map);

      polylineRef.current = poly;
    }

    const bounds = L.latLngBounds([]);

    dayLog.places.forEach((place, index) => {
      const { lat, lng } = applyPrivacyPrecision(place.lat, place.lng, settings.privacyPrecision);
      bounds.extend([lat, lng]);

      const isSelected = selectedPlaceId === place.id;
      const coverPhoto = place.coverPhotoUrl || place.photos?.[0]?.url;
      const placeName = getPlaceName(place, settings.language);

      // Major spots have a floating white photo card on the map with photo and label!
      // Other spots have circular node badges.
      const hasPhotoCard = Boolean(coverPhoto && (index % 2 === 0 || place.isFavorite || place.photos.length > 0));

      const markerHtml = hasPhotoCard
        ? `
          <div class="map-photo-card ${isSelected ? 'selected ring-2 ring-pink-500 scale-110 shadow-xl' : ''}">
            <img src="${coverPhoto}" class="map-photo-card-img" alt="${placeName}" />
            <div class="map-photo-card-label">${placeName}</div>
          </div>
        `
        : `
          <div class="route-node-badge ${isSelected ? 'scale-125 ring-2 ring-pink-500 shadow-lg' : ''}">
            ${index + 1}
          </div>
        `;

      const customIcon = L.divIcon({
        className: 'custom-photo-pin',
        html: markerHtml,
        iconSize: hasPhotoCard ? [68, 86] : [24, 24],
        iconAnchor: hasPhotoCard ? [34, 86] : [12, 12],
      });

      const marker = L.marker([lat, lng], { icon: customIcon }).addTo(map);
      marker.on('click', () => {
        onSelectPlace(place.id);
        handleCenterOnPlace(place);
      });

      markersRef.current[place.id] = marker;
    });

    // Fit map bounds
    if (bounds.isValid()) {
      map.fitBounds(bounds, { padding: [50, 50], maxZoom: 16, animate: true });
    }
  }, [dayLog, selectedPlaceId, settings.colorTheme, settings.privacyPrecision, settings.language]);

  // Handle Walking Simulation
  useEffect(() => {
    if (!isSimulating || !dayLog || !mapInstanceRef.current) {
      if (simMarkerRef.current) {
        simMarkerRef.current.remove();
        simMarkerRef.current = null;
      }
      return;
    }

    const path = dayLog.routePoints.length > 0
      ? dayLog.routePoints
      : dayLog.places.map((p) => ({ lat: p.lat, lng: p.lng, timestamp: p.arrivalTime }));

    if (path.length === 0) return;

    let idx = 0;
    const interval = setInterval(() => {
      idx = (idx + 1) % path.length;
      const pt = path[idx];
      const { lat, lng } = applyPrivacyPrecision(pt.lat, pt.lng, settings.privacyPrecision);

      const map = mapInstanceRef.current;
      if (map) {
        if (!simMarkerRef.current) {
          const simIcon = L.divIcon({
            className: 'custom-sim-pin',
            html: `
              <div class="relative flex items-center justify-center w-8 h-8">
                <div class="radar-pulse-ring"></div>
                <div class="w-4 h-4 rounded-full bg-white shadow-lg border-2 border-pink-500 bg-pink-500"></div>
              </div>
            `,
            iconSize: [32, 32],
            iconAnchor: [16, 16],
          });
          simMarkerRef.current = L.marker([lat, lng], { icon: simIcon, zIndexOffset: 1000 }).addTo(map);
        } else {
          simMarkerRef.current.setLatLng([lat, lng]);
        }
        map.panTo([lat, lng], { animate: true });
      }
    }, 1600);

    return () => clearInterval(interval);
  }, [isSimulating, dayLog, settings.privacyPrecision]);

  // Center to Route
  const handleFitRoute = () => {
    if (!mapInstanceRef.current || !dayLog || !dayLog.places.length) return;
    const bounds = L.latLngBounds(
      dayLog.places.map((p) => [p.lat, p.lng] as [number, number])
    );
    if (bounds.isValid()) {
      mapInstanceRef.current.fitBounds(bounds, { padding: [50, 50], animate: true });
    }
  };

  // Center to GPS Current Location with Real Live Beacon
  const handleLocateMe = async () => {
    if (!mapInstanceRef.current) return;
    setIsLocating(true);
    try {
      const coords = await getCurrentGpsPosition();
      setUserGpsLocation(coords);
      const map = mapInstanceRef.current;

      if (userGpsMarkerRef.current) {
        userGpsMarkerRef.current.remove();
      }

      const gpsBeaconIcon = L.divIcon({
        className: 'custom-live-gps-pin',
        html: `
          <div class="relative flex items-center justify-center w-10 h-10">
            <div class="absolute inset-0 rounded-full bg-blue-500/30 animate-ping"></div>
            <div class="w-4 h-4 rounded-full bg-blue-600 border-2 border-white shadow-lg flex items-center justify-center">
              <div class="w-1.5 h-1.5 rounded-full bg-white"></div>
            </div>
          </div>
        `,
        iconSize: [40, 40],
        iconAnchor: [20, 20],
      });

      userGpsMarkerRef.current = L.marker([coords.lat, coords.lng], {
        icon: gpsBeaconIcon,
        zIndexOffset: 3000,
      }).addTo(map);

      map.flyTo([coords.lat, coords.lng], 16, { animate: true, duration: 1 });
    } catch (err) {
      console.warn('GPS location request failed', err);
      // Fallback to route or first place
      if (dayLog && dayLog.places.length > 0) {
        const p = dayLog.places[0];
        mapInstanceRef.current.setView([p.lat, p.lng], 16, { animate: true });
      }
    } finally {
      setIsLocating(false);
    }
  };

  // Toggle 3D building perspective
  const toggle3D = () => {
    const next = !is3DMode;
    setIs3DMode(next);
    onUpdateSettings({ threeDBuildingView: next });
  };

  const selectedPlace = dayLog?.places.find((p) => p.id === selectedPlaceId);
  const formattedDate = dayLog?.date ? formatDayTitle(dayLog.date, settings.language) : '';
  const totalPhotos = dayLog?.places.reduce((acc, p) => acc + p.photos.length, 0) || 74;
  const movementKm = dayLog?.summaryMeta?.movementKm || dayLog?.totalDistanceKm || 3.2;

  return (
    <div className="relative w-full h-full flex-1 overflow-hidden select-none">
      {/* Map Canvas with smooth 3D isometric tilt */}
      <div
        className="w-full h-full relative isolate z-0 overflow-hidden transition-transform duration-500 origin-bottom"
        style={
          is3DMode
            ? {
                transform: 'perspective(900px) rotateX(25deg) scale(1.03)',
                transformOrigin: '50% 85%',
              }
            : undefined
        }
      >
        <div ref={mapContainerRef} className="w-full h-full" />
      </div>

      {/* Floating Map Controls on Right (Matching Video) */}
      <div className="absolute top-4 right-3.5 z-30 flex flex-col gap-2">
        {/* Fit route */}
        <button
          id="btn-fit-route"
          onClick={handleFitRoute}
          className="w-9 h-9 rounded-full bg-white/95 dark:bg-stone-900/95 backdrop-blur-md shadow-md border border-stone-200/80 dark:border-stone-800/80 flex items-center justify-center text-stone-700 dark:text-stone-200 hover:bg-white dark:hover:bg-stone-800 transition active:scale-95"
          title={t.map.centerRoute}
        >
          <Maximize2 className="w-4 h-4" />
        </button>

        {/* 3D Perspective Toggle */}
        <button
          id="btn-toggle-3d"
          onClick={toggle3D}
          className={`w-9 h-9 rounded-full backdrop-blur-md shadow-md border flex items-center justify-center transition active:scale-95 ${
            is3DMode
              ? 'bg-pink-600 text-white border-pink-600 shadow-pink-500/30'
              : 'bg-white/95 dark:bg-stone-900/95 border-stone-200/80 dark:border-stone-800/80 text-stone-700 dark:text-stone-200 hover:bg-white'
          }`}
          title={t.map.perspectiveToggle}
        >
          <Box className="w-4 h-4" />
        </button>

        {/* Map Layers Menu */}
        <div className="relative">
          <button
            id="btn-map-style-menu"
            onClick={() => setShowStyleMenu(!showStyleMenu)}
            className="w-9 h-9 rounded-full bg-white/95 dark:bg-stone-900/95 backdrop-blur-md shadow-md border border-stone-200/80 dark:border-stone-800/80 flex items-center justify-center text-stone-700 dark:text-stone-200 hover:bg-white dark:hover:bg-stone-800 transition active:scale-95"
            title={t.map.styleSelect}
          >
            <Layers className="w-4 h-4" />
          </button>

          {showStyleMenu && (
            <div className="absolute right-0 top-11 bg-white dark:bg-stone-900 rounded-2xl shadow-xl border border-stone-200 dark:border-stone-800 p-2 z-50 w-40 space-y-1 animate-in fade-in zoom-in-95">
              {[
                { id: 'positron', label: t.map.stylePositron },
                { id: 'dark', label: t.map.styleDark },
                { id: 'voyager', label: t.map.styleVoyager },
                { id: 'satellite', label: t.map.styleSatellite },
              ].map((style) => (
                <button
                  key={style.id}
                  onClick={() => {
                    onUpdateSettings({ mapStyle: style.id as MapStyle });
                    setShowStyleMenu(false);
                  }}
                  className={`w-full text-left px-2.5 py-1.5 rounded-lg text-xs font-medium transition ${
                    settings.mapStyle === style.id
                      ? 'bg-pink-50 dark:bg-pink-950/70 text-pink-700 dark:text-pink-300 font-semibold'
                      : 'hover:bg-stone-100 dark:hover:bg-stone-800 text-stone-700 dark:text-stone-300'
                  }`}
                >
                  {style.label}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Compass Needle (Video Matching) */}
        <button
          onClick={() => {
            mapInstanceRef.current?.setBearing ? mapInstanceRef.current.setBearing(0) : mapInstanceRef.current?.setView(mapInstanceRef.current.getCenter(), 16);
          }}
          className="w-9 h-9 rounded-full bg-white/95 dark:bg-stone-900/95 backdrop-blur-md shadow-md border border-stone-200/80 dark:border-stone-800/80 flex flex-col items-center justify-center transition active:scale-95"
          title="Compass North"
        >
          <Compass className="w-4 h-4 text-rose-500" />
          <span className="text-[8px] font-bold text-stone-600 dark:text-stone-300 leading-none">
            {settings.language === 'ko' ? '북' : (t.map.north || '北')}
          </span>
        </button>

        {/* Locate GPS Arrow */}
        <button
          id="btn-locate-gps"
          onClick={handleLocateMe}
          disabled={isLocating}
          className="w-9 h-9 rounded-full bg-white/95 dark:bg-stone-900/95 backdrop-blur-md shadow-md border border-stone-200/80 dark:border-stone-800/80 flex items-center justify-center text-blue-600 dark:text-blue-400 hover:bg-white dark:hover:bg-stone-800 transition active:scale-95 disabled:opacity-75"
          title={t.map.currentLocation}
        >
          {isLocating ? (
            <Loader2 className="w-4 h-4 animate-spin text-blue-600 dark:text-blue-400" />
          ) : (
            <Crosshair className="w-4 h-4" />
          )}
        </button>
      </div>

      {/* Top Left Floating: Simulation Walking Button (Moved from bottom to keep map clear) */}
      <div className="absolute top-4 left-3.5 z-30 flex items-center gap-2">
        <button
          onClick={onToggleSimulate}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold shadow-md backdrop-blur-md transition active:scale-95 border ${
            isSimulating
              ? 'bg-amber-500 border-amber-600 text-white animate-pulse'
              : 'bg-white/95 dark:bg-stone-900/95 text-stone-700 dark:text-stone-300 border-stone-200/90 dark:border-stone-800/90 hover:bg-stone-50'
          }`}
          title={isSimulating ? t.header.stopSimulate : t.header.simulateWalk}
        >
          {isSimulating ? (
            <>
              <Pause className="w-3.5 h-3.5 fill-current" />
              <span>{t.header.stopSimulate}</span>
            </>
          ) : (
            <>
              <Play className="w-3.5 h-3.5 fill-current text-pink-600" />
              <span>{t.header.simulateWalk}</span>
            </>
          )}
        </button>

        {/* Live GPS Active Status Pill */}
        {userGpsLocation && (
          <div className="hidden sm:flex items-center gap-1.5 bg-blue-50/90 dark:bg-blue-950/80 border border-blue-200 dark:border-blue-800/70 text-blue-700 dark:text-blue-300 px-2.5 py-1 rounded-full text-[11px] font-semibold backdrop-blur-md shadow-xs animate-in fade-in">
            <span className="w-2 h-2 rounded-full bg-blue-500 animate-pulse" />
            <span>GPS 감지됨</span>
          </div>
        )}
      </div>

      {/* Interactive Map Click Banner: Add place at clicked location */}
      {clickedCoords && (
        <div className="absolute top-14 left-3 right-3 sm:left-4 sm:right-auto z-35 sm:max-w-sm bg-white/95 dark:bg-stone-900/95 backdrop-blur-md rounded-2xl shadow-xl border border-stone-200/90 dark:border-stone-800/90 p-2.5 sm:p-3 flex items-center justify-between gap-2 animate-in slide-in-from-top-2 duration-150">
          <div className="flex items-center gap-2 min-w-0">
            <div className="w-7 h-7 rounded-xl bg-pink-100 dark:bg-pink-950/70 text-pink-600 flex items-center justify-center flex-shrink-0">
              <MapPin className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <p className="text-xs font-bold text-stone-900 dark:text-white truncate">
                {settings.language === 'ko' ? '지도에서 선택한 위치' : 'Selected Map Point'}
              </p>
              <p className="text-[10px] text-stone-500 font-mono truncate">
                {clickedCoords.lat}, {clickedCoords.lng}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-1 flex-shrink-0">
            <button
              onClick={() => {
                onOpenAddModalWithCoords?.(clickedCoords.lat, clickedCoords.lng);
                setClickedCoords(null);
              }}
              className="px-2.5 py-1.5 rounded-xl bg-pink-600 hover:bg-pink-700 text-white text-[11px] font-bold shadow-xs transition active:scale-95 flex items-center gap-1"
            >
              <Plus className="w-3 h-3" />
              <span>{settings.language === 'ko' ? '장소 추가' : 'Add Place'}</span>
            </button>
            <button
              onClick={() => setClickedCoords(null)}
              className="w-6 h-6 rounded-full flex items-center justify-center text-stone-400 hover:text-stone-700 dark:hover:text-stone-200 text-xs"
            >
              ×
            </button>
          </div>
        </div>
      )}

      {/* Apple Maps Watermark & Scale Bar at Bottom Left (Subtle) */}
      <div className="absolute bottom-14 sm:bottom-16 left-3.5 z-10 pointer-events-none flex flex-col gap-0.5">
        <div className="text-[9px] text-stone-500 dark:text-stone-400 font-medium bg-white/70 dark:bg-stone-900/70 px-1.5 py-0.5 rounded backdrop-blur-sm shadow-xs inline-block">
          {settings.language === 'ko' ? '지도 법률 정보' : (t.map.appleMapsNotice || 'マップ 法律に基づく情報')}
        </div>
        <div className="flex items-center gap-1 text-[8px] text-stone-400 font-mono">
          <span>0</span>
          <span className="w-6 h-[1.5px] bg-stone-400 inline-block" />
          <span>25 m</span>
        </div>
      </div>

      {/* COLLAPSIBLE BOTTOM DRAWER - Only shown when no specific place bottom sheet is open */}
      {!selectedPlaceId && (
        <div className="absolute bottom-2 left-2 right-2 sm:left-4 sm:right-4 z-30 transition-all duration-300 ease-in-out">
        {isBottomDrawerExpanded ? (
          /* EXPANDED VIEW: Full carousel of places */
          <div className="w-full bg-white/95 dark:bg-stone-900/95 backdrop-blur-md rounded-3xl p-3 shadow-xl border border-stone-200/90 dark:border-stone-800/90 transition animate-in slide-in-from-bottom-2">
            {/* Top Bar with Collapse Button */}
            <div className="flex items-center justify-between pb-2 mb-2 border-b border-stone-100 dark:border-stone-800">
              <div className="flex items-center gap-1.5">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onPrevDay();
                  }}
                  className="w-6 h-6 rounded-full bg-stone-100 dark:bg-stone-800 flex items-center justify-center text-stone-600 dark:text-stone-300 hover:bg-stone-200 transition"
                  title={t.header.yesterday}
                >
                  <ChevronLeft className="w-3.5 h-3.5" />
                </button>

                <div>
                  <h3 className="text-xs sm:text-sm font-bold text-stone-900 dark:text-white flex items-center gap-1">
                    <span className="text-[10px] text-pink-500">▲</span>
                    <span>{formattedDate}</span>
                  </h3>
                  <p className="text-[10px] text-stone-500 dark:text-stone-400 font-medium">
                    {formatDayStatsSummary(dayLog?.places.length || 0, totalPhotos, movementKm, settings.language)}
                  </p>
                </div>

                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onNextDay();
                  }}
                  className="w-6 h-6 rounded-full bg-stone-100 dark:bg-stone-800 flex items-center justify-center text-stone-600 dark:text-stone-300 hover:bg-stone-200 transition"
                  title={t.header.tomorrow}
                >
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>
              </div>

              {/* Action buttons: Collapse Map & Timeline Log */}
              <div className="flex items-center gap-1.5">
                <button
                  onClick={() => setIsBottomDrawerExpanded(false)}
                  className="flex items-center gap-1 text-[11px] font-semibold text-stone-600 dark:text-stone-300 hover:text-stone-900 bg-stone-100 dark:bg-stone-800 px-2.5 py-1 rounded-full transition active:scale-95"
                  title="지도 넓게 보기"
                >
                  <span>{settings.language === 'ko' ? '지도 접기' : 'Collapse'}</span>
                  <ChevronDown className="w-3.5 h-3.5 text-stone-400" />
                </button>
                <button
                  onClick={onExpandTimeline}
                  className="flex items-center gap-1 text-[11px] font-bold text-pink-600 dark:text-pink-400 hover:text-pink-700 bg-pink-50 dark:bg-pink-950/50 px-2.5 py-1 rounded-full transition active:scale-95"
                >
                  <span>{settings.language === 'ko' ? '로그' : 'Timeline'}</span>
                  <ChevronUp className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            {/* Saved Places Horizontal Carousel */}
            {dayLog && dayLog.places.length > 0 ? (
              <div>
                <div className="flex items-center justify-between mb-1.5 px-1">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-stone-500 dark:text-stone-400">
                    {settings.language === 'ko' ? '저장된 스팟' : 'Saved Spots'} ({dayLog.places.length})
                  </span>
                  <span className="text-[9px] text-stone-400">
                    {settings.language === 'ko' ? '스팟을 탭하여 이동' : 'Tap to focus'}
                  </span>
                </div>

                <div className="flex items-center gap-2 overflow-x-auto no-scrollbar pb-1 pt-0.5">
                  {dayLog.places.map((place, idx) => {
                    const isPlaceSelected = selectedPlaceId === place.id;
                    const thumb = place.coverPhotoUrl || place.photos?.[0]?.url;
                    const placeName = getPlaceName(place, settings.language);

                    return (
                      <button
                        key={place.id}
                        onClick={() => {
                          onSelectPlace(place.id);
                          handleCenterOnPlace(place);
                        }}
                        className={`flex items-center gap-2 p-1.5 pr-3 rounded-2xl border transition-all duration-200 flex-shrink-0 text-left active:scale-95 ${
                          isPlaceSelected
                            ? 'bg-pink-50 dark:bg-pink-950/70 border-pink-500 shadow-sm ring-1 ring-pink-500/50'
                            : 'bg-stone-50 dark:bg-stone-800/80 border-stone-200/60 dark:border-stone-700/60 hover:border-stone-300 dark:hover:border-stone-600'
                        }`}
                      >
                        {/* Photo Thumbnail or Number Circle */}
                        <div className="relative w-9 h-9 rounded-xl overflow-hidden bg-stone-200 dark:bg-stone-700 flex-shrink-0 flex items-center justify-center shadow-xs">
                          {thumb ? (
                            <img
                              src={thumb}
                              alt={placeName}
                              referrerPolicy="no-referrer"
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <span className="text-xs font-bold text-stone-600 dark:text-stone-300">
                              {idx + 1}
                            </span>
                          )}
                          <span className="absolute -top-1 -left-1 w-4 h-4 rounded-full bg-stone-900/80 text-white text-[9px] font-bold flex items-center justify-center">
                            {idx + 1}
                          </span>
                        </div>

                        {/* Text info */}
                        <div className="min-w-0 max-w-[120px]">
                          <p className="text-xs font-bold text-stone-900 dark:text-white truncate leading-tight">
                            {placeName}
                          </p>
                          <p className="text-[10px] text-stone-400 dark:text-stone-500 truncate mt-0.5">
                            {place.arrivalTime} · {t.categories[place.category] || place.category}
                          </p>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            ) : (
              <p className="text-xs text-stone-400 py-1 text-center">
                {settings.language === 'ko' ? '아직 기록된 스팟이 없습니다. 상단 + 버튼 또는 지도를 탭해 추가하세요.' : 'No spots yet. Tap map or + to add.'}
              </p>
            )}
          </div>
        ) : (
          /* COMPACT VIEW: Minimal sleek bar leaving the whole map clear */
          <div className="w-full bg-white/95 dark:bg-stone-900/95 backdrop-blur-md rounded-2xl px-3 py-2 shadow-lg border border-stone-200/90 dark:border-stone-800/90 flex items-center justify-between gap-2 transition animate-in fade-in">
            {/* Date Navigator */}
            <div className="flex items-center gap-1.5 min-w-0">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onPrevDay();
                }}
                className="w-6 h-6 rounded-full bg-stone-100 dark:bg-stone-800 flex items-center justify-center text-stone-600 dark:text-stone-300 hover:bg-stone-200 transition"
                title={t.header.yesterday}
              >
                <ChevronLeft className="w-3.5 h-3.5" />
              </button>

              <div
                onClick={() => setIsBottomDrawerExpanded(true)}
                className="cursor-pointer min-w-0"
              >
                <h3 className="text-xs font-bold text-stone-900 dark:text-white flex items-center gap-1 truncate">
                  <span className="text-[10px] text-pink-500">▲</span>
                  <span>{formattedDate}</span>
                </h3>
                <p className="text-[10px] text-stone-500 dark:text-stone-400 font-medium truncate">
                  {formatDayStatsSummary(dayLog?.places.length || 0, totalPhotos, movementKm, settings.language)}
                </p>
              </div>

              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onNextDay();
                }}
                className="w-6 h-6 rounded-full bg-stone-100 dark:bg-stone-800 flex items-center justify-center text-stone-600 dark:text-stone-300 hover:bg-stone-200 transition"
                title={t.header.tomorrow}
              >
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Expand Spots List & Full Log Buttons */}
            <div className="flex items-center gap-1.5 flex-shrink-0">
              <button
                onClick={() => setIsBottomDrawerExpanded(true)}
                className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-stone-100 dark:bg-stone-800 hover:bg-stone-200 dark:hover:bg-stone-700 text-stone-700 dark:text-stone-300 text-[11px] font-bold transition active:scale-95"
              >
                <span>{settings.language === 'ko' ? `스팟 목록 (${dayLog?.places.length || 0})` : `Spots (${dayLog?.places.length || 0})`}</span>
                <ChevronUp className="w-3.5 h-3.5 text-stone-500" />
              </button>
              <button
                onClick={onExpandTimeline}
                className="px-2.5 py-1.5 rounded-xl bg-pink-50 dark:bg-pink-950/60 hover:bg-pink-100 text-pink-600 dark:text-pink-400 text-[11px] font-bold transition active:scale-95"
              >
                {settings.language === 'ko' ? '로그' : 'Timeline'}
              </button>
            </div>
          </div>
        )}
      </div>
      )}
    </div>
  );
};
