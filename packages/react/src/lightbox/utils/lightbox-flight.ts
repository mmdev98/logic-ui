import type { LightboxRect } from "../types";
import { createLightboxSpring, type LightboxEasing } from "./lightbox-easing";

/** A CSS border radius in px, capped at a circle so it animates evenly. */
export function getLightboxFlightRadius(
  radius: string,
  rect: LightboxRect,
): number {
  const value = parseFloat(radius) || 0;
  return Math.min(value, Math.min(rect.width, rect.height) / 2);
}

/** Corner radii in px: top-left, top-right, bottom-right, bottom-left. */
export type LightboxFlightRadii = [number, number, number, number];

/** The four corner radii of an element's computed style, each capped like `getLightboxFlightRadius`. */
export function getLightboxFlightRadii(
  style: Pick<
    CSSStyleDeclaration,
    | "borderTopLeftRadius"
    | "borderTopRightRadius"
    | "borderBottomRightRadius"
    | "borderBottomLeftRadius"
  >,
  rect: LightboxRect,
): LightboxFlightRadii {
  return [
    getLightboxFlightRadius(style.borderTopLeftRadius, rect),
    getLightboxFlightRadius(style.borderTopRightRadius, rect),
    getLightboxFlightRadius(style.borderBottomRightRadius, rect),
    getLightboxFlightRadius(style.borderBottomLeftRadius, rect),
  ];
}

/**
 * Keyframe that draws the image of `box` as it looks in `source`: scaled to
 * cover it, centred on it, and clipped to it with its corner `radii`. Animate
 * between it and `LIGHTBOX_FLIGHT_REST` to fly the image between the two.
 */
export function getLightboxFlightKeyframe(
  source: LightboxRect,
  box: LightboxRect,
  radii: LightboxFlightRadii,
): Keyframe {
  // An empty box (not laid out yet) keeps its size, rather than divide by 0.
  const scale =
    box.width > 0 && box.height > 0
      ? Math.max(source.width / box.width, source.height / box.height)
      : 1;
  const x = source.left + source.width / 2 - (box.left + box.width / 2);
  const y = source.top + source.height / 2 - (box.top + box.height / 2);
  // The clip is drawn before the scale, so it is in the box's own pixels.
  const insetX = Math.max(0, (box.width - source.width / scale) / 2);
  const insetY = Math.max(0, (box.height - source.height / scale) / 2);
  return {
    transform: `translate3d(${x}px, ${y}px, 0px) scale(${scale})`,
    clipPath: `inset(${insetY}px ${insetX}px round ${radii
      .map((radius) => `${radius / scale}px`)
      .join(" ")})`,
  };
}

/**
 * How the flying media looks on screen: the box of it that shows, the
 * corners of that box, and its opacity. A flight goes from one to another.
 */
export type LightboxFlightState = {
  rect: LightboxRect;
  radii: LightboxFlightRadii;
  opacity: number;
};

const NO_RADII: LightboxFlightRadii = [0, 0, 0, 0];

/** The media at rest in the viewer, in its `box`. */
export function getLightboxRestState(box: LightboxRect): LightboxFlightState {
  return { rect: box, radii: NO_RADII, opacity: 1 };
}

/** Scale of a faded media, which shrinks a little as it fades. */
const FADED_SCALE = 0.95;

/** The media faded out where it is: the flight without a trigger. */
export function getLightboxFadedState(rect: LightboxRect): LightboxFlightState {
  return { ...getLightboxMovedState(rect, 0, 0, FADED_SCALE), opacity: 0 };
}

/**
 * The media moved by `x` and `y` and scaled by `scale` around its centre,
 * as the pull to dismiss and the zoom leave it.
 */
export function getLightboxMovedState(
  box: LightboxRect,
  x: number,
  y: number,
  scale: number,
): LightboxFlightState {
  const width = box.width * scale;
  const height = box.height * scale;
  return {
    rect: {
      left: box.left + x + (box.width - width) / 2,
      top: box.top + y + (box.height - height) / 2,
      width,
      height,
    },
    radii: NO_RADII,
    opacity: 1,
  };
}

const mix = (from: number, to: number, progress: number) =>
  from + (to - from) * progress;

/**
 * The state `progress` of the way from `from` to `to`, on screen: the box
 * that shows, its corners and its opacity each move evenly between the two.
 */
export function interpolateLightboxFlightState(
  from: LightboxFlightState,
  to: LightboxFlightState,
  progress: number,
): LightboxFlightState {
  return {
    rect: {
      left: mix(from.rect.left, to.rect.left, progress),
      top: mix(from.rect.top, to.rect.top, progress),
      width: mix(from.rect.width, to.rect.width, progress),
      height: mix(from.rect.height, to.rect.height, progress),
    },
    radii: from.radii.map((radius, corner) =>
      mix(radius, to.radii[corner] ?? 0, progress),
    ) as LightboxFlightRadii,
    opacity: mix(from.opacity, to.opacity, progress),
  };
}

/** Frames a flight is sampled into: enough that no corner shows between them. */
export const LIGHTBOX_FLIGHT_FRAMES = 30;

/**
 * The keyframes of a flight of the media in `box` from one state to
 * another, evenly spaced in time, with `easing` already applied. Played
 * with a linear easing, the box that shows changes shape evenly on screen
 * and its corners keep their radius, which one transform between two
 * keyframes can't do: the browser would blend its scale and its clip apart.
 */
export function getLightboxFlightKeyframes(
  from: LightboxFlightState,
  to: LightboxFlightState,
  box: LightboxRect,
  easing: LightboxEasing,
  frames: number = LIGHTBOX_FLIGHT_FRAMES,
): Keyframe[] {
  return Array.from({ length: frames }, (_, index) => {
    const time = index / (frames - 1);
    const state = interpolateLightboxFlightState(from, to, easing(time));
    return {
      ...getLightboxFlightKeyframe(state.rect, box, state.radii),
      opacity: state.opacity,
      offset: time,
    };
  });
}

/**
 * Opacity of the copy of the trigger at `progress` of the way: 0 before the
 * window, 1 after it, and a smootherstep ramp between, with no jolt at either end.
 */
export function getLightboxCrossfadeOpacity(
  progress: number,
  window: { start: number; end: number },
): number {
  const t = Math.min(
    1,
    Math.max(0, (progress - window.start) / (window.end - window.start)),
  );
  return t * t * t * (t * (t * 6 - 15) + 10);
}

/**
 * Keyframes of the copy of a trigger that flies with the media and fades in
 * over it: laid out at the size of the box that shows on each frame, rather
 * than scaled, so its own image keeps its crop and its text stays sharp.
 */
export function getLightboxStandInKeyframes(
  from: LightboxFlightState,
  to: LightboxFlightState,
  easing: LightboxEasing,
  window: { start: number; end: number },
  /** Fades the copy out instead, over the window mirrored: the flight that opens. */
  fadeOut = false,
  frames: number = LIGHTBOX_FLIGHT_FRAMES,
): Keyframe[] {
  const mirrored = { start: 1 - window.end, end: 1 - window.start };
  return Array.from({ length: frames }, (_, index) => {
    const time = index / (frames - 1);
    // By the way covered, not the time: the flight covers most of its way
    // early, and the blend should follow the sizes.
    const progress = easing(time);
    const { rect, radii } = interpolateLightboxFlightState(from, to, progress);
    return {
      left: `${rect.left}px`,
      top: `${rect.top}px`,
      width: `${rect.width}px`,
      height: `${rect.height}px`,
      borderRadius: radii.map((radius) => `${radius}px`).join(" "),
      opacity: fadeOut
        ? 1 - getLightboxCrossfadeOpacity(progress, mirrored)
        : getLightboxCrossfadeOpacity(progress, window),
      offset: time,
    };
  });
}

/**
 * The current frame of `video` on a canvas that takes the place of `copy`,
 * or `null` when there is no frame yet or no canvas. Drawing a frame from
 * another origin taints the canvas, which only stops reading it back.
 */
function snapshotLightboxVideo(
  video: HTMLVideoElement | undefined,
  copy: HTMLVideoElement,
): HTMLCanvasElement | null {
  if (!video || video.readyState < 2 || !video.videoWidth) return null;
  const canvas = video.ownerDocument.createElement("canvas");
  canvas.width = video.videoWidth;
  canvas.height = video.videoHeight;
  const context = canvas.getContext("2d");
  if (!context) return null;
  try {
    context.drawImage(video, 0, 0);
  } catch {
    return null;
  }
  canvas.className = copy.className;
  canvas.style.cssText = copy.style.cssText;
  canvas.setAttribute("aria-hidden", "true");
  return canvas;
}

/**
 * A copy of a trigger to fly in its place while it is hidden: inert, hidden
 * from assistive technology, out of the layout, and without the state
 * attributes that hide the trigger.
 */
export function createLightboxStandIn(trigger: HTMLElement): HTMLElement {
  const standIn = trigger.cloneNode(true) as HTMLElement;
  // A copied `<video>` would load again and show nothing meanwhile: its
  // frame on a canvas instead, with the same classes, so it shows at once.
  const videos = trigger.querySelectorAll("video");
  standIn.querySelectorAll("video").forEach((copy, index) => {
    const frame = snapshotLightboxVideo(videos[index], copy);
    if (frame) copy.replaceWith(frame);
  });
  for (const element of [standIn, ...standIn.querySelectorAll("[id]")])
    element.removeAttribute("id");
  for (const name of ["data-flying", "data-popup-open", "data-pending"])
    standIn.removeAttribute(name);
  standIn.setAttribute("aria-hidden", "true");
  standIn.setAttribute("inert", "");
  standIn.tabIndex = -1;
  Object.assign(standIn.style, {
    position: "fixed",
    left: "0px",
    top: "0px",
    margin: "0px",
    boxSizing: "border-box",
    overflow: "hidden",
    pointerEvents: "none",
    visibility: "visible",
    translate: "none",
    scale: "none",
    transform: "none",
    opacity: "0",
  });
  return standIn;
}

/**
 * Where a flight state is relative to the media at rest in `box`: how far
 * its centre is from the box's, and its width as a share of the box's.
 */
export function getLightboxFlightOffset(
  state: LightboxFlightState,
  box: LightboxRect,
): { x: number; y: number; scale: number } {
  return {
    x: state.rect.left + state.rect.width / 2 - (box.left + box.width / 2),
    y: state.rect.top + state.rect.height / 2 - (box.top + box.height / 2),
    scale: box.width > 0 ? state.rect.width / box.width : 1,
  };
}

export function prefersLightboxReducedMotion(win: Window): boolean {
  return win.matchMedia?.("(prefers-reduced-motion: reduce)").matches ?? false;
}

/**
 * The spring a close flight starts with after a pull to dismiss: at the speed of the
 * finger along the way to the trigger (px/ms), in progress per flight.
 */
export function getLightboxReleaseEasing(
  from: LightboxFlightState,
  to: LightboxFlightState,
  velocity: { x: number; y: number },
  duration: number,
): LightboxEasing {
  const dx =
    to.rect.left + to.rect.width / 2 - (from.rect.left + from.rect.width / 2);
  const dy =
    to.rect.top + to.rect.height / 2 - (from.rect.top + from.rect.height / 2);
  const distance = Math.hypot(dx, dy);
  if (distance < 1) return createLightboxSpring(0);
  const speed = (velocity.x * dx + velocity.y * dy) / distance;
  return createLightboxSpring((speed * duration) / distance);
}
