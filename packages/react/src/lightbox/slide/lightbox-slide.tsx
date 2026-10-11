"use client";

import { mergeProps } from "@base-ui/react/merge-props";
import { useRender } from "@base-ui/react/use-render";
import { useMergedRefs } from "@base-ui/utils/useMergedRefs";
import * as React from "react";
import { LIGHTBOX_STATE_ATTRIBUTES } from "../lightbox-state-attributes";
import { useLightboxRootContext } from "../root/lightbox-root-context";
import type { LightboxRootActivationDirection } from "../root/lightbox-root";
import type { LightboxMediaStatus } from "../media/lightbox-media";
import { getLightboxSlideId } from "../utils/lightbox-items";
import { TRACK_PROGRESS } from "../viewport/lightbox-viewport-track";
import { slideProgress } from "./lightbox-slide-css-vars";
import {
  useLightboxViewportContext,
  useLightboxViewportSlideContext,
} from "../viewport/lightbox-viewport-context";
import {
  LightboxSlideContext,
  type LightboxSlideContextValue,
} from "./lightbox-slide-context";

export type LightboxSlideState = {
  /** Whether it is the slide shown in the viewer. */
  active: boolean;
  /** Whether its `Lightbox.Media` is loading. */
  loading: boolean;
  /** Whether its `Lightbox.Media` failed to load. */
  error: boolean;
  /** Side of the previous item the item shown came from, on screen. */
  activationDirection: LightboxRootActivationDirection;
};

export type LightboxSlideProps = useRender.ComponentProps<
  "div",
  LightboxSlideState
>;

/**
 * One slide of the viewport, as large as the viewport. Return it from the
 * function passed to `Lightbox.Viewport`. Its padding is the space kept
 * around the media (`p-6 md:p-24`, or `p-0` for edge to edge). Put a
 * `Lightbox.Media` inside, and a `Lightbox.Caption`, or any other content.
 * It has `--lightbox-slide-progress`, its distance from the centre, and it
 * is placed with `translate`, so its `transform` is free for a custom
 * transition between slides.
 * With a `Lightbox.ThumbnailList`, it is the tab panel of its thumbnail.
 * Renders a `<div>` element.
 */
export function LightboxSlide(
  props: LightboxSlideProps,
): React.ReactElement | null {
  const { render, ref, children, ...elementProps } = props;

  const {
    items,
    values,
    index: activeIndex,
    activationDirection,
    id: rootId,
    thumbnailList,
  } = useLightboxRootContext();
  const { width, gap, directionSign } = useLightboxViewportContext();
  const { index, position } = useLightboxViewportSlideContext();
  const [element, setElement] = React.useState<HTMLElement | null>(null);
  const [status, setStatus] = React.useState<LightboxMediaStatus>("idle");
  const [captionId, setCaptionId] = React.useState<string | undefined>();
  const handleElement = React.useCallback(
    (node: HTMLElement | null) => setElement(node),
    [],
  );
  const mergedRef = useMergedRefs(ref, handleElement);

  const item: unknown = items[index];
  const value = values[index];
  const active = index === activeIndex;

  const contextValue: LightboxSlideContextValue | null = React.useMemo(
    () =>
      value === undefined
        ? null
        : {
            item,
            value,
            index,
            active,
            element,
            status,
            setStatus,
            setCaptionId,
          },
    [item, value, index, active, element, status],
  );

  const state: LightboxSlideState = React.useMemo(
    () => ({
      active,
      loading: status === "loading",
      error: status === "error",
      activationDirection,
    }),
    [active, status, activationDirection],
  );

  const rendered = useRender({
    defaultTagName: "div",
    render,
    ref: mergedRef,
    state,
    enabled: contextValue !== null,
    stateAttributesMapping: LIGHTBOX_STATE_ATTRIBUTES,
    props: mergeProps<"div">(
      {
        id: getLightboxSlideId(rootId, index),
        // The WAI-ARIA carousel pattern: with thumbnails to pick the slide,
        // the slides are their tab panels.
        role: thumbnailList ? "tabpanel" : "group",
        "aria-roledescription": "slide",
        "aria-label": `${index + 1} of ${items.length}`,
        "aria-describedby": captionId,
        "aria-hidden": active ? undefined : true,
        // Nothing in a slide that isn't shown takes focus: focusing it (the
        // dialog's initial focus on a neighbour's video) would scroll it into view.
        inert: !active,
        "aria-busy": state.loading || undefined,
        style: {
          position: "absolute",
          inset: 0,
          boxSizing: "border-box",
          // Its place on the track. With `translate`, so the app's `transform`
          // (a rotation for a cube) turns the slide around its own box.
          translate: `${position * (width + gap) * directionSign}px 0px`,
          // Its distance from the centre, in slides, on every frame: the track
          // writes how far it moved, and this slot adds its own place.
          [slideProgress as string]: `calc(${position * directionSign} + var(${TRACK_PROGRESS}, 0))`,
        },
        children,
      },
      elementProps,
    ),
  });

  if (!contextValue) return null;
  return (
    <LightboxSlideContext value={contextValue}>{rendered}</LightboxSlideContext>
  );
}
