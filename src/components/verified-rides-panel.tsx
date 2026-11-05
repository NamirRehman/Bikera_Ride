import React, { useCallback, useRef, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { Card } from './Card';
import { useAuth } from '../contexts/AuthContext';
import { colors } from '../theme/tokens';
import { getRideEvidenceOverview, rideEvidence, sessionRoutePoints, type RideEvidenceOverview } from '../services/rideEvidence';
import { shareGpx } from '../services/rideFiles';

const km = (metres: bigint) => (Number(metres) / 1000).toFixed(1);

export function VerifiedRidesPanel({ refreshKey = 0 }: { refreshKey?: number }) {
  const { principal, getIdentity } = useAuth();
  const [snapshot, setSnapshot] = useState<{ owner: string; data: RideEvidenceOverview } | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [revision, setRevision] = useState(0);
  const [exporting, setExporting] = useState<string | null>(null);
  const generation = useRef(0);
  const data = snapshot?.owner === principal ? snapshot.data : null;

  useFocusEffect(useCallback(() => {
    const current = ++generation.current;
    if (!principal) { setSnapshot(null); return; }
    setLoading(true);
    setError(null);
    void getRideEvidenceOverview(getIdentity(), principal).then((next) => {
      if (generation.current === current) setSnapshot({ owner: principal, data: next });
    }).catch((err) => {
      if (generation.current === current) setError(err instanceof Error ? err.message : 'Could not load ride evidence.');
    }).finally(() => { if (generation.current === current) setLoading(false); });
    return () => { generation.current++; };
  }, [principal, getIdentity, revision, refreshKey]));

  if (!principal) return null;

  return (
    <Card glass>
      <Text style={styles.heading}>Verified rides</Text>
      <Text style={styles.copy}>Last 30 days. Independent checks can confirm your Bikera rides; private rides stay on your device.</Text>
      {loading && !data ? <Text style={styles.copy}>Loading ride evidence…</Text> : null}
      {error ? <View accessibilityRole="alert"><Text style={styles.error}>{error}</Text><Pressable accessibilityRole="button" onPress={() => setRevision((value) => value + 1)} style={styles.action}><Text style={styles.link}>Retry ride evidence</Text></Pressable></View> : null}
      {data ? <>
        <View style={styles.totals}>
          {([['Verified', data.totals.completedMeters], ['Independently confirmed', data.totals.attestedMeters], ['Not counted', data.totals.rejectedMeters]] as const).map(([label, metres]) => (
            <View key={label} style={styles.total}><Text style={styles.number}>{km(metres)} km</Text><Text style={styles.caption}>{label}</Text></View>
          ))}
        </View>
        {data.rides.length === 0 ? <Text style={styles.copy}>No finished rides shared with Bikera yet.</Text> : data.rides.map((ride) => {
          const evidence = rideEvidence(ride.provenance);
          return <View key={ride.id} style={styles.ride}>
            <View style={{ flex: 1 }}>
              <Text style={styles.date}>{new Date(Number(ride.startTime / 1_000_000n)).toLocaleDateString()} · {km(ride.distance)} km</Text>
              <Text style={styles.caption}>{Math.round(Number(ride.duration) / 60)} min · {ride.avgSpeed.toString()} km/h average</Text>
              {ride.route.length >= 2 ? <Pressable accessibilityRole="button" disabled={exporting !== null} onPress={async () => {
                setExporting(ride.id);
                try { await shareGpx({ title: `Bikera ride ${ride.id}`, points: sessionRoutePoints(ride) }); }
                catch (err) { setError(err instanceof Error ? err.message : 'Could not export GPX.'); }
                finally { setExporting(null); }
              }} style={styles.action}><Text style={styles.link}>{exporting === ride.id ? 'Exporting…' : 'Export GPX'}</Text></Pressable> : null}
            </View>
            <Text accessibilityLabel={evidence.detail} style={[styles.badge, evidence.level === 'confirmed' && styles.confirmed]}>{evidence.label}</Text>
          </View>;
        })}
      </> : !loading && !error ? <Text style={styles.copy}>Open this screen while signed in to load your ride evidence.</Text> : null}
    </Card>
  );
}

const styles = StyleSheet.create({
  heading: { color: colors.textPrimary, fontSize: 19, fontWeight: '800' },
  copy: { color: colors.textSecondary, fontSize: 13, lineHeight: 19, marginVertical: 10 },
  totals: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginVertical: 12 },
  total: { flexGrow: 1, flexBasis: 100 },
  number: { color: colors.textPrimary, fontSize: 19, fontWeight: '800' },
  caption: { color: colors.textTertiary, fontSize: 12, lineHeight: 17, marginTop: 3 },
  ride: { flexDirection: 'row', gap: 8, alignItems: 'flex-start', paddingVertical: 12, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.border1 },
  date: { color: colors.textPrimary, fontSize: 13, fontWeight: '600' },
  badge: { color: colors.textSecondary, backgroundColor: colors.surface3, padding: 6, borderRadius: 10, maxWidth: '40%', fontSize: 11 },
  confirmed: { color: colors.success },
  action: { paddingVertical: 12, minHeight: 44, justifyContent: 'center' },
  link: { color: colors.brandPurple, fontSize: 13, fontWeight: '700' },
  error: { color: colors.error, lineHeight: 19, marginTop: 8 },
});
