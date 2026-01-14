/**
 * Haptic feedback utility for mobile devices
 * Uses the Vibration API when available
 */

type HapticPattern = 'light' | 'medium' | 'success' | 'warning' | 'error';

const patterns: Record<HapticPattern, number | number[]> = {
  light: 10,
  medium: 25,
  success: [10, 50, 20],
  warning: [15, 30, 15, 30, 15],
  error: [50, 30, 50],
};

export const hapticFeedback = (pattern: HapticPattern = 'light'): void => {
  // Check if Vibration API is available
  if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
    try {
      navigator.vibrate(patterns[pattern]);
    } catch {
      // Silently fail if vibration is not supported
    }
  }
};
