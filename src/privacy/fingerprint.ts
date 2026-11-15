import { native } from './native';

export const fingerprintAvailable = native !== null;

export function setFingerprinting(on: boolean, exempt: string[]) {
  native?.setFingerprinting(on, exempt);
}

export function setPrivateBrowsing(on: boolean) {
  native?.setPrivate(on);
}

export function resetPrivateFingerprint() {
  native?.resetPrivateFingerprint();
}

export function resetFingerprints() {
  native?.resetFingerprint();
}
