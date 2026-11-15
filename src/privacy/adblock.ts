import { native } from './native';

export const adblockAvailable = native !== null;

export function setAdblock(on: boolean) {
  native?.setEnabled(on);
}

export function setSiteExceptions(hosts: string[]) {
  native?.setSiteExceptions(hosts);
}
