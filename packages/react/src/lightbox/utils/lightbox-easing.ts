/** Maps the time of an animation, 0 to 1, to its progress, 0 to 1. */
export type LightboxEasing = (time: number) => number;

/**
 * The CSS `cubic-bezier(x1, y1, x2, y2)` curve as a function, solved for
 * the time with Newton's method, then bisection where it doesn't converge.
 */
export function createLightboxCubicBezier(
  x1: number,
  y1: number,
  x2: number,
  y2: number,
): LightboxEasing {
  const curve = (a: number, b: number, t: number) =>
    3 * a * (1 - t) ** 2 * t + 3 * b * (1 - t) * t ** 2 + t ** 3;
  const slope = (a: number, b: number, t: number) =>
    3 * a * (1 - t) ** 2 + 6 * (b - a) * (1 - t) * t + 3 * (1 - b) * t ** 2;

  return (time) => {
    if (time <= 0) return 0;
    if (time >= 1) return 1;
    let t = time;
    for (let i = 0; i < 8; i += 1) {
      const error = curve(x1, x2, t) - time;
      if (Math.abs(error) < 1e-6) return curve(y1, y2, t);
      const derivative = slope(x1, x2, t);
      if (Math.abs(derivative) < 1e-6) break;
      t -= error / derivative;
    }
    let low = 0;
    let high = 1;
    t = time;
    for (let i = 0; i < 30; i += 1) {
      const x = curve(x1, x2, t);
      if (Math.abs(x - time) < 1e-6) break;
      if (x < time) low = t;
      else high = t;
      t = (low + high) / 2;
    }
    return curve(y1, y2, t);
  };
}

/** A CSS `cubic-bezier(…)` string as a function; other values give a straight line. */
export function parseLightboxCubicBezier(value: string): LightboxEasing {
  const numbers = value.match(/-?[\d.]+/g)?.map(Number) ?? [];
  const [x1 = 0, y1 = 0, x2 = 1, y2 = 1] =
    value.trim().startsWith("cubic-bezier(") && numbers.length === 4
      ? numbers
      : [];
  return createLightboxCubicBezier(x1, y1, x2, y2);
}

/** Stiffness of the release spring, in its own time: settled by the end. */
const SPRING_STIFFNESS = 10;
/** Fastest start the spring takes, so it never overshoots its target. */
const SPRING_MAX_VELOCITY = 8;

/**
 * A critically damped spring from 0 to 1 that starts at `velocity`, in
 * progress per animation length: `0` starts at rest, `2` twice as fast as an
 * even pace. It never overshoots, and ends at exactly 1.
 */
export function createLightboxSpring(velocity: number): LightboxEasing {
  const omega = SPRING_STIFFNESS;
  const start = Math.min(Math.max(velocity, -2), SPRING_MAX_VELOCITY);
  return (time) => {
    if (time <= 0) return 0;
    if (time >= 1) return 1;
    return 1 - Math.exp(-omega * time) * (1 + (omega - start) * time);
  };
}

/** The easing as a CSS `linear()` function, sampled `steps` times. */
export function formatLightboxLinearEasing(
  easing: LightboxEasing,
  steps = 24,
): string {
  const points = Array.from({ length: steps + 1 }, (_, index) =>
    String(Math.round(easing(index / steps) * 10000) / 10000),
  );
  return `linear(${points.join(", ")})`;
}
