import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Alert, Pressable, StyleSheet, Text, View } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';

import { Screen } from '../components/Screen';
import { SectionHeader } from '../components/SectionHeader';
import { Card } from '../components/Card';
import { PrimaryButton } from '../components/PrimaryButton';
import { useAuth } from '../contexts/AuthContext';
import { useToastHelpers } from '../contexts/ToastContext';
import { colors } from '../theme/tokens';
import {
  deleteLocalRide,
  listLocalRides,
  loadLocalRide,
  pickAndImportRideFile,
  saveLocalRide,
  shareGpx,
  type LocalRideSummary,
} from '../services/rideFiles';

const SOURCE_LABEL: Record<LocalRideSummary['source'], string> = {
  bikera: 'Tracked in Bikera',
  gpx: 'GPX file',
  fit: 'FIT file',
};

/** Imported rides are a personal route library, not evidence for stakes or rewards. */
export function RideFilesScreen() {
  const { principal } = useAuth();
  const { success, error: showError } = useToastHelpers();
  const [rides, setRides] = useState<LocalRideSummary[]>([]);
  const [importing, setImporting] = useState(false);
  const [exportingId, setExportingId] = useState<string | null>(null);
  // The toast helpers are new functions every render; keep them out of refresh's dependencies.
  const showErrorRef = useRef(showError);
  showErrorRef.current = showError;

  const refresh = useCallback(async () => {
    try {
      setRides(await listLocalRides(principal || ''));
    } catch {
      showErrorRef.current('Ride files', 'Ride storage on this device is unavailable.');
    }
  }, [principal]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  // Rides saved by the tracker while this screen was in the background.
  useFocusEffect(
    useCallback(() => {
      void refresh();
    }, [refresh]),
  );

  const importFile = async () => {
    setImporting(true);
    try {
      const ride = await pickAndImportRideFile();
      if (!ride) return;
      await saveLocalRide(ride, principal || '');
      await refresh();
      success('Ride imported', `${ride.title} was saved on this device.`);
    } catch (err) {
      showError('Could not import', err instanceof Error ? err.message : 'Could not import this file.');
    } finally {
      setImporting(false);
    }
  };

  const exportRide = async (summary: LocalRideSummary) => {
    setExportingId(summary.id);
    try {
      await shareGpx(await loadLocalRide(summary.id));
    } catch (err) {
      showError('Could not export', err instanceof Error ? err.message : 'Could not export this ride.');
    } finally {
      setExportingId(null);
    }
  };

  const removeRide = (summary: LocalRideSummary) => {
    Alert.alert('Delete ride file?', `${summary.title} will be removed from this device.`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: () => {
          void deleteLocalRide(summary.id).then(refresh).catch(() => showError('Could not delete', 'Try again.'));
        },
      },
    ]);
  };

  return (
    <Screen>
      <SectionHeader
        title="Ride files"
        subtitle="Open a GPX or FIT ride from Strava, Garmin, or Wahoo, or export your Bikera rides as GPX. Files stay on this device unless you share them."
      />

      <PrimaryButton
        label={importing ? 'Importing…' : 'Import GPX or FIT'}
        onPress={() => { void importFile(); }}
        disabled={importing}
      />
      <Text style={styles.note}>Imported files do not count toward stakes, races, or rewards.</Text>

      {rides.length === 0 ? (
        <Card style={styles.empty}>
          <Ionicons name="document-text-outline" size={28} color={colors.textTertiary} style={styles.emptyIcon} />
          <Text style={styles.emptyText}>
            No ride files yet. Rides you finish in the Ride tab are saved here too, ready to export.
          </Text>
        </Card>
      ) : (
        rides.map((ride) => (
          <Card key={ride.id} style={styles.row}>
            <Text style={styles.title} numberOfLines={1}>{ride.title}</Text>
            <Text style={styles.meta}>
              {new Date(ride.startedAtMs).toLocaleString()} · {(ride.distanceM / 1000).toFixed(1)} km · {ride.pointCount} GPS points
            </Text>
            <Text style={styles.meta}>{SOURCE_LABEL[ride.source]}</Text>
            <View style={styles.actions}>
              <Pressable
                onPress={() => { void exportRide(ride); }}
                disabled={exportingId === ride.id}
                style={styles.action}
                accessibilityRole="button"
                accessibilityLabel={`Export ${ride.title} as GPX`}
              >
                <Ionicons name="share-outline" size={16} color={colors.brandPurple} />
                <Text style={styles.actionText}>{exportingId === ride.id ? 'Exporting…' : 'Export GPX'}</Text>
              </Pressable>
              <Pressable
                onPress={() => removeRide(ride)}
                style={styles.action}
                accessibilityRole="button"
                accessibilityLabel={`Delete ${ride.title}`}
              >
                <Ionicons name="trash-outline" size={16} color={colors.error} />
                <Text style={[styles.actionText, { color: colors.error }]}>Delete</Text>
              </Pressable>
            </View>
          </Card>
        ))
      )}

      <Text style={styles.note}>Deleting the app also deletes these ride files. Export a copy if you want to keep one.</Text>
    </Screen>
  );
}

const styles = StyleSheet.create({
  note: { color: colors.textTertiary, fontSize: 12, marginTop: 10, marginBottom: 6, lineHeight: 17 },
  empty: { marginTop: 14, paddingVertical: 10 },
  emptyIcon: { alignSelf: 'center', marginBottom: 10 },
  emptyText: { color: colors.textSecondary, textAlign: 'center', fontSize: 14, lineHeight: 20 },
  row: { marginTop: 12 },
  title: { color: colors.textPrimary, fontSize: 16, fontWeight: '700', marginBottom: 4 },
  meta: { color: colors.textTertiary, fontSize: 13, marginTop: 2 },
  actions: { flexDirection: 'row', gap: 18, marginTop: 8 },
  action: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingVertical: 4 },
  actionText: { color: colors.brandPurple, fontWeight: '700', fontSize: 14 },
});
