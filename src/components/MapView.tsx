import React, { useEffect, useRef, useState, useMemo } from 'react';
import L from 'leaflet';
import {
  Compass,
  Layers,
  Crosshair,
  Maximize2,
  Plus,
  Play,
  Pause,
  ChevronLeft,
  ChevronRight,
  ChevronUp,
  ChevronDown,
  MapPin,
  Loader2,
  Clock,
  Sparkles,
  Footprints,
  Navigation,
  Heart,
  Star,
  ExternalLink,
  Info,
} from 'lucide-react';
import { DayLog, PlaceLog, AppSettings, MapStyle } from '../types';
import { translations, formatDayTitle } from '../i18n/translations';
import { PALETTES, applyPrivacyPrecision } from '../utils/geoUtils';
import { getPlaceName, getPlaceAddress, getPlaceNote, formatDayStatsSummary } from '../utils/localeUtils';
import { getCurrentGpsPosition } from '../utils/locationService';
import { generate3DBuildings } from '../utils/building3DService';
import { ThreeDBuildingCanvas } from './ThreeDBuildingCanvas';

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
  onSelectDate?: (date: string) => void;
  availableDates?: string[];
}

type BottomSheetSnap = 'collapsed' | 'peek' | 'expanded';

export const MapView: React.FC<MapViewProps> = ({
  dayLog,
  settings,
  onUpdateSettings,
  selectedPlaceId,
  onSelectPlace,
  onOpenAddModalWithCoords,
  onSelectPhoto,
  isSimulating,
  onToggleSimulate,
  onPrevDay,
  onNextDay,
  onSelectDate,
}) => {
  const mapContainerRef = useRef<HTMLDivElement | null>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const [map, setMap] = useState<L.Map | null>(null);
  const tileLayerRef = useRef<L.TileLayer | null>(null);
  const routePolylineRef = useRef<L.Polyline | null>(null);
  const markersRef = useRef<Record<string, L.Marker>>({});
  const simMarkerRef = useRef<L.Marker | null>(null);
  const userGpsMarkerRef = useRef<L.Marker | null>(null);

  // 3-state Interactive Bottom Sheet: 'collapsed' (76px) | 'peek' (310px) | 'expanded' (full vertical timeline 80vh)
  const [sheetSnap, setSheetSnap] = useState<BottomSheetSnap>('peek');
  const [is3DMode, setIs3DMode] = useState<boolean>(settings.threeDBuildingView ?? false);
  const [showStyleMenu, setShowStyleMenu] = useState<boolean>(false);
  const [clickedCoords, setClickedCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [userGpsLocation, setUserGpsLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [isLocating, setIsLocating] = useState<boolean>(false);

  // Drag tracking refs for smooth sheet dragging
  const dragStartYRef = useRef<number | null>(null);
  const currentSnapRef = useRef<BottomSheetSnap>('peek');
  currentSnapRef.current = sheetSnap;

  // Refs for auto-scrolling timeline cards
  const timelineItemRefs = useRef<Record<string, HTMLDivElement | null>>({});
  const carouselItemRefs = useRef<Record<string, HTMLButtonElement | null>>({});

  // Synchronize 3D state with settings
  useEffect(() => {
    setIs3DMode(settings.threeDBuildingView ?? false);
  }, [settings.threeDBuildingView]);

  // Generate 3D building models for spots and surrounding streetscapes
  const buildings3D = useMemo(() => {
    return generate3DBuildings(dayLog?.places || [], dayLog?.routePoints || []);
  }, [dayLog?.places, dayLog?.routePoints]);

  const t = translations[settings.language];
  const activePalette = PALETTES[settings.colorTheme] || PALETTES.magenta;
  const lastFittedDayRef = useRef<string | null>(null);

  // Helper to center on a specific place
  const handleCenterOnPlace = (place: PlaceLog, zoom = 17) => {
    if (!mapInstanceRef.current) return;
    const { lat, lng } = applyPrivacyPrecision(place.lat, place.lng, settings.privacyPrecision);
    mapInstanceRef.current.flyTo([lat, lng], zoom, {
      duration: 0.8,
    });
  };

  // 1. Initialize Leaflet Map
  useEffect(() => {
    if (!mapContainerRef.current) return;

    if ((mapContainerRef.current as any)._leaflet_id) {
      delete (mapContainerRef.current as any)._leaflet_id;
    }

    const initialLat = dayLog?.places?.[0]?.lat || 37.5445;
    const initialLng = dayLog?.places?.[0]?.lng || 127.056;

    try {
      const createdMap = L.map(mapContainerRef.current, {
        center: [initialLat, initialLng],
        zoom: 16,
        zoomControl: false,
        attributionControl: false,
      });

      mapInstanceRef.current = createdMap;
      setMap(createdMap);

      createdMap.on('click', (e: L.LeafletMouseEvent) => {
        setClickedCoords({
          lat: Number(e.latlng.lat.toFixed(5)),
          lng: Number(e.latlng.lng.toFixed(5)),
        });
      });

      const resizeObserver = new ResizeObserver(() => {
        if (mapInstanceRef.current) {
          mapInstanceRef.current.invalidateSize();
        }
      });
      resizeObserver.observe(mapContainerRef.current);

      return () => {
        resizeObserver.disconnect();
        if (mapInstanceRef.current) {
          mapInstanceRef.current.remove();
          mapInstanceRef.current = null;
        }
        setMap(null);
      };
    } catch (err) {
      console.error('Leaflet initialization error:', err);
    }
  }, []);

  // 2. Tile Layer Update
  useEffect(() => {
    if (!map) return;

    if (tileLayerRef.current) {
      map.removeLayer(tileLayerRef.current);
      tileLayerRef.current = null;
    }

    const isDark = settings.theme === 'dark';
    let tileUrl = 'https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png';
    let subdomains = ['a', 'b', 'c', 'd'];
    let maxZoom = 20;

    if (settings.mapStyle === 'dark' || (settings.mapStyle === 'positron' && isDark)) {
      tileUrl = 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png';
    } else if (settings.mapStyle === 'voyager') {
      tileUrl = 'https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png';
    } else if (settings.mapStyle === 'satellite') {
      tileUrl = 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}';
      subdomains = [];
      maxZoom = 19;
    }

    const layer = L.tileLayer(tileUrl, {
      maxZoom,
      subdomains: subdomains.length > 0 ? subdomains : ['a'],
      keepBuffer: 4,
    });

    layer.addTo(map);
    tileLayerRef.current = layer;
  }, [map, settings.mapStyle, settings.theme]);

  // 3. Draw Route Polyline
  useEffect(() => {
    if (!map) return;

    if (routePolylineRef.current) {
      map.removeLayer(routePolylineRef.current);
      routePolylineRef.current = null;
    }

    const routeLatLngs: [number, number][] = [];
    if (dayLog?.routePoints && dayLog.routePoints.length > 0) {
      dayLog.routePoints.forEach((pt) => {
        const { lat, lng } = applyPrivacyPrecision(pt.lat, pt.lng, settings.privacyPrecision);
        routeLatLngs.push([lat, lng]);
      });
    } else if (dayLog?.places) {
      dayLog.places.forEach((p) => {
        const { lat, lng } = applyPrivacyPrecision(p.lat, p.lng, settings.privacyPrecision);
        routeLatLngs.push([lat, lng]);
      });
    }

    if (routeLatLngs.length > 1) {
      const polyline = L.polyline(routeLatLngs, {
        color: activePalette.primary || '#FF2D55',
        weight: 5,
        opacity: 0.88,
        lineCap: 'round',
        lineJoin: 'round',
      }).addTo(map);

      routePolylineRef.current = polyline;
    }
  }, [map, dayLog, activePalette, settings.privacyPrecision]);

  // 4. Update Photo Pin Markers
  useEffect(() => {
    if (!map) return;

    Object.values(markersRef.current).forEach((m) => {
      map.removeLayer(m);
    });
    markersRef.current = {};

    if (!dayLog || (!dayLog.places.length && !dayLog.routePoints?.length)) return;

    const latLngBounds: [number, number][] = [];

    dayLog.places.forEach((place, index) => {
      const { lat, lng } = applyPrivacyPrecision(place.lat, place.lng, settings.privacyPrecision);
      latLngBounds.push([lat, lng]);

      const isSelected = selectedPlaceId === place.id;
      const coverPhoto = place.coverPhotoUrl || place.photos?.[0]?.url;
      const placeName = getPlaceName(place, settings.language);
      const hasPhotoCard = Boolean(coverPhoto);

      const markerHtml = hasPhotoCard
        ? `
          <div class="map-photo-pin ${isSelected ? 'selected' : ''}">
            <div class="map-photo-card">
              <img src="${coverPhoto}" class="map-photo-card-img" alt="${placeName}" loading="lazy" />
              <span class="map-photo-card-idx">${index + 1}</span>
            </div>
            <div class="map-photo-label-outside">${placeName}</div>
            <div class="map-photo-pin-tail"></div>
          </div>
        `
        : `
          <div class="route-node-badge ${isSelected ? 'selected' : ''}">
            ${index + 1}
          </div>
        `;

      const customIcon = L.divIcon({
        className: 'custom-photo-pin',
        html: markerHtml,
        iconSize: hasPhotoCard ? [60, 85] : [30, 30],
        iconAnchor: hasPhotoCard ? [30, 85] : [15, 15],
      });

      const marker = L.marker([lat, lng], { icon: customIcon })
        .addTo(map)
        .on('click', (e) => {
          L.DomEvent.stopPropagation(e);
          onSelectPlace(place.id);
          handleCenterOnPlace(place);
          // Auto scroll into view on the carousel or timeline
          if (carouselItemRefs.current[place.id]) {
            carouselItemRefs.current[place.id]?.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' });
          }
          if (sheetSnap === 'collapsed') {
            setSheetSnap('peek');
          }
        });

      markersRef.current[place.id] = marker;
    });

    if (dayLog.routePoints) {
      dayLog.routePoints.forEach((pt) => {
        const { lat, lng } = applyPrivacyPrecision(pt.lat, pt.lng, settings.privacyPrecision);
        latLngBounds.push([lat, lng]);
      });
    }

    if (latLngBounds.length > 0 && (!lastFittedDayRef.current || lastFittedDayRef.current !== dayLog.date)) {
      lastFittedDayRef.current = dayLog.date;
      const bounds = L.latLngBounds(latLngBounds);
      map.fitBounds(bounds, {
        paddingTopLeft: [50, 60],
        paddingBottomRight: [50, sheetSnap === 'peek' ? 240 : 100],
        maxZoom: 16.5,
        animate: false,
      });
    }
  }, [map, dayLog, selectedPlaceId, settings.language, settings.privacyPrecision]);

  // 5. Update marker selection highlight
  useEffect(() => {
    Object.entries(markersRef.current).forEach(([id, markerInstance]) => {
      const marker = markerInstance as L.Marker;
      const el = marker?.getElement ? marker.getElement() : null;
      if (!el) return;
      const isSelected = id === selectedPlaceId;
      const pinEl = el.querySelector('.map-photo-pin');
      const badgeEl = el.querySelector('.route-node-badge');

      if (pinEl) {
        if (isSelected) {
          pinEl.classList.add('selected');
          el.style.zIndex = '1000';
        } else {
          pinEl.classList.remove('selected');
          el.style.zIndex = '';
        }
      } else if (badgeEl) {
        if (isSelected) {
          badgeEl.classList.add('selected');
          el.style.zIndex = '1000';
        } else {
          badgeEl.classList.remove('selected');
          el.style.zIndex = '';
        }
      }
    });

    // If a place is selected and timeline is expanded, scroll to it smoothly
    if (selectedPlaceId) {
      if (timelineItemRefs.current[selectedPlaceId]) {
        timelineItemRefs.current[selectedPlaceId]?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
      if (carouselItemRefs.current[selectedPlaceId]) {
        carouselItemRefs.current[selectedPlaceId]?.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' });
      }
    }
  }, [selectedPlaceId]);

  // 6. Walking simulation marker
  useEffect(() => {
    if (!isSimulating || !dayLog || !map) {
      if (simMarkerRef.current) {
        map.removeLayer(simMarkerRef.current);
        simMarkerRef.current = null;
      }
      return;
    }

    const route =
      dayLog.routePoints && dayLog.routePoints.length > 0
        ? dayLog.routePoints
        : dayLog.places.map((p) => ({ lat: p.lat, lng: p.lng, timestamp: p.arrivalTime }));

    if (route.length === 0) return;

    let stepIndex = 0;
    const interval = setInterval(() => {
      if (stepIndex >= route.length) {
        stepIndex = 0;
      }
      const pt = route[stepIndex];
      const { lat, lng } = applyPrivacyPrecision(pt.lat, pt.lng, settings.privacyPrecision);

      if (simMarkerRef.current) {
        simMarkerRef.current.setLatLng([lat, lng]);
      } else {
        const simIcon = L.divIcon({
          className: 'sim-walking-icon',
          html: '<div class="w-7 h-7 rounded-full bg-pink-600 border-2 border-white shadow-xl flex items-center justify-center text-sm shadow-pink-500/40 animate-pulse">🚶</div>',
          iconSize: [28, 28],
          iconAnchor: [14, 14],
        });
        simMarkerRef.current = L.marker([lat, lng], { icon: simIcon, zIndexOffset: 2000 }).addTo(map);
      }
      stepIndex++;
    }, 450);

    return () => {
      clearInterval(interval);
      if (simMarkerRef.current && map) {
        map.removeLayer(simMarkerRef.current);
        simMarkerRef.current = null;
      }
    };
  }, [isSimulating, dayLog, map, settings.privacyPrecision]);

  // Fit Route Action
  const handleFitRoute = () => {
    if (!map || !dayLog) return;
    const latLngs: [number, number][] = [];
    dayLog.places.forEach((p) => {
      const { lat, lng } = applyPrivacyPrecision(p.lat, p.lng, settings.privacyPrecision);
      latLngs.push([lat, lng]);
    });
    if (dayLog.routePoints) {
      dayLog.routePoints.forEach((pt) => {
        const { lat, lng } = applyPrivacyPrecision(pt.lat, pt.lng, settings.privacyPrecision);
        latLngs.push([lat, lng]);
      });
    }

    if (latLngs.length > 0) {
      const bounds = L.latLngBounds(latLngs);
      map.fitBounds(bounds, {
        paddingTopLeft: [50, 60],
        paddingBottomRight: [50, sheetSnap === 'peek' ? 240 : 100],
        maxZoom: 16.5,
        animate: true,
      });
    }
  };

  // Toggle 3D Perspective Mode
  const toggle3D = () => {
    const next = !is3DMode;
    setIs3DMode(next);
    onUpdateSettings({ threeDBuildingView: next });

    if (map) {
      setTimeout(() => {
        map.invalidateSize();
      }, 150);
    }
  };

  // Locate Current GPS Location
  const handleLocateMe = async () => {
    setIsLocating(true);
    try {
      const pos = await getCurrentGpsPosition();
      const coords = { lat: pos.lat, lng: pos.lng };
      setUserGpsLocation(coords);

      if (map) {
        map.flyTo([coords.lat, coords.lng], 17, { duration: 0.9 });

        if (userGpsMarkerRef.current) {
          userGpsMarkerRef.current.setLatLng([coords.lat, coords.lng]);
        } else {
          const gpsIcon = L.divIcon({
            className: 'user-gps-marker',
            html: '<div class="w-4 h-4 rounded-full bg-blue-500 border-2 border-white shadow-lg ring-4 ring-blue-400/30 animate-pulse"></div>',
            iconSize: [16, 16],
            iconAnchor: [8, 8],
          });
          userGpsMarkerRef.current = L.marker([coords.lat, coords.lng], {
            icon: gpsIcon,
            zIndexOffset: 1500,
          }).addTo(map);
        }
      }
    } catch {
      if (dayLog?.places?.[0]) {
        handleCenterOnPlace(dayLog.places[0]);
      }
    } finally {
      setIsLocating(false);
    }
  };

  // Timeline Card Click Handler (Satisfying User Requirement 1: Map Camera flies, Marker highlights, Card focuses)
  const handleTimelineCardClick = (place: PlaceLog) => {
    onSelectPlace(place.id);
    handleCenterOnPlace(place);
    // If the user clicks a card while in full expanded view, snap to peek so map + place are visible together
    if (sheetSnap === 'expanded') {
      setSheetSnap('peek');
    }
  };

  // Drag Gesture Handlers for Bottom Sheet
  const handleTouchStart = (e: React.TouchEvent | React.MouseEvent) => {
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;
    dragStartYRef.current = clientY;
  };

  const handleTouchEnd = (e: React.TouchEvent | React.MouseEvent) => {
    if (dragStartYRef.current === null) return;
    const clientY = 'changedTouches' in e ? e.changedTouches[0].clientY : e.clientY;
    const deltaY = clientY - dragStartYRef.current;
    dragStartYRef.current = null;

    // Threshold of 35px for snap transition
    if (deltaY < -35) {
      // Swiped UP -> expand
      if (currentSnapRef.current === 'collapsed') setSheetSnap('peek');
      else if (currentSnapRef.current === 'peek') setSheetSnap('expanded');
    } else if (deltaY > 35) {
      // Swiped DOWN -> collapse
      if (currentSnapRef.current === 'expanded') setSheetSnap('peek');
      else if (currentSnapRef.current === 'peek') setSheetSnap('collapsed');
    }
  };

  const formattedDate = dayLog?.date ? formatDayTitle(dayLog.date, settings.language) : '';
  const totalPhotos = dayLog?.places ? dayLog.places.reduce((acc, p) => acc + (p.photos?.length || 0), 0) : 0;
  const movementKm = dayLog?.summaryMeta?.movementKm || dayLog?.totalDistanceKm || 5.4;

  return (
    <div className="relative w-full h-full flex-1 overflow-hidden select-none">
      {/* Empty State Banner if current date has no spots */}
      {(!dayLog || dayLog.places.length === 0) && (
        <div className="absolute top-16 left-3 right-3 sm:left-6 sm:right-6 z-40 max-w-md mx-auto bg-white/95 dark:bg-stone-900/95 backdrop-blur-md rounded-3xl p-5 shadow-2xl border border-stone-200/90 dark:border-stone-800/90 text-center animate-in fade-in zoom-in-95 duration-200">
          <div className="w-12 h-12 rounded-2xl bg-pink-50 dark:bg-pink-950/60 text-pink-600 dark:text-pink-400 mx-auto flex items-center justify-center mb-3">
            <MapPin className="w-6 h-6" />
          </div>
          <h3 className="text-sm font-black text-stone-900 dark:text-white mb-1">
            {settings.language === 'ko' ? '선택한 날짜에 기록된 장소가 없습니다' : 'No spots on this date'}
          </h3>
          <p className="text-xs text-stone-500 dark:text-stone-400 mb-4 leading-relaxed">
            {settings.language === 'ko'
              ? '서울 성수동 또는 북촌 투어 데이터를 선택하여 타임라인을 확인해보세요.'
              : 'Switch to a date with tour data to explore the timeline and route.'}
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-2">
            <button
              onClick={() => onSelectDate?.('2026-09-18')}
              className="w-full sm:w-auto px-4 py-2.5 rounded-xl bg-gradient-to-r from-pink-600 to-rose-500 text-white text-xs font-bold shadow-md hover:opacity-90 active:scale-95 transition"
            >
              📍 9월 18일 성수동 & 서울숲 투어 (9곳)
            </button>
            <button
              onClick={() => onSelectDate?.('2026-09-17')}
              className="w-full sm:w-auto px-4 py-2.5 rounded-xl bg-stone-100 dark:bg-stone-800 text-stone-700 dark:text-stone-300 text-xs font-bold hover:bg-stone-200 dark:hover:bg-stone-700 active:scale-95 transition"
            >
              🏛️ 9월 17일 종로 북촌 한옥마을 (5곳)
            </button>
          </div>
        </div>
      )}

      {/* Map Container Stage */}
      <div className={`w-full h-full relative ${is3DMode ? 'map-3d-stage' : ''}`}>
        <div ref={mapContainerRef} className="w-full h-full z-0" />

        {/* Real 3D Building Extrusion & Shadows Canvas */}
        <ThreeDBuildingCanvas
          map={map}
          buildings={buildings3D}
          is3DMode={is3DMode}
          theme={settings.theme}
          selectedPlaceId={selectedPlaceId}
          onSelectPlace={(id) => onSelectPlace(id)}
          language={settings.language}
        />
      </div>

      {/* Floating Map Controls on Right (Apple Maps Style) */}
      <div className="absolute top-4 right-3.5 z-30 flex flex-col gap-2">
        {/* Fit route button */}
        <button
          id="btn-fit-route"
          onClick={handleFitRoute}
          className="w-9 h-9 rounded-full bg-white/95 dark:bg-stone-900/95 backdrop-blur-md shadow-md border border-stone-200/80 dark:border-stone-800/80 flex items-center justify-center text-stone-700 dark:text-stone-200 hover:bg-white dark:hover:bg-stone-800 transition active:scale-95"
          title={t.map.centerRoute}
        >
          <Maximize2 className="w-4 h-4" />
        </button>

        {/* 3D / 2D Perspective Toggle Button (Video Matching) */}
        <button
          id="btn-toggle-3d"
          onClick={toggle3D}
          className={`w-9 h-9 rounded-full backdrop-blur-md shadow-md border flex items-center justify-center transition active:scale-95 font-black text-[11px] tracking-tight ${
            is3DMode
              ? 'bg-pink-600 text-white border-pink-600 shadow-pink-500/30'
              : 'bg-white/95 dark:bg-stone-900/95 border-stone-200/80 dark:border-stone-800/80 text-stone-800 dark:text-stone-100 hover:bg-white'
          }`}
          title={is3DMode ? '2D 평면 뷰로 전환' : '3D 입체 뷰로 전환'}
        >
          {is3DMode ? '2D' : '3D'}
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

        {/* Compass Needle (Reset North) */}
        <button
          onClick={() => {
            if (mapInstanceRef.current && dayLog?.places?.[0]) {
              handleCenterOnPlace(dayLog.places[0]);
            }
          }}
          className="w-9 h-9 rounded-full bg-white/95 dark:bg-stone-900/95 backdrop-blur-md shadow-md border border-stone-200/80 dark:border-stone-800/80 flex flex-col items-center justify-center transition active:scale-95"
          title={settings.language === 'ko' ? '정북 정렬' : 'Reset North'}
        >
          <Compass className="w-4 h-4 text-rose-500" />
          <span className="text-[8px] font-bold text-stone-600 dark:text-stone-300 leading-none mt-0.5">
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

      {/* Top Left Floating: Simulation Walking Button */}
      <div className="absolute top-4 left-3.5 z-30 flex items-center gap-2">
        <button
          onClick={onToggleSimulate}
          className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-semibold shadow-md backdrop-blur-md transition active:scale-95 border ${
            isSimulating
              ? 'bg-amber-500 border-amber-600 text-white animate-pulse'
              : 'bg-white/95 dark:bg-stone-900/95 text-stone-700 dark:text-stone-300 border-stone-200/90 dark:border-stone-800/90 hover:bg-stone-50'
          }`}
          title={isSimulating ? t.header.stopSimulate : t.header.simulateWalk}
        >
          {isSimulating ? (
            <>
              <Pause className="w-3.5 h-3.5 fill-current" />
              <span>{settings.language === 'ko' ? '산책 일시정지' : t.header.stopSimulate}</span>
            </>
          ) : (
            <>
              <Play className="w-3.5 h-3.5 fill-current text-pink-600" />
              <span>{settings.language === 'ko' ? '산책 시뮬레이션' : t.header.simulateWalk}</span>
            </>
          )}
        </button>

        {userGpsLocation && (
          <div className="hidden sm:flex items-center gap-1.5 bg-blue-50/90 dark:bg-blue-950/80 border border-blue-200 dark:border-blue-800/70 text-blue-700 dark:text-blue-300 px-2.5 py-1 rounded-full text-[11px] font-semibold backdrop-blur-md shadow-xs animate-in fade-in">
            <span className="w-2 h-2 rounded-full bg-blue-500 animate-pulse" />
            <span>GPS 감지됨</span>
          </div>
        )}
      </div>

      {/* Map Click Marker prompt */}
      {clickedCoords && (
        <div className="absolute top-14 left-3 right-3 sm:left-4 sm:right-auto z-35 sm:max-w-sm bg-white/95 dark:bg-stone-900/95 backdrop-blur-md rounded-2xl shadow-xl border border-stone-200/90 dark:border-stone-800/90 p-2.5 sm:p-3 flex items-center justify-between gap-2 animate-in slide-in-from-top-2 duration-150">
          <div className="flex items-center gap-2 min-w-0">
            <div className="w-7 h-7 rounded-xl bg-pink-100 dark:bg-pink-950/70 text-pink-600 flex items-center justify-center flex-shrink-0">
              <MapPin className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <p className="text-xs font-bold text-stone-900 dark:text-white truncate">
                {settings.language === 'ko' ? '선택한 위치에 기록 추가' : 'Add Spot at Coordinates'}
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

      {/* Apple Maps Watermark & Scale Bar */}
      <div className="absolute bottom-16 sm:bottom-20 left-3.5 z-10 pointer-events-none flex flex-col gap-0.5">
        <div className="text-[9px] text-stone-500 dark:text-stone-400 font-medium bg-white/70 dark:bg-stone-900/70 px-1.5 py-0.5 rounded backdrop-blur-sm shadow-xs inline-block">
          {settings.language === 'ko' ? '지도 데이터' : (t.map.appleMapsNotice || 'マップ 法律に基づく情報')}
        </div>
        <div className="flex items-center gap-1 text-[8px] text-stone-400 font-mono">
          <span>0</span>
          <span className="w-6 h-[1.5px] bg-stone-400 inline-block" />
          <span>50 m</span>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 🚀 REAL MOBILE 3-SNAP INTERACTIVE BOTTOM SHEET & CHRONOLOGICAL TIMELINE */}
      {/* ========================================================================= */}
      <div
        className={`absolute left-0 right-0 bottom-0 z-40 bg-white/95 dark:bg-stone-900/95 backdrop-blur-xl border-t border-stone-200/90 dark:border-stone-800/90 shadow-2xl transition-all duration-300 ease-out flex flex-col rounded-t-[28px] ${
          sheetSnap === 'collapsed'
            ? 'h-[74px]'
            : sheetSnap === 'peek'
            ? 'h-[290px] sm:h-[310px]'
            : 'h-[82vh] sm:h-[80vh]'
        }`}
      >
        {/* DRAG HANDLE BAR (TOUCH & POINTER SWIPE SENSITIVE) */}
        <div
          onMouseDown={handleTouchStart}
          onMouseUp={handleTouchEnd}
          onTouchStart={handleTouchStart}
          onTouchEnd={handleTouchEnd}
          onClick={() => {
            if (sheetSnap === 'collapsed') setSheetSnap('peek');
            else if (sheetSnap === 'peek') setSheetSnap('expanded');
            else setSheetSnap('peek');
          }}
          className="w-full pt-2 pb-1.5 flex flex-col items-center justify-center cursor-grab active:cursor-grabbing select-none"
        >
          <div className="w-10 h-1.5 rounded-full bg-stone-300 dark:bg-stone-700 transition-colors hover:bg-stone-400" />
        </div>

        {/* TOP HEADER: Date Navigation & Quick Meta */}
        <div className="px-4 pb-2 flex items-center justify-between border-b border-stone-100 dark:border-stone-800 flex-shrink-0">
          <div className="flex items-center gap-2">
            <button
              onClick={(e) => {
                e.stopPropagation();
                onPrevDay();
              }}
              className="w-7 h-7 rounded-full bg-stone-100 dark:bg-stone-800 flex items-center justify-center text-stone-600 dark:text-stone-300 hover:bg-stone-200 dark:hover:bg-stone-700 transition"
              title={t.header.yesterday}
            >
              <ChevronLeft className="w-4 h-4" />
            </button>

            <div
              onClick={() => {
                if (sheetSnap === 'collapsed') setSheetSnap('peek');
                else if (sheetSnap === 'peek') setSheetSnap('expanded');
              }}
              className="cursor-pointer"
            >
              <h3 className="text-sm font-black text-stone-900 dark:text-white flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-pink-500 animate-pulse" />
                <span>{formattedDate}</span>
              </h3>
              <p className="text-[11px] text-stone-500 dark:text-stone-400 font-medium">
                {formatDayStatsSummary(dayLog?.places.length || 0, totalPhotos, movementKm, settings.language)}
              </p>
            </div>

            <button
              onClick={(e) => {
                e.stopPropagation();
                onNextDay();
              }}
              className="w-7 h-7 rounded-full bg-stone-100 dark:bg-stone-800 flex items-center justify-center text-stone-600 dark:text-stone-300 hover:bg-stone-200 dark:hover:bg-stone-700 transition"
              title={t.header.tomorrow}
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          {/* Action toggle buttons: Expand to Timeline / Minimize to Map */}
          <div className="flex items-center gap-1.5">
            {sheetSnap !== 'expanded' ? (
              <button
                onClick={() => setSheetSnap('expanded')}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-gradient-to-r from-pink-500 to-rose-500 text-white text-xs font-bold shadow-sm hover:opacity-90 active:scale-95 transition"
              >
                <span>타임라인</span>
                <ChevronUp className="w-3.5 h-3.5" />
              </button>
            ) : (
              <button
                onClick={() => setSheetSnap('peek')}
                className="flex items-center gap-1 px-3 py-1.5 rounded-full bg-stone-100 dark:bg-stone-800 text-stone-700 dark:text-stone-300 text-xs font-bold hover:bg-stone-200 dark:hover:bg-stone-700 active:scale-95 transition"
              >
                <span>지도 보기</span>
                <ChevronDown className="w-3.5 h-3.5 text-stone-400" />
              </button>
            )}

            {sheetSnap !== 'collapsed' && (
              <button
                onClick={() => setSheetSnap('collapsed')}
                className="w-7 h-7 rounded-full bg-stone-100 dark:bg-stone-800 flex items-center justify-center text-stone-500 hover:text-stone-800 dark:hover:text-stone-200 transition"
                title="접기"
              >
                <ChevronDown className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>

        {/* =================================================================== */}
        {/* SNAP 2: PEEK MODE (Horizontal Spot Cards for Quick Map Exploration) */}
        {/* =================================================================== */}
        {sheetSnap === 'peek' && (
          <div className="flex-1 p-3 flex flex-col justify-between overflow-hidden animate-in fade-in duration-200">
            {/* Title & Mood Chip */}
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold text-stone-700 dark:text-stone-300 truncate max-w-[260px] sm:max-w-none">
                {dayLog?.titleKo || dayLog?.title || '성수동 & 서울숲 감성 골목 투어'}
              </span>
              <span className="text-[10px] font-semibold text-pink-600 dark:text-pink-400 bg-pink-50 dark:bg-pink-950/60 px-2 py-0.5 rounded-full flex-shrink-0">
                {dayLog?.places.length || 0}개 장소 순서대로
              </span>
            </div>

            {/* Horizontal Carousel of Places */}
            {dayLog && dayLog.places.length > 0 ? (
              <div className="flex items-center gap-2.5 overflow-x-auto no-scrollbar pb-1 pt-0.5">
                {dayLog.places.map((place, idx) => {
                  const isPlaceSelected = selectedPlaceId === place.id;
                  const thumb = place.coverPhotoUrl || place.photos?.[0]?.url;
                  const placeName = getPlaceName(place, settings.language);

                  return (
                    <button
                      key={place.id}
                      ref={(el) => (carouselItemRefs.current[place.id] = el)}
                      onClick={() => handleTimelineCardClick(place)}
                      className={`flex flex-col p-2 rounded-2xl border transition-all duration-200 flex-shrink-0 text-left w-36 sm:w-40 active:scale-95 ${
                        isPlaceSelected
                          ? 'bg-pink-50/90 dark:bg-pink-950/70 border-pink-500 shadow-md ring-2 ring-pink-500/50'
                          : 'bg-white dark:bg-stone-800/90 border-stone-200/80 dark:border-stone-700/80 hover:border-stone-300 dark:hover:border-stone-600 shadow-xs'
                      }`}
                    >
                      {/* Photo Thumbnail */}
                      <div className="relative w-full h-20 rounded-xl overflow-hidden bg-stone-100 dark:bg-stone-800 mb-1.5 flex items-center justify-center">
                        {thumb ? (
                          <img
                            src={thumb}
                            alt={placeName}
                            referrerPolicy="no-referrer"
                            className="w-full h-full object-cover rounded-xl"
                          />
                        ) : (
                          <span className="text-base font-bold text-stone-500">#{idx + 1}</span>
                        )}
                        <span
                          className={`absolute top-1.5 left-1.5 min-w-[18px] h-[18px] px-1 rounded-md text-[10px] font-black flex items-center justify-center shadow-md ${
                            isPlaceSelected
                              ? 'bg-pink-600 text-white'
                              : 'bg-black/75 backdrop-blur-xs text-white'
                          }`}
                        >
                          {idx + 1}
                        </span>
                        <span className="absolute bottom-1.5 right-1.5 bg-black/70 backdrop-blur-xs text-white text-[9px] font-bold px-1.5 py-0.5 rounded">
                          {place.arrivalTime}
                        </span>
                      </div>

                      {/* Text info */}
                      <p
                        className={`text-xs font-bold truncate leading-tight ${
                          isPlaceSelected
                            ? 'text-pink-600 dark:text-pink-400'
                            : 'text-stone-900 dark:text-white'
                        }`}
                      >
                        {placeName}
                      </p>
                      <p className="text-[10px] text-stone-400 dark:text-stone-500 truncate mt-0.5">
                        {place.durationMinutes ? `${place.durationMinutes}분 체류` : place.arrivalTime} ·{' '}
                        {t.categories[place.category] || place.category}
                      </p>
                    </button>
                  );
                })}
              </div>
            ) : (
              <p className="text-xs text-stone-400 py-4 text-center">기록된 장소가 없습니다.</p>
            )}

            {/* Tap to expand banner */}
            <div className="pt-2 flex items-center justify-between border-t border-stone-100 dark:border-stone-800/80">
              <span className="text-[11px] text-stone-500 dark:text-stone-400 flex items-center gap-1">
                <Footprints className="w-3.5 h-3.5 text-pink-500" />
                <span>카드를 누르면 지도가 해당 위치로 이동합니다</span>
              </span>
              <button
                onClick={() => setSheetSnap('expanded')}
                className="text-xs font-bold text-pink-600 dark:text-pink-400 hover:underline flex items-center gap-1"
              >
                <span>상세 타임라인 보기</span>
                <ChevronUp className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        )}

        {/* =========================================================================== */}
        {/* SNAP 3: EXPANDED MODE (Full Vertical Chronological Timeline + Daily Recap) */}
        {/* =========================================================================== */}
        {sheetSnap === 'expanded' && (
          <div className="flex-1 overflow-y-auto px-4 py-3 space-y-4 animate-in fade-in duration-200">
            {/* 1. AI 하루 회고 카드 (Daily Recap Card - Apple Intelligence Style) */}
            {dayLog?.aiRecap && (
              <div className="relative overflow-hidden rounded-3xl p-4 bg-gradient-to-br from-pink-500/10 via-purple-500/5 to-amber-500/10 border border-pink-200/80 dark:border-pink-900/50 shadow-sm">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-1.5 text-pink-600 dark:text-pink-400 font-black text-xs">
                    <Sparkles className="w-4 h-4 animate-pulse" />
                    <span>오늘의 AI 하루 회고</span>
                  </div>
                  <span className="text-[10px] text-stone-400 font-mono">
                    {dayLog.places.length} Spots · {movementKm} km · {dayLog.steps?.toLocaleString() || 14820} 걸음
                  </span>
                </div>

                <p className="text-xs sm:text-sm font-semibold text-stone-800 dark:text-stone-200 leading-relaxed mb-3">
                  {dayLog.aiRecap.recapKo || dayLog.aiRecap.recap}
                </p>

                <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-pink-200/50 dark:border-pink-900/30">
                  <div className="flex items-center gap-1 bg-white/80 dark:bg-stone-800/80 px-2.5 py-1 rounded-full text-[11px] font-bold text-stone-700 dark:text-stone-300 shadow-xs">
                    <span>✨ 무드:</span>
                    <span className="text-pink-600 dark:text-pink-400 font-extrabold">
                      {dayLog.aiRecap.moodKo || dayLog.aiRecap.mood}
                    </span>
                  </div>
                  <div className="flex items-center gap-1 bg-white/80 dark:bg-stone-800/80 px-2.5 py-1 rounded-full text-[11px] font-bold text-stone-700 dark:text-stone-300 shadow-xs">
                    <span>🌟 하이라이트:</span>
                    <span className="text-stone-800 dark:text-stone-100">
                      {dayLog.aiRecap.highlightKo || dayLog.aiRecap.highlight}
                    </span>
                  </div>
                </div>
              </div>
            )}

            {/* 2. CHRONOLOGICAL TIMELINE LIST */}
            <div className="relative pl-6 space-y-4">
              {/* Vertical Continuous Line */}
              <div className="absolute left-[13px] top-3 bottom-6 w-0.5 bg-gradient-to-b from-pink-500 via-rose-400 to-stone-300 dark:to-stone-700 rounded-full" />

              {dayLog?.places && dayLog.places.length > 0 ? (
                dayLog.places.map((place, idx) => {
                  const isPlaceSelected = selectedPlaceId === place.id;
                  const placeName = getPlaceName(place, settings.language);
                  const address = getPlaceAddress(place, settings.language);
                  const note = getPlaceNote(place, settings.language);
                  const coverPhoto = place.coverPhotoUrl || place.photos?.[0]?.url;

                  return (
                    <div
                      key={place.id}
                      ref={(el) => (timelineItemRefs.current[place.id] = el)}
                      className="relative group transition-all duration-200"
                    >
                      {/* Timeline Dot Node */}
                      <button
                        onClick={() => handleTimelineCardClick(place)}
                        className={`absolute -left-[23px] top-3 w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-black shadow-md transition-all active:scale-90 z-10 ${
                          isPlaceSelected
                            ? 'bg-pink-600 text-white ring-4 ring-pink-400/40 scale-125'
                            : 'bg-white dark:bg-stone-800 text-stone-700 dark:text-stone-300 border border-stone-300 dark:border-stone-600 hover:border-pink-500'
                        }`}
                      >
                        {idx + 1}
                      </button>

                      {/* Timeline Card */}
                      <div
                        onClick={() => handleTimelineCardClick(place)}
                        className={`cursor-pointer rounded-2xl p-3.5 border transition-all duration-200 ${
                          isPlaceSelected
                            ? 'bg-pink-50/80 dark:bg-pink-950/60 border-pink-500 shadow-lg ring-1 ring-pink-500/50 -translate-y-0.5'
                            : 'bg-white dark:bg-stone-800/90 border-stone-200/90 dark:border-stone-700/80 hover:border-stone-300 dark:hover:border-stone-600 shadow-sm'
                        }`}
                      >
                        {/* Time & Category Row */}
                        <div className="flex items-center justify-between mb-1.5">
                          <div className="flex items-center gap-1.5 text-xs font-bold text-stone-600 dark:text-stone-400">
                            <Clock className="w-3.5 h-3.5 text-pink-500" />
                            <span>
                              {place.arrivalTime}
                              {place.departureTime ? ` ~ ${place.departureTime}` : ''}
                            </span>
                            {place.durationMinutes && (
                              <span className="text-[10px] px-1.5 py-0.5 rounded bg-stone-100 dark:bg-stone-700 text-stone-500 dark:text-stone-300 font-medium">
                                {place.durationMinutes}분 체류
                              </span>
                            )}
                          </div>

                          <div className="flex items-center gap-1">
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-stone-100 dark:bg-stone-700 text-stone-700 dark:text-stone-300">
                              {t.categories[place.category] || place.category}
                            </span>
                            {place.isFirstVisit && (
                              <span className="px-1.5 py-0.5 rounded-full text-[9px] font-bold bg-amber-100 dark:bg-amber-950/70 text-amber-700 dark:text-amber-400">
                                첫방문 ⭐
                              </span>
                            )}
                          </div>
                        </div>

                        {/* Place Name */}
                        <div className="flex items-start justify-between gap-2 mb-1.5">
                          <h4
                            className={`text-sm sm:text-base font-black leading-snug ${
                              isPlaceSelected
                                ? 'text-pink-600 dark:text-pink-400'
                                : 'text-stone-900 dark:text-white'
                            }`}
                          >
                            {placeName}
                          </h4>
                          {place.rating && (
                            <div className="flex items-center gap-0.5 text-amber-500 text-xs font-bold flex-shrink-0">
                              <Star className="w-3.5 h-3.5 fill-current" />
                              <span>{place.rating}</span>
                            </div>
                          )}
                        </div>

                        {/* Address */}
                        {address && (
                          <p className="text-[11px] text-stone-500 dark:text-stone-400 flex items-center gap-1 mb-2">
                            <MapPin className="w-3 h-3 text-stone-400 flex-shrink-0" />
                            <span className="truncate">{address}</span>
                          </p>
                        )}

                        {/* Photos Grid */}
                        {place.photos && place.photos.length > 0 && (
                          <div className="grid grid-cols-3 gap-2 mb-2.5">
                            {place.photos.slice(0, 3).map((photo, pIdx) => (
                              <div
                                key={photo.id || pIdx}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  onSelectPhoto(photo.url, photo.captionKo || photo.caption);
                                }}
                                className="relative aspect-square rounded-xl overflow-hidden bg-stone-100 dark:bg-stone-800 cursor-zoom-in group/img"
                              >
                                <img
                                  src={photo.url}
                                  alt={photo.captionKo || placeName}
                                  referrerPolicy="no-referrer"
                                  className="w-full h-full object-cover transition duration-300 group-hover/img:scale-105"
                                />
                                {photo.captionKo && (
                                  <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/70 to-transparent p-1">
                                    <p className="text-[8px] text-white truncate font-medium">
                                      {photo.captionKo}
                                    </p>
                                  </div>
                                )}
                              </div>
                            ))}
                          </div>
                        )}

                        {/* Note / Memo quote */}
                        {note && (
                          <p className="text-xs text-stone-600 dark:text-stone-300 bg-stone-50 dark:bg-stone-800/60 rounded-xl p-2.5 leading-relaxed mb-2.5 border border-stone-100 dark:border-stone-700/60">
                            {note}
                          </p>
                        )}

                        {/* Bottom Actions Row */}
                        <div className="flex items-center justify-between pt-1 border-t border-stone-100 dark:border-stone-800">
                          <div className="flex items-center gap-2">
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleTimelineCardClick(place);
                              }}
                              className="flex items-center gap-1 text-[11px] font-bold text-pink-600 dark:text-pink-400 hover:text-pink-700 active:scale-95 transition"
                            >
                              <Navigation className="w-3 h-3" />
                              <span>지도에서 포커스</span>
                            </button>
                            <span className="text-stone-300 dark:text-stone-700">·</span>
                            <a
                              href={`https://map.naver.com/v5/search/${encodeURIComponent(placeName)}`}
                              target="_blank"
                              rel="noreferrer"
                              onClick={(e) => e.stopPropagation()}
                              className="flex items-center gap-0.5 text-[11px] text-stone-500 hover:text-stone-800 dark:hover:text-stone-200 transition"
                            >
                              <span>네이버지도</span>
                              <ExternalLink className="w-2.5 h-2.5" />
                            </a>
                          </div>

                          {place.likesCount && (
                            <div className="flex items-center gap-1 text-[11px] text-rose-500 font-bold">
                              <Heart className="w-3.5 h-3.5 fill-current" />
                              <span>{place.likesCount}</span>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })
              ) : (
                <p className="text-xs text-stone-400 py-6 text-center">기록된 타임라인이 없습니다.</p>
              )}
            </div>

            {/* Bottom Safe Area Spacer */}
            <div className="h-12" />
          </div>
        )}
      </div>
    </div>
  );
};
