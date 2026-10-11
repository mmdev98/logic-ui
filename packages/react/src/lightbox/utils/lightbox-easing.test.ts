import { describe, expect, it } from "vitest";
import {
  createLightboxCubicBezier,
  createLightboxSpring,
  formatLightboxLinearEasing,
  parseLightboxCubicBezier,
} from "./lightbox-easing";

describe("createLightboxCubicBezier", () => {
  it("is the identity for a straight curve", () => {
    const linear = createLightboxCubicBezier(0, 0, 1, 1);
    expect(linear(0.25)).toBeCloseTo(0.25, 5);
    expect(linear(0.8)).toBeCloseTo(0.8, 5);
  });

  it("matches known values of the CSS `ease` curve", () => {
    const ease = createLightboxCubicBezier(0.25, 0.1, 0.25, 1);
    expect(ease(0.5)).toBeCloseTo(0.8024, 3);
  });

  it("starts at 0, ends at 1, and only moves forward", () => {
    const flight = createLightboxCubicBezier(0.32, 0.72, 0, 1);
    expect(flight(0)).toBe(0);
    expect(flight(1)).toBe(1);
    let previous = 0;
    for (let time = 0.05; time <= 1; time += 0.05) {
      expect(flight(time)).toBeGreaterThanOrEqual(previous);
      previous = flight(time);
    }
  });
});

describe("parseLightboxCubicBezier", () => {
  it("reads a CSS cubic-bezier()", () => {
    const parsed = parseLightboxCubicBezier("cubic-bezier(0.25, 0.1, 0.25, 1)");
    expect(parsed(0.5)).toBeCloseTo(0.8024, 3);
  });

  it("falls back to a straight line", () => {
    expect(parseLightboxCubicBezier("ease")(0.3)).toBeCloseTo(0.3, 5);
  });
});

describe("createLightboxSpring", () => {
  it.each([0, 1, 4, 8, 20])(
    "starts at 0, ends at exactly 1 and never overshoots, from velocity %s",
    (velocity) => {
      const spring = createLightboxSpring(velocity);
      expect(spring(0)).toBe(0);
      expect(spring(1)).toBe(1);
      for (let time = 0.02; time < 1; time += 0.02) {
        expect(spring(time)).toBeLessThanOrEqual(1);
      }
    },
  );

  it("starts at the velocity it was given", () => {
    const step = 1e-4;
    expect(createLightboxSpring(0)(step) / step).toBeCloseTo(0, 1);
    expect(createLightboxSpring(3)(step) / step).toBeCloseTo(3, 1);
  });

  it("is further along early on when released faster", () => {
    expect(createLightboxSpring(5)(0.1)).toBeGreaterThan(
      createLightboxSpring(0)(0.1),
    );
  });
});

describe("formatLightboxLinearEasing", () => {
  it("samples the curve into a CSS linear() function", () => {
    expect(formatLightboxLinearEasing((time) => time, 4)).toBe(
      "linear(0, 0.25, 0.5, 0.75, 1)",
    );
  });
});
