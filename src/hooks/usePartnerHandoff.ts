import { useCallback, useEffect, useRef } from 'react';
import { Alert, AppState, Linking } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useAuth } from '../contexts/AuthContext';
import { useToastHelpers } from '../contexts/ToastContext';
import { recordHandoff, type HandoffTarget } from '../services/mobility';

export function usePartnerHandoff() {
  const { principal, getIdentity } = useAuth();
  const navigation = useNavigation<any>();
  const { info } = useToastHelpers();
  const infoRef = useRef(info);
  infoRef.current = info;
  const pending = useRef(false);
  const away = useRef(false);
  const openedAt = useRef(0);

  useEffect(() => {
    const subscription = AppState.addEventListener('change', (state) => {
      if (!pending.current) return;
      if (state !== 'active') { away.current = true; return; }
      if (!away.current) return;
      pending.current = false;
      away.current = false;
      if (Date.now() - openedAt.current > 30 * 60_000) return;
      Alert.alert('Record your partner ride?', 'Record in Bikera so your ride can be credited. Start within 30 minutes of opening the operator. Choose whether to share the ride on the Ride screen.', [
        { text: 'Not now', style: 'cancel' },
        { text: 'Open Ride', onPress: () => navigation.navigate('Track') },
      ]);
    });
    return () => subscription.remove();
  }, [navigation]);

  return useCallback(async (url: string, target?: HandoffTarget) => {
    if (target && principal) {
      try { await recordHandoff(getIdentity(), target); }
      catch (err) { infoRef.current('Opening operator', err instanceof Error ? err.message : 'The referral could not be recorded.'); }
    } else if (!principal) {
      infoRef.current('Not signed in', 'Sign in so partner rides can be credited to your Bikera account.');
    }
    pending.current = true;
    away.current = false;
    openedAt.current = Date.now();
    try { await Linking.openURL(url); }
    catch (err) { pending.current = false; throw err; }
  }, [principal, getIdentity]);
}
