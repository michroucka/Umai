export const MAX_FAILED_PAIRING_ATTEMPTS = 10;
export const PAIRING_LOCKOUT_MS = 15 * 60 * 1000;

let failedAttemptTimes: number[] = [];

export function isPairingLocked(): boolean {
    failedAttemptTimes = failedAttemptTimes.filter((time) => time > Date.now() - PAIRING_LOCKOUT_MS);

    return failedAttemptTimes.length >= MAX_FAILED_PAIRING_ATTEMPTS;
}

export function recordFailedPairing(): void {
    failedAttemptTimes.push(Date.now());
}
