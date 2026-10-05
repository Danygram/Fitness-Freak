import confetti from 'canvas-confetti';

const COLORS = ['#b6f23d', '#58cbf5', '#b494f8', '#f5c451'];

// A tasteful two-sided burst in our brand colors. Used for genuine wins only
// (reaching a goal, finishing onboarding) — not routine actions.
export function celebrate() {
  const end = Date.now() + 900;
  const base = { startVelocity: 32, spread: 70, ticks: 220, zIndex: 9999, colors: COLORS };

  // Initial pop from the center-bottom.
  confetti({ ...base, particleCount: 90, origin: { x: 0.5, y: 0.7 }, spread: 100 });

  // Streamers from both lower corners.
  (function frame() {
    confetti({ ...base, particleCount: 10, angle: 60, origin: { x: 0, y: 0.8 } });
    confetti({ ...base, particleCount: 10, angle: 120, origin: { x: 1, y: 0.8 } });
    if (Date.now() < end) requestAnimationFrame(frame);
  })();
}
