import { native } from './native';

export function setTrackerLearning(on: boolean) {
  native?.setBadgerEnabled(on);
}

export function learnedTrackers() {
  return native?.badgerLearned() ?? 0;
}

export function resetLearnedTrackers() {
  native?.resetBadger();
}
