import { createContext, useContext } from 'react';

export const NativeTabLayoutContext = createContext(false);

export function useNativeTabLayout() {
  return useContext(NativeTabLayoutContext);
}
