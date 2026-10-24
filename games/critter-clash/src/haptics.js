// Phone haptics: native vibration through Capacitor inside the APK (navigator.vibrate needs a
// permission the WebView doesn't have), the Vibration API on the web. Honours Settings > Vibration.
import { Capacitor } from '@capacitor/core';
import { Haptics, ImpactStyle } from '@capacitor/haptics';
import { save } from './save.js';
import { sfx } from './audio.js';

const native = Capacitor.isNativePlatform();
const STYLE = { light: ImpactStyle.Light, medium: ImpactStyle.Medium, heavy: ImpactStyle.Heavy };
const MS = { light: 10, medium: 22, heavy: 45 };
let last = 0;

export function buzz(kind = 'light') {
  if (!save.settings.vibrate) return;
  const now = performance.now();
  if (now - last < 50) return; // a flurry of hits shouldn't turn into one long rattle
  last = now;
  if (native) Haptics.impact({ style: STYLE[kind] }).catch(() => {});
  else navigator.vibrate?.(MS[kind]);
}

// the Adventure's reward jingle with a tap you can feel (bigger rewards, a firmer tap)
export function reward(level = 1) {
  sfx.jingle(level);
  buzz(level >= 3 ? 'heavy' : level === 2 ? 'medium' : 'light');
}
