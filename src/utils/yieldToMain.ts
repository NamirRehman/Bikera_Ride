/**
 * Hands the JS thread back to React Native so a queued tab press, navigation
 * update, or paint can run before the next chunk of fetch work.
 */
export function yieldToMain(): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, 0);
  });
}
