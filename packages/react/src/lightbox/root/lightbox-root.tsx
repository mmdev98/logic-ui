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
import * as React from "react";
import {
  LIGHTBOX_FLIGHT_DURATION,
  LIGHTBOX_FLIGHT_EASING,
  LIGHTBOX_ZOOM_SCALE,
} from "../constants";
import {
  LightboxActivationDirection,
  type LightboxMediaSize,
  LightboxPhase,
  type LightboxRect,
  type LightboxItemValue,
} from "../types";
import {
  LIGHTBOX_FLIGHT_REST,
  getLightboxFlightKeyframe,
  getLightboxFlightRadii,
  prefersLightboxReducedMotion,
} from "../utils/lightbox-flight";
import {
  isLightboxRectInViewport,
  isLightboxZoomed,
  toLightboxRect,
  zoomLightboxAroundPoint,
} from "../utils/lightbox-geometry";
import {
  clampLightboxIndex,
  getLightboxItemValue,
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
import { useLightboxZoom } from "./use-lightbox-zoom";

/** Longest the viewer waits for its image before it counts as open (ms). */
const OPENING_FALLBACK_DELAY = LIGHTBOX_FLIGHT_DURATION + 1000;

/**
 * Runs a flight with the Web Animations API and calls `onFinish` when it
 * ends. Finishes at once where the API is missing (jsdom, old browsers).
 */
function animateLightboxMedia(
  element: HTMLElement,
  keyframes: Keyframe[],
  onFinish: () => void,
  fill: FillMode = "none",
): Animation | null {
  if (typeof element.animate !== "function") {
    onFinish();
    return null;
  }
  const animation = element.animate(keyframes, {
    duration: LIGHTBOX_FLIGHT_DURATION,
    easing: LIGHTBOX_FLIGHT_EASING,
    fill,
  });
  // A cancelled flight rejects; the code that cancels it moves on itself.
  animation.finished.then(onFinish, () => {});
  return animation;
}

/** Image state when there is no trigger on screen to fly from or back to. */
const FADED_OUT: Keyframe = { opacity: 0, scale: "0.95" };
const FADED_IN: Keyframe = { opacity: 1, scale: "1" };

export interface LightboxRootProps<Item = unknown> {
  /** The items, in order. They can have any shape. */
  items: readonly Item[];
  /**
   * Returns the value that identifies an item. It must stay the same when
   * items are added, removed or reordered.
   * @default (item) => item.id
   */
  itemToValue?: (item: Item) => LightboxItemValue;
  children?: React.ReactNode;
  /** Value of the item open in the viewer, or `null` while it is closed. */
  value?: LightboxItemValue | null;
  /**
   * Value of the item open at first, when `value` is not controlled.
   * @default null
   */
  defaultValue?: LightboxItemValue | null;
  /** Called when the viewer opens, closes or shows another item. */
  onValueChange?: (value: LightboxItemValue | null) => void;
  /**
   * Links `Lightbox.Trigger`s placed outside the root, from
   * `Lightbox.createHandle()`.
   */
  handle?: LightboxHandle;
  /**
   * Loads an item's media before the viewer opens, so it shows at once and
   * flies from its trigger at the right size. Resolves with its natural
   * size, or `null`. The default loads the item's `src` as an image, when it
   * has one; pass your own when `Lightbox.Media` shows another URL, such as a
   * resized image, or a video.
   * @default loadLightboxMedia
   */
  loadMedia?: (item: Item) => Promise<LightboxMediaSize | null>;
  /**
   * Largest zoom scale.
   * @default 4
   */
  maxScale?: number;
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

  const [phase, setPhase] = React.useState(LightboxPhase.Closed);
  const [pendingValue, setPendingValue] =
    React.useState<LightboxItemValue | null>(null);
  const [flyingValue, setFlyingValue] =
    React.useState<LightboxItemValue | null>(null);
  const [controlsHidden, setControlsHidden] = React.useState(false);
  const [mediaSizes, setMediaSizes] = React.useState<
    ReadonlyMap<LightboxItemValue, LightboxMediaSize>
  >(() => new Map());

  const phaseRef = useValueAsRef(phase);
  const openerRef = React.useRef<HTMLElement | null>(null);
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
  const flightRef = React.useRef<Animation | null>(null);
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
  const [activationDirection, setActivationDirection] = React.useState(
    LightboxActivationDirection.None,
  );
  if (index !== directionIndex) {
    setDirectionIndex(index);
    setActivationDirection(
      open && phase !== LightboxPhase.Closed
        ? getLightboxActivationDirection(index - directionIndex, direction)
        : LightboxActivationDirection.None,
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

  const setValue = useStableCallback((nextValue: LightboxItemValue | null) => {
    if (nextValue === value) return;
    setValueState(nextValue);
    onValueChange?.(nextValue);
  });

  const changeIndex = useStableCallback(
    (nextIndex: number, transition: LightboxTrackTransition | null = null) => {
      const nextValue = values[nextIndex];
      if (nextIndex === index || nextValue === undefined) return;
      zoom.reset();
      trackTransitionRef.current = transition;
      setValue(nextValue);
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
    async (nextValue: LightboxItemValue, trigger?: HTMLElement | null) => {
      const nextIndex = values.indexOf(nextValue);
      const item = items[nextIndex];
      if (nextIndex === -1 || open || pendingValue !== null) return;
      if (phaseRef.current !== LightboxPhase.Closed) return;

      openerRef.current = trigger ?? findTrigger(nextValue);
      setPendingValue(nextValue);
      const size = await loadMedia(item as Item);
      if (size) setMediaSize(nextValue, size);
      setPendingValue(null);
      setValue(nextValue);
    },
  );

  const close = useStableCallback(() => {
    if (open) setValue(null);
  });

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

  /** Rect and corner radii of the item's trigger, when it's on screen. */
  const getTriggerTarget = (itemValue: LightboxItemValue) => {
    const trigger = findTrigger(itemValue);
    if (!trigger?.isConnected) return null;
    const win = ownerWindow(trigger);
    const rect = toLightboxRect(trigger);
    const viewport = {
      width: win.document.documentElement.clientWidth,
      height: win.document.documentElement.clientHeight,
    };
    if (!isLightboxRectInViewport(rect, viewport)) return null;
    // Each corner, so a tile rounded on one side only flies with that side rounded.
    const radii = getLightboxFlightRadii(win.getComputedStyle(trigger), rect);
    return { rect, radii };
  };

  const stopFlight = () => {
    flightRef.current?.cancel();
    flightRef.current = null;
    setFlyingValue(null);
  };

  const finishOpening = useStableCallback(() => {
    openingTimeout.clear();
    flightRef.current = null;
    setFlyingValue(null);
    if (phaseRef.current === LightboxPhase.Opening)
      setPhase(LightboxPhase.Open);
  });

  const finishClosing = useStableCallback(() => {
    flightRef.current = null;
    setFlyingValue(null);
    zoom.reset();
    setPhase(LightboxPhase.Closed);
  });

  /**
   * What flies for the active item: its `Lightbox.Media` box, with whatever
   * it shows (the image, a video, an error message). `box` is where it sits
   * at rest, and `transform` where it is now. The flight takes the close
   * drag (`translate` and `scale` on the box) and the zoom (`transform` on
   * its `<img>`) over as one `transform` on the box, and they're cleared.
   */
  const getFlightTarget = (): {
    element: HTMLElement;
    box: LightboxRect;
    transform: string;
  } | null => {
    const entry = getActiveMedia();
    if (!entry) return null;
    zoom.stop();
    const { element, zoomElement } = entry;
    const { translate, scale } = element.style;
    const zoomTransform = zoomElement?.style.transform ?? "";
    element.style.translate = "";
    element.style.scale = "";
    if (zoomElement) zoomElement.style.transform = "";
    const dragTransform = translate
      ? `translate(${translate.split(" ").join(", ")}) scale(${scale || 1})`
      : "";
    const transform = [dragTransform, zoomTransform]
      .filter((part) => part !== "" && part !== "none")
      .join(" ");
    return {
      element,
      box: getMediaBox(entry),
      transform: transform || "none",
    };
  };

  /** Starts the open flight once the active media is laid out in the viewer. */
  const tryStartOpenFlight = useStableCallback(() => {
    if (phaseRef.current !== LightboxPhase.Opening) return;
    if (openFlightStartedRef.current) return;
    if (activeValue === undefined) return;
    const flight = getFlightTarget();
    if (!flight) return;
    openFlightStartedRef.current = true;

    const win = ownerWindow(flight.element);
    if (prefersLightboxReducedMotion(win)) {
      finishOpening();
      return;
    }
    const target = getTriggerTarget(activeValue);
    const keyframes: Keyframe[] = target
      ? [
          getLightboxFlightKeyframe(target.rect, flight.box, target.radii),
          LIGHTBOX_FLIGHT_REST,
        ]
      : [FADED_OUT, FADED_IN];
    if (target) setFlyingValue(activeValue);
    flightRef.current = animateLightboxMedia(
      flight.element,
      keyframes,
      finishOpening,
    );
  });

  const startCloseFlight = () => {
    const flight = activeValue === undefined ? null : getFlightTarget();
    if (!flight || activeValue === undefined) {
      finishClosing();
      return;
    }
    const win = ownerWindow(flight.element);
    if (prefersLightboxReducedMotion(win)) {
      finishClosing();
      return;
    }
    // Starts from where it is now: zoomed, panned or dragged.
    const current = flight.transform;
    const target = getTriggerTarget(activeValue);
    const keyframes: Keyframe[] = target
      ? [
          { transform: current, clipPath: "inset(0px 0px round 0px)" },
          getLightboxFlightKeyframe(target.rect, flight.box, target.radii),
        ]
      : [
          { ...FADED_IN, transform: current },
          { ...FADED_OUT, transform: current },
        ];
    if (target) setFlyingValue(activeValue);
    flightRef.current = animateLightboxMedia(
      flight.element,
      keyframes,
      finishClosing,
      // Holds the last frame until the viewer unmounts.
      "forwards",
    );
  };

  // Turns `open` into the animation phases. Runs before paint, so the close
  // flight measures the image where the user last saw it.
  useIsoLayoutEffect(() => {
    if (
      open &&
      (phase === LightboxPhase.Closed || phase === LightboxPhase.Closing)
    ) {
      stopFlight();
      zoom.reset();
      openFlightStartedRef.current = false;
      setControlsHidden(false);
      setActivationDirection(LightboxActivationDirection.None);
      setPhase(LightboxPhase.Opening);
      openingTimeout.start(OPENING_FALLBACK_DELAY, finishOpening);
    } else if (
      !open &&
      (phase === LightboxPhase.Open || phase === LightboxPhase.Opening)
    ) {
      stopFlight();
      openingTimeout.clear();
      setPhase(LightboxPhase.Closing);
      startCloseFlight();
    }
  }, [open, phase]);

  useIsoLayoutEffect(() => {
    if (phase !== LightboxPhase.Opening) return undefined;
    tryStartOpenFlight();
    // A `Lightbox.Media` registers before the next frame. Without one there
    // is nothing to fly, and the viewer is open at once.
    const frame = AnimationFrame.request(() => {
      if (!openFlightStartedRef.current) finishOpening();
    });
    return () => AnimationFrame.cancel(frame);
  }, [phase, tryStartOpenFlight, finishOpening]);

  // The open item was removed: show its neighbour, or close when none is left.
  React.useEffect(() => {
    if (!open || foundIndex !== -1) return;
    if (activeValue === undefined) close();
    else setValue(activeValue);
  }, [open, foundIndex, activeValue, close, setValue]);

  const goTo = useStableCallback((nextIndex: number) => {
    const target = clampLightboxIndex(nextIndex, items.length);
    // Slides in; `Lightbox.Viewport` turns a longer jump into a one-item slide.
    changeIndex(target, { step: target - index, offset: 0 });
  });

  const stepIndex = useStableCallback((step: number, fromOffset: number) => {
    const target = clampLightboxIndex(index + step, items.length);
    if (target === index) return;
    changeIndex(target, { step: target - index, offset: fromOffset });
  });

  // Written to the elements directly: it changes at the start and end of each
  // gesture, and the popup shouldn't re-render for it.
  const setDragging = useStableCallback((dragging: boolean) => {
    for (const element of [popupRef.current, backdropRef.current]) {
      if (!element) continue;
      if (dragging) element.setAttribute("data-dragging", "");
      else element.removeAttribute("data-dragging");
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

  const getFinalFocus = useStableCallback(() => {
    const target = activeValue === undefined ? null : findTrigger(activeValue);
    if (target?.isConnected) return target;
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
      flyingValue,
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
      goToPrevious: () => goTo(index - 1),
      goToNext: () => goTo(index + 1),
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
      setPopupElement: (element) => {
        popupRef.current = element;
      },
      setBackdropElement: (element) => {
        backdropRef.current = element;
      },
      getZoom: zoom.getZoom,
      setZoom: zoom.setZoom,
      animateZoom: zoom.animateZoom,
      setDismiss: zoom.setDismiss,
      animateDismiss: zoom.animateDismiss,
      setDragging,
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
      flyingValue,
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
          // Stays open while the image flies back, then lets Base UI unmount it.
          open={open || phase === LightboxPhase.Closing}
          onOpenChange={(nextOpen) => {
            if (!nextOpen) close();
          }}
        >
          {children}
        </Dialog.Root>
      </LightboxRootZoomContext>
    </LightboxRootContext>
  );
}
