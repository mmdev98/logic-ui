"use client";

import {
  Dialog,
  type DialogTitleProps,
  type DialogTitleState,
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
import { type LightboxActivationDirection } from "../types";
import { useLightboxStartingStyle } from "../use-lightbox-starting-style";

export type LightboxTitleState = DialogTitleState & {
  /** Side of the previous item the item shown came from, on screen. */
  activationDirection: LightboxActivationDirection;
  /**
   * `starting` for one frame when its content changes with the item shown
   * (with a function child).
   */
  transitionStatus: LightboxTransitionStatus;
};

export interface LightboxTitleProps
  extends
    Omit<DialogTitleProps, "className" | "style" | "render" | "children">,
    LightboxStateProps<LightboxTitleState> {
  /**
   * Content. A function receives the item shown in the viewer, as passed to
   * `items`, to name it: `{(photo) => photo.title}`.
   */
  // The items can have any shape, like Base UI's `Combobox.List` children.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  children?: React.ReactNode | ((item: any) => React.ReactNode);
}

/**
 * Names the viewer for screen readers. Hide it visually if the design has no
 * visible title. With a function child, it names the item shown, and has
 * `data-starting-style` for a frame when the item changes, with
 * `data-activation-direction`, to animate the new title in.
 * Renders an `<h2>` element.
 */
export function LightboxTitle(props: LightboxTitleProps): React.ReactElement {
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

  return (
    <Dialog.Title
      {...getLightboxStateAttributes(extra)}
      {...elementProps}
      {...addLightboxState<DialogTitleState, typeof extra>(
        { className, style, render },
        extra,
      )}
    >
      {content}
    </Dialog.Title>
  );
}
