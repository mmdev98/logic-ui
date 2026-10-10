"use client";

import { mergeProps } from "@base-ui/react/merge-props";
import { useRender } from "@base-ui/react/use-render";
import { ownerWindow } from "@base-ui/utils/owner";
import { useIsoLayoutEffect } from "@base-ui/utils/useIsoLayoutEffect";
import { useMergedRefs } from "@base-ui/utils/useMergedRefs";
import { useStableCallback } from "@base-ui/utils/useStableCallback";
import * as React from "react";
import { useLightboxRootContext } from "../root/lightbox-root-context";
import { useLightboxSlideContext } from "../slide/lightbox-slide-context";
import {
  type LightboxMediaLayout,
  LightboxMediaStatus,
  LightboxPhase,
} from "../types";
import { getLightboxContainedSize } from "../utils/lightbox-geometry";
import {
  getLightboxAspectRatio,
  toLightboxDimension,
} from "../utils/lightbox-items";
import {
  fillLightboxMediaBox,
  findLightboxMediaElement,
  getLightboxMediaNaturalSize,
  getLightboxMediaStatus,
  isLightboxMediaPlayable,
  isLightboxMediaZoomable,
} from "../utils/lightbox-media";

export type LightboxMediaState = {
  /** Whether its slide is the one shown in the viewer. */
  active: boolean;
  /** Whether the media is loading. */
  loading: boolean;
  /** Whether the media failed to load. */
  error: boolean;
};

export interface LightboxMediaProps extends useRender.ComponentProps<
  "div",
  LightboxMediaState
> {
  /**
   * Natural width of the media, when known. With `height`, it gives the box
   * the media's shape before it has loaded, so the image flies in at the
   * right size.
   */
  width?: number | string;
  /** Natural height of the media, when known. See `width`. */
  height?: number | string;
}

/** Media events that tell the loading state or the natural size. */
const MEDIA_EVENTS = ["load", "loadeddata", "loadedmetadata", "error"];

function isSameLayout(a: LightboxMediaLayout | null, b: LightboxMediaLayout) {
  return (
    a !== null &&
    a.left === b.left &&
    a.top === b.top &&
    a.width === b.width &&
    a.height === b.height &&
    a.slideWidth === b.slideWidth &&
    a.slideHeight === b.slideHeight
  );
}

/**
 * The media of a `Lightbox.Slide`: put an `<img>`, a `<video>` or an
 * `<iframe>` inside, as its direct child. It is a box with the media's
 * shape, fitted inside the slide's padding, that the media fills. The box
 * flies from the trigger and back and follows the drag to close, with all
 * of its content: put a spinner or an error message next to the media and
 * show them with the slide's `data-loading` and `data-error`. An `<img>`
 * also zooms and pans; other media don't. A `<video>` pauses when its
 * slide is no longer shown. The loading state comes from the
 * media's own events. Its position and size are set by the box, and its
 * `translate` and `scale` while it is dragged.
 * Renders a `<div>` element.
 */
export function LightboxMedia(props: LightboxMediaProps): React.ReactElement {
  const { width, height, render, ref, ...elementProps } = props;

  const {
    value,
    active,
    status,
    setStatus,
    element: slideElement,
  } = useLightboxSlideContext();
  const { phase, mediaSizes, setMediaSize, registerMedia } =
    useLightboxRootContext();
  const [layout, setLayout] = React.useState<LightboxMediaLayout | null>(null);
  const [box, setBox] = React.useState<HTMLElement | null>(null);
  const [mediaElement, setMediaElement] = React.useState<HTMLElement | null>(
    null,
  );
  const handleBox = React.useCallback(
    (node: HTMLElement | null) => setBox(node),
    [],
  );
  const mergedRef = useMergedRefs(ref, handleBox);

  const aspectRatio = getLightboxAspectRatio(
    mediaSizes.get(value),
    toLightboxDimension(width),
    toLightboxDimension(height),
  );

  const measure = useStableCallback(() => {
    if (!slideElement) return;
    const style = ownerWindow(slideElement).getComputedStyle(slideElement);
    const paddingLeft = parseFloat(style.paddingLeft) || 0;
    const paddingTop = parseFloat(style.paddingTop) || 0;
    const slideWidth = slideElement.clientWidth;
    const slideHeight = slideElement.clientHeight;
    const contentWidth = Math.max(
      0,
      slideWidth - paddingLeft - (parseFloat(style.paddingRight) || 0),
    );
    const contentHeight = Math.max(
      0,
      slideHeight - paddingTop - (parseFloat(style.paddingBottom) || 0),
    );
    // Until the size is known, the media fills the space.
    const ratio =
      aspectRatio ?? (contentHeight > 0 ? contentWidth / contentHeight : 1);
    const size = getLightboxContainedSize(ratio, contentWidth, contentHeight);
    const next: LightboxMediaLayout = {
      left: paddingLeft + (contentWidth - size.width) / 2,
      top: paddingTop + (contentHeight - size.height) / 2,
      width: size.width,
      height: size.height,
      slideWidth,
      slideHeight,
    };
    setLayout((current) => (isSameLayout(current, next) ? current : next));
  });

  useIsoLayoutEffect(() => {
    measure();
    if (!slideElement || typeof ResizeObserver === "undefined")
      return undefined;
    const observer = new ResizeObserver(measure);
    observer.observe(slideElement);
    return () => observer.disconnect();
  }, [slideElement, aspectRatio, measure]);

  // Finds the media among the children, and again when they change.
  useIsoLayoutEffect(() => {
    if (!box) return undefined;
    const update = () => setMediaElement(findLightboxMediaElement(box));
    update();
    if (typeof MutationObserver === "undefined") return undefined;
    const observer = new MutationObserver(update);
    observer.observe(box, { childList: true });
    return () => observer.disconnect();
  }, [box]);

  // The loading state: as it is now (a cached image is loaded already), then
  // from the media's events. They don't bubble, so the box listens in the
  // capture phase. A new `src` loads again.
  useIsoLayoutEffect(() => {
    if (!box) return undefined;
    const readStatus = () => {
      const next = getLightboxMediaStatus(mediaElement);
      setStatus(next);
      const size = mediaElement && getLightboxMediaNaturalSize(mediaElement);
      if (next === LightboxMediaStatus.Loaded && size)
        setMediaSize(value, size);
    };
    readStatus();

    const handleEvent = (event: Event) => {
      if (!mediaElement || event.target !== mediaElement) return;
      if (event.type === "error") {
        setStatus(LightboxMediaStatus.Error);
        return;
      }
      const size = getLightboxMediaNaturalSize(mediaElement);
      if (size) setMediaSize(value, size);
      // A video knows its size before it can show a frame.
      if (event.type !== "loadedmetadata")
        setStatus(LightboxMediaStatus.Loaded);
    };
    for (const type of MEDIA_EVENTS) {
      box.addEventListener(type, handleEvent, true);
    }
    const observer =
      mediaElement && typeof MutationObserver !== "undefined"
        ? new MutationObserver(readStatus)
        : null;
    observer?.observe(mediaElement as HTMLElement, {
      attributes: true,
      attributeFilter: ["src", "srcset"],
    });
    return () => {
      for (const type of MEDIA_EVENTS) {
        box.removeEventListener(type, handleEvent, true);
      }
      observer?.disconnect();
      setStatus(LightboxMediaStatus.Idle);
    };
  }, [box, mediaElement, value, setStatus, setMediaSize]);

  // The media fills the box. Written to it directly: it's the app's element.
  useIsoLayoutEffect(
    () => (mediaElement ? fillLightboxMediaBox(mediaElement) : undefined),
    [mediaElement],
  );

  // A video stops when its slide is no longer the one shown, or the viewer
  // closes.
  const playing = active && phase !== LightboxPhase.Closing;
  useIsoLayoutEffect(() => {
    if (playing || !isLightboxMediaPlayable(mediaElement)) return;
    (mediaElement as HTMLMediaElement).pause();
  }, [playing, mediaElement]);

  // A failed image is no longer one to zoom.
  const zoomElement =
    isLightboxMediaZoomable(mediaElement) &&
    status !== LightboxMediaStatus.Error
      ? mediaElement
      : null;

  useIsoLayoutEffect(() => {
    if (!layout || !box || !slideElement) return undefined;
    return registerMedia(value, {
      element: box,
      zoomElement,
      slideElement,
      layout,
    });
  }, [layout, box, slideElement, value, zoomElement, registerMedia]);

  const state: LightboxMediaState = React.useMemo(
    () => ({
      active,
      loading: status === LightboxMediaStatus.Loading,
      error: status === LightboxMediaStatus.Error,
    }),
    [active, status],
  );

  return useRender({
    defaultTagName: "div",
    render,
    ref: mergedRef,
    state,
    props: mergeProps<"div">(
      elementProps,
      // Last, so the caller's `style` can't move it.
      {
        style: {
          position: "absolute",
          left: layout?.left ?? 0,
          top: layout?.top ?? 0,
          width: layout?.width ?? 0,
          height: layout?.height ?? 0,
          visibility: layout ? undefined : "hidden",
          willChange: active ? "transform" : undefined,
        },
      },
    ),
  });
}
