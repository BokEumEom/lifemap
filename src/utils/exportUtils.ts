import { DayLog, Language } from '../types';
import { getPlaceName, getPlaceNote, getDayTitle, getDayDailyNote } from './localeUtils';

/**
 * Generates GPX XML string from DayLog
 */
export function generateGpx(day: DayLog, lang: Language = 'ko'): string {
  const dayDate = day?.date || new Date().toISOString().split('T')[0];
  const dayTitle = getDayTitle(day, lang) || dayDate;
  const places = day?.places || [];
  const routePoints = day?.routePoints || [];
  const dailyNote = getDayDailyNote(day, lang) || 'Daily trail';

  const waypointsXml = places
    .map(
      (p) => `  <wpt lat="${p.lat}" lon="${p.lng}">
    <name>${escapeXml(getPlaceName(p, lang))}</name>
    <desc>${escapeXml(getPlaceNote(p, lang))}</desc>
    <type>${p.category}</type>
  </wpt>`
    )
    .join('\n');

  const trackpointsXml = routePoints
    .map(
      (pt) => `      <trkpt lat="${pt.lat}" lon="${pt.lng}">
        <time>${dayDate}T${pt.timestamp || '12:00'}:00Z</time>
      </trkpt>`
    )
    .join('\n');

  return `<?xml version="1.0" encoding="UTF-8"?>
<gpx version="1.1" creator="LifeMap" xmlns="http://www.topografix.com/GPX/1/1">
  <metadata>
    <name>LifeMap - ${dayDate}</name>
    <desc>${escapeXml(dailyNote)}</desc>
    <time>${dayDate}T00:00:00Z</time>
  </metadata>
${waypointsXml}
  <trk>
    <name>${escapeXml(dayTitle)}</name>
    <trkseg>
${trackpointsXml}
    </trkseg>
  </trk>
</gpx>`;
}

/**
 * Generates CSV string of places visited
 */
export function generateCsv(day: DayLog, lang: Language = 'ko'): string {
  const dayDate = day?.date || '';
  const places = day?.places || [];
  const headers = lang === 'ko'
    ? ['날짜', '장소명', '카테고리', '도착시간', '출발시간', '머문시간(분)', '위도', '경도', '메모']
    : lang === 'ja'
    ? ['日付', '場所名', 'カテゴリー', '到着時間', '出発時間', '滞在時間(分)', '緯度', '経度', 'メモ']
    : ['Date', 'Place Name', 'Category', 'Arrival', 'Departure', 'Duration(mins)', 'Latitude', 'Longitude', 'Note'];

  const rows = places.map((p) => [
    dayDate,
    `"${(getPlaceName(p, lang) || '').replace(/"/g, '""')}"`,
    p.category,
    p.arrivalTime,
    p.departureTime,
    p.durationMinutes,
    p.lat,
    p.lng,
    `"${(getPlaceNote(p, lang) || '').replace(/"/g, '""')}"`,
  ]);

  return [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
}

/**
 * Triggers browser download of a file
 */
export function downloadFile(content: string, filename: string, mimeType: string) {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

function escapeXml(unsafe: string): string {
  return unsafe.replace(/[<>&'"]/g, (c) => {
    switch (c) {
      case '<':
        return '&lt;';
      case '>':
        return '&gt;';
      case '&':
        return '&amp;';
      case '\'':
        return '&apos;';
      case '"':
        return '&quot;';
      default:
        return c;
    }
  });
}
