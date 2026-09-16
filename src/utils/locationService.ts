/**
 * Location & Photo EXIF Service
 * Provides real-time GPS acquisition, reverse geocoding via OpenStreetMap,
 * and client-side EXIF GPS extraction from uploaded photos.
 */

export interface GpsCoordinate {
  lat: number;
  lng: number;
  accuracy?: number;
}

export interface GeocodedAddress {
  name?: string;
  address?: string;
  city?: string;
  country?: string;
}

/**
 * Get device GPS coordinates with high accuracy
 */
export function getCurrentGpsPosition(): Promise<GpsCoordinate> {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      reject(new Error('Geolocation is not supported by your browser'));
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        resolve({
          lat: Number(pos.coords.latitude.toFixed(6)),
          lng: Number(pos.coords.longitude.toFixed(6)),
          accuracy: pos.coords.accuracy,
        });
      },
      (err) => {
        reject(err);
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 10000,
      }
    );
  });
}

/**
 * Reverse geocode coordinates to get address and spot name using OpenStreetMap Nominatim
 */
export async function reverseGeocode(
  lat: number,
  lng: number,
  lang: string = 'ko'
): Promise<GeocodedAddress> {
  try {
    const acceptLang = lang === 'ko' ? 'ko,en;q=0.8,*;q=0.5' : lang === 'ja' ? 'ja,en;q=0.8,*;q=0.5' : 'en;q=0.9,*;q=0.5';
    const res = await fetch(
      `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=18&addressdetails=1`,
      {
        headers: {
          'Accept-Language': acceptLang,
        },
      }
    );

    if (!res.ok) {
      return {
        address: `${lat.toFixed(5)}, ${lng.toFixed(5)}`,
      };
    }

    const data = await res.json();
    const addr = data.address || {};
    
    // Pick the most descriptive name for the spot
    const name =
      addr.amenity ||
      addr.shop ||
      addr.tourism ||
      addr.leisure ||
      addr.historic ||
      addr.building ||
      addr.office ||
      addr.craft ||
      addr.road ||
      data.name ||
      '';

    const fullAddress = data.display_name || '';

    return {
      name: name || undefined,
      address: fullAddress || `${lat.toFixed(5)}, ${lng.toFixed(5)}`,
      city: addr.city || addr.town || addr.village || addr.county,
      country: addr.country,
    };
  } catch (e) {
    console.warn('Reverse geocoding failed, using coordinates', e);
    return {
      address: `${lat.toFixed(5)}, ${lng.toFixed(5)}`,
    };
  }
}

/**
 * Extract EXIF metadata (GPS coordinates & timestamp) from a JPEG/TIFF image File
 */
export async function extractExifGps(
  file: File
): Promise<{ lat?: number; lng?: number; timestamp?: string } | null> {
  try {
    const buffer = await file.arrayBuffer();
    const view = new DataView(buffer);

    // Check for JPEG SOI marker (0xFFD8)
    if (view.getUint16(0) !== 0xffd8) {
      return null;
    }

    let offset = 2;
    const length = view.byteLength;

    while (offset < length) {
      if (view.getUint8(offset) !== 0xff) {
        break;
      }

      const marker = view.getUint8(offset + 1);

      // APP1 marker (0xFFE1) contains EXIF
      if (marker === 0xe1) {
        const app1Length = view.getUint16(offset + 2);
        const exifStart = offset + 4;

        // Check for 'Exif\0\0' (0x457869660000)
        if (
          view.getUint32(exifStart) === 0x45786966 &&
          view.getUint16(exifStart + 4) === 0x0000
        ) {
          const tiffOffset = exifStart + 6;
          const littleEndian = view.getUint16(tiffOffset) === 0x4949; // 'II' = Intel/little endian, 'MM' = Motorola/big endian

          const ifd0Offset = view.getUint32(tiffOffset + 4, littleEndian);
          let gpsOffset: number | null = null;
          let dateStr: string | null = null;

          const numIfd0Entries = view.getUint16(tiffOffset + ifd0Offset, littleEndian);
          for (let i = 0; i < numIfd0Entries; i++) {
            const entryOffset = tiffOffset + ifd0Offset + 2 + i * 12;
            const tag = view.getUint16(entryOffset, littleEndian);

            if (tag === 0x8825) {
              // GPSInfo IFD pointer
              gpsOffset = view.getUint32(entryOffset + 8, littleEndian);
            } else if (tag === 0x9003 || tag === 0x0132) {
              // DateTimeOriginal
              const strOffset = view.getUint32(entryOffset + 8, littleEndian);
              if (tiffOffset + strOffset < length) {
                let s = '';
                for (let j = 0; j < 19; j++) {
                  s += String.fromCharCode(view.getUint8(tiffOffset + strOffset + j));
                }
                dateStr = s;
              }
            }
          }

          if (gpsOffset !== null) {
            const numGpsEntries = view.getUint16(tiffOffset + gpsOffset, littleEndian);
            let latRef = 'N';
            let lonRef = 'E';
            let latDeg = 0, latMin = 0, latSec = 0;
            let lonDeg = 0, lonMin = 0, lonSec = 0;
            let hasLat = false;
            let hasLon = false;

            for (let i = 0; i < numGpsEntries; i++) {
              const entryOffset = tiffOffset + gpsOffset + 2 + i * 12;
              const tag = view.getUint16(entryOffset, littleEndian);

              if (tag === 0x0001) {
                // GPSLatitudeRef
                latRef = String.fromCharCode(view.getUint8(entryOffset + 8));
              } else if (tag === 0x0002) {
                // GPSLatitude (3 rationals)
                const valOffset = view.getUint32(entryOffset + 8, littleEndian);
                latDeg = readRational(view, tiffOffset + valOffset, littleEndian);
                latMin = readRational(view, tiffOffset + valOffset + 8, littleEndian);
                latSec = readRational(view, tiffOffset + valOffset + 16, littleEndian);
                hasLat = true;
              } else if (tag === 0x0003) {
                // GPSLongitudeRef
                lonRef = String.fromCharCode(view.getUint8(entryOffset + 8));
              } else if (tag === 0x0004) {
                // GPSLongitude (3 rationals)
                const valOffset = view.getUint32(entryOffset + 8, littleEndian);
                lonDeg = readRational(view, tiffOffset + valOffset, littleEndian);
                lonMin = readRational(view, tiffOffset + valOffset + 8, littleEndian);
                lonSec = readRational(view, tiffOffset + valOffset + 16, littleEndian);
                hasLon = true;
              }
            }

            if (hasLat && hasLon) {
              let finalLat = latDeg + latMin / 60 + latSec / 3600;
              if (latRef === 'S') finalLat = -finalLat;

              let finalLng = lonDeg + lonMin / 60 + lonSec / 3600;
              if (lonRef === 'W') finalLng = -finalLng;

              return {
                lat: Number(finalLat.toFixed(6)),
                lng: Number(finalLng.toFixed(6)),
                timestamp: dateStr || undefined,
              };
            }
          }
        }
        break;
      }

      offset += 2 + view.getUint16(offset + 2);
    }

    return null;
  } catch (e) {
    console.warn('EXIF parsing failed or not present', e);
    return null;
  }
}

function readRational(view: DataView, offset: number, littleEndian: boolean): number {
  const num = view.getUint32(offset, littleEndian);
  const den = view.getUint32(offset + 4, littleEndian);
  return den === 0 ? 0 : num / den;
}
