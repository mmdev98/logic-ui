"use client";

import { mergeProps } from "@base-ui/react/merge-props";
import type { BaseUIGenericEventDetails } from "@base-ui/react/types";
import { useRender } from "@base-ui/react/use-render";
import { useIsoLayoutEffect } from "@base-ui/utils/useIsoLayoutEffect";
import { useStableCallback } from "@base-ui/utils/useStableCallback";
import { useMergedRefs } from "@base-ui/utils/useMergedRefs";
import * as React from "react";
import { CROPPER_TRANSITION_DURATION } from "../constants";
import * as REASONS from "../cropper-reasons";
import { CROPPER_STATE_ATTRIBUTES } from "../cropper-state-attributes";
import type {
  CropperAspectRatio,
  CropperCoordinates,
  CropperDefaultTransforms,
  CropperSize,
  CropperState,
} from "../types";
import { drawCropperCanvas } from "../utils/cropper-canvas";
import { getCropperRatio } from "../utils/cropper-geometry";
import { getCropperRoundedCoordinates } from "../utils/cropper-restrictions";
import { createCropperSettings } from "../utils/cropper-settings";
import { getCropperZoom, getCropperZoomFactor } from "../utils/cropper-zoom";
import {
  type CropperActionOptions,
  CropperEngine,
  hasCropperInteractions,
} from "./cropper-engine";
import {
  type CropperLoadedImage,
  type CropperRootActions,
  CropperRootContext,
  type CropperRootContextValue,
  CropperRootStateContext,
  type CropperRootStateContextValue,
} from "./cropper-root-context";
import { useCropperImage } from "./use-cropper-image";

/**
 * Where the image may go relative to the crop and the viewport:
 * - `"fit-area"`: the image can't be zoomed out past the viewport on both axes, and the crop stays on the image.
 * - `"fill-area"`: the image always fills the viewport, and the crop stays on the image.
 * - `"stencil"`: only the crop stays on the image; the view is free.
 * - `"none"`: no limit; the crop can leave the image.
 */
export type CropperRootImageRestriction =
  "fill-area" | "fit-area" | "stencil" | "none";

/**
 * Where the image is:
 * - `"idle"`: there is no `src`.
 * - `"loading"`: the image loads, or waits for `Cropper.Viewport` to have a size.
 * - `"loaded"`: the image is on screen with its crop.
 * - `"error"`: the image failed to load.
 */
export type CropperRootStatus = "idle" | "loading" | "loaded" | "error";

/**
 * Why the crop changed, as passed in `eventDetails.reason`:
 * - `"image-load"`: A new image was shown, or the cropper started over on it.
 * - `"viewport-resize"`: `Cropper.Viewport` changed size.
 * - `"settings-change"`: A prop such as `aspectRatio` changed and the crop was fitted to it.
 * - `"stencil-drag"`: `Cropper.Stencil` was dragged.
 * - `"handle-drag"`: A `Cropper.Handle` was dragged.
 * - `"image-drag"`: The image was dragged.
 * - `"pinch"`: Two fingers pinched or turned the image.
 * - `"wheel"`: The wheel or a trackpad pinch zoomed the image.
 * - `"keyboard"`: A key moved, resized or zoomed the crop.
 * - `"zoom-in-press"`: `Cropper.ZoomIn` was pressed.
 * - `"zoom-out-press"`: `Cropper.ZoomOut` was pressed.
 * - `"rotate-press"`: `Cropper.Rotate` was pressed.
 * - `"flip-press"`: `Cropper.Flip` was pressed.
 * - `"reset-press"`: `Cropper.Reset` was pressed.
 * - `"imperative-action"`: A call on `actionsRef` or on the context's actions.
 * - `"none"`: Another cause.
 */
export type CropperRootChangeEventReason =
  | typeof REASONS.imageLoad
  | typeof REASONS.viewportResize
  | typeof REASONS.settingsChange
  | typeof REASONS.stencilDrag
  | typeof REASONS.handleDrag
  | typeof REASONS.imageDrag
  | typeof REASONS.pinch
  | typeof REASONS.wheel
  | typeof REASONS.keyboard
  | typeof REASONS.zoomInPress
  | typeof REASONS.zoomOutPress
  | typeof REASONS.rotatePress
  | typeof REASONS.flipPress
  | typeof REASONS.resetPress
  | typeof REASONS.imperativeAction
  | typeof REASONS.none;

/** Details of a change: its `reason` and the native `event`. */
export type CropperRootChangeEventDetails =
  BaseUIGenericEventDetails<CropperRootChangeEventReason>;

export type CropperRootState = {
  /** Where the image is: `data-loading`, `data-loaded` or `data-error`. */
  status: CropperRootStatus;
  /** Whether the cropper ignores the user. */
  disabled: boolean;
  /** Whether a drag, pinch or wheel zoom is in progress. */
  interacting: boolean;
  /** Whether a change animates. */
  transitioning: boolean;
};

export interface CropperRootProps extends useRender.ComponentProps<
  "div",
  CropperRootState
> {
  /** URL of the image to crop. */
  src?: string | null | undefined;
  /**
   * CORS mode of the image. `getCanvas()` needs it for an image from another
   * origin, and the server must allow it; `null` loads the image without CORS.
   * @default "anonymous"
   */
  crossOrigin?: "anonymous" | "use-credentials" | null | undefined;
  /** Aspect ratio (width / height) of the crop: a number, or a range. */
  aspectRatio?: CropperAspectRatio | undefined;
  /** Smallest width of the crop, in image pixels. */
  minWidth?: number | undefined;
  /** Smallest height of the crop, in image pixels. */
  minHeight?: number | undefined;
  /** Largest width of the crop, in image pixels. */
  maxWidth?: number | undefined;
  /** Largest height of the crop, in image pixels. */
  maxHeight?: number | undefined;
  /**
   * Fixes the crop's size on screen (pixels): the image moves and zooms
   * behind it, and the crop can't be moved or resized. It keeps within
   * `aspectRatio`.
   */
  stencilSize?:
    CropperSize | ((state: CropperState) => CropperSize) | undefined;
  /**
   * Where the image may go relative to the crop and the viewport.
   * @default "fit-area"
   */
  imageRestriction?: CropperRootImageRestriction | undefined;
  /**
   * Whether zooming resizes the crop with the image, rather than keeping its
   * size on screen. Ignored with `stencilSize`.
   * @default true
   */
  adjustStencil?: boolean | undefined;
  /**
   * The crop to start from, in image pixels. A size without `left` and
   * `top` is centered. 80% of the image by default.
   */
  defaultCoordinates?:
    | Partial<CropperCoordinates>
    | ((state: CropperState) => Partial<CropperCoordinates>)
    | undefined;
  /** The part of the image to show first, in image pixels. Wins over `defaultCoordinates`. */
  defaultVisibleArea?:
    | CropperCoordinates
    | ((state: CropperState) => CropperCoordinates)
    | undefined;
  /** The rotation and flip to start from. */
  defaultTransforms?: CropperDefaultTransforms | undefined;
  /**
   * How long a change from a button, a key or the end of a gesture animates
   * (ms); drags wait for it. Animate with `data-transitioning` and
   * `--cropper-transition-duration`. `0` turns it off.
   * @default 350
   */
  transitionDuration?: number | undefined;
  /**
   * Whether the cropper ignores the user.
   * @default false
   */
  disabled?: boolean | undefined;
  /** Called when the crop, in whole image pixels, changes. */
  onCoordinatesChange?:
    | ((
        coordinates: CropperCoordinates | null,
        eventDetails: CropperRootChangeEventDetails,
      ) => void)
    | undefined;
  /** Called with the crop when a change is complete: at the end of a gesture, or after a button or key press. */
  onCoordinatesCommitted?:
    | ((
        coordinates: CropperCoordinates | null,
        eventDetails: CropperRootChangeEventDetails,
      ) => void)
    | undefined;
  /** Called when `status` changes: the image loads, shows or fails. */
  onStatusChange?: ((status: CropperRootStatus) => void) | undefined;
  /** Receives the actions: `getCanvas()`, `getCoordinates()`, `rotate()` … */
  actionsRef?: React.RefObject<CropperRootActions | null> | undefined;
}

function isCropperCoordinatesEqual(
  a: CropperCoordinates | null,
  b: CropperCoordinates | null,
): boolean {
  if (!a || !b) return a === b;
  return (
    a.left === b.left &&
    a.top === b.top &&
    a.width === b.width &&
    a.height === b.height
  );
}

/** The actions of the root, each passing `options` (the reason of the change) to the engine. */
function createCropperRootActions(
  engine: CropperEngine,
  getImage: () => CropperLoadedImage | null,
  options: CropperActionOptions,
): CropperRootActions {
  return {
    getState: () => engine.getSnapshot().state,
    getCoordinates: () => {
      const { state } = engine.getSnapshot();
      return state
        ? getCropperRoundedCoordinates(state, engine.getSettings())
        : null;
    },
    getCanvas: (canvasOptions) => {
      const element = getImage()?.element;
      return element
        ? drawCropperCanvas(engine.getSnapshot().state, element, canvasOptions)
        : null;
    },
    setCoordinates: (coordinates) => {
      if (
        typeof coordinates === "function" ||
        coordinates.left !== undefined ||
        coordinates.top !== undefined
      ) {
        engine.setCoordinates(coordinates, options);
        return;
      }
      // A size alone stays centered on the crop's current center.
      engine.setCoordinates((state: CropperState) => {
        const current = state.coordinates;
        if (!current) return coordinates;
        const width = coordinates.width ?? current.width;
        const height = coordinates.height ?? current.height;
        return {
          width,
          height,
          left: current.left + (current.width - width) / 2,
          top: current.top + (current.height - height) / 2,
        };
      }, options);
    },
    setState: (state) => engine.setState(state, options),
    zoom: (factor, center) => engine.zoomImage(factor, center, options),
    setZoom: (zoom) =>
      engine.zoomImage(
        getCropperZoomFactor(
          engine.getSnapshot().state,
          engine.getSettings(),
          zoom,
        ),
        undefined,
        { ...options, transitions: false },
      ),
    move: (left, top) => engine.moveImage(left, top, options),
    rotate: (angle) => engine.rotateImage(angle, options),
    flip: (horizontal, vertical = false) =>
      engine.flipImage(horizontal, vertical, options),
    reset: () => {
      const image = getImage();
      const { state } = engine.getSnapshot();
      if (image && state) {
        engine.setState(
          engine.createDefaultState(state.boundary, image),
          options,
        );
      }
    },
  };
}

/**
 * Holds the image, the crop and the view, and provides them to the parts.
 * Renders a `<div>` element.
 */
export function CropperRoot(props: CropperRootProps): React.ReactElement {
  const {
    src,
    crossOrigin: crossOriginProp = "anonymous",
    aspectRatio,
    minWidth,
    minHeight,
    maxWidth,
    maxHeight,
    stencilSize,
    imageRestriction = "fit-area",
    adjustStencil = true,
    defaultCoordinates,
    defaultVisibleArea,
    defaultTransforms,
    transitionDuration = CROPPER_TRANSITION_DURATION,
    disabled = false,
    onCoordinatesChange,
    onCoordinatesCommitted,
    onStatusChange,
    actionsRef,
    render,
    ref,
    ...elementProps
  } = props;
  const crossOrigin = crossOriginProp ?? undefined;

  const settings = createCropperSettings({
    aspectRatio,
    minWidth,
    minHeight,
    maxWidth,
    maxHeight,
    stencilSize,
    imageRestriction,
    adjustStencil,
    defaultCoordinates,
    defaultVisibleArea,
    defaultTransforms,
  });
  const [engine] = React.useState(
    () => new CropperEngine(settings, transitionDuration),
  );
  useIsoLayoutEffect(() => {
    engine.configure(settings, transitionDuration);
  });
  React.useEffect(() => () => engine.dispose(), [engine]);
  const snapshot = React.useSyncExternalStore(
    engine.subscribe,
    engine.getSnapshot,
    engine.getSnapshot,
  );

  const elementRef = React.useRef<HTMLDivElement | null>(null);
  const mergedRef = useMergedRefs(ref, elementRef);
  const getElement = React.useCallback(() => elementRef.current, []);
  const loaded = useCropperImage(src, crossOrigin, getElement);
  const { image } = loaded;

  const [boundary, setBoundaryState] = React.useState<CropperSize | null>(null);
  const setBoundary = React.useCallback((next: CropperSize | null) => {
    setBoundaryState((previous) =>
      previous?.width === next?.width && previous?.height === next?.height
        ? previous
        : next,
    );
  }, []);

  // Start over on a new image; follow the viewport's size on the same one.
  const imageRef = React.useRef<CropperLoadedImage | null>(null);
  useIsoLayoutEffect(() => {
    if (!image) {
      imageRef.current = null;
      engine.clear();
      return;
    }
    if (!boundary) return;
    if (imageRef.current !== image || !engine.getSnapshot().state) {
      imageRef.current = image;
      engine.reset(boundary, image, { reason: REASONS.imageLoad });
    } else {
      engine.setBoundary(boundary, { reason: REASONS.viewportResize });
      // The new size can break restrictions that held before.
      engine.reconcile({ reason: REASONS.viewportResize });
    }
  }, [engine, image, boundary]);

  const interacting = hasCropperInteractions(snapshot.interactions);

  // A prop such as `aspectRatio` changed: fit the crop to it.
  useIsoLayoutEffect(() => {
    if (!interacting) {
      engine.reconcile({ transitions: true, reason: REASONS.settingsChange });
    }
  });

  const status =
    loaded.status === "loaded" && !snapshot.state ? "loading" : loaded.status;

  const getImage = useStableCallback(() => imageRef.current);
  const actions: CropperRootActions = React.useMemo(
    () =>
      createCropperRootActions(engine, getImage, {
        reason: REASONS.imperativeAction,
      }),
    [engine, getImage],
  );
  React.useImperativeHandle(actionsRef, () => actions, [actions]);

  const runAction = useStableCallback(
    (
      reason: CropperRootChangeEventReason,
      event: Event | undefined,
      action: (partActions: CropperRootActions) => void,
    ) => {
      action(createCropperRootActions(engine, getImage, { reason, event }));
    },
  );

  // Report the crop when it changes, and when a change is complete.
  const reportedRef = React.useRef<CropperCoordinates | null>(null);
  const committedRef = React.useRef<CropperCoordinates | null>(null);
  React.useEffect(() => {
    const coordinates = snapshot.state
      ? getCropperRoundedCoordinates(snapshot.state, engine.getSettings())
      : null;
    const details = {
      reason: snapshot.reason,
      event: snapshot.event ?? new Event("base-ui"),
    } as CropperRootChangeEventDetails;
    if (!isCropperCoordinatesEqual(reportedRef.current, coordinates)) {
      reportedRef.current = coordinates;
      onCoordinatesChange?.(coordinates, details);
    }
    if (
      !interacting &&
      !isCropperCoordinatesEqual(committedRef.current, coordinates)
    ) {
      committedRef.current = coordinates;
      onCoordinatesCommitted?.(coordinates, details);
    }
  }, [
    engine,
    snapshot,
    interacting,
    onCoordinatesChange,
    onCoordinatesCommitted,
  ]);

  const reportedStatusRef = React.useRef(status);
  React.useEffect(() => {
    if (reportedStatusRef.current === status) return;
    reportedStatusRef.current = status;
    onStatusChange?.(status);
  }, [status, onStatusChange]);

  const zoom = getCropperZoom(snapshot.state, settings);
  const fixedStencil = stencilSize !== undefined;

  const contextValue: CropperRootContextValue = React.useMemo(
    () => ({
      actions,
      status,
      disabled,
      image,
      crossOrigin,
      fixedStencil,
      engine,
      setBoundary,
      runAction,
    }),
    [
      actions,
      status,
      disabled,
      image,
      crossOrigin,
      fixedStencil,
      engine,
      setBoundary,
      runAction,
    ],
  );

  const stateContextValue: CropperRootStateContextValue = React.useMemo(
    () => ({
      state: snapshot.state,
      interactions: snapshot.interactions,
      interacting,
      transitioning: snapshot.transitioning,
      zoom,
    }),
    [snapshot, interacting, zoom],
  );

  const state: CropperRootState = React.useMemo(
    () => ({
      status,
      disabled,
      interacting,
      transitioning: snapshot.transitioning,
    }),
    [status, disabled, interacting, snapshot.transitioning],
  );

  const coordinates = snapshot.state?.coordinates;
  const cssVariables = {
    "--cropper-transition-duration": `${transitionDuration}ms`,
    ...(image && {
      "--cropper-image-aspect-ratio": `${getCropperRatio(image)}`,
    }),
    ...(coordinates && {
      "--cropper-aspect-ratio": `${getCropperRatio(coordinates)}`,
    }),
  } as React.CSSProperties;

  const element = useRender({
    defaultTagName: "div",
    render,
    ref: mergedRef,
    state,
    stateAttributesMapping: CROPPER_STATE_ATTRIBUTES,
    props: mergeProps<"div">({ style: cssVariables }, elementProps),
  });

  return (
    <CropperRootContext value={contextValue}>
      <CropperRootStateContext value={stateContextValue}>
        {element}
      </CropperRootStateContext>
    </CropperRootContext>
  );
}
