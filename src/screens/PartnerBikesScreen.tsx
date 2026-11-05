import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { AppState, FlatList, Linking, Modal, Platform, Pressable, RefreshControl, StyleSheet, Text, TextInput, View } from 'react-native';
import { useFocusEffect, useIsFocused } from '@react-navigation/native';
import * as Location from 'expo-location';
import { Screen } from '../components/Screen';
import { Card } from '../components/Card';
import { SectionHeader } from '../components/SectionHeader';
import { GuestBanner } from '../components/GuestBanner';
import { useAuth } from '../contexts/AuthContext';
import { usePartnerHandoff } from '../hooks/usePartnerHandoff';
import { colors } from '../theme/tokens';
import { webAppPage } from '../config';
import { OPERATOR_PRESETS } from '../services/operatorPresets';
import type { QrOperator } from '../services/bikeQr';
import { formatFare, getMobilitySystems, getMyPartnerRides, getNearbyBikes, listActiveOperators, rentalLink,
  type MobilitySystem, type NearbyBikes, type NearbyStation, type NearbyVehicle, type PartnerRide } from '../services/mobility';
import { withTimeout } from '../services/integration-utils';

type SearchArea = { key?: string; lat: number; lon: number; label: string };
type Target = { kind: 'bike'; item: NearbyVehicle } | { kind: 'station'; item: NearbyStation };
const distance = (metres: number) => metres < 1000 ? `${Math.round(metres)} m away` : `${(metres / 1000).toFixed(1)} km away`;
const message = (err: unknown) => err instanceof Error ? err.message : 'Please check your connection and try again.';

export function PartnerBikesScreen() {
  const { principal, getIdentity } = useAuth();
  const openHandoff = usePartnerHandoff();
  const focused = useIsFocused();
  const [active, setActive] = useState(AppState.currentState === 'active');
  const [systems, setSystems] = useState<MobilitySystem[] | null>(null);
  const [operators, setOperators] = useState<QrOperator[]>([]);
  const [area, setArea] = useState<SearchArea | null>(null);
  const [nearby, setNearby] = useState<NearbyBikes | null>(null);
  const [view, setView] = useState<'bike' | 'station'>('bike');
  const [loading, setLoading] = useState(false);
  const [systemsLoading, setSystemsLoading] = useState(true);
  const [locating, setLocating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [systemError, setSystemError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [revision, setRevision] = useState(0);
  const [picker, setPicker] = useState(false);
  const [search, setSearch] = useState('');
  const [opening, setOpening] = useState<string | null>(null);
  const [history, setHistory] = useState<{ owner: string; rides: PartnerRide[] } | null>(null);
  const [historyError, setHistoryError] = useState<string | null>(null);
  const [historyLoading, setHistoryLoading] = useState(false);
  const openedArea = useRef(false);
  const loadedArea = useRef<SearchArea | null>(null);

  useEffect(() => {
    const subscription = AppState.addEventListener('change', (state) => setActive(state === 'active'));
    return () => subscription.remove();
  }, []);

  useFocusEffect(useCallback(() => {
    const controller = new AbortController();
    setSystemsLoading(true);
    setSystemError(null);
    void getMobilitySystems(controller.signal).then((list) => {
      if (controller.signal.aborted) return;
      setSystems(list);
      if (!openedArea.current) {
        const first = list.find((system) => system.center && system.vehiclesAvailable > 0);
        if (first?.center) {
          openedArea.current = true;
          setArea({ key: first.key, ...first.center, label: `${first.city} · ${first.operatorName}` });
        } else { setLoading(false); }
      }
    }).catch((err) => { if (!controller.signal.aborted) setSystemError(message(err)); })
      .finally(() => { if (!controller.signal.aborted) setSystemsLoading(false); });
    void listActiveOperators().then((list) => { if (!controller.signal.aborted) setOperators(list); }).catch(() => {});
    return () => controller.abort();
  }, [revision]));

  useEffect(() => {
    if (!focused || !active || !area) return;
    const controller = new AbortController();
    let inFlight = false;
    // Keep the last results during refreshes; a different search area needs its own results.
    if (loadedArea.current !== area) {
      setNearby(null);
      setError(null);
      loadedArea.current = area;
    }
    const refresh = async () => {
      if (inFlight) return;
      inFlight = true;
      setLoading(true);
      try {
        const next = await getNearbyBikes(area.lat, area.lon, area.key, controller.signal);
        if (!controller.signal.aborted) {
          setNearby(next);
          setError(null);
          if (!next.vehicles.length && next.stations.length) setView('station');
        }
      } catch (err) { if (!controller.signal.aborted) setError(message(err)); }
      finally { inFlight = false; if (!controller.signal.aborted) setLoading(false); }
    };
    void refresh();
    const timer = setInterval(() => { void refresh(); }, 30_000);
    return () => { clearInterval(timer); controller.abort(); };
  }, [area, focused, active, revision]);

  useFocusEffect(useCallback(() => {
    let cancelled = false;
    setHistoryError(null);
    if (!principal) { setHistory(null); return; }
    setHistoryLoading(true);
    void getMyPartnerRides(getIdentity(), principal).then((rides) => {
      if (!cancelled) setHistory({ owner: principal, rides });
    }).catch((err) => { if (!cancelled) setHistoryError(message(err)); })
      .finally(() => { if (!cancelled) setHistoryLoading(false); });
    return () => { cancelled = true; };
  }, [principal, getIdentity, revision]));

  const cities = useMemo(() => (systems || []).filter((system) => system.vehiclesAvailable > 0 && system.center &&
    `${system.city} ${system.operatorName} ${system.countryCode}`.toLowerCase().includes(search.toLowerCase()))
    .sort((a, b) => a.countryCode.localeCompare(b.countryCode) || a.city.localeCompare(b.city)), [systems, search]);
  const targets: Target[] = view === 'bike'
    ? (nearby?.vehicles || []).map((item) => ({ kind: 'bike', item }))
    : (nearby?.stations || []).map((item) => ({ kind: 'station', item }));
  const myRides = history?.owner === principal ? history.rides : null;

  const locate = async () => {
    setLocating(true);
    setNotice(null);
    try {
      const permission = await Location.requestForegroundPermissionsAsync();
      if (!permission.granted) throw new Error('Location permission was not granted. You can choose a city instead.');
      const position = await withTimeout(Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced }), 15_000, 'Could not find your location. Choose a city or try again.');
      openedArea.current = true;
      setArea({ lat: position.coords.latitude, lon: position.coords.longitude, label: 'Near me' });
    } catch (err) { setNotice(message(err)); }
    finally { setLocating(false); }
  };

  const ride = async (target: Target) => {
    const link = rentalLink(target.item.rentalUris);
    if (!link) { setNotice('This bike has no rental link. Open the operator directly.'); return; }
    setOpening(`${target.kind}:${target.item.id}`);
    setNotice(null);
    try {
      const item = target.item;
      await openHandoff(link, operators.some((operator) => operator.id === item.operatorId) ? {
        operatorId: item.operatorId, systemId: item.systemId, lat: item.lat, lon: item.lon,
        vehicleId: target.kind === 'bike' ? target.item.id : undefined,
        vehicleTypeId: target.kind === 'bike' ? target.item.vehicleType?.id : undefined,
        stationId: target.kind === 'station' ? item.id : target.item.stationId || undefined,
      } : undefined);
    } catch (err) { setNotice(message(err)); }
    finally { setOpening(null); }
  };

  const openMap = (lat: number, lon: number) => {
    const url = Platform.OS === 'ios' ? `https://maps.apple.com/?ll=${lat},${lon}&q=Partner%20bike` : `https://www.google.com/maps/search/?api=1&query=${lat},${lon}`;
    void Linking.openURL(url).catch((err) => setNotice(message(err)));
  };

  return <Screen scroll={false} contentStyle={{ flex: 1, paddingHorizontal: 16, paddingTop: 0 }}>
    <FlatList
      data={targets}
      keyExtractor={(target) => `${target.kind}:${target.item.operatorId}:${target.item.systemId}:${target.item.id}`}
      refreshControl={<RefreshControl refreshing={loading || systemsLoading} onRefresh={() => setRevision((value) => value + 1)} tintColor={colors.brandPurple} />}
      contentContainerStyle={{ paddingBottom: 32 }}
      ListHeaderComponent={<>
        <SectionHeader title="Partner bikes" subtitle="Find a shared bike and open the operator to rent it." />
        <GuestBanner compact message="Sign in so partner rides can be credited to your Bikera account." />
        <Text style={styles.copy}>You pay the operator in their app. Bikera never handles your payment.</Text>
        <View style={styles.actions}>
          <Pressable style={styles.button} accessibilityRole="button" onPress={() => setPicker(true)}><Text style={styles.link}>{area?.label || 'Choose city'}</Text></Pressable>
          <Pressable style={styles.button} accessibilityRole="button" disabled={locating} onPress={() => { void locate(); }}><Text style={styles.link}>{locating ? 'Locating…' : 'Near me'}</Text></Pressable>
        </View>
        <Text style={styles.small}>Your location is used for this search only. Availability refreshes every 30 seconds while this screen is open.</Text>
        <Pressable style={styles.button} accessibilityRole="link" onPress={() => { void Linking.openURL(webAppPage('ride-partners')).catch((err) => setNotice(message(err))); }}><Text style={styles.link}>Open live bike map on Bikera Web</Text></Pressable>
        {notice || systemError || error ? <View accessibilityRole="alert"><Text style={styles.error}>{notice || systemError || error}</Text><Pressable style={styles.button} accessibilityRole="button" onPress={() => setRevision((value) => value + 1)}><Text style={styles.link}>Retry availability</Text></Pressable></View> : null}
        <View style={styles.actions}>{(['bike', 'station'] as const).map((mode) => <Pressable key={mode} style={[styles.button, view === mode && styles.selected]} accessibilityRole="tab" accessibilityState={{ selected: view === mode }} aria-selected={view === mode} onPress={() => setView(mode)}><Text style={styles.link}>{mode === 'bike' ? 'Bikes' : 'Stations'}</Text></Pressable>)}</View>
        {systemsLoading && !area ? <Text style={styles.copy}>Loading partner cities…</Text> : loading && !nearby ? <Text style={styles.copy}>Loading available bikes…</Text> : null}
      </>}
      ListEmptyComponent={!loading && !systemsLoading && !error && !systemError ? <Text style={styles.copy}>{area ? `No ${view === 'bike' ? 'bikes' : 'stations'} within 1.5 km. Try another city or Near me.` : 'No cities with bicycles available right now. Pull to refresh.'}</Text> : null}
      renderItem={({ item: target }) => <Card>
        <Text style={styles.title}>{target.kind === 'bike' ? target.item.vehicleType?.name || 'Bicycle' : target.item.name}</Text>
        <Text style={styles.copy}>{target.item.operatorName || target.item.operatorId} · {distance(target.item.distanceM)}</Text>
        <Text style={styles.small}>{target.kind === 'bike' ? `${target.item.batteryPercent === null ? '' : `${target.item.batteryPercent}% battery · `}${target.item.pricing?.summary || "Price in the operator's app"}` : `${target.item.vehiclesAvailable} bicycles available`}</Text>
        {!target.item.deepLink ? <Text style={styles.small}>Find this bike in the operator’s app.</Text> : null}
        <View style={styles.actions}>
          <Pressable style={styles.button} accessibilityRole="button" disabled={opening !== null} onPress={() => { void ride(target); }}><Text style={styles.link}>{opening === `${target.kind}:${target.item.id}` ? 'Opening…' : target.item.deepLink ? 'Ride with operator' : 'Open app'}</Text></Pressable>
          <Pressable style={styles.button} accessibilityRole="link" onPress={() => openMap(target.item.lat, target.item.lon)}><Text style={styles.link}>Directions</Text></Pressable>
        </View>
      </Card>}
      ListFooterComponent={<>
        <Text style={styles.small}>Lagos, Nigeria and South Africa: coming soon.</Text>
        {principal ? <Card>
          <Text style={styles.title}>Your partner rides</Text>
          {historyLoading && !myRides ? <Text style={styles.copy}>Loading partner rides…</Text> : null}
          {historyError ? <View accessibilityRole="alert"><Text style={styles.error}>{historyError}</Text><Pressable style={styles.button} accessibilityRole="button" onPress={() => setRevision((value) => value + 1)}><Text style={styles.link}>Retry partner rides</Text></Pressable></View> : null}
          {myRides?.map((item) => <View key={item.id} style={styles.history}>
            <Text style={styles.title}>{operators.find((operator) => operator.id === item.operatorId)?.name || OPERATOR_PRESETS.find((operator) => operator.id === item.operatorId)?.name || item.operatorId}</Text>
            <Text style={styles.copy}>{new Date(Number(item.startTime / 1_000_000n)).toLocaleDateString()} · {(Number(item.distanceM) / 1000).toFixed(1)} km</Text>
            {item.estimatedFare[0] ? <Text style={styles.small}>Estimated fare: about {formatFare(item.estimatedFare[0].amountMinor, item.estimatedFare[0].currency)}. The operator shows the final price.</Text> : null}
          </View>)}
          {myRides?.length === 0 ? <Text style={styles.copy}>No credited partner rides yet. After opening an operator, record and share the ride in Bikera.</Text> : null}
        </Card> : null}
      </>}
    />
    <Modal visible={picker} animationType="slide" onRequestClose={() => setPicker(false)}>
      <Screen scroll={false} contentStyle={{ flex: 1, padding: 16 }}>
        <Text style={styles.title}>Choose a city</Text>
        <TextInput accessibilityLabel="Search partner cities" placeholder="City, country code or operator" placeholderTextColor={colors.textTertiary} value={search} onChangeText={setSearch} style={styles.input} />
        <Pressable accessibilityRole="button" onPress={() => setPicker(false)} style={styles.button}><Text style={styles.link}>Close city picker</Text></Pressable>
        {systemError ? <Text accessibilityRole="alert" style={styles.error}>{systemError}</Text> : null}
        <FlatList data={cities} keyExtractor={(system) => system.key} ListEmptyComponent={<Text style={styles.copy}>{systemsLoading ? 'Loading partner cities…' : systemError ? 'Close the picker and retry availability.' : 'No matching cities with bicycles available.'}</Text>} renderItem={({ item }) => <Pressable accessibilityRole="button" style={styles.city} onPress={() => {
          if (!item.center) return;
          openedArea.current = true;
          setArea({ key: item.key, ...item.center, label: `${item.city} · ${item.operatorName}` });
          setPicker(false);
        }}><Text style={styles.title}>{item.city} · {item.countryCode}</Text><Text style={styles.small}>{item.operatorName} · {item.vehiclesAvailable} bicycles</Text></Pressable>} />
      </Screen>
    </Modal>
  </Screen>;
}

const styles = StyleSheet.create({
  title: { color: colors.textPrimary, fontSize: 16, fontWeight: '700' },
  copy: { color: colors.textSecondary, fontSize: 13, lineHeight: 20, marginVertical: 8 },
  small: { color: colors.textTertiary, fontSize: 12, lineHeight: 18, marginVertical: 4 },
  actions: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  button: { paddingHorizontal: 12, paddingVertical: 12, minHeight: 44, justifyContent: 'center', borderRadius: 12 },
  selected: { backgroundColor: colors.surface3 },
  link: { color: colors.brandPurple, fontWeight: '700', fontSize: 13 },
  error: { color: colors.error, fontSize: 13, lineHeight: 20, marginTop: 8 },
  input: { color: colors.textPrimary, padding: 14, marginTop: 16, borderWidth: 1, borderColor: colors.border1, borderRadius: 12 },
  city: { paddingVertical: 14, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.border1 },
  history: { paddingTop: 12, marginTop: 12, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.border1 },
});
