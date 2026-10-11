import { describe, expect, it, vi } from "vitest";
import {
  createLightboxStandIn,
  getLightboxCrossfadeOpacity,
  getLightboxFadedState,
  getLightboxFlightKeyframe,
  getLightboxFlightKeyframes,
  getLightboxFlightOffset,
  getLightboxFlightRadii,
  getLightboxMovedState,
  getLightboxReleaseEasing,
  getLightboxRestState,
  getLightboxStandInKeyframes,
  interpolateLightboxFlightState,
  type LightboxFlightState,
} from "./lightbox-flight";

describe("getLightboxFlightKeyframe", () => {
  it("covers the trigger with the image and clips it to the trigger", () => {
    const box = { left: 200, top: 150, width: 400, height: 300 };
    const trigger = { left: 10, top: 20, width: 60, height: 60 };
    const keyframe = getLightboxFlightKeyframe(trigger, box, [8, 8, 8, 8]);
    // Cover: the 4:3 image scales to the trigger's height, 80 × 60.
    expect(keyframe.transform).toBe(
      "translate3d(-360px, -250px, 0px) scale(0.2)",
    );
    // 60 px of the 80 px width show: 50 px of the box is clipped on each side.
    expect(keyframe.clipPath).toBe("inset(0px 50px round 40px 40px 40px 40px)");
  });

  it("keeps each corner's own radius", () => {
    const box = { left: 0, top: 0, width: 100, height: 100 };
    const trigger = { left: 0, top: 0, width: 50, height: 50 };
    const keyframe = getLightboxFlightKeyframe(trigger, box, [12, 0, 0, 12]);
    expect(keyframe.clipPath).toBe("inset(0px 0px round 24px 0px 0px 24px)");
  });
});

describe("getLightboxFlightRadii", () => {
  it("reads the four corners, capped at a circle", () => {
    const rect = { left: 0, top: 0, width: 40, height: 20 };
    expect(
      getLightboxFlightRadii(
        {
          borderTopLeftRadius: "12px",
          borderTopRightRadius: "0px",
          borderBottomRightRadius: "999px",
          borderBottomLeftRadius: "",
        },
        rect,
      ),
    ).toEqual([10, 0, 10, 0]);
  });
});

const box = { left: 200, top: 150, width: 400, height: 300 };
const tile: LightboxFlightState = {
  rect: { left: 10, top: 20, width: 60, height: 60 },
  radii: [8, 8, 8, 8],
  opacity: 1,
};

describe("flight states", () => {
  it("rests in the box, square and opaque", () => {
    expect(getLightboxRestState(box)).toEqual({
      rect: box,
      radii: [0, 0, 0, 0],
      opacity: 1,
    });
  });

  it("moves and scales around the centre", () => {
    expect(getLightboxMovedState(box, 10, -20, 0.5).rect).toEqual({
      left: 310,
      top: 205,
      width: 200,
      height: 150,
    });
  });

  it("fades out a little smaller, where it is", () => {
    const faded = getLightboxFadedState(box);
    expect(faded.opacity).toBe(0);
    expect(faded.rect.width).toBeCloseTo(380);
    expect(faded.rect.left + faded.rect.width / 2).toBeCloseTo(400);
  });

  it("interpolates the box on screen, its corners and its opacity", () => {
    const rest = getLightboxRestState(box);
    expect(interpolateLightboxFlightState(tile, rest, 0.5)).toEqual({
      rect: { left: 105, top: 85, width: 230, height: 180 },
      radii: [4, 4, 4, 4],
      opacity: 1,
    });
  });
});

describe("getLightboxFlightKeyframes", () => {
  const rest = getLightboxRestState(box);
  const keyframes = getLightboxFlightKeyframes(tile, rest, box, (t) => t, 5);

  it("starts on the trigger and ends at rest", () => {
    const {
      offset: firstOffset,
      opacity: firstOpacity,
      ...first
    } = keyframes[0] ?? {};
    expect(first).toEqual(
      getLightboxFlightKeyframe(tile.rect, box, tile.radii),
    );
    expect(firstOffset).toBe(0);
    expect(firstOpacity).toBe(1);
    expect(keyframes.at(-1)?.transform).toBe(
      "translate3d(0px, 0px, 0px) scale(1)",
    );
    expect(keyframes.at(-1)?.offset).toBe(1);
  });

  it("draws each frame at the state on screen for its time", () => {
    const middle = interpolateLightboxFlightState(tile, rest, 0.5);
    const { offset, opacity, ...frame } = keyframes[2] ?? {};
    expect(offset).toBe(0.5);
    expect(opacity).toBe(1);
    expect(frame).toEqual(
      getLightboxFlightKeyframe(middle.rect, box, middle.radii),
    );
  });

  it("applies the easing to the progress, spacing the frames evenly in time", () => {
    const eased = getLightboxFlightKeyframes(tile, rest, box, (t) => t * t, 3);
    const quarter = interpolateLightboxFlightState(tile, rest, 0.25);
    expect(eased[1]?.offset).toBe(0.5);
    expect(eased[1]?.transform).toBe(
      getLightboxFlightKeyframe(quarter.rect, box, quarter.radii).transform,
    );
  });
});

describe("getLightboxReleaseEasing", () => {
  const rest = getLightboxRestState(box);
  const below = getLightboxMovedState(box, 0, 300, 1);

  it("starts at the speed of the drag along the way", () => {
    // 300 px to go in 300 ms at 2 px/ms: twice an even pace.
    const easing = getLightboxReleaseEasing(rest, below, { x: 0, y: 2 }, 300);
    expect(easing(1e-4) / 1e-4).toBeCloseTo(2, 1);
  });

  it("ignores the speed across the way", () => {
    const easing = getLightboxReleaseEasing(rest, below, { x: 5, y: 0 }, 300);
    expect(easing(1e-4) / 1e-4).toBeCloseTo(0, 1);
  });

  it("starts at rest when there is no way to go", () => {
    const easing = getLightboxReleaseEasing(rest, rest, { x: 0, y: 3 }, 300);
    expect(easing(0.5)).toBeGreaterThan(0);
    expect(easing(1)).toBe(1);
  });
});

describe("getLightboxCrossfadeOpacity", () => {
  const window = { start: 0.25, end: 0.75 };

  it.each([
    { time: 0, opacity: 0 },
    { time: 0.25, opacity: 0 },
    { time: 0.5, opacity: 0.5 },
    { time: 0.75, opacity: 1 },
    { time: 1, opacity: 1 },
  ])("is $opacity at $time", ({ time, opacity }) => {
    expect(getLightboxCrossfadeOpacity(time, window)).toBeCloseTo(opacity);
  });
});

describe("getLightboxStandInKeyframes", () => {
  const rest = getLightboxRestState(box);
  const keyframes = getLightboxStandInKeyframes(
    rest,
    tile,
    (t) => t,
    { start: 0.25, end: 0.75 },
    false,
    5,
  );

  it("lays the copy out at the box that shows on each frame", () => {
    const middle = interpolateLightboxFlightState(rest, tile, 0.5);
    expect(keyframes[2]).toEqual({
      left: `${middle.rect.left}px`,
      top: `${middle.rect.top}px`,
      width: `${middle.rect.width}px`,
      height: `${middle.rect.height}px`,
      borderRadius: "4px 4px 4px 4px",
      opacity: 0.5,
      offset: 0.5,
    });
  });

  it("fades in, and ends on the trigger, opaque", () => {
    expect(keyframes[0]?.opacity).toBe(0);
    expect(keyframes.at(-1)).toMatchObject({
      left: "10px",
      top: "20px",
      width: "60px",
      height: "60px",
      borderRadius: "8px 8px 8px 8px",
      opacity: 1,
    });
  });
});

describe("getLightboxStandInKeyframes, by the way covered", () => {
  it("blends as the way goes, not as the time goes", () => {
    const rest = getLightboxRestState(box);
    const keyframes = getLightboxStandInKeyframes(
      rest,
      tile,
      (t) => t * t,
      { start: 0.5, end: 1 },
      false,
      5,
    );
    // Three quarters of the time is 56% of the way: barely into the window,
    // where the time alone would be halfway through it.
    expect(keyframes[3]?.offset).toBe(0.75);
    expect(keyframes[3]?.opacity).toBeLessThan(0.05);
    expect(keyframes[4]?.opacity).toBe(1);
  });
});

describe("getLightboxStandInKeyframes, fading out", () => {
  it("starts opaque on the trigger and fades out early, over the window mirrored", () => {
    const rest = getLightboxRestState(box);
    const keyframes = getLightboxStandInKeyframes(
      tile,
      rest,
      (t) => t,
      { start: 0.5, end: 1 },
      true,
      5,
    );
    expect(keyframes.map((keyframe) => keyframe.opacity)).toEqual([
      1, 0.5, 0, 0, 0,
    ]);
    expect(keyframes[0]).toMatchObject({ left: "10px", width: "60px" });
  });
});

describe("createLightboxStandIn", () => {
  it("shows a video's current frame on a canvas, which needs no loading", () => {
    const drawImage = vi.fn();
    vi.spyOn(HTMLCanvasElement.prototype, "getContext").mockReturnValue({
      drawImage,
    } as unknown as CanvasRenderingContext2D);
    const trigger = document.createElement("button");
    trigger.innerHTML = '<video class="size-full object-cover"></video>';
    const video = trigger.querySelector("video") as HTMLVideoElement;
    vi.spyOn(video, "readyState", "get").mockReturnValue(2);
    vi.spyOn(video, "videoWidth", "get").mockReturnValue(320);
    vi.spyOn(video, "videoHeight", "get").mockReturnValue(180);

    const standIn = createLightboxStandIn(trigger);

    const canvas = standIn.querySelector("canvas");
    expect(standIn.querySelector("video")).toBeNull();
    expect(canvas?.className).toBe("size-full object-cover");
    expect([canvas?.width, canvas?.height]).toEqual([320, 180]);
    expect(drawImage).toHaveBeenCalledWith(video, 0, 0);
    vi.restoreAllMocks();
  });

  it("keeps the copied video when it has no frame yet", () => {
    const trigger = document.createElement("button");
    trigger.innerHTML = "<video></video>";

    const standIn = createLightboxStandIn(trigger);

    expect(standIn.querySelector("video")).not.toBeNull();
  });

  it("copies the trigger as an inert, hidden, out-of-layout element", () => {
    const trigger = document.createElement("button");
    trigger.id = "tile";
    trigger.setAttribute("data-flying", "");
    trigger.setAttribute("aria-label", "Open, and 5 more");
    trigger.innerHTML = '<img id="inner" alt="" /><span>+5</span>';

    const standIn = createLightboxStandIn(trigger);

    expect(standIn).not.toBe(trigger);
    expect(standIn.textContent).toBe("+5");
    expect(standIn.hasAttribute("id")).toBe(false);
    expect(standIn.querySelector("[id]")).toBeNull();
    expect(standIn.hasAttribute("data-flying")).toBe(false);
    expect(standIn.getAttribute("aria-hidden")).toBe("true");
    expect(standIn.hasAttribute("inert")).toBe(true);
    expect(standIn.style.position).toBe("fixed");
    expect(standIn.style.pointerEvents).toBe("none");
    // The trigger itself is untouched.
    expect(trigger.hasAttribute("data-flying")).toBe(true);
  });
});

describe("getLightboxFlightOffset", () => {
  it("measures a state from the media at rest: centre offset and width share", () => {
    expect(getLightboxFlightOffset(tile, box)).toEqual({
      // The tile's centre (40, 50) from the box's (400, 300).
      x: -360,
      y: -250,
      scale: 0.15,
    });
  });

  it("is no offset at rest", () => {
    expect(getLightboxFlightOffset(getLightboxRestState(box), box)).toEqual({
      x: 0,
      y: 0,
      scale: 1,
    });
  });
});
