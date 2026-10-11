"use client";

import {
  Dialog,
  type DialogDescriptionProps,
  type DialogDescriptionState,
} from "@base-ui/react/dialog";
import * as React from "react";
import {
  addLightboxState,
  type LightboxStateProps,
} from "../lightbox-dialog-state";
import {
  getLightboxStateAttributes,
  type LightboxTransitionStatus,
} from "../lightbox-state-attributes";
import { useLightboxRootContext } from "../root/lightbox-root-context";
import type { LightboxRootActivationDirection } from "../root/lightbox-root";
import { useLightboxStartingStyle } from "../use-lightbox-starting-style";

export type LightboxDescriptionState = DialogDescriptionState & {
  /** Side of the previous item the item shown came from, on screen. */
  activationDirection: LightboxRootActivationDirection;
  /**
   * `starting` for one frame when its content changes with the item shown
   * (with a function child).
   */
  transitionStatus: LightboxTransitionStatus;
};

export interface LightboxDescriptionProps
  extends
    Omit<DialogDescriptionProps, "className" | "style" | "render" | "children">,
    LightboxStateProps<LightboxDescriptionState> {
  /**
   * Content. A function receives the item shown in the viewer, as passed to
   * `items`, to show its caption: `{(photo) => photo.caption}`.
   */
  // The items can have any shape, like Base UI's `Combobox.List` children.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  children?: React.ReactNode | ((item: any) => React.ReactNode) | undefined;
}

/**
 * Describes the item shown in the viewer, such as its caption, linked to the
 * viewer for screen readers. With a function child, it has
 * `data-starting-style` for a frame when the item changes, with
 * `data-activation-direction`, to animate the new caption in. Renders
 * nothing when its content is empty.
 * Renders a `<p>` element.
 */
export function LightboxDescription(
  props: LightboxDescriptionProps,
): React.ReactElement | null {
  const { children, className, style, render, ...elementProps } = props;

  const { activeItem, index, phase, activationDirection } =
    useLightboxRootContext();
  const followsItem = typeof children === "function";
  let content: React.ReactNode = children as React.ReactNode;
  if (typeof children === "function")
    content = activeItem === undefined ? null : children(activeItem);

  const starting = useLightboxStartingStyle(
    index,
    followsItem && phase === "open",
  );
  const extra = React.useMemo(
    () => ({
      activationDirection,
      transitionStatus: (starting
        ? "starting"
        : undefined) as LightboxTransitionStatus,
    }),
    [activationDirection, starting],
  );

  if (content === undefined || content === null || content === "") return null;

  return (
    <Dialog.Description
      {...getLightboxStateAttributes(extra)}
      {...elementProps}
      {...addLightboxState<DialogDescriptionState, typeof extra>(
        { className, style, render },
        extra,
      )}
    >
      {content}
    </Dialog.Description>
  );
}
