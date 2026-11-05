/**
 * Rides saved on this device, exportable as GPX. Riders cannot import ride files into Bikera
 * (Eli, 3 Nov 2026: files can be faked); `gpx` / `fit` rides are ones imported before that.
 */
import { Directory, File, Paths } from 'expo-file-system';
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

/** Account erasure must remove only this rider's local routes on a shared device. */
export async function eraseLocalRides(ownerPrincipal: string): Promise<void> {
  const rides = await listLocalRides(ownerPrincipal);
  for (const ride of rides) await deleteLocalRide(ride.id);
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
  if (sorted.length > MAX_POINTS) throw new Error('The ride has too many GPS points.');
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
