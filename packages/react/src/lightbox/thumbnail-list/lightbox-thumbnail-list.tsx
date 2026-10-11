"use client";

import { mergeProps } from "@base-ui/react/merge-props";
import { useRender } from "@base-ui/react/use-render";
import { ownerWindow } from "@base-ui/utils/owner";
import { useIsoLayoutEffect } from "@base-ui/utils/useIsoLayoutEffect";
import { useMergedRefs } from "@base-ui/utils/useMergedRefs";
import { useStableCallback } from "@base-ui/utils/useStableCallback";
import * as React from "react";
import { useLightboxRootContext } from "../root/lightbox-root-context";

import { createLightboxChangeEventDetails } from "../utils/lightbox-event-details";
import {
  LightboxThumbnailListContext,
  type LightboxThumbnailListContextValue,
  LightboxThumbnailListItemContext,
} from "./lightbox-thumbnail-list-context";
import { useLightboxThumbnailListScroll } from "./use-lightbox-thumbnail-list-scroll";

export type LightboxThumbnailListState = {
  /**
   * Which way the thumbnails run.
   *
   * - `"horizontal"`: Left to right, or right to left in a right-to-left layout.
   * - `"vertical"`: Top to bottom.
   */
  orientation: "horizontal" | "vertical";
  /** Whether thumbnails are scrolled out of view before the start. */
  overflowStart: boolean;
  /** Whether thumbnails are scrolled out of view past the end. */
  overflowEnd: boolean;
  /** Whether the mouse drags the strip. */
  swiping: boolean;
};

/** Renders one thumbnail for an item, as passed to `items`. */
export type LightboxThumbnailRender = (
  // The items can have any shape, like Base UI's `Combobox.List` children.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  item: any,
  index: number,
) => React.ReactNode;

export interface LightboxThumbnailListProps extends Omit<
  useRender.ComponentProps<"div", LightboxThumbnailListState>,
  "children"
> {
  /**
   * A function that renders one thumbnail: a `Lightbox.Thumbnail` with an
   * image inside. Receives the item as passed to `items`, and is called for
   * every item. Other children, such as a `Lightbox.ThumbnailIndicator`,
   * render after the thumbnails.
   */
  children:
    | LightboxThumbnailRender
    | ReadonlyArray<LightboxThumbnailRender | React.ReactNode>;
  /**
   * Which arrow keys move between thumbnails, and which way the strip
   * scrolls. Set as `data-orientation`.
   *
   * - `"horizontal"`: ← → move, and the wheel scrolls the strip sideways.
   * - `"vertical"`: ↑ ↓ move, for a column of thumbnails.
   * @default "horizontal"
   */
  orientation?: "horizontal" | "vertical";
  /**
   * Whether the arrow keys also show the item of the thumbnail they move to.
   * When `false`, they only move focus, and Enter shows the item.
   * @default true
   */
  activateOnFocus?: boolean;
}

/**
 * A strip of thumbnails inside the viewer, one per item. It is a single tab
 * stop: the arrow keys move between thumbnails and show their item, Home and
 * End go to the first and last. It scrolls itself: the active thumbnail
 * glides to its centre, the mouse can drag it, and the wheel scrolls a
 * horizontal strip. Make it scroll with `overflow: auto`, and hide its
 * scrollbar in CSS if you like. Follows the WAI-ARIA tabbed carousel
 * pattern: it is a tab list, and the slides are its tab panels.
 * Renders a `<div>` element.
 */
export function LightboxThumbnailList(
  props: LightboxThumbnailListProps,
): React.ReactElement {
  const {
    children,
    orientation = "horizontal",
    activateOnFocus = true,
    render,
    ref,
    ...elementProps
  } = props;

  const { items, values, index, goTo, registerThumbnailList } =
    useLightboxRootContext();
  const childList = Array.isArray(children) ? children : [children];
  const renderThumbnail = childList.find(
    (child): child is LightboxThumbnailRender => typeof child === "function",
  );
  if (!renderThumbnail) {
    throw new Error(
      "Base UI: Lightbox.ThumbnailList has no function child. " +
        "It renders one thumbnail per item from a function. " +
        "Pass one: {(photo) => <Lightbox.Thumbnail />}.",
    );
  }
  const otherChildren = childList.filter(
    (child) => typeof child !== "function",
  ) as React.ReactNode[];
  const [focusIndex, setFocusIndex] = React.useState(index);
  const [shownIndex, setShownIndex] = React.useState(index);
  const thumbnailsRef = React.useRef(new Map<number, HTMLElement>());

  // The tab stop follows the item shown in the viewer.
  if (index !== shownIndex) {
    setShownIndex(index);
    setFocusIndex(index);
  }

  const getThumbnail = useStableCallback((thumbnailIndex: number) =>
    thumbnailsRef.current.get(thumbnailIndex),
  );

  const scroll = useLightboxThumbnailListScroll({
    orientation,
    activeIndex: index,
    getThumbnail,
  });
  const [listElement, setListElement] = React.useState<HTMLElement | null>(
    null,
  );
  const handleListElement = React.useCallback(
    (node: HTMLElement | null) => setListElement(node),
    [],
  );
  const mergedRef = useMergedRefs(ref, scroll.ref, handleListElement);

  // The slides become its tab panels.
  useIsoLayoutEffect(() => {
    if (!listElement) return undefined;
    return registerThumbnailList({ element: listElement });
  }, [listElement, registerThumbnailList]);

  const registerThumbnail = useStableCallback(
    (thumbnailIndex: number, element: HTMLElement) => {
      thumbnailsRef.current.set(thumbnailIndex, element);
      return () => {
        if (thumbnailsRef.current.get(thumbnailIndex) === element)
          thumbnailsRef.current.delete(thumbnailIndex);
      };
    },
  );

  const handleKeyDown = useStableCallback(
    (event: React.KeyboardEvent<HTMLDivElement>) => {
      if (event.altKey || event.ctrlKey || event.metaKey) return;
      const last = items.length - 1;
      const isRtl =
        orientation === "horizontal" &&
        ownerWindow(event.currentTarget).getComputedStyle(event.currentTarget)
          .direction === "rtl";
      let previousKey = isRtl ? "ArrowRight" : "ArrowLeft";
      let nextKey = isRtl ? "ArrowLeft" : "ArrowRight";
      if (orientation === "vertical") {
        previousKey = "ArrowUp";
        nextKey = "ArrowDown";
      }

      let target: number | null = null;
      if (event.key === previousKey) target = Math.max(0, focusIndex - 1);
      else if (event.key === nextKey) target = Math.min(last, focusIndex + 1);
      else if (event.key === "Home") target = 0;
      else if (event.key === "End") target = last;
      if (target === null) return;

      const element = thumbnailsRef.current.get(target);
      if (!element) return;
      // Handled here: the viewer doesn't also change the item.
      event.preventDefault();
      setFocusIndex(target);
      element.focus();
      if (activateOnFocus)
        goTo(
          target,
          createLightboxChangeEventDetails(
            "list-navigation",
            event.nativeEvent,
            element,
          ),
        );
    },
  );

  const contextValue: LightboxThumbnailListContextValue = React.useMemo(
    () => ({
      focusIndex,
      setFocusIndex,
      registerThumbnail,
      element: listElement,
      getThumbnail,
    }),
    [focusIndex, registerThumbnail, listElement, getThumbnail],
  );

  const state: LightboxThumbnailListState = React.useMemo(
    () => ({
      orientation,
      overflowStart: scroll.overflowStart,
      overflowEnd: scroll.overflowEnd,
      swiping: scroll.swiping,
    }),
    [orientation, scroll.overflowStart, scroll.overflowEnd, scroll.swiping],
  );

  const element = useRender({
    defaultTagName: "div",
    render,
    ref: mergedRef,
    state,
    stateAttributesMapping: {
      overflowStart: (value) => (value ? { "data-overflow-start": "" } : null),
      overflowEnd: (value) => (value ? { "data-overflow-end": "" } : null),
    },
    props: mergeProps<"div">(
      scroll.props,
      {
        role: "tablist",
        "aria-orientation": orientation,
        "aria-label": "Thumbnails",
        onKeyDown: handleKeyDown,
        children: (
          <React.Fragment>
            {items.map((item, itemIndex) => (
              <LightboxThumbnailListItemContext
                key={values[itemIndex]}
                value={{ index: itemIndex }}
              >
                {renderThumbnail(item, itemIndex)}
              </LightboxThumbnailListItemContext>
            ))}
            {otherChildren}
          </React.Fragment>
        ),
      },
      elementProps,
    ),
  });

  return (
    <LightboxThumbnailListContext value={contextValue}>
      {element}
    </LightboxThumbnailListContext>
  );
}
