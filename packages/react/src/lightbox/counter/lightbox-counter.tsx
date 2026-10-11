"use client";

import { mergeProps } from "@base-ui/react/merge-props";
import { useRender } from "@base-ui/react/use-render";
import * as React from "react";
import {
  LIGHTBOX_STATE_ATTRIBUTES,
  type LightboxTransitionStatus,
} from "../lightbox-state-attributes";
import { useLightboxRootContext } from "../root/lightbox-root-context";
import { type LightboxActivationDirection } from "../types";
import { useLightboxStartingStyle } from "../use-lightbox-starting-style";

export type LightboxCounterState = {
  /** Index of the active item. */
  index: number;
  /** Number of items. */
  count: number;
  /** Side of the previous item the item shown came from, on screen. */
  activationDirection: LightboxActivationDirection;
  /** `starting` for one frame when the item shown changes. */
  transitionStatus: LightboxTransitionStatus;
};

export interface LightboxCounterProps extends Omit<
  useRender.ComponentProps<"span", LightboxCounterState>,
  "children"
> {
  /**
   * Content. A function receives the state, to format it.
   * @default `${index + 1} / ${count}`
   */
  children?:
    React.ReactNode | ((state: LightboxCounterState) => React.ReactNode);
}

/**
 * Position of the active item, as "2 / 5". Announced to screen readers when
 * it changes. It has `data-starting-style` for a frame when the item
 * changes, with `data-activation-direction`, to animate the new number in.
 * Renders a `<span>` element.
 */
export function LightboxCounter(
  props: LightboxCounterProps,
): React.ReactElement {
  const { children, render, ref, ...elementProps } = props;

  const { index, items, phase, activationDirection } = useLightboxRootContext();
  const count = items.length;
  const starting = useLightboxStartingStyle(index, phase === "open");

  const state: LightboxCounterState = React.useMemo(
    () => ({
      index,
      count,
      activationDirection,
      transitionStatus: starting ? "starting" : undefined,
    }),
    [index, count, activationDirection, starting],
  );

  return useRender({
    defaultTagName: "span",
    render,
    ref,
    state,
    stateAttributesMapping: {
      ...LIGHTBOX_STATE_ATTRIBUTES,
      index: () => null,
      count: () => null,
    },
    props: mergeProps<"span">(
      {
        "aria-live": "polite",
        children:
          typeof children === "function"
            ? children(state)
            : (children ?? `${index + 1} / ${count}`),
      },
      elementProps,
    ),
  });
}
