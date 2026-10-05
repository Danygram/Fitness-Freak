import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';

// Adapted from the aceternity "Aurora Background" (21st.dev / MIT): a slow,
// blurred animated gradient, masked to a soft glow — themed to our lime/sky.
export function AuroraBackground({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        'relative flex min-h-screen flex-col items-center justify-center overflow-hidden bg-background',
        className,
      )}
    >
      <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden="true">
        <div
          className="animate-aurora absolute -inset-[35%] opacity-90"
          style={{
            backgroundImage:
              'repeating-linear-gradient(105deg, hsl(80 86% 59% / 0.30) 0%, hsl(200 92% 60% / 0.24) 22%, hsl(265 82% 66% / 0.22) 44%, hsl(80 86% 59% / 0.30) 66%)',
            backgroundSize: '200% 120%',
            filter: 'blur(52px)',
            WebkitMaskImage: 'radial-gradient(ellipse 95% 85% at 50% -5%, black 25%, transparent 80%)',
            maskImage: 'radial-gradient(ellipse 95% 85% at 50% -5%, black 25%, transparent 80%)',
          }}
        />
      </div>
      <div className="relative z-10 flex w-full flex-col items-center justify-center">
        {children}
      </div>
    </div>
  );
}
