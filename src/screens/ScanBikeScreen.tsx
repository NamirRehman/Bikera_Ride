import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Linking, Pressable, StyleSheet, Text, View } from 'react-native';
import { CameraView, useCameraPermissions, type BarcodeScanningResult } from 'expo-camera';
import { Ionicons } from '@expo/vector-icons';

import { Screen } from '../components/Screen';
import { SectionHeader } from '../components/SectionHeader';
import { Card } from '../components/Card';
import { PrimaryButton } from '../components/PrimaryButton';
import { useAuth } from '../contexts/AuthContext';
import { useToastHelpers } from '../contexts/ToastContext';
import { colors, radii } from '../theme/tokens';
import { webAppPage } from '../config';
import { matchBikeQr, type QrMatch, type QrOperator } from '../services/bikeQr';
import { OPERATOR_PRESETS } from '../services/operatorPresets';
import { listActiveOperators, recordHandoff } from '../services/mobility';

/**
 * Scan the QR code on a partner bike. Bikera only ever opens a link whose host belongs to a known
 * operator, records the hand-off on-chain for registered operators (so the next ride is credited),
 * and then opens the operator's app or site to unlock and pay.
 */
export function ScanBikeScreen() {
  const { principal, getIdentity } = useAuth();
  const { error: showError, info } = useToastHelpers();
  const [permission, requestPermission] = useCameraPermissions();
  const [scanning, setScanning] = useState(false);
  const [registered, setRegistered] = useState<QrOperator[]>([]);
  const [match, setMatch] = useState<QrMatch | null>(null);
  const [connected, setConnected] = useState(false);
  const [systemId, setSystemId] = useState('');
  const [opening, setOpening] = useState(false);
  // The camera reports the same code many times a second; handle only the first.
  const handledRef = useRef(false);

  useEffect(() => {
    listActiveOperators(principal ? getIdentity() : undefined)
      .then(setRegistered)
      .catch((err) => console.warn('[ScanBike] Could not load partner operators', err));
  }, [principal, getIdentity]);

  const handleText = useCallback(
    (text: string) => {
      // Operators connected to Bikera first; otherwise still recognise a known operator so the
      // rider can open it, but without a credited ride.
      const live = matchBikeQr(text, registered);
      const result = live.kind === 'partner' ? live : matchBikeQr(text, OPERATOR_PRESETS);
      setConnected(live.kind === 'partner');
      setMatch(result);
      if (result.kind === 'partner') {
        const systems = result.operator.systems;
        setSystemId(systems.length === 1 ? systems[0].systemId : '');
      }
    },
    [registered],
  );

  const onScanned = useCallback(
    ({ data }: BarcodeScanningResult) => {
      if (handledRef.current || !data) return;
      handledRef.current = true;
      setScanning(false);
      handleText(data);
    },
    [handleText],
  );

  const startScanning = async () => {
    setMatch(null);
    if (!permission?.granted) {
      const next = await requestPermission();
      if (!next.granted) {
        showError('Camera', 'Allow camera access in Settings to scan bike QR codes.');
        return;
      }
    }
    handledRef.current = false;
    setScanning(true);
  };

  const openPartner = async () => {
    if (!match || match.kind !== 'partner') return;
    setOpening(true);
    try {
      if (connected && principal && systemId) {
        const identity = getIdentity();
        if (identity) await recordHandoff(identity, { operatorId: match.operator.id, systemId });
      } else if (connected && !principal) {
        info('Not signed in', 'Sign in so rides you take after scanning are credited to your Bikera account.');
      }
    } catch (err) {
      info('Opening anyway', err instanceof Error ? err.message : 'This ride will not be credited.');
    } finally {
      setOpening(false);
      Linking.openURL(match.url).catch(() => showError('Could not open', match.url));
    }
  };

  const partnerCities = useMemo(
    () => (match?.kind === 'partner' ? [...match.operator.systems].sort((a, b) => a.city.localeCompare(b.city)) : []),
    [match],
  );
  const needsCity = connected && partnerCities.length > 1 && !systemId;

  return (
    <Screen>
      <SectionHeader
        title="Scan a bike"
        subtitle="Scan the QR code on a partner bike. Bikera opens the operator's app to unlock and pay, and credits your next ride when you're signed in."
      />

      {scanning ? (
        <View style={styles.cameraWrap}>
          <CameraView
            style={StyleSheet.absoluteFill}
            facing="back"
            barcodeScannerSettings={{ barcodeTypes: ['qr'] }}
            onBarcodeScanned={onScanned}
          />
          <View pointerEvents="none" style={styles.frame} />
        </View>
      ) : null}

      <PrimaryButton
        label={scanning ? 'Stop camera' : match ? 'Scan another bike' : 'Scan with camera'}
        onPress={() => {
          if (scanning) setScanning(false);
          else void startScanning();
        }}
        style={styles.button}
      />

      {match?.kind === 'partner' ? (
        <Card style={styles.result}>
          <Text style={styles.resultTitle}>{match.operator.name} bike</Text>
          {connected ? (
            partnerCities.length > 1 ? (
              <>
                <Text style={styles.resultText}>Choose the city you're riding in</Text>
                <View style={styles.chips}>
                  {partnerCities.map((system) => (
                    <Pressable
                      key={system.systemId}
                      onPress={() => setSystemId(system.systemId)}
                      style={[styles.chip, systemId === system.systemId && styles.chipActive]}
                      accessibilityRole="button"
                      accessibilityState={{ selected: systemId === system.systemId }}
                    >
                      <Text style={[styles.chipText, systemId === system.systemId && styles.chipTextActive]}>{system.city}</Text>
                    </Pressable>
                  ))}
                </View>
              </>
            ) : null
          ) : (
            <Text style={styles.resultText}>
              {match.operator.name} isn't connected to Bikera yet, so this ride won't be credited.
            </Text>
          )}
          <PrimaryButton
            label={opening ? 'Opening…' : `Open in ${match.operator.name}`}
            onPress={() => { void openPartner(); }}
            disabled={opening || needsCity}
            style={styles.button}
          />
        </Card>
      ) : null}

      {match?.kind === 'unknown-link' ? (
        <Card style={styles.result}>
          <View style={styles.warnRow}>
            <Ionicons name="shield-checkmark-outline" size={20} color={colors.warning} />
            <Text style={[styles.resultText, styles.flex]}>
              This QR code links to <Text style={styles.strong}>{match.host}</Text>, which isn't a Bikera partner. For your safety Bikera doesn't open it.
            </Text>
          </View>
        </Card>
      ) : null}

      {match?.kind === 'not-a-link' ? (
        <Card style={styles.result}>
          <Text style={styles.resultText}>This QR code isn't a bike link: "{match.text.slice(0, 80)}"</Text>
        </Card>
      ) : null}

      <Pressable
        onPress={() => Linking.openURL(webAppPage('ride-partners')).catch(() => {})}
        accessibilityRole="link"
        style={styles.linkWrap}
      >
        <Text style={styles.link}>Find partner bikes on the map</Text>
      </Pressable>
    </Screen>
  );
}

const styles = StyleSheet.create({
  cameraWrap: {
    height: 320,
    borderRadius: radii.xl,
    overflow: 'hidden',
    backgroundColor: '#000',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    marginBottom: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  frame: {
    width: 200,
    height: 200,
    borderRadius: 24,
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.75)',
  },
  button: { marginTop: 4 },
  result: { marginTop: 16 },
  resultTitle: { color: colors.textPrimary, fontSize: 17, fontWeight: '800', marginBottom: 8 },
  resultText: { color: colors.textSecondary, fontSize: 14, lineHeight: 20, marginBottom: 10 },
  strong: { color: colors.textPrimary, fontWeight: '700' },
  warnRow: { flexDirection: 'row', gap: 10, alignItems: 'flex-start' },
  flex: { flex: 1 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 10 },
  chip: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.15)',
  },
  chipActive: { backgroundColor: colors.brandPurple, borderColor: colors.brandPurple },
  chipText: { color: colors.textSecondary, fontWeight: '600', fontSize: 13 },
  chipTextActive: { color: '#0B1220' },
  linkWrap: { marginTop: 18, paddingVertical: 6 },
  link: { color: colors.brandPurple, fontWeight: '700', fontSize: 14 },
});
