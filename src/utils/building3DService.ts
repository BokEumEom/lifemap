import { PlaceLog, RoutePoint } from '../types';

export interface Building3D {
  id: string;
  name: string;
  nameKo?: string;
  nameEn?: string;
  category: string;
  centerLat: number;
  centerLng: number;
  heightMeters: number;
  footprint: [number, number][]; // [lat, lng] array forming a closed polygon
  isSpot: boolean;
  spotId?: string;
  roofType?: 'flat' | 'stepped' | 'atrium' | 'terrace';
}

// Convert meters to approximate lat/lng delta
const METERS_TO_LAT = 1 / 111139; // ~ 0.00000899 degrees lat per meter
function metersToLng(lat: number) {
  return 1 / (111139 * Math.cos((lat * Math.PI) / 180));
}

// Helper to generate a rectangular polygon footprint around a center
function createRectFootprint(
  centerLat: number,
  centerLng: number,
  widthM: number,
  lengthM: number,
  rotationDeg = 0
): [number, number][] {
  const dLatM = lengthM / 2;
  const dLngM = widthM / 2;
  const rad = (rotationDeg * Math.PI) / 180;
  const cos = Math.cos(rad);
  const sin = Math.sin(rad);

  const cornersM = [
    [-dLngM, -dLatM],
    [dLngM, -dLatM],
    [dLngM, dLatM],
    [-dLngM, dLatM],
  ];

  const m2lng = metersToLng(centerLat);

  return cornersM.map(([x, y]) => {
    const rx = x * cos - y * sin;
    const ry = x * sin + y * cos;
    return [centerLat + ry * METERS_TO_LAT, centerLng + rx * m2lng];
  });
}

// Pseudo-random deterministic hash based on coordinates
function coordHash(lat: number, lng: number, seed = 0): number {
  const val = Math.sin(lat * 12.9898 + lng * 78.233 + seed) * 43758.5453;
  return val - Math.floor(val);
}

/**
 * Generate 3D building models for:
 * 1) Exact spots visited in the dayLog
 * 2) Contextual urban buildings surrounding the tour route
 */
export function generate3DBuildings(
  places: PlaceLog[] = [],
  routePoints: Array<RoutePoint | [number, number]> = []
): Building3D[] {
  const buildings: Building3D[] = [];
  const occupiedCenters: [number, number][] = [];

  // Helper to check minimum distance to avoid overlapping buildings
  const isTooClose = (lat: number, lng: number, minDistM = 22) => {
    const m2lng = metersToLng(lat);
    for (const [cLat, cLng] of occupiedCenters) {
      const dLatM = (lat - cLat) / METERS_TO_LAT;
      const dLngM = (lng - cLng) / m2lng;
      const dist = Math.hypot(dLatM, dLngM);
      if (dist < minDistM) return true;
    }
    return false;
  };

  // 1. Create 3D buildings for each visited spot
  places.forEach((place, index) => {
    let heightMeters = 14;
    let widthM = 22;
    let lengthM = 24;
    let roofType: Building3D['roofType'] = 'flat';

    const cat = place.category as string;
    switch (cat) {
      case 'transit':
      case 'station':
      case 'transport':
        heightMeters = 38;
        widthM = 45;
        lengthM = 35;
        roofType = 'atrium';
        break;
      case 'culture':
      case 'museum':
      case 'art_gallery':
        heightMeters = 26;
        widthM = 34;
        lengthM = 30;
        roofType = 'stepped';
        break;
      case 'stay':
      case 'hotel':
      case 'department_store':
        heightMeters = 52;
        widthM = 30;
        lengthM = 28;
        roofType = 'terrace';
        break;
      case 'shopping':
        heightMeters = 24;
        widthM = 28;
        lengthM = 26;
        roofType = 'flat';
        break;
      case 'cafe':
      case 'bakery':
        heightMeters = 12;
        widthM = 18;
        lengthM = 20;
        roofType = 'flat';
        break;
      case 'restaurant':
        heightMeters = 16;
        widthM = 20;
        lengthM = 22;
        roofType = 'flat';
        break;
      case 'shrine_temple':
        heightMeters = 14;
        widthM = 24;
        lengthM = 24;
        roofType = 'stepped';
        break;
      case 'nature':
      case 'park':
        heightMeters = 8;
        widthM = 16;
        lengthM = 16;
        roofType = 'atrium';
        break;
      default:
        heightMeters = 18;
        widthM = 22;
        lengthM = 22;
    }

    // Deterministic angle based on index
    const angle = (index * 47) % 90;
    const footprint = createRectFootprint(place.lat, place.lng, widthM, lengthM, angle);

    buildings.push({
      id: `building-spot-${place.id}`,
      name: place.name,
      nameKo: place.nameKo,
      nameEn: place.nameEn,
      category: place.category,
      centerLat: place.lat,
      centerLng: place.lng,
      heightMeters,
      footprint,
      isSpot: true,
      spotId: place.id,
      roofType,
    });

    occupiedCenters.push([place.lat, place.lng]);
  });

  // 2. Generate surrounding urban context buildings around each spot (radius ~150m)
  places.forEach((place) => {
    const offsetsM = [
      [-42, -38],
      [45, -35],
      [-40, 42],
      [42, 45],
      [0, -55],
      [0, 58],
      [-65, 0],
      [68, 0],
      [-75, -70],
      [75, -70],
      [-75, 75],
      [78, 72],
    ];

    const m2lng = metersToLng(place.lat);

    offsetsM.forEach(([ox, oy], i) => {
      const bLat = place.lat + oy * METERS_TO_LAT;
      const bLng = place.lng + ox * m2lng;

      if (!isTooClose(bLat, bLng, 24)) {
        const hRand = coordHash(bLat, bLng, i);
        // Realistic height distribution: mostly 12-28m, occasional 35-48m towers
        const heightMeters = hRand > 0.85 ? Math.round(36 + hRand * 20) : Math.round(10 + hRand * 18);
        const widthM = Math.round(18 + coordHash(bLat, bLng, i + 10) * 16);
        const lengthM = Math.round(18 + coordHash(bLat, bLng, i + 20) * 16);
        const rot = Math.round(coordHash(bLat, bLng, i + 30) * 90);

        const footprint = createRectFootprint(bLat, bLng, widthM, lengthM, rot);

        const buildingType = heightMeters > 35 ? 'commercial' : heightMeters > 20 ? 'office' : 'residential';

        buildings.push({
          id: `building-context-${bLat.toFixed(5)}-${bLng.toFixed(5)}`,
          name: heightMeters > 35 ? 'City Plaza Tower' : 'Urban Building',
          nameKo: heightMeters > 35 ? '도심 오피스 타워' : '도시 상업 빌딩',
          nameEn: heightMeters > 35 ? 'Downtown Commercial Tower' : 'City Block Building',
          category: buildingType,
          centerLat: bLat,
          centerLng: bLng,
          heightMeters,
          footprint,
          isSpot: false,
          roofType: heightMeters > 35 ? 'terrace' : 'flat',
        });

        occupiedCenters.push([bLat, bLng]);
      }
    });
  });

  // 3. Context buildings along the route
  if (routePoints && routePoints.length > 2) {
    const step = Math.max(1, Math.floor(routePoints.length / 15));
    for (let r = 0; r < routePoints.length; r += step) {
      const pt = routePoints[r];
      if (!pt) continue;
      const rLat = Array.isArray(pt) ? pt[0] : pt.lat;
      const rLng = Array.isArray(pt) ? pt[1] : pt.lng;
      if (typeof rLat !== 'number' || typeof rLng !== 'number') continue;
      const m2lng = metersToLng(rLat);

      const sideOffsets = [
        [-35, 30],
        [35, -30],
      ];

      sideOffsets.forEach(([ox, oy], sIdx) => {
        const bLat = rLat + oy * METERS_TO_LAT;
        const bLng = rLng + ox * m2lng;

        if (!isTooClose(bLat, bLng, 26)) {
          const hRand = coordHash(bLat, bLng, sIdx + 77);
          const heightMeters = Math.round(12 + hRand * 22);
          const widthM = 20;
          const lengthM = 20;
          const rot = Math.round(hRand * 45);

          const footprint = createRectFootprint(bLat, bLng, widthM, lengthM, rot);

          buildings.push({
            id: `building-route-${bLat.toFixed(5)}-${bLng.toFixed(5)}`,
            name: 'Street Corner Building',
            nameKo: '거리 빌딩',
            nameEn: 'Street Corner Building',
            category: 'commercial',
            centerLat: bLat,
            centerLng: bLng,
            heightMeters,
            footprint,
            isSpot: false,
            roofType: 'flat',
          });

          occupiedCenters.push([bLat, bLng]);
        }
      });
    }
  }

  return buildings;
}

/**
 * Convert 3D buildings into GeoJSON FeatureCollection for MapLibre GL 3D fill-extrusion
 */
export function buildingsToGeoJSON(buildings: Building3D[]): GeoJSON.FeatureCollection<GeoJSON.Polygon> {
  return {
    type: 'FeatureCollection',
    features: buildings.map((b) => {
      // Footprint in Building3D is [lat, lng], GeoJSON requires [lng, lat]
      const ring: [number, number][] = b.footprint.map((pt) => {
        const lat = Array.isArray(pt) ? pt[0] : (pt as any).lat;
        const lng = Array.isArray(pt) ? pt[1] : (pt as any).lng;
        return [lng, lat];
      });

      // Ensure closed loop
      if (
        ring.length > 0 &&
        (ring[0][0] !== ring[ring.length - 1][0] || ring[0][1] !== ring[ring.length - 1][1])
      ) {
        ring.push([...ring[0]]);
      }

      return {
        type: 'Feature',
        id: b.id,
        properties: {
          id: b.id,
          name: b.name,
          nameKo: b.nameKo || b.name,
          category: b.category,
          height: b.heightMeters,
          base_height: 0,
          isSpot: b.isSpot ? 1 : 0,
          spotId: b.spotId || '',
          color: b.isSpot ? '#f43f5e' : '#dedcd3',
          roofColor: b.isSpot ? '#fb7185' : '#eae7de',
        },
        geometry: {
          type: 'Polygon',
          coordinates: [ring],
        },
      };
    }),
  };
}
