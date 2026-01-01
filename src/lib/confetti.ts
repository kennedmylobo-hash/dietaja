import confetti from 'canvas-confetti';

/**
 * Celebration confetti animation for checkout success
 */
export const celebrateCheckout = (): void => {
  // First burst
  confetti({
    particleCount: 100,
    spread: 70,
    origin: { y: 0.6 },
    colors: ['#7C9A72', '#A8C69F', '#D4A574', '#F5E6D3', '#FFFFFF'],
  });

  // Side bursts for extra celebration
  setTimeout(() => {
    confetti({
      particleCount: 50,
      angle: 60,
      spread: 55,
      origin: { x: 0 },
      colors: ['#7C9A72', '#A8C69F', '#D4A574'],
    });
    confetti({
      particleCount: 50,
      angle: 120,
      spread: 55,
      origin: { x: 1 },
      colors: ['#7C9A72', '#A8C69F', '#D4A574'],
    });
  }, 150);
};
