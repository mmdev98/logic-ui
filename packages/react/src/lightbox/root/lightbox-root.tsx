"use client";

import { Dialog } from "@base-ui/react/dialog";
import { useDirection } from "@base-ui/react/direction-provider";
import { ownerWindow } from "@base-ui/utils/owner";
import { AnimationFrame } from "@base-ui/utils/useAnimationFrame";
import { useControlled } from "@base-ui/utils/useControlled";
import { useIsoLayoutEffect } from "@base-ui/utils/useIsoLayoutEffect";
import { useStableCallback } from "@base-ui/utils/useStableCallback";
import { useId } from "@base-ui/utils/useId";
import { useTimeout } from "@base-ui/utils/useTimeout";
import { useValueAsRef } from "@base-ui/utils/useValueAsRef";
import type { BaseUIChangeEventDetails } from "@base-ui/react/types";
import * as React from "react";
import * as REASONS from "../lightbox-reasons";
import {
  LIGHTBOX_CROSSFADE_WINDOW,
  LIGHTBOX_FLIGHT_DURATION,
  LIGHTBOX_FLIGHT_EASING,
  LIGHTBOX_ZOOM_SCALE,
} from "../constants";
import {
  type LightboxMediaSize,
  type LightboxRect,
  type LightboxItemValue,
} from "../types";
import { createLightboxChangeEventDetails } from "../utils/lightbox-event-details";
import {
  type LightboxEasing,
  formatLightboxLinearEasing,
  parseLightboxCubicBezier,
} from "../utils/lightbox-easing";
import {
  type LightboxFlightState,
  createLightboxStandIn,
  getLightboxFadedState,
  getLightboxFlightKeyframes,
  getLightboxFlightOffset,
  getLightboxFlightRadii,
  getLightboxMovedState,
  getLightboxReleaseEasing,
  getLightboxRestState,
  getLightboxStandInKeyframes,
  interpolateLightboxFlightState,
  prefersLightboxReducedMotion,
} from "../utils/lightbox-flight";
import {
  getLightboxVisibleArea,
  isLightboxRectVisible,
  isLightboxZoomed,
  toLightboxRect,
  zoomLightboxAroundPoint,
} from "../utils/lightbox-geometry";
import {
  clampLightboxIndex,
  getLightboxItemValue,
  getLightboxNearestIndex,
  loadLightboxMedia,
} from "../utils/lightbox-items";
import type { LightboxHandle } from "./lightbox-handle";
import {
  type LightboxMediaEntry,
  type LightboxThumbnailListEntry,
  LightboxRootContext,
  type LightboxRootContextValue,
  LightboxRootZoomContext,
  type LightboxRootZoomContextValue,
  type LightboxTrackTransition,
} from "./lightbox-root-context";
import { getLightboxActivationDirection } from "../utils/lightbox-motion";
import {
  flightDuration,
  flightEasing,
  flightMovementX,
  flightMovementY,
  flightScale,
  swipeMovementX,
  swipeProgress,
  swipeStrength,
} from "../popup/lightbox-popup-css-vars";
import { useLightboxZoom } from "./use-lightbox-zoom";

/** Longest the viewer waits for its image before it counts as open (ms). */
const OPENING_FALLBACK_DELAY = LIGHTBOX_FLIGHT_DURATION + 1000;

/** Whether the media is in a popup still hidden: kept mounted while closed. */
function isLightboxMediaHidden(entry: LightboxMediaEntry): boolean {
  return entry.slideElement.closest("[hidden]") !== null;
}

/**
 * Whether a media was measured while hidden: at zero size, though its slide
 * is laid out now.
 */
function isLightboxMediaStale(entry: LightboxMediaEntry): boolean {
  return (
    (entry.layout.width <= 0 || entry.layout.height <= 0) &&
    entry.slideElement.clientWidth > 0
  );
}

/** The flight's curve when nothing throws the image: `LIGHTBOX_FLIGHT_EASING`. */
const FLIGHT_EASING = parseLightboxCubicBezier(LIGHTBOX_FLIGHT_EASING);

/**
 * Runs an animation with the Web Animations API and calls `onFinish` when
 * it ends. Finishes at once where the API is missing (jsdom, old browsers).
 */
function animateLightboxMedia(
  element: HTMLElement,
  keyframes: Keyframe[],
  options: KeyframeAnimationOptions,
  onFinish: () => void,
): Animation | null {
  if (typeof element.animate !== "function") {
    onFinish();
    return null;
  }
  const animation = element.animate(keyframes, options);
  // A cancelled animation rejects; the code that cancels it moves on itself.
  animation.finished.then(onFinish, () => {});
  return animation;
}

/** A running flight: enough to tell where the media is at any moment. */
type LightboxFlight = {
  element: HTMLElement;
  from: LightboxFlightState;
  to: LightboxFlightState;
  easing: LightboxEasing;
  duration: number;
  animations: Animation[];
};

/**
 * Where the image flies back to when the viewer closes, and where focus returns.
 *
 * - `"active"`: The trigger of the item shown. Without one on the page, the image fades out. For a grid with a trigger per item.
 * - `"opener"`: The trigger that opened the viewer, whichever item is shown. For one cover that opens a whole album.
 * - `"nearest"`: The trigger of the item shown, or else the trigger of the nearest item that has one. For a grid that shows a few items and a "+5" tile.
 */
export type LightboxRootCloseTarget = "active" | "opener" | "nearest";

/**
 * Where the viewer is in its open and close animation.
 *
 * - `"closed"`: The viewer is not shown.
 * - `"opening"`: The image flies from its trigger, or fades in.
 * - `"open"`: The image has landed in the viewer.
 * - `"closing"`: The image flies back to its trigger, or fades out.
 */
export type LightboxRootPhase = "closed" | "opening" | "open" | "closing";

/**
 * Side of the previous item the item shown came from, on screen. Set as
 * `data-activation-direction`, like Base UI's tabs.
 *
 * - `"left"`: It came from the left: after Previous in a left-to-right layout, Next in a right-to-left one.
 * - `"right"`: It came from the right: after Next in a left-to-right layout, Previous in a right-to-left one.
 * - `"none"`: The viewer just opened, or the item shown didn't move.
 */
export type LightboxRootActivationDirection = "left" | "right" | "none";

/**
 * Why the item open in the viewer changed, in `onValueChange`. The values
 * are Base UI's where it has one (`escape-key`, `close-press`), so a
 * reason compares with the same string as in a Base UI dialog.
 *
 * - `"trigger-press"`: A `Lightbox.Trigger` was pressed.
 * - `"swipe"`: A swipe to the next or previous item, or a pull to dismiss.
 * - `"keyboard"`: A viewer shortcut: ← → Home End.
 * - `"list-navigation"`: The arrow keys in a `Lightbox.ThumbnailList` with `activateOnFocus`.
 * - `"thumbnail-press"`: A `Lightbox.Thumbnail` was pressed.
 * - `"previous-press"`: `Lightbox.Previous` was pressed.
 * - `"next-press"`: `Lightbox.Next` was pressed.
 * - `"close-press"`: `Lightbox.Close` was pressed.
 * - `"escape-key"`: Escape was pressed.
 * - `"outside-press"`: A press outside the popup.
 * - `"focus-out"`: Focus left the popup.
 * - `"imperative-action"`: A call on the `handle`: `open()` or `close()`.
 * - `"missing"`: The open item was removed from `items`: the viewer shows its neighbour, or closes.
 * - `"none"`: Another cause, such as a Base UI dialog change without a reason.
 */
export type LightboxRootChangeEventReason =
  | typeof REASONS.triggerPress
  | typeof REASONS.swipe
  | typeof REASONS.keyboard
  | typeof REASONS.listNavigation
  | typeof REASONS.thumbnailPress
  | typeof REASONS.previousPress
  | typeof REASONS.nextPress
  | typeof REASONS.closePress
  | typeof REASONS.escapeKey
  | typeof REASONS.outsidePress
  | typeof REASONS.focusOut
  | typeof REASONS.imperativeAction
  | typeof REASONS.missing
  | typeof REASONS.none;

/**
 * Details of a change of the open item: its `reason`, the native `event`,
 * and the element it came from (`trigger`). Call `cancel()` to keep the
 * current item; a cancelled swipe or pull to dismiss springs back.
 */
export type LightboxRootChangeEventDetails =
  BaseUIChangeEventDetails<LightboxRootChangeEventReason>;

export interface LightboxRootProps<Item = unknown> {
  /** The items, in order. They can have any shape. */
  items: readonly Item[];
  /**
   * Returns the value that identifies an item. It must stay the same when
   * items are added, removed or reordered.
   * @default (item) => item.id
   */
  itemToValue?: ((item: Item) => LightboxItemValue) | undefined;
  children?: React.ReactNode | undefined;
  /** Value of the item open in the viewer, or `null` while it is closed. */
  value?: LightboxItemValue | null | undefined;
  /**
   * Value of the item open at first, when `value` is not controlled.
   * @default null
   */
  defaultValue?: LightboxItemValue | null | undefined;
  /**
   * Called when the viewer opens, closes or shows another item, with why
   * (`eventDetails.reason`). Call `eventDetails.cancel()` to keep the
   * current item: a cancelled swipe or pull to dismiss springs back.
   */
  onValueChange?:
    | ((
        value: LightboxItemValue | null,
        eventDetails: LightboxRootChangeEventDetails,
      ) => void)
    | undefined;
  /**
   * Called when the viewer has finished opening or closing: the image has
   * landed in the viewer, or back on the page.
   */
  onOpenChangeComplete?: ((open: boolean) => void) | undefined;
  /**
   * Where the image flies back to when the viewer closes, and where focus
   * returns. When that trigger shows another image, the image turns into it
   * on the way, and the trigger stays empty while the viewer is open.
   * @default "active"
   */
  closeTarget?: LightboxRootCloseTarget | undefined;
  /**
   * Scrolls the page, hidden behind the viewer, to keep the trigger the image
   * flies back to in view as the items change. Without it, closing on an
   * item whose trigger is off screen fades the image out instead.
   * @default true
   */
  scrollToTrigger?: boolean | undefined;
  /**
   * Links `Lightbox.Trigger`s placed outside the root, from
   * `Lightbox.createHandle()`.
   */
  handle?: LightboxHandle | undefined;
  /**
   * Loads an item's media before the viewer opens, so it shows at once and
   * flies from its trigger at the right size. Resolves with its natural
   * size, or `null`. The default loads the item's `src` as an image, when it
   * has one; pass your own when `Lightbox.Media` shows another URL, such as a
   * resized image, or a video.
   * @default loadLightboxMedia
   */
  loadMedia?: ((item: Item) => Promise<LightboxMediaSize | null>) | undefined;
  /**
   * Largest zoom scale.
   * @default 4
   */
  maxScale?: number | undefined;
}

/**
 * Holds the lightbox state: the items, the open item, the viewer's
 * animation, and the zoom of the active image. Place the viewer parts inside
 * it, and the triggers inside it or anywhere else with a `handle`.
 * Renders no element.
 */
export function LightboxRoot<Item = unknown>(
  props: LightboxRootProps<Item>,
): React.ReactElement {
  const {
    items,
    itemToValue = getLightboxItemValue,
    children,
    value: valueProp,
    defaultValue = null,
    onValueChange,
    onOpenChangeComplete,
    closeTarget = "active",
    scrollToTrigger = true,
    handle,
    loadMedia = loadLightboxMedia,
    maxScale = LIGHTBOX_ZOOM_SCALE.max,
  } = props;
  const minScale = LIGHTBOX_ZOOM_SCALE.min;

  const [value, setValueState] = useControlled<LightboxItemValue | null>({
    controlled: valueProp,
    default: defaultValue,
    name: "Lightbox",
    state: "value",
  });
  const open = value !== null;

  // The viewer keeps showing the last item while it closes.
  const [lastValue, setLastValue] = React.useState(value);
  if (value !== null && value !== lastValue) setLastValue(value);
  const shownValue = value ?? lastValue;

  const [phase, setPhase] = React.useState<LightboxRootPhase>("closed");
  const [pendingValue, setPendingValue] =
    React.useState<LightboxItemValue | null>(null);
  // The trigger the image flies back to, kept empty while the viewer is open.
  const [landingTrigger, setLandingTrigger] =
    React.useState<HTMLElement | null>(null);
  // The trigger the image flies from or lands on, hidden by the app meanwhile.
  const [flyingTrigger, setFlyingTrigger] = React.useState<HTMLElement | null>(
    null,
  );
  const [controlsHidden, setControlsHidden] = React.useState(false);
  const [mediaSizes, setMediaSizes] = React.useState<
    ReadonlyMap<LightboxItemValue, LightboxMediaSize>
  >(() => new Map());

  const phaseRef = useValueAsRef(phase);
  const openerRef = React.useRef<HTMLElement | null>(null);
  // The item the viewer opened on, which the opener shows.
  const openerValueRef = React.useRef<LightboxItemValue | null>(null);
  const triggersRef = React.useRef(
    new Map<LightboxItemValue, Set<HTMLElement>>(),
  );
  const mediaRef = React.useRef(
    new Map<LightboxItemValue, LightboxMediaEntry>(),
  );
  // Rendered state, unlike `mediaRef`: `Lightbox.ZoomIn` is disabled on a
  // media that can't zoom.
  const [zoomableValues, setZoomableValues] = React.useState<
    ReadonlySet<LightboxItemValue>
  >(() => new Set());
  const popupRef = React.useRef<HTMLElement | null>(null);
  const backdropRef = React.useRef<HTMLElement | null>(null);
  const flightRef = React.useRef<LightboxFlight | null>(null);
  // Where a flight that was stopped left the media, for the next to start from.
  const interruptedRef = React.useRef<{
    element: HTMLElement;
    state: LightboxFlightState;
  } | null>(null);
  // The copy of a trigger flying in its place, until the trigger shows again.
  const standInRef = React.useRef<HTMLElement | null>(null);
  // How fast the pull that dismissed the viewer was going (px/ms).
  const releaseVelocityRef = React.useRef<{ x: number; y: number } | null>(
    null,
  );
  const openFlightStartedRef = React.useRef(false);
  const trackTransitionRef = React.useRef<LightboxTrackTransition | null>(null);
  const openingTimeout = useTimeout();

  const values = React.useMemo(
    () => items.map((item) => itemToValue(item)),
    // `itemToValue` is often an inline function; the values only change with the items.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [items],
  );

  // When the open item is removed, the viewer stays where it was and moves
  // to the neighbour (see the effect below).
  const foundIndex = shownValue === null ? -1 : values.indexOf(shownValue);
  const [lastIndex, setLastIndex] = React.useState(0);
  if (foundIndex !== -1 && foundIndex !== lastIndex) setLastIndex(foundIndex);
  const index =
    foundIndex === -1
      ? clampLightboxIndex(lastIndex, items.length)
      : foundIndex;
  const activeItem: unknown = items[index];
  const activeValue = values[index];

  const id = useId() ?? "lightbox";
  const direction = useDirection();
  // Which side the item shown came from: only while the viewer is open, so
  // opening on an item doesn't count as a move.
  const [directionIndex, setDirectionIndex] = React.useState(index);
  const [activationDirection, setActivationDirection] =
    React.useState<LightboxRootActivationDirection>("none");
  if (index !== directionIndex) {
    setDirectionIndex(index);
    setActivationDirection(
      open && phase !== "closed"
        ? getLightboxActivationDirection(index - directionIndex, direction)
        : "none",
    );
  }

  const [thumbnailList, setThumbnailList] =
    React.useState<LightboxThumbnailListEntry | null>(null);

  const getActiveMedia = useStableCallback(() =>
    activeValue === undefined ? undefined : mediaRef.current.get(activeValue),
  );

  const zoom = useLightboxZoom({
    getActiveMedia,
    getDismissTargets: () => [popupRef.current, backdropRef.current],
    minScale,
    maxScale,
  });
  const zoomed = isLightboxZoomed(zoom.scale, minScale);
  const zoomable = activeValue !== undefined && zoomableValues.has(activeValue);

  /** The item's trigger on the page, preferring the one that opened the viewer. */
  const findTrigger = useStableCallback((itemValue: LightboxItemValue) => {
    const elements = triggersRef.current.get(itemValue);
    if (!elements?.size) return null;
    const opener = openerRef.current;
    if (opener && elements.has(opener)) return opener;
    return elements.values().next().value ?? null;
  });

  /** Whether the item has a trigger on the page. */
  const hasTrigger = (itemIndex: number): boolean => {
    const itemValue = values[itemIndex];
    return (
      itemValue !== undefined && Boolean(findTrigger(itemValue)?.isConnected)
    );
  };

  /**
   * The trigger the image flies back to on close, and focus returns to, as
   * `closeTarget` picks it, with the item it shows.
   */
  const findCloseTrigger = useStableCallback(
    (): { element: HTMLElement; value: LightboxItemValue } | null => {
      const opener = openerRef.current;
      const openerValue = openerValueRef.current;
      if (
        closeTarget === "opener" &&
        opener?.isConnected &&
        openerValue !== null
      )
        return { element: opener, value: openerValue };
      const targetIndex =
        closeTarget === "nearest"
          ? getLightboxNearestIndex(index, values.length, hasTrigger)
          : index;
      const targetValue = values[targetIndex];
      const element =
        targetValue === undefined ? null : findTrigger(targetValue);
      return targetValue !== undefined && element?.isConnected
        ? { element, value: targetValue }
        : null;
    },
  );

  /**
   * Asks the app with `onValueChange`, then changes the value unless it
   * cancelled. Returns whether it changed.
   */
  const setValue = useStableCallback(
    (
      nextValue: LightboxItemValue | null,
      eventDetails: LightboxRootChangeEventDetails,
    ): boolean => {
      if (nextValue === value) return false;
      onValueChange?.(nextValue, eventDetails);
      if (eventDetails.isCanceled) return false;
      setValueState(nextValue);
      return true;
    },
  );

  const changeIndex = useStableCallback(
    (
      nextIndex: number,
      eventDetails: LightboxRootChangeEventDetails,
      transition: LightboxTrackTransition | null = null,
    ): boolean => {
      const nextValue = values[nextIndex];
      if (nextIndex === index || nextValue === undefined) return false;
      if (!setValue(nextValue, eventDetails)) return false;
      zoom.reset();
      trackTransitionRef.current = transition;
      return true;
    },
  );

  const setMediaSize = useStableCallback(
    (itemValue: LightboxItemValue, size: LightboxMediaSize) => {
      setMediaSizes((sizes) => {
        const current = sizes.get(itemValue);
        if (current?.width === size.width && current?.height === size.height)
          return sizes;
        return new Map(sizes).set(itemValue, size);
      });
    },
  );

  const openValue = useStableCallback(
    async (
      nextValue: LightboxItemValue,
      eventDetails: LightboxRootChangeEventDetails,
    ) => {
      const nextIndex = values.indexOf(nextValue);
      const item = items[nextIndex];
      if (nextIndex === -1 || open || pendingValue !== null) return;
      if (phaseRef.current !== "closed") return;

      const trigger = eventDetails.trigger;
      openerRef.current =
        trigger instanceof HTMLElement ? trigger : findTrigger(nextValue);
      openerValueRef.current = nextValue;
      setPendingValue(nextValue);
      const size = await loadMedia(item as Item);
      if (size) setMediaSize(nextValue, size);
      setPendingValue(null);
      setValue(nextValue, eventDetails);
    },
  );

  const close = useStableCallback(
    (
      eventDetails: LightboxRootChangeEventDetails,
      velocity?: { x: number; y: number },
    ): boolean => {
      if (!open || !setValue(null, eventDetails)) return false;
      releaseVelocityRef.current = velocity ?? null;
      return true;
    },
  );

  /** Where the media sits at rest, without its zoom, drag or flight. */
  const getMediaBox = (entry: LightboxMediaEntry): LightboxRect => {
    const slideRect = toLightboxRect(entry.slideElement);
    return {
      left: slideRect.left + entry.layout.left,
      top: slideRect.top + entry.layout.top,
      width: entry.layout.width,
      height: entry.layout.height,
    };
  };

  /**
   * Rect and corner radii of a trigger, when it can be seen: in the window,
   * and not scrolled out of a list that clips it.
   */
  const getTriggerTarget = (trigger: HTMLElement | null) => {
    if (!trigger?.isConnected) return null;
    const win = ownerWindow(trigger);
    const rect = toLightboxRect(trigger);
    if (!isLightboxRectVisible(rect, getLightboxVisibleArea(trigger)))
      return null;
    // Each corner, so a tile rounded on one side only flies with that side rounded.
    const radii = getLightboxFlightRadii(win.getComputedStyle(trigger), rect);
    return { rect, radii };
  };

  /** Scrolls the page, without animating, until the trigger is in view. */
  const revealTrigger = (trigger: HTMLElement) => {
    if (!scrollToTrigger || typeof trigger.scrollIntoView !== "function")
      return;
    trigger.scrollIntoView({
      block: "nearest",
      inline: "nearest",
      behavior: "instant",
    });
  };

  /**
   * Stops the running flight where it is, and keeps that state: the next
   * flight starts from it instead of jumping to its own start.
   */
  const stopFlight = () => {
    const flight = flightRef.current;
    const animation = flight?.animations[0];
    if (flight && animation) {
      const time = Math.min(
        1,
        Math.max(0, Number(animation.currentTime ?? 0) / flight.duration),
      );
      interruptedRef.current = {
        element: flight.element,
        state: interpolateLightboxFlightState(
          flight.from,
          flight.to,
          flight.easing(time),
        ),
      };
    }
    for (const running of flight?.animations ?? []) running.cancel();
    standInRef.current?.remove();
    standInRef.current = null;
    flightRef.current = null;
    setFlyingTrigger(null);
  };

  /**
   * The flight variables before any flight, so transitions have them from the
   * start. Never over a flight's: a ref can run again mid-flight.
   */
  const writeDefaultFlightVariables = (element: HTMLElement) => {
    if (element.style.getPropertyValue(flightDuration)) return;
    element.style.setProperty(flightDuration, `${LIGHTBOX_FLIGHT_DURATION}ms`);
    element.style.setProperty(flightEasing, LIGHTBOX_FLIGHT_EASING);
    element.style.setProperty(flightMovementX, "0px");
    element.style.setProperty(flightMovementY, "0px");
    element.style.setProperty(flightScale, "1");
  };

  /** Writes the flight's length and curve, for transitions that follow it. */
  const writeFlightVariables = (duration: number, easing: string) => {
    for (const element of [popupRef.current, backdropRef.current]) {
      element?.style.setProperty(flightDuration, `${duration}ms`);
      element?.style.setProperty(flightEasing, easing);
    }
  };

  /** Writes where the image flies to or from, for content that goes with it. */
  const writeFlightOffset = (state: LightboxFlightState, box: LightboxRect) => {
    const popup = popupRef.current;
    if (!popup) return;
    const offset = getLightboxFlightOffset(state, box);
    popup.style.setProperty(flightMovementX, `${Math.round(offset.x)}px`);
    popup.style.setProperty(flightMovementY, `${Math.round(offset.y)}px`);
    popup.style.setProperty(
      flightScale,
      String(Math.round(offset.scale * 1000) / 1000),
    );
  };

  /**
   * Flies the media in `box` from one state to another, sampled in screen
   * space so its shape and corners change evenly, then calls `onFinish`.
   */
  const fly = (
    element: HTMLElement,
    box: LightboxRect,
    from: LightboxFlightState,
    to: LightboxFlightState,
    easing: LightboxEasing,
    onFinish: () => void,
    /**
     * `forwards` holds the last frame until the viewer unmounts (closing).
     * Opening lets go, or its clip would cut off the zoom and the pull.
     */
    fill: FillMode,
  ) => {
    const duration = LIGHTBOX_FLIGHT_DURATION;
    // The end away from the viewer: where it lands, or where it comes from.
    writeFlightOffset(fill === "forwards" ? to : from, box);
    writeFlightVariables(
      duration,
      easing === FLIGHT_EASING
        ? LIGHTBOX_FLIGHT_EASING
        : formatLightboxLinearEasing(easing),
    );
    const flight: LightboxFlight = {
      element,
      from,
      to,
      easing,
      duration,
      animations: [],
    };
    flightRef.current = flight;
    const animation = animateLightboxMedia(
      element,
      getLightboxFlightKeyframes(from, to, box, easing),
      // The easing is in the keyframes.
      { duration, easing: "linear", fill },
      onFinish,
    );
    if (animation) flight.animations.push(animation);
  };

  /**
   * Where the active media is on screen now, as a flight state: where a
   * stopped flight left it, or where the pull to dismiss and the zoom leave
   * it. The flight takes the drag (`translate` and `scale` on the box) and
   * the zoom (`transform` on its `<img>`) over, and they're cleared.
   */
  const takeMediaState = (
    entry: LightboxMediaEntry,
    box: LightboxRect,
  ): LightboxFlightState => {
    const interrupted = interruptedRef.current;
    interruptedRef.current = null;
    zoom.stop();
    const { element, zoomElement } = entry;
    const [dragX = 0, dragY = 0] = element.style.translate
      .split(" ")
      .map((value) => parseFloat(value) || 0);
    const dragScale = parseFloat(element.style.scale) || 1;
    const current = zoom.getZoom();
    element.style.translate = "";
    element.style.scale = "";
    if (zoomElement) zoomElement.style.transform = "";
    if (interrupted?.element === element) return interrupted.state;
    // The zoom is drawn inside the pulled box, both around its centre.
    return getLightboxMovedState(
      box,
      dragX + dragScale * current.x,
      dragY + dragScale * current.y,
      dragScale * current.scale,
    );
  };

  const finishOpening = useStableCallback(() => {
    openingTimeout.clear();
    flightRef.current = null;
    // Faded out by now: the image has taken its place.
    standInRef.current?.remove();
    standInRef.current = null;
    setFlyingTrigger(null);
    if (phaseRef.current !== "opening") return;
    setPhase("open");
    onOpenChangeComplete?.(true);
  });

  const finishClosing = useStableCallback(() => {
    flightRef.current = null;
    interruptedRef.current = null;
    setFlyingTrigger(null);
    zoom.reset();
    setPhase("closed");
    onOpenChangeComplete?.(false);
  });

  /**
   * Flies a copy of `trigger` along with the media, on the same path, and
   * fades it in over the media (closing) or out of it (opening): the media
   * turns into the trigger's look, or grows out of it.
   */
  const flyStandIn = (
    trigger: HTMLElement,
    from: LightboxFlightState,
    to: LightboxFlightState,
    easing: LightboxEasing,
    fadeOut: boolean,
  ) => {
    const flight = flightRef.current;
    const popup = popupRef.current;
    if (!flight || !popup) return;
    const standIn = createLightboxStandIn(trigger);
    popup.append(standIn);
    standInRef.current = standIn;
    const animation = animateLightboxMedia(
      standIn,
      getLightboxStandInKeyframes(
        from,
        to,
        easing,
        LIGHTBOX_CROSSFADE_WINDOW,
        fadeOut,
      ),
      { duration: flight.duration, easing: "linear", fill: "forwards" },
      () => {},
    );
    if (animation) flight.animations.push(animation);
  };

  /**
   * Starts the open flight once the active media is laid out in the viewer:
   * from its trigger, from where a close flight was stopped, or fading in.
   * What flies is the `Lightbox.Media` box, with whatever it shows (the
   * image, a video, an error message).
   */
  const tryStartOpenFlight = useStableCallback(() => {
    if (phaseRef.current !== "opening") return;
    if (openFlightStartedRef.current) return;
    if (activeValue === undefined) return;
    const entry = getActiveMedia();
    if (!entry) return;
    // A popup kept mounted while closed is shown a moment after it opens: wait
    // for it (the opening effect tries again each frame), then for the media
    // to measure its real box. It registers again, which starts the flight.
    if (isLightboxMediaHidden(entry)) return;
    if (isLightboxMediaStale(entry)) {
      entry.measure();
      return;
    }
    openFlightStartedRef.current = true;
    const box = getMediaBox(entry);
    const interrupted = interruptedRef.current?.element === entry.element;
    const current = takeMediaState(entry, box);

    if (prefersLightboxReducedMotion(ownerWindow(entry.element))) {
      finishOpening();
      return;
    }
    const trigger = findTrigger(activeValue);
    const target = interrupted ? null : getTriggerTarget(trigger);
    let from = current;
    if (target) from = { rect: target.rect, radii: target.radii, opacity: 1 };
    else if (!interrupted) from = getLightboxFadedState(box);
    if (target) setFlyingTrigger(trigger);
    const to = getLightboxRestState(box);
    fly(entry.element, box, from, to, FLIGHT_EASING, finishOpening, "none");
    // A trigger that shows something else (an avatar, a cover): the image
    // grows out of its look.
    if (target && trigger?.hasAttribute("data-crossfade"))
      flyStandIn(trigger, from, to, FLIGHT_EASING, true);
  });

  const startCloseFlight = () => {
    const entry = getActiveMedia();
    const velocity = releaseVelocityRef.current;
    releaseVelocityRef.current = null;
    if (!entry || activeValue === undefined) {
      finishClosing();
      return;
    }
    const box = getMediaBox(entry);
    // Starts from where the image is now: mid-flight, zoomed or pulled.
    const from = takeMediaState(entry, box);
    if (prefersLightboxReducedMotion(ownerWindow(entry.element))) {
      finishClosing();
      return;
    }
    const trigger = findCloseTrigger();
    if (trigger) revealTrigger(trigger.element);
    const target = getTriggerTarget(trigger?.element ?? null);
    const to: LightboxFlightState = target
      ? { rect: target.rect, radii: target.radii, opacity: 1 }
      : getLightboxFadedState(from.rect);
    // The trigger is hidden while the image flies to it, so the image lands
    // in an empty slot.
    if (target && trigger) setFlyingTrigger(trigger.element);
    const easing = velocity
      ? getLightboxReleaseEasing(from, to, velocity, LIGHTBOX_FLIGHT_DURATION)
      : FLIGHT_EASING;
    fly(entry.element, box, from, to, easing, finishClosing, "forwards");
    // A trigger that shows something else: another item (a cover, a "+3"
    // tile), or with `crossfade` (an avatar). The image turns into its look
    // on the way, and lands looking exactly like it.
    if (
      target &&
      trigger &&
      (trigger.value !== activeValue ||
        trigger.element.hasAttribute("data-crossfade"))
    )
      flyStandIn(trigger.element, from, to, easing, false);
  };

  // Turns `open` into the animation phases. Runs before paint, so the close
  // flight measures the image where the user last saw it.
  useIsoLayoutEffect(() => {
    if (open && (phase === "closed" || phase === "closing")) {
      stopFlight();
      zoom.reset();
      openFlightStartedRef.current = false;
      setControlsHidden(false);
      setActivationDirection("none");
      setPhase("opening");
      openingTimeout.start(OPENING_FALLBACK_DELAY, finishOpening);
    } else if (!open && (phase === "open" || phase === "opening")) {
      stopFlight();
      openingTimeout.clear();
      setPhase("closing");
      startCloseFlight();
    }
  }, [open, phase]);

  // Where the image will land follows the item shown, from the opening
  // flight to the end of the closing one. Before paint, so the slot never
  // shows filled for a frame.
  useIsoLayoutEffect(() => {
    setLandingTrigger(
      phase === "closed" ? null : (findCloseTrigger()?.element ?? null),
    );
  }, [phase, activeValue, closeTarget, findCloseTrigger]);

  // Landed: the copy goes in the commit that shows the trigger again, before
  // paint, so no frame shows the slot empty.
  useIsoLayoutEffect(() => {
    if (phase !== "closed") return;
    standInRef.current?.remove();
    standInRef.current = null;
  }, [phase]);

  useIsoLayoutEffect(() => {
    if (phase !== "opening") return undefined;
    tryStartOpenFlight();
    // A `Lightbox.Media` registers before the next frame. Without one there
    // is nothing to fly, and the viewer is open at once. One that is there
    // but not shown or laid out yet is tried again each frame until it is.
    let frame = 0;
    const check = () => {
      if (openFlightStartedRef.current) return;
      const entry = getActiveMedia();
      if (
        entry &&
        (isLightboxMediaHidden(entry) || isLightboxMediaStale(entry))
      ) {
        tryStartOpenFlight();
        frame = AnimationFrame.request(check);
        return;
      }
      finishOpening();
    };
    frame = AnimationFrame.request(check);
    return () => AnimationFrame.cancel(frame);
  }, [phase, tryStartOpenFlight, finishOpening]);

  // As the items change, the page behind the viewer scrolls to keep the
  // trigger to fly back to in view, so it's on screen when the viewer closes.
  useIsoLayoutEffect(() => {
    if (!open || phase !== "open") return;
    const trigger = findCloseTrigger();
    if (trigger) revealTrigger(trigger.element);
    // When the item shown changes, or the viewer has just opened.
  }, [open, phase, activeValue]);

  // The open item was removed: show its neighbour, or close when none is left.
  React.useEffect(() => {
    if (!open || foundIndex !== -1) return;
    const eventDetails = createLightboxChangeEventDetails(REASONS.missing);
    if (activeValue === undefined) close(eventDetails);
    else setValue(activeValue, eventDetails);
  }, [open, foundIndex, activeValue, close, setValue]);

  const goTo = useStableCallback(
    (
      nextIndex: number,
      eventDetails: LightboxRootChangeEventDetails,
    ): boolean => {
      const target = clampLightboxIndex(nextIndex, items.length);
      // Slides in; `Lightbox.Viewport` turns a longer jump into a one-item slide.
      return changeIndex(target, eventDetails, {
        step: target - index,
        offset: 0,
      });
    },
  );

  const stepIndex = useStableCallback(
    (
      step: number,
      fromOffset: number,
      eventDetails: LightboxRootChangeEventDetails,
    ): boolean => {
      const target = clampLightboxIndex(index + step, items.length);
      if (target === index) return false;
      return changeIndex(target, eventDetails, {
        step: target - index,
        offset: fromOffset,
      });
    },
  );

  // Stable, so the elements' refs only run when they mount and unmount. The
  // CSS variables are there from the start, at rest.
  const setPopupElement = useStableCallback((element: HTMLElement | null) => {
    popupRef.current = element;
    if (!element) return;
    zoom.refresh();
    writeDefaultFlightVariables(element);
  });
  const setBackdropElement = useStableCallback(
    (element: HTMLElement | null) => {
      backdropRef.current = element;
      if (!element) return;
      zoom.refresh();
      writeDefaultFlightVariables(element);
    },
  );

  // Every frame of a swipe: written to the popup directly, not rendered.
  const setSwipe = useStableCallback((movementX: number, progress: number) => {
    const popup = popupRef.current;
    if (!popup) return;
    popup.style.setProperty(swipeMovementX, `${movementX}px`);
    popup.style.setProperty(swipeProgress, String(progress));
  });

  const setSwipeStrength = useStableCallback((strength: number) => {
    popupRef.current?.style.setProperty(swipeStrength, String(strength));
  });

  // Written to the elements directly: it changes at the start and end of each
  // gesture, and the popup shouldn't re-render for it.
  const setSwiping = useStableCallback((swiping: boolean) => {
    for (const element of [popupRef.current, backdropRef.current]) {
      if (!element) continue;
      if (swiping) element.setAttribute("data-swiping", "");
      else element.removeAttribute("data-swiping");
    }
  });

  // Stable: `Lightbox.Viewport` starts the slide in an effect that must only
  // re-run when the index changes, not whenever the context does (an image
  // loading mid-slide would otherwise cut the animation short).
  const takeTrackTransition = useStableCallback(() => {
    const transition = trackTransitionRef.current;
    trackTransitionRef.current = null;
    return transition;
  });

  const zoomTo = (scale: number) => {
    const entry = getActiveMedia();
    if (!entry?.zoomElement) return;
    const center = {
      x: entry.layout.slideWidth / 2,
      y: entry.layout.slideHeight / 2,
    };
    zoom.animateZoom(
      zoomLightboxAroundPoint(
        zoom.getTargetZoom(),
        scale,
        center,
        entry.layout,
      ),
      { clamp: true },
    );
  };

  // Focus returns where the image lands, else to the opener.
  const getFinalFocus = useStableCallback(() => {
    const target = findCloseTrigger();
    if (target) return target.element;
    return openerRef.current?.isConnected ? openerRef.current : null;
  });

  const registerTrigger = useStableCallback(
    (itemValue: LightboxItemValue, element: HTMLElement) => {
      const triggers = triggersRef.current;
      const elements = triggers.get(itemValue) ?? new Set();
      elements.add(element);
      triggers.set(itemValue, elements);
      return () => {
        elements.delete(element);
        if (!elements.size) triggers.delete(itemValue);
      };
    },
  );

  const registerThumbnailList = useStableCallback(
    (entry: LightboxThumbnailListEntry) => {
      setThumbnailList(entry);
      return () =>
        setThumbnailList((current) => (current === entry ? null : current));
    },
  );

  const registerMedia = useStableCallback(
    (itemValue: LightboxItemValue, entry: LightboxMediaEntry) => {
      mediaRef.current.set(itemValue, entry);
      // Not cleared on unregister: the media re-registers on every layout
      // change, and a removed one leaves `zoomTo` nothing to zoom anyway.
      const canZoom = entry.zoomElement !== null;
      setZoomableValues((current) => {
        if (current.has(itemValue) === canZoom) return current;
        const next = new Set(current);
        if (canZoom) next.add(itemValue);
        else next.delete(itemValue);
        return next;
      });
      if (itemValue === activeValue) tryStartOpenFlight();
      return () => {
        if (mediaRef.current.get(itemValue) === entry)
          mediaRef.current.delete(itemValue);
      };
    },
  );

  const contextValue: LightboxRootContextValue = React.useMemo(
    () => ({
      items,
      values,
      index,
      activeItem,
      activeValue,
      open,
      phase,
      pendingValue,
      flyingTrigger,
      landingTrigger,
      zoomed,
      controlsHidden,
      hasPrevious: index > 0,
      hasNext: index < items.length - 1,
      minScale,
      maxScale,
      mediaSizes,
      activationDirection,
      id,
      thumbnailList,
      openValue,
      close,
      goTo,
      goToPrevious: (eventDetails) => goTo(index - 1, eventDetails),
      goToNext: (eventDetails) => goTo(index + 1, eventDetails),
      // Steps from where a running zoom ends, so quick presses add up.
      zoomIn: () =>
        zoomTo(zoom.getTargetZoom().scale + LIGHTBOX_ZOOM_SCALE.step),
      zoomOut: () =>
        zoomTo(zoom.getTargetZoom().scale - LIGHTBOX_ZOOM_SCALE.step),
      resetZoom: () => zoom.animateZoom({ scale: minScale, x: 0, y: 0 }),
      panBy: (deltaX, deltaY) => {
        const current = zoom.getZoom();
        zoom.animateZoom(
          { ...current, x: current.x + deltaX, y: current.y + deltaY },
          { clamp: true },
        );
      },
      toggleControls: () => setControlsHidden((hidden) => !hidden),
      getFinalFocus,
      setMediaSize,
      registerTrigger,
      registerMedia,
      registerThumbnailList,
      getActiveMedia,
      setPopupElement,
      setBackdropElement,
      getZoom: zoom.getZoom,
      setZoom: zoom.setZoom,
      animateZoom: zoom.animateZoom,
      setDismiss: zoom.setDismiss,
      animateDismiss: zoom.animateDismiss,
      setSwiping,
      setSwipe,
      setSwipeStrength,
      stepIndex,
      takeTrackTransition,
    }),
    // The callbacks are stable; `zoomTo` only reads them.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [
      items,
      values,
      index,
      activeItem,
      activeValue,
      open,
      phase,
      pendingValue,
      flyingTrigger,
      landingTrigger,
      zoomed,
      controlsHidden,
      minScale,
      maxScale,
      mediaSizes,
      activationDirection,
      id,
      thumbnailList,
    ],
  );

  // Detached triggers read the root through the handle.
  useIsoLayoutEffect(() => {
    if (!handle) return undefined;
    handle.setRoot(contextValue);
    return () => handle.setRoot(null);
  }, [handle, contextValue]);

  const zoomValue: LightboxRootZoomContextValue = React.useMemo(
    () => ({
      scale: zoom.scale,
      canZoomIn: zoomable && zoom.scale < maxScale,
      canZoomOut: zoomed,
    }),
    [zoom.scale, maxScale, zoomed, zoomable],
  );

  return (
    <LightboxRootContext value={contextValue}>
      <LightboxRootZoomContext value={zoomValue}>
        <Dialog.Root
          // Stays open until the image has flown back, then lets Base UI
          // unmount it. Not `phase === Closing`: in the render where `value`
          // becomes `null` the phase is still `Open`, and the dialog would
          // close and reopen around the close flight.
          open={open || phase !== "closed"}
          onOpenChange={(nextOpen, eventDetails) => {
            if (nextOpen) return;
            // Escape, an outside press or `Lightbox.Close`, with Base UI's reason.
            const closed = close(
              createLightboxChangeEventDetails(
                eventDetails.reason,
                eventDetails.event,
                eventDetails.trigger,
              ),
            );
            if (!closed) eventDetails.cancel();
          }}
        >
          {children}
        </Dialog.Root>
      </LightboxRootZoomContext>
    </LightboxRootContext>
  );
}
