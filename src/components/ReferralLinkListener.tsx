import { useEffect } from 'react';
import { Linking } from 'react-native';
import { useToastHelpers } from '../contexts/ToastContext';
import { parseReferralCodeFromUrl, storeReferralCode } from '../utils/referral';

export function ReferralLinkListener() {
  const { info } = useToastHelpers();

  useEffect(() => {
    let isMounted = true;

    const handleUrl = async (url: string | null | undefined) => {
      if (!isMounted || !url) return;
      const code = parseReferralCodeFromUrl(url);
      if (!code) return;
      await storeReferralCode(code);
      info('Referral detected', `Code ${code} has been saved for registration.`);
    };

    const checkInitialUrl = async () => {
      try {
        const initialUrl = await Linking.getInitialURL();
        await handleUrl(initialUrl);
      } catch {
        // ignore
      }
    };

    checkInitialUrl();

    const subscription = Linking.addEventListener('url', (event) => {
      handleUrl(event.url);
    });

    return () => {
      isMounted = false;
      subscription.remove();
    };
  }, [info]);

  return null;
}
