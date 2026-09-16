import { PrivacyPrecision, RoutePoint } from '../types';

/**
 * Calculates distance between two coordinates in kilometers using Haversine formula
 */
export function calculateDistanceKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371; // Earth's radius in km
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

/**
 * Calculates total route length in kilometers
 */
export function calculateTotalRouteDistance(points: RoutePoint[]): number {
  if (!points || points.length < 2) return 0;
  let total = 0;
  for (let i = 0; i < points.length - 1; i++) {
    total += calculateDistanceKm(
      points[i].lat,
      points[i].lng,
      points[i + 1].lat,
      points[i + 1].lng
    );
  }
  return Number(total.toFixed(2));
}

/**
 * Applies privacy precision blurring if user selected 'approximate'
 * Blurs coordinates within ~300-400m deterministic jitter
 */
export function applyPrivacyPrecision(lat: number, lng: number, precision: PrivacyPrecision): { lat: number; lng: number } {
  if (precision === 'exact') {
    return { lat, lng };
  }
  // Deterministic snap to ~0.003 degrees (~330m grid)
  const factor = 1000 / 3;
  const blurredLat = Math.round(lat * factor) / factor;
  const blurredLng = Math.round(lng * factor) / factor;
  return { lat: blurredLat, lng: blurredLng };
}

/**
 * Color theme palette definition
 */
export const PALETTES = {
  emerald: {
    name: 'Emerald Forest',
    primary: '#10b981', // emerald-500
    glow: 'rgba(16, 185, 129, 0.4)',
    line: '#059669',
    accent: '#34d399',
  },
  indigo: {
    name: 'RONDO Indigo',
    primary: '#6366f1', // indigo-500
    glow: 'rgba(99, 102, 241, 0.4)',
    line: '#4f46e5',
    accent: '#818cf8',
  },
  tangerine: {
    name: 'Sunset Tangerine',
    primary: '#f97316', // orange-500
    glow: 'rgba(249, 115, 22, 0.4)',
    line: '#ea580c',
    accent: '#fb923c',
  },
  cyan: {
    name: 'Ocean Cyan',
    primary: '#06b6d4', // cyan-500
    glow: 'rgba(6, 182, 212, 0.4)',
    line: '#0891b2',
    accent: '#22d3ee',
  },
  rose: {
    name: 'Rose Blossom',
    primary: '#f43f5e', // rose-500
    glow: 'rgba(244, 63, 94, 0.4)',
    line: '#e11d48',
    accent: '#fb7185',
  },
  magenta: {
    name: 'RONDO Magenta',
    primary: '#FF2D55',
    glow: 'rgba(255, 45, 85, 0.45)',
    line: '#E60049',
    accent: '#FF6482',
  },
};
