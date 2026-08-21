import { queries } from '../../core/variables.js';
import { SlicknavBridge } from './slicknav-bridge.js';

const REPAIR_DELAYS = [0, 60, 120, 240] as const;

class MobileHeaderController {
  readonly #bridge = new SlicknavBridge();
  #retryTimer = 0;
  #initialized = false;

  initialize(): () => void {
    if (this.#initialized) return this.destroy;
    this.#initialized = true;
    this.#bridge.setActive(true);
    queries.desktop.addEventListener('change', this.scheduleRepair);
    this.scheduleRepair();
    return this.destroy;
  }

  repair(finalAttempt = false): boolean {
    if (queries.desktop.matches) return true;
    return this.#bridge.repair(finalAttempt);
  }

  scheduleRepair = (): void => {
    this.#clearRetry();
    if (!this.#initialized || queries.desktop.matches) return;

    let index = 0;
    const attempt = (): void => {
      this.#retryTimer = 0;
      if (!this.#initialized) return;
      const finalAttempt = index === REPAIR_DELAYS.length - 1;
      if (this.repair(finalAttempt)) return;
      index += 1;
      const delay = REPAIR_DELAYS[index];
      if (delay !== undefined) this.#retryTimer = window.setTimeout(attempt, delay);
    };
    this.#retryTimer = window.setTimeout(attempt, REPAIR_DELAYS[0]);
  };

  destroy = (): void => {
    if (this.#initialized) queries.desktop.removeEventListener('change', this.scheduleRepair);
    this.#initialized = false;
    this.#clearRetry();
    this.#bridge.destroy();
  };

  #clearRetry(): void {
    if (this.#retryTimer) clearTimeout(this.#retryTimer);
    this.#retryTimer = 0;
  }
}

const mobileHeader = new MobileHeaderController();

export function repairMobileHeader(finalAttempt = false): boolean {
  return mobileHeader.repair(finalAttempt);
}

export function scheduleMobileHeaderRepair(): void {
  mobileHeader.scheduleRepair();
}

export function initializeMobileHeader(): () => void {
  return mobileHeader.initialize();
}

export function destroyMobileHeader(): void {
  mobileHeader.destroy();
}
