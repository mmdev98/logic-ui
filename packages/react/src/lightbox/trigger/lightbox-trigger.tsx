"use client";

import { mergeProps } from "@base-ui/react/merge-props";
import { useRender } from "@base-ui/react/use-render";
import { useMergedRefs } from "@base-ui/utils/useMergedRefs";
import * as React from "react";
import type { LightboxHandle } from "../root/lightbox-handle";
import {
  type LightboxRootContextValue,
  useLightboxRootContextOptional,
} from "../root/lightbox-root-context";
import { type LightboxItemValue } from "../types";
import { createLightboxChangeEventDetails } from "../utils/lightbox-event-details";
import * as REASONS from "../lightbox-reasons";
import { useLightboxElementRef } from "../use-lightbox-element-ref";

export type LightboxTriggerState = {
  /** Whether its image loads before the viewer opens. */
  pending: boolean;
  /** Whether the image flies from it or back to it. Hide the trigger meanwhile. */
  flying: boolean;
  /** Whether another trigger's image is loading. */
  disabled: boolean;
  /**
   * Whether the image will fly back to it when the viewer closes: the
   * trigger of the item shown, or the one `closeTarget` picks. From the
   * start of the opening flight to the end of the closing one. Hide the
   * thumbnail meanwhile and keep its space (`visibility: hidden`): the image
   * looks like it left its slot, and lands in an empty one.
   */
  popupOpen: boolean;
  /** Whether the image crossfades with it during its flights. */
  crossfade: boolean;
};

export interface LightboxTriggerProps extends useRender.ComponentProps<
  "button",
  LightboxTriggerState
> {
  /** Value of the item it opens, as returned by `itemToValue`. */
  value: LightboxItemValue;
  /**
   * Links a trigger placed outside `Lightbox.Root` to it, from
   * `Lightbox.createHandle()`.
   */
  handle?: LightboxHandle | undefined;
  /**
   * Whether it shows something other than the media it opens: an avatar, a
   * cover, an icon. The image then crossfades with a copy of it during the
   * flights, growing out of its look and turning back into it on the way
   * home. A trigger `closeTarget` picks for another item always crossfades.
   * @default false
   */
  crossfade?: boolean | undefined;
}

function subscribeToNothing(): () => void {
  return () => {};
}

function registerNothing(): () => void {
  return () => {};
}

/** The root of a trigger: its context, or the one its `handle` links to. */
function useLightboxTriggerRoot(
  handle: LightboxHandle | undefined,
): LightboxRootContextValue | null {
  const context = useLightboxRootContextOptional();
  const linked = React.useSyncExternalStore(
    handle?.subscribe ?? subscribeToNothing,
    () => handle?.getRoot() ?? null,
    () => null,
  );
  if (!handle && !context) {
    throw new Error(
      "Base UI: LightboxRootContext is missing. " +
        "Lightbox.Trigger must be placed within <Lightbox.Root>, " +
        "or be given the `handle` passed to <Lightbox.Root>.",
    );
  }
  return handle ? linked : context;
}

/**
 * Opens the viewer on one item. The image flies from the trigger to the
 * viewer and back. Put the thumbnail inside it, or lay it over the thumbnail.
 * It has `data-popup-open` while the image will fly back to it (the item
 * shown is its own, or `closeTarget` picks it): hide it then, keeping its
 * space, so the image always lands in an empty slot. When `value` matches no item, only the children render,
 * without the button. Renders a `<button>` element.
 */
export function LightboxTrigger(
  props: LightboxTriggerProps,
): React.ReactElement | null {
  const {
    value,
    handle,
    crossfade = false,
    render,
    ref,
    children,
    ...elementProps
  } = props;

  const root = useLightboxTriggerRoot(handle);
  const index = root ? root.values.indexOf(value) : -1;
  const exists = !root || index !== -1;

  const registerRef = useLightboxElementRef(
    exists ? value : undefined,
    root?.registerTrigger ?? registerNothing,
  );
  // Its own element: of several triggers of an item, only the one the image
  // flies from or lands on is flying.
  const [triggerElement, setTriggerElement] =
    React.useState<HTMLElement | null>(null);
  const handleElement = React.useCallback(
    (node: HTMLElement | null) => setTriggerElement(node),
    [],
  );
  const mergedRef = useMergedRefs(ref, registerRef, handleElement);

  const pending = root?.pendingValue === value;
  const flying =
    triggerElement !== null && root?.flyingTrigger === triggerElement;
  const disabled = (root?.pendingValue ?? null) !== null;
  const popupOpen =
    triggerElement !== null && root?.landingTrigger === triggerElement;

  const state: LightboxTriggerState = React.useMemo(
    () => ({ pending, flying, disabled, popupOpen, crossfade }),
    [pending, flying, disabled, popupOpen, crossfade],
  );

  const element = useRender({
    defaultTagName: "button",
    render,
    ref: mergedRef,
    state,
    // Named like Base UI's triggers: `data-popup-open`.
    stateAttributesMapping: {
      popupOpen: (isOpen) => (isOpen ? { "data-popup-open": "" } : null),
      // The root reads it on the element, to know whether to crossfade.
      crossfade: (isCrossfade) =>
        isCrossfade ? { "data-crossfade": "" } : null,
    },
    enabled: exists,
    props: mergeProps<"button">(
      {
        type: "button",
        "aria-label": root
          ? `Open image ${index + 1} of ${root.items.length}`
          : undefined,
        "aria-haspopup": "dialog",
        "aria-busy": pending || undefined,
        // Stays focusable while disabled, so focus isn't lost while loading.
        "aria-disabled": disabled || undefined,
        onClick: (event) => {
          if (disabled || !root) return;
          void root.openValue(
            value,
            createLightboxChangeEventDetails(
              REASONS.triggerPress,
              event.nativeEvent,
              event.currentTarget,
            ),
          );
        },
        children,
      },
      elementProps,
    ),
  });

  // Nothing to open: still show the children (an avatar without a photo).
  if (!exists) return <>{children}</>;
  return element;
}
