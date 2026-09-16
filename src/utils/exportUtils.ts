import { DayLog } from '../types';

/**
 * Generates GPX XML string from DayLog
 */
export function generateGpx(day: DayLog): string {
  const dayDate = day?.date || new Date().toISOString().split('T')[0];
  const dayTitle = day?.title || dayDate;
  const places = day?.places || [];
  const routePoints = day?.routePoints || [];

  const waypointsXml = places
    .map(
      (p) => `  <wpt lat="${p.lat}" lon="${p.lng}">
    <name>${escapeXml(p.name)}</name>
    <desc>${escapeXml(p.note || '')}</desc>
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
    <desc>${escapeXml(day?.dailyNote || 'Daily trail')}</desc>
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
export function generateCsv(day: DayLog): string {
  const dayDate = day?.date || '';
  const places = day?.places || [];
  const headers = ['Date', 'Place Name', 'Category', 'Arrival', 'Departure', 'Duration(mins)', 'Latitude', 'Longitude', 'Note'];
  const rows = places.map((p) => [
    dayDate,
    `"${(p.name || '').replace(/"/g, '""')}"`,
    p.category,
    p.arrivalTime,
    p.departureTime,
    p.durationMinutes,
    p.lat,
    p.lng,
    `"${(p.note || '').replace(/"/g, '""')}"`,
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
