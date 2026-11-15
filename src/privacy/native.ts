import { requireOptionalNativeModule } from 'expo';

type Shield = {
  setEnabled(on: boolean): void;
  setSiteExceptions(hosts: string[]): void;
  setFingerprinting(on: boolean, hosts: string[]): void;
  setPrivate(on: boolean): void;
  resetPrivateFingerprint(): void;
  resetFingerprint(): void;
  setBadgerEnabled(on: boolean): void;
  badgerLearned(): number;
  resetBadger(): void;
  debounce(url: string): string | null;
};

export const native = requireOptionalNativeModule<Shield>('Shield');
