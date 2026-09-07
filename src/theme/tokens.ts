import { Platform } from 'react-native';

/** Palette from bikera_ride/assets/icon.png: cyan chain on black. */
const ICON_CYAN = '#42C0FB';
const ICON_CYAN_DEEP = '#1A9FE0';
const ICON_CYAN_MID = '#2BB4F0';
const ICON_CYAN_SOFT = '#7DD8FF';
const ICON_CYAN_PALE = '#B8ECFF';

export const colors = {
  brandPurple: ICON_CYAN,
  brandViolet: ICON_CYAN_MID,
  brandIndigo: ICON_CYAN_DEEP,
  brandBlue100: ICON_CYAN_PALE,
  brandBlue200: ICON_CYAN_SOFT,
  brandBlue300: ICON_CYAN_MID,
  brandBlue400: ICON_CYAN_DEEP,

  surface0: '#000000',
  surface1: '#000000',
  surface2: '#0A0A0A',
  surface3: '#111111',
  surfaceCard: '#0E0E0E',

  textPrimary: '#F4FBFF',
  textSecondary: '#D7E8F2',
  textTertiary: '#7A93A3',
  textMuted: '#5C707C',

  border1: 'rgba(66,192,251,0.18)',
  border2: 'rgba(255,255,255,0.06)',
  borderAccent: 'rgba(66,192,251,0.4)',

  success: '#22c55e',
  warning: '#f59e0b',
  error: '#ef4444',
  info: ICON_CYAN,
} as const;

export const gradients = {
  brand: [
    colors.brandIndigo,
    colors.brandPurple,
    colors.brandBlue200,
  ],
  gradientBrand: [
    colors.brandIndigo,
    colors.brandPurple,
    colors.brandBlue100,
  ],
  background: [colors.surface0, '#05080A', '#000000', '#031018'],
  button: [colors.brandIndigo, colors.brandPurple],
} as const;

export const shadows = {
  neon: '0px 0px 20px rgba(66,192,251,0.28)',
  glow: '0px 0px 28px rgba(66,192,251,0.24)',
  soft: Platform.select({
    ios: {
      shadowColor: ICON_CYAN,
      shadowOpacity: 0.18,
      shadowRadius: 10,
      shadowOffset: { width: 0, height: 2 },
    },
    android: {
      elevation: 6,
    },
    default: {},
  }),
} as const;

export const radii = {
  lg: 18,
  xl: 20,
  xxl: 28,
  '3xl': 32,
} as const;

export const typography = {
  h1: { fontSize: 34, lineHeight: 40, fontWeight: '800' } as const,
  h2: { fontSize: 28, lineHeight: 34, fontWeight: '700' } as const,
  body: { fontSize: 16, lineHeight: 22, fontWeight: '400' } as const,
  small: { fontSize: 12, lineHeight: 16, fontWeight: '400' } as const,
} as const;

export const overlays = {
  overlay60: 'rgba(0,0,0,0.6)',
  overlay80: 'rgba(0,0,0,0.8)',
} as const;
