import { requireOptionalNativeModule } from 'expo';

type Shield = {
  setEnabled(on: boolean): void;
  setSiteExceptions(hosts: string[]): void;
  setBadgerEnabled(on: boolean): void;
  badgerLearned(): number;
  resetBadger(): void;
  debounce(url: string): string | null;
};

export const native = requireOptionalNativeModule<Shield>('Shield');
