// the build's version: the APK's own number in CI ('v1.0.<run>', the same as its versionName), or 'v1.0-dev' and the commit locally
export const VERSION = typeof __VERSION__ !== 'undefined' ? __VERSION__ : 'v1.0-dev';
