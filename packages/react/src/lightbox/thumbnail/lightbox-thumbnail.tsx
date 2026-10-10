"use client";

import { mergeProps } from "@base-ui/react/merge-props";
import { useRender } from "@base-ui/react/use-render";
import { useIsoLayoutEffect } from "@base-ui/utils/useIsoLayoutEffect";
import { useMergedRefs } from "@base-ui/utils/useMergedRefs";
import * as React from "react";
import { useLightboxRootContext } from "../root/lightbox-root-context";
import { getLightboxSlideId } from "../utils/lightbox-items";
import {
  useLightboxThumbnailListContext,
  useLightboxThumbnailListItemContext,
} from "../thumbnail-list/lightbox-thumbnail-list-context";

export type LightboxThumbnailState = {
  /** Whether its item is the one shown in the viewer. */
  active: boolean;
};

export type LightboxThumbnailProps = useRender.ComponentProps<
  "button",
  LightboxThumbnailState
>;

/**
 * Shows its item in the viewer. Return it from the function passed to
 * `Lightbox.ThumbnailList`, with the thumbnail image inside, such as a Base UI
 * `Avatar` that handles loading and errors, or anything else, such as a dot.
 * It is a tab: it has `aria-selected` and `data-active` while its item is
 * shown, and the list keeps it centred.
 * Renders a `<button>` element.
 */
export function LightboxThumbnail(
  props: LightboxThumbnailProps,
): React.ReactElement {
  const { render, ref, ...elementProps } = props;

  const {
    items,
    index: activeIndex,
    goTo,
    id: rootId,
  } = useLightboxRootContext();
  const { focusIndex, setFocusIndex, registerThumbnail } =
    useLightboxThumbnailListContext();
  const { index } = useLightboxThumbnailListItemContext();
  const elementRef = React.useRef<HTMLElement | null>(null);
  const mergedRef = useMergedRefs(ref, elementRef);

  const active = index === activeIndex;

  // A layout effect: registered before `Lightbox.ThumbnailList` centres the active one.
  useIsoLayoutEffect(() => {
    const element = elementRef.current;
    if (!element) return undefined;
    return registerThumbnail(index, element);
  }, [index, registerThumbnail]);

  const state: LightboxThumbnailState = React.useMemo(
    () => ({ active }),
    [active],
  );

  return useRender({
    defaultTagName: "button",
    render,
    ref: mergedRef,
    state,
    props: mergeProps<"button">(
      {
        type: "button",
        "aria-label": `Show image ${index + 1} of ${items.length}`,
        role: "tab",
        "aria-selected": active,
        // Only the active slide is sure to be rendered.
        "aria-controls": active ? getLightboxSlideId(rootId, index) : undefined,
        tabIndex: index === focusIndex ? 0 : -1,
        onFocus: () => setFocusIndex(index),
        onClick: () => goTo(index),
      },
      elementProps,
    ),
  });
}
