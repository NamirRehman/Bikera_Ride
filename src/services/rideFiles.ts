/**
 * Rider-controlled route files (GPX / FIT). Imported files and saved routes stay on this device
 * unless the rider exports and shares them. They are a personal route library: imported distance
 * never counts toward stakes, races, or rewards.
 */
import { Directory, File, Paths } from 'expo-file-system';
import * as DocumentPicker from 'expo-document-picker';
import * as Sharing from 'expo-sharing';

export type RidePoint = { latitude: number; longitude: number; timestampMs: number };
export type LocalRide = {
  id: string;
  ownerPrincipal?: string;
  title: string;
  source: 'bikera' | 'gpx' | 'fit';
  startedAtMs: number;
  endedAtMs: number;
  distanceM: number;
  points: RidePoint[];
};
/** A saved ride without its points, for lists. */
export type LocalRideSummary = Omit<LocalRide, 'points'> & { pointCount: number };

const MAX_FILE_BYTES = 25 * 1024 * 1024;
const MAX_POINTS = 100_000;

const ridesDir = () => new Directory(Paths.document, 'ride-files');
const indexFile = () => new File(ridesDir(), 'index.json');
const rideFile = (id: string) => new File(ridesDir(), `${id}.json`);

const newId = () => `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;

function readIndex(): LocalRideSummary[] {
  const file = indexFile();
  if (!file.exists) return [];
  try {
    const parsed = JSON.parse(file.textSync());
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function writeIndex(entries: LocalRideSummary[]): void {
  indexFile().write(JSON.stringify(entries));
}

export async function saveLocalRide(ride: LocalRide, ownerPrincipal: string): Promise<void> {
  const dir = ridesDir();
  if (!dir.exists) dir.create({ intermediates: true, idempotent: true });
  const stored: LocalRide = { ...ride, ownerPrincipal };
  rideFile(ride.id).write(JSON.stringify(stored));
  const { points, ...summary } = stored;
  writeIndex([{ ...summary, pointCount: points.length }, ...readIndex().filter((r) => r.id !== ride.id)]);
}

export async function listLocalRides(ownerPrincipal: string): Promise<LocalRideSummary[]> {
  return readIndex()
    .filter((ride) => (ride.ownerPrincipal ?? '') === ownerPrincipal)
    .sort((a, b) => b.startedAtMs - a.startedAtMs);
}

export async function loadLocalRide(id: string): Promise<LocalRide> {
  return JSON.parse(await rideFile(id).text());
}

export async function deleteLocalRide(id: string): Promise<void> {
  const file = rideFile(id);
  if (file.exists) file.delete();
  writeIndex(readIndex().filter((r) => r.id !== id));
}

function validPoint(point: RidePoint): boolean {
  return Number.isFinite(point.latitude) && Math.abs(point.latitude) <= 90 &&
    Number.isFinite(point.longitude) && Math.abs(point.longitude) <= 180 &&
    Number.isFinite(point.timestampMs) && point.timestampMs > 0;
}

function distanceM(a: RidePoint, b: RidePoint): number {
  const rad = (n: number) => n * Math.PI / 180;
  const dLat = rad(b.latitude - a.latitude);
  const dLon = rad(b.longitude - a.longitude);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(rad(a.latitude)) * Math.cos(rad(b.latitude)) * Math.sin(dLon / 2) ** 2;
  return 6_371_000 * 2 * Math.atan2(Math.sqrt(h), Math.sqrt(1 - h));
}

function createRide(title: string, source: LocalRide['source'], points: RidePoint[]): LocalRide {
  const sorted = points.filter(validPoint).sort((a, b) => a.timestampMs - b.timestampMs);
  if (sorted.length < 2) throw new Error('The file needs at least two GPS points with timestamps.');
  if (sorted.length > MAX_POINTS) throw new Error('The file has too many GPS points.');
  let metres = 0;
  for (let i = 1; i < sorted.length; i++) {
    const segment = distanceM(sorted[i - 1], sorted[i]);
    // Ignore implausible jumps in the display estimate. Imported distance is never stake evidence.
    if (segment < 2_000) metres += segment;
  }
  return {
    id: newId(), title: title.slice(0, 120), source,
    startedAtMs: sorted[0].timestampMs, endedAtMs: sorted[sorted.length - 1].timestampMs,
    distanceM: Math.round(metres), points: sorted,
  };
}

export function rideFromPoints(title: string, points: RidePoint[]): LocalRide {
  return createRide(title, 'bikera', points);
}

const xmlUnescape = (text: string) => text
  .replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&apos;/g, "'").replace(/&amp;/g, '&');

/** GPX track and route points. No DOMParser on React Native, so this reads the few tags it needs. */
export function parseGpx(xml: string, title: string): LocalRide {
  if (/<!DOCTYPE/i.test(xml)) throw new Error('GPX files with a DOCTYPE are not supported.');
  if (!/<(?:\w+:)?gpx[\s>]/i.test(xml)) throw new Error('This is not a valid GPX file.');
  const points: RidePoint[] = [];
  const pointTag = /<(?:\w+:)?(trkpt|rtept)\b([^>]*?)(\/>|>([\s\S]*?)<\/(?:\w+:)?\1>)/g;
  let match: RegExpExecArray | null;
  while ((match = pointTag.exec(xml)) !== null) {
    if (points.length >= MAX_POINTS) throw new Error('The file has too many GPS points.');
    const attrs = match[2];
    const lat = /\blat\s*=\s*["']([^"']+)["']/.exec(attrs)?.[1];
    const lon = /\blon\s*=\s*["']([^"']+)["']/.exec(attrs)?.[1];
    const time = match[4] ? /<(?:\w+:)?time>([^<]+)<\/(?:\w+:)?time>/.exec(match[4])?.[1] : undefined;
    points.push({
      latitude: Number(lat),
      longitude: Number(lon),
      timestampMs: time ? Date.parse(xmlUnescape(time.trim())) : NaN,
    });
  }
  return createRide(title, 'gpx', points);
}

const FIT_EPOCH_MS = Date.UTC(1989, 11, 31, 0, 0, 0);
const SEMICIRCLES_TO_DEGREES = 180 / 2 ** 31;
const RECORD_MESG = 20;
const FIELD_LAT = 0;
const FIELD_LONG = 1;
const FIELD_TIMESTAMP = 253;

type FitField = { num: number; size: number };
type FitDefinition = { littleEndian: boolean; globalNum: number; fields: FitField[]; devBytes: number };

/**
 * Read GPS points from a FIT activity: record messages (position_lat, position_long, timestamp),
 * including compressed-timestamp headers and chained files. Everything else is skipped by size.
 */
export function parseFitBytes(bytes: Uint8Array, title: string): LocalRide {
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  const points: RidePoint[] = [];
  let offset = 0;
  let sawFile = false;

  while (offset + 12 <= bytes.length) {
    const headerSize = bytes[offset];
    if ((headerSize !== 12 && headerSize !== 14) || offset + headerSize > bytes.length) break;
    const signature = String.fromCharCode(bytes[offset + 8], bytes[offset + 9], bytes[offset + 10], bytes[offset + 11]);
    if (signature !== '.FIT') break;
    sawFile = true;
    const dataSize = view.getUint32(offset + 4, true);
    let pos = offset + headerSize;
    const end = pos + dataSize;
    if (end > bytes.length) throw new Error('The FIT file is damaged.');

    const definitions = new Map<number, FitDefinition>();
    let lastTimestamp = 0;

    while (pos < end) {
      const header = bytes[pos++];
      let local: number;
      let compressedTime: number | null = null;
      if (header & 0x80) {
        local = (header >> 5) & 0x03;
        const offsetBits = header & 0x1f;
        compressedTime = lastTimestamp + ((offsetBits - (lastTimestamp & 0x1f)) & 0x1f);
        lastTimestamp = compressedTime;
      } else if (header & 0x40) {
        local = header & 0x0f;
        const hasDev = (header & 0x20) !== 0;
        if (pos + 5 > end) throw new Error('The FIT file is damaged.');
        const littleEndian = bytes[pos + 1] === 0;
        const globalNum = littleEndian ? view.getUint16(pos + 2, true) : view.getUint16(pos + 2, false);
        const count = bytes[pos + 4];
        pos += 5;
        const fields: FitField[] = [];
        for (let i = 0; i < count; i++) {
          fields.push({ num: bytes[pos], size: bytes[pos + 1] });
          pos += 3;
        }
        let devBytes = 0;
        if (hasDev) {
          const devCount = bytes[pos++];
          for (let i = 0; i < devCount; i++) {
            devBytes += bytes[pos + 1];
            pos += 3;
          }
        }
        if (pos > end) throw new Error('The FIT file is damaged.');
        definitions.set(local, { littleEndian, globalNum, fields, devBytes });
        continue;
      } else {
        local = header & 0x0f;
      }

      const def = definitions.get(local);
      if (!def) throw new Error('The FIT file is damaged.');
      let lat: number | null = null;
      let lon: number | null = null;
      let timestamp = compressedTime;
      for (const field of def.fields) {
        if (pos + field.size > end) throw new Error('The FIT file is damaged.');
        if (field.size === 4) {
          if (field.num === FIELD_TIMESTAMP) {
            const value = view.getUint32(pos, def.littleEndian);
            if (value !== 0xffffffff) {
              timestamp = value;
              lastTimestamp = value;
            }
          } else if (def.globalNum === RECORD_MESG && (field.num === FIELD_LAT || field.num === FIELD_LONG)) {
            const value = view.getInt32(pos, def.littleEndian);
            if (value !== 0x7fffffff) {
              if (field.num === FIELD_LAT) lat = value;
              else lon = value;
            }
          }
        }
        pos += field.size;
      }
      pos += def.devBytes;

      if (def.globalNum === RECORD_MESG && lat !== null && lon !== null && timestamp !== null) {
        if (points.length >= MAX_POINTS) throw new Error('The file has too many GPS points.');
        points.push({
          latitude: lat * SEMICIRCLES_TO_DEGREES,
          longitude: lon * SEMICIRCLES_TO_DEGREES,
          timestampMs: FIT_EPOCH_MS + timestamp * 1000,
        });
      }
    }
    // Skip the 2-byte file CRC; another FIT file may be chained after it.
    offset = end + 2;
  }

  if (!sawFile) throw new Error('This is not a FIT file.');
  return createRide(title, 'fit', points);
}

const xmlEscape = (text: string) => text.replace(/[&<>"']/g, (char) => ({
  '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&apos;',
})[char]!);

export function toGpx(ride: Pick<LocalRide, 'title' | 'points'>): string {
  const points = ride.points.filter(validPoint);
  if (points.length < 2) throw new Error('This ride has no complete GPS route to export.');
  const trkpts = points.map((p) =>
    `      <trkpt lat="${p.latitude}" lon="${p.longitude}"><time>${new Date(p.timestampMs).toISOString()}</time></trkpt>`,
  );
  return `<?xml version="1.0" encoding="UTF-8"?>\n` +
    `<gpx version="1.1" creator="Bikera" xmlns="http://www.topografix.com/GPX/1/1">\n` +
    `  <trk><name>${xmlEscape(ride.title)}</name><trkseg>\n${trkpts.join('\n')}\n` +
    `  </trkseg></trk>\n</gpx>\n`;
}

/** Write the ride as a GPX file and open the share sheet (Files, Strava, Garmin, mail…). */
export async function shareGpx(ride: Pick<LocalRide, 'title' | 'points'>): Promise<void> {
  const data = toGpx(ride);
  const name = `${ride.title.replace(/[^a-z0-9_-]+/gi, '-').replace(/^-+|-+$/g, '').slice(0, 60) || 'bikera-ride'}.gpx`;
  const file = new File(Paths.cache, name);
  file.write(data);
  if (!(await Sharing.isAvailableAsync())) throw new Error('Sharing is not available on this device.');
  await Sharing.shareAsync(file.uri, {
    mimeType: 'application/gpx+xml',
    UTI: 'com.topografix.gpx',
    dialogTitle: 'Export GPX',
  });
}

/** Let the rider pick a .gpx or .fit file and read it. Returns null if they cancel. */
export async function pickAndImportRideFile(): Promise<LocalRide | null> {
  // Any type: iOS has no registered type for .gpx/.fit and would grey those files out.
  const result = await DocumentPicker.getDocumentAsync({ type: '*/*', copyToCacheDirectory: true, multiple: false });
  if (result.canceled || !result.assets?.length) return null;
  const asset = result.assets[0];
  const name = asset.name || 'ride';
  if (asset.size && asset.size > MAX_FILE_BYTES) throw new Error('Choose a route file smaller than 25 MB.');
  const title = name.replace(/\.(gpx|fit)$/i, '');
  const file = new File(asset.uri);
  if (/\.gpx$/i.test(name)) return parseGpx(await file.text(), title);
  if (/\.fit$/i.test(name)) return parseFitBytes(await file.bytes(), title);
  throw new Error('Choose a .gpx or .fit ride file.');
}
