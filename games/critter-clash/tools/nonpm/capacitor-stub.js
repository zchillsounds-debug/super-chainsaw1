export const Capacitor = { isNativePlatform: () => false, getPlatform: () => 'web' };
const no = () => Promise.reject(new Error('web stub'));
export const Filesystem = { writeFile: no, readFile: no, getUri: no };
export const Directory = { Documents: 'DOCUMENTS', Cache: 'CACHE', Data: 'DATA' };
export const Encoding = { UTF8: 'utf8' };
export const Haptics = { impact: no };
export const ImpactStyle = { Light: 'LIGHT', Medium: 'MEDIUM', Heavy: 'HEAVY' };
export const Share = { share: no };
