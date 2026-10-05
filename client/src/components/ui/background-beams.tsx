import { motion } from 'motion/react';
import { cn } from '@/lib/utils';

// Adapted from the aceternity "Background Beams" (21st.dev / MIT): faint vertical
// paths with bright gradient pulses traveling down them, themed to our palette.
const W = 720;
const H = 460;
const COLS = 18;
const BEAM_COLORS = ['#b6f23d', '#58cbf5', '#b494f8'];

function pathFor(i: number) {
  const x = (W / (COLS - 1)) * i;
  const sway = 22 * (i % 2 === 0 ? 1 : -1);
  return `M ${x} -20 C ${x + sway} ${H * 0.3}, ${x - sway} ${H * 0.62}, ${x + sway * 0.4} ${H + 20}`;
}

export function BackgroundBeams({ className }: { className?: string }) {
  return (
    <div
      className={cn('pointer-events-none overflow-hidden', className)}
      aria-hidden="true"
    >
      <svg
        className="h-full w-full"
        viewBox={`0 0 ${W} ${H}`}
        preserveAspectRatio="xMidYMin slice"
        fill="none"
      >
        <defs>
          <filter id="ff-beam-glow" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="3.2" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        {/* faint static strands for texture */}
        {Array.from({ length: COLS }).map((_, i) => (
          <path key={`s${i}`} d={pathFor(i)} stroke="rgba(255,255,255,0.06)" strokeWidth="1" />
        ))}

        {/* animated bright pulses on a subset */}
        <g filter="url(#ff-beam-glow)">
          {Array.from({ length: COLS }).map((_, i) => {
            if (i % 2 !== 0) return null;
            const color = BEAM_COLORS[(i / 2) % BEAM_COLORS.length];
            const gid = `ff-beam-${i}`;
            const duration = 4 + (i % 5) * 0.9;
            const delay = (i % 6) * 0.7;
            return (
              <g key={`b${i}`}>
                <path d={pathFor(i)} stroke={`url(#${gid})`} strokeWidth="2.4" strokeLinecap="round" />
                <motion.linearGradient
                  id={gid}
                  gradientUnits="objectBoundingBox"
                  x1="0"
                  x2="0"
                  initial={{ y1: '-25%', y2: '0%' }}
                  animate={{ y1: ['-25%', '110%'], y2: ['0%', '135%'] }}
                  transition={{
                    duration,
                    delay,
                    repeat: Infinity,
                    repeatDelay: 0.6,
                    ease: 'easeInOut',
                  }}
                >
                  <stop stopColor={color} stopOpacity="0" />
                  <stop offset="0.5" stopColor={color} stopOpacity="1" />
                  <stop offset="1" stopColor={color} stopOpacity="0" />
                </motion.linearGradient>
              </g>
            );
          })}
        </g>
      </svg>
    </div>
  );
}
