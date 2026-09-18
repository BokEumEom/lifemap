import React, { useEffect, useRef, useState, useCallback } from 'react';
import type L from 'leaflet';
import { Building3D } from '../utils/building3DService';

interface ThreeDBuildingCanvasProps {
  map: L.Map | null;
  buildings: Building3D[];
  is3DMode: boolean;
  theme: 'light' | 'dark' | 'system';
  selectedPlaceId?: string | null;
  onSelectPlace?: (placeId: string) => void;
  language?: 'ko' | 'ja' | 'en';
}

interface HoveredBuildingInfo {
  building: Building3D;
  screenX: number;
  screenY: number;
}

// Ray-casting algorithm for point in polygon
function pointInPolygon(px: number, py: number, polygon: { x: number; y: number }[]): boolean {
  let inside = false;
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const xi = polygon[i].x;
    const yi = polygon[i].y;
    const xj = polygon[j].x;
    const yj = polygon[j].y;

    const intersect = yi > py !== yj > py && px < ((xj - xi) * (py - yi)) / (yj - yi) + xi;
    if (intersect) inside = !inside;
  }
  return inside;
}

export const ThreeDBuildingCanvas: React.FC<ThreeDBuildingCanvasProps> = ({
  map,
  buildings,
  is3DMode,
  theme,
  selectedPlaceId,
  onSelectPlace,
  language = 'ko',
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [hoveredInfo, setHoveredInfo] = useState<HoveredBuildingInfo | null>(null);

  // Cached screen roofs for hit testing
  const roofPolygonsRef = useRef<Array<{ building: Building3D; roofPoints: { x: number; y: number }[] }>>([]);

  const isDark =
    theme === 'dark' ||
    (theme === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches);

  const drawBuildings = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas || !map || !is3DMode) {
      if (canvas) {
        const ctx = canvas.getContext('2d');
        ctx?.clearRect(0, 0, canvas.width, canvas.height);
      }
      roofPolygonsRef.current = [];
      return;
    }

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const rect = canvas.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;

    if (canvas.width !== Math.round(rect.width * dpr) || canvas.height !== Math.round(rect.height * dpr)) {
      canvas.width = Math.round(rect.width * dpr);
      canvas.height = Math.round(rect.height * dpr);
    }

    ctx.save();
    ctx.scale(dpr, dpr);
    ctx.clearRect(0, 0, rect.width, rect.height);

    const zoom = map.getZoom();
    // Only render buildings when zoomed in enough to see city blocks (zoom >= 14)
    if (zoom < 14) {
      ctx.restore();
      roofPolygonsRef.current = [];
      return;
    }

    const mapBounds = map.getBounds();
    const mapCenter = map.getCenter();
    const centerPoint = map.latLngToContainerPoint(mapCenter);

    // Scale height by zoom
    const zoomScale = Math.pow(2, zoom - 16);

    const roofs: Array<{ building: Building3D; roofPoints: { x: number; y: number }[] }> = [];

    // Filter buildings currently within viewport + buffer
    const visibleBuildings = buildings.filter((b) => {
      return (
        b.centerLat >= mapBounds.getSouth() - 0.005 &&
        b.centerLat <= mapBounds.getNorth() + 0.005 &&
        b.centerLng >= mapBounds.getWest() - 0.005 &&
        b.centerLng <= mapBounds.getEast() + 0.005
      );
    });

    // Sort buildings from North to South (back to front painter's algorithm)
    visibleBuildings.sort((a, b) => b.centerLat - a.centerLat);

    // 1. Draw Ground Drop Shadows First
    ctx.fillStyle = isDark ? 'rgba(0, 0, 0, 0.35)' : 'rgba(0, 0, 0, 0.09)';
    visibleBuildings.forEach((b) => {
      const heightPx = Math.max(8, b.heightMeters * 1.15 * zoomScale);
      const groundPoints = b.footprint.map((pt) => {
        const lat = Array.isArray(pt) ? pt[0] : (pt as any).lat;
        const lng = Array.isArray(pt) ? pt[1] : (pt as any).lng;
        return map.latLngToContainerPoint([lat, lng]);
      });

      if (!groundPoints || groundPoints.length < 3) return;

      const shadowOffset = {
        x: heightPx * 0.45,
        y: heightPx * 0.35,
      };

      ctx.beginPath();
      ctx.moveTo(groundPoints[0].x + shadowOffset.x, groundPoints[0].y + shadowOffset.y);
      for (let i = 1; i < groundPoints.length; i++) {
        ctx.lineTo(groundPoints[i].x + shadowOffset.x, groundPoints[i].y + shadowOffset.y);
      }
      ctx.closePath();
      ctx.fill();
    });

    // 2. Draw Walls and Roofs
    visibleBuildings.forEach((b) => {
      const isSelected = Boolean(b.spotId && b.spotId === selectedPlaceId);
      const isVisitedSpot = b.isSpot;

      const groundPoints = b.footprint.map((pt) => {
        const lat = Array.isArray(pt) ? pt[0] : (pt as any).lat;
        const lng = Array.isArray(pt) ? pt[1] : (pt as any).lng;
        return map.latLngToContainerPoint([lat, lng]);
      });

      if (!groundPoints || groundPoints.length < 3) return;

      // Calculate extruded roof points (vertical isometric projection with slight camera perspective)
      const heightPx = Math.max(10, b.heightMeters * 1.35 * zoomScale);

      // Slight perspective shift away from map center
      const avgGroundX = groundPoints.reduce((acc, p) => acc + p.x, 0) / groundPoints.length;
      const avgGroundY = groundPoints.reduce((acc, p) => acc + p.y, 0) / groundPoints.length;
      const perspX = ((avgGroundX - centerPoint.x) / rect.width) * (heightPx * 0.25);

      const roofPoints = groundPoints.map((g) => ({
        x: g.x + perspX,
        y: g.y - heightPx,
      }));

      roofs.push({ building: b, roofPoints });

      // Draw Walls (Quads connecting ground to roof)
      const numPoints = groundPoints.length;
      for (let i = 0; i < numPoints; i++) {
        const next = (i + 1) % numPoints;
        const g1 = groundPoints[i];
        const g2 = groundPoints[next];
        const r1 = roofPoints[i];
        const r2 = roofPoints[next];

        // Wall normal orientation relative to light from top-left (~315deg)
        const dx = g2.x - g1.x;
        const dy = g2.y - g1.y;
        const normalAngle = Math.atan2(dy, dx);
        // Factor from 0 (shaded) to 1 (bright)
        const light = 0.5 + 0.5 * Math.sin(normalAngle + Math.PI / 3);

        ctx.beginPath();
        ctx.moveTo(g1.x, g1.y);
        ctx.lineTo(g2.x, g2.y);
        ctx.lineTo(r2.x, r2.y);
        ctx.lineTo(r1.x, r1.y);
        ctx.closePath();

        // Palette calculation
        if (isSelected) {
          ctx.fillStyle = isDark
            ? `rgba(${255 * (0.6 + 0.4 * light)}, 45, 85, 0.95)`
            : `rgba(255, ${60 + 120 * light}, ${90 + 120 * light}, 0.95)`;
        } else if (isVisitedSpot) {
          if (isDark) {
            ctx.fillStyle = `rgb(${Math.round(40 + 35 * light)}, ${Math.round(45 + 40 * light)}, ${Math.round(60 + 50 * light)})`;
          } else {
            ctx.fillStyle = `rgb(${Math.round(230 + 20 * light)}, ${Math.round(235 + 18 * light)}, ${Math.round(245 + 10 * light)})`;
          }
        } else {
          // Surrounding urban buildings
          if (isDark) {
            ctx.fillStyle = `rgb(${Math.round(28 + 24 * light)}, ${Math.round(32 + 28 * light)}, ${Math.round(42 + 35 * light)})`;
          } else {
            ctx.fillStyle = `rgb(${Math.round(210 + 35 * light)}, ${Math.round(218 + 32 * light)}, ${Math.round(228 + 25 * light)})`;
          }
        }
        ctx.fill();

        // Edge line
        ctx.lineWidth = 0.8;
        ctx.strokeStyle = isDark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(100, 115, 140, 0.2)';
        ctx.stroke();

        // Architectural floor lines for tall buildings
        if (b.heightMeters >= 24 && heightPx > 28) {
          const floors = Math.floor(b.heightMeters / 3.8);
          ctx.strokeStyle = isDark ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0, 0, 0, 0.06)';
          ctx.lineWidth = 0.5;
          for (let f = 1; f < floors; f++) {
            const t = f / floors;
            const fg1 = { x: g1.x + (r1.x - g1.x) * t, y: g1.y + (r1.y - g1.y) * t };
            const fg2 = { x: g2.x + (r2.x - g2.x) * t, y: g2.y + (r2.y - g2.y) * t };
            ctx.beginPath();
            ctx.moveTo(fg1.x, fg1.y);
            ctx.lineTo(fg2.x, fg2.y);
            ctx.stroke();
          }
        }
      }

      // Draw Roof Polygon
      ctx.beginPath();
      ctx.moveTo(roofPoints[0].x, roofPoints[0].y);
      for (let i = 1; i < roofPoints.length; i++) {
        ctx.lineTo(roofPoints[i].x, roofPoints[i].y);
      }
      ctx.closePath();

      if (isSelected) {
        ctx.fillStyle = '#FF2D55';
        ctx.fill();
        ctx.lineWidth = 2.5;
        ctx.strokeStyle = '#ffffff';
        ctx.stroke();
      } else if (isVisitedSpot) {
        ctx.fillStyle = isDark ? '#384252' : '#ffffff';
        ctx.fill();
        ctx.lineWidth = 2;
        ctx.strokeStyle = '#FF2D55';
        ctx.stroke();

        // Spot rooftop indicator badge dot
        const avgRoofX = roofPoints.reduce((acc, p) => acc + p.x, 0) / roofPoints.length;
        const avgRoofY = roofPoints.reduce((acc, p) => acc + p.y, 0) / roofPoints.length;
        ctx.beginPath();
        ctx.arc(avgRoofX, avgRoofY, 3.5, 0, Math.PI * 2);
        ctx.fillStyle = '#FF2D55';
        ctx.fill();
      } else {
        ctx.fillStyle = isDark ? '#2a313d' : '#f8fafc';
        ctx.fill();
        ctx.lineWidth = 1;
        ctx.strokeStyle = isDark ? 'rgba(255, 255, 255, 0.15)' : 'rgba(100, 115, 140, 0.3)';
        ctx.stroke();

        // Architectural rooftop equipment / terrace decoration
        if (b.roofType === 'atrium') {
          // Glass atrium pattern
          ctx.strokeStyle = isDark ? 'rgba(56, 189, 248, 0.35)' : 'rgba(14, 165, 233, 0.4)';
          ctx.lineWidth = 0.8;
          ctx.beginPath();
          ctx.moveTo(roofPoints[0].x, roofPoints[0].y);
          ctx.lineTo(roofPoints[2].x, roofPoints[2].y);
          ctx.moveTo(roofPoints[1].x, roofPoints[1].y);
          ctx.lineTo(roofPoints[3].x, roofPoints[3].y);
          ctx.stroke();
        } else if (b.roofType === 'terrace') {
          // Inset terrace
          const avgRoofX = roofPoints.reduce((acc, p) => acc + p.x, 0) / roofPoints.length;
          const avgRoofY = roofPoints.reduce((acc, p) => acc + p.y, 0) / roofPoints.length;
          ctx.beginPath();
          ctx.arc(avgRoofX, avgRoofY, Math.min(8, heightPx * 0.15), 0, Math.PI * 2);
          ctx.fillStyle = isDark ? '#1a202c' : '#e2e8f0';
          ctx.fill();
        }
      }
    });

    roofPolygonsRef.current = roofs;
    ctx.restore();
  }, [map, buildings, is3DMode, theme, isDark, selectedPlaceId]);

  // Hook map events to re-render
  useEffect(() => {
    if (!map) return;

    map.on('move', drawBuildings);
    map.on('zoom', drawBuildings);
    map.on('resize', drawBuildings);
    map.on('viewreset', drawBuildings);

    drawBuildings();

    return () => {
      map.off('move', drawBuildings);
      map.off('zoom', drawBuildings);
      map.off('resize', drawBuildings);
      map.off('viewreset', drawBuildings);
    };
  }, [map, drawBuildings]);

  // Handle pointer interaction (hover and click on 3D buildings)
  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!is3DMode) {
      if (hoveredInfo) setHoveredInfo(null);
      return;
    }

    const rect = e.currentTarget.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;

    let found: HoveredBuildingInfo | null = null;
    // Iterate roofs in reverse order (top-most first)
    const roofs = roofPolygonsRef.current;
    for (let i = roofs.length - 1; i >= 0; i--) {
      const { building, roofPoints } = roofs[i];
      if (pointInPolygon(mouseX, mouseY, roofPoints)) {
        found = {
          building,
          screenX: mouseX,
          screenY: mouseY,
        };
        break;
      }
    }

    setHoveredInfo(found);
  };

  const handleClick = () => {
    if (hoveredInfo?.building.spotId && onSelectPlace) {
      onSelectPlace(hoveredInfo.building.spotId);
    }
  };

  if (!is3DMode) return null;

  return (
    <div
      ref={containerRef}
      onMouseMove={handleMouseMove}
      onMouseLeave={() => setHoveredInfo(null)}
      onClick={handleClick}
      className="absolute inset-0 pointer-events-auto z-[350]"
      style={{ cursor: hoveredInfo ? 'pointer' : 'default' }}
    >
      <canvas ref={canvasRef} className="w-full h-full block pointer-events-none" />

      {/* Floating 3D Building Tooltip on Hover */}
      {hoveredInfo && (
        <div
          className="absolute z-50 pointer-events-none bg-stone-900/90 dark:bg-stone-950/90 text-white backdrop-blur-md px-3 py-2 rounded-xl shadow-xl border border-stone-700/80 text-xs flex flex-col gap-0.5 animate-in fade-in zoom-in-95 duration-150"
          style={{
            left: Math.min(window.innerWidth - 180, Math.max(10, hoveredInfo.screenX - 70)),
            top: Math.max(10, hoveredInfo.screenY - 65),
          }}
        >
          <div className="font-bold flex items-center gap-1.5 truncate max-w-[200px]">
            {hoveredInfo.building.isSpot && (
              <span className="w-2 h-2 rounded-full bg-pink-500 animate-pulse flex-shrink-0" />
            )}
            <span className="truncate">
              {language === 'ko'
                ? hoveredInfo.building.nameKo || hoveredInfo.building.name
                : hoveredInfo.building.name}
            </span>
          </div>
          <div className="text-[10px] text-stone-300 flex items-center gap-2">
            <span>
              {language === 'ko' ? '높이' : 'Height'}: {hoveredInfo.building.heightMeters}m (약{' '}
              {Math.max(1, Math.round(hoveredInfo.building.heightMeters / 3.5))}
              {language === 'ko' ? '층' : 'F'})
            </span>
            <span className="text-stone-500">·</span>
            <span className="capitalize text-pink-400 font-medium">
              {hoveredInfo.building.category.replace('_', ' ')}
            </span>
          </div>
        </div>
      )}
    </div>
  );
};
