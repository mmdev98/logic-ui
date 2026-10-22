import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { IMAGE_SIZE, VIEWPORT_SIZE } from "../test-utils";
import { createCropperSettings } from "../utils/cropper-settings";
import { CropperEngine, isCropperStateEqual } from "./cropper-engine";

function createEngine(duration = 350): CropperEngine {
  const engine = new CropperEngine(createCropperSettings({}), duration);
  engine.reset(VIEWPORT_SIZE, IMAGE_SIZE, { reason: "image-load" });
  return engine;
}

describe("CropperEngine", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("creates the state and records the reason", () => {
    const engine = createEngine();
    const snapshot = engine.getSnapshot();
    expect(snapshot.state?.coordinates).toEqual({
      left: 100,
      top: 50,
      width: 800,
      height: 400,
    });
    expect(snapshot.reason).toBe("image-load");
  });

  it("notifies its listeners on a change only", () => {
    const engine = createEngine();
    const listener = vi.fn();
    engine.subscribe(listener);
    engine.setBoundary(VIEWPORT_SIZE);
    expect(listener).not.toHaveBeenCalled();
    engine.moveCoordinates({ left: 10, top: 0 }, { reason: "stencil-drag" });
    expect(listener).toHaveBeenCalled();
    expect(engine.getSnapshot().reason).toBe("stencil-drag");
  });

  it("moves the crop by screen pixels", () => {
    const engine = createEngine();
    engine.moveCoordinates({ left: 10, top: 0 });
    // 2.5 image pixels per screen pixel.
    expect(engine.getSnapshot().state?.coordinates?.left).toBe(125);
  });

  it("tracks a gesture until its end", () => {
    const engine = createEngine();
    engine.moveCoordinates({ left: 10, top: 0 });
    expect(engine.getSnapshot().interactions.moveCoordinates).toBe(true);
    engine.moveCoordinatesEnd();
    expect(engine.getSnapshot().interactions.moveCoordinates).toBe(false);
  });

  it("animates a zoom for the transition duration, and ignores drags meanwhile", () => {
    const engine = createEngine();
    engine.zoomImage(2);
    expect(engine.getSnapshot().transitioning).toBe(true);
    const before = engine.getSnapshot().state;
    engine.moveCoordinates({ left: 10, top: 0 });
    expect(engine.getSnapshot().state).toBe(before);

    vi.advanceTimersByTime(350);
    expect(engine.getSnapshot().transitioning).toBe(false);
  });

  it("doesn't animate with a duration of 0", () => {
    const engine = createEngine(0);
    engine.zoomImage(2);
    expect(engine.getSnapshot().transitioning).toBe(false);
  });

  it("brings the state back within new settings", () => {
    const engine = createEngine();
    engine.configure(createCropperSettings({ aspectRatio: 1 }), 0);
    expect(engine.isConsistent()).toBe(false);
    engine.reconcile();
    expect(engine.isConsistent()).toBe(true);
  });

  it("clears the state", () => {
    const engine = createEngine();
    engine.clear();
    expect(engine.getSnapshot().state).toBeNull();
  });
});

describe("isCropperStateEqual", () => {
  it("ignores differences below the tolerance", () => {
    const engine = createEngine();
    const state = engine.getSnapshot().state!;
    const close = {
      ...state,
      coordinates: {
        ...state.coordinates!,
        left: state.coordinates!.left + 1e-4,
      },
    };
    expect(isCropperStateEqual(state, close)).toBe(true);
    expect(
      isCropperStateEqual(state, {
        ...state,
        coordinates: { ...state.coordinates!, left: 0 },
      }),
    ).toBe(false);
  });
});
