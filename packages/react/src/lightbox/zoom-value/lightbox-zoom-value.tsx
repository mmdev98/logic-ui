"use client";

import { mergeProps } from "@base-ui/react/merge-props";
import { useRender } from "@base-ui/react/use-render";
import * as React from "react";
import { useLightboxRootZoomContext } from "../root/lightbox-root-context";

export type LightboxZoomValueState = {
  /** Scale of the active image: 1 at its original size. */
  scale: number;
};

export interface LightboxZoomValueProps extends Omit<
  useRender.ComponentProps<"span", LightboxZoomValueState>,
  "children"
> {
  /**
   * Content. A function receives the state, to format the scale.
   * @default `${Math.round(scale * 100)}%`
   */
  children?:
    | React.ReactNode
    | ((state: LightboxZoomValueState) => React.ReactNode)
    | undefined;
}

/**
 * Zoom level of the active image, as a percentage.
 * Renders a `<span>` element.
 */
export function LightboxZoomValue(
  props: LightboxZoomValueProps,
): React.ReactElement {
  const { children, render, ref, ...elementProps } = props;

  const { scale } = useLightboxRootZoomContext();

  const state: LightboxZoomValueState = React.useMemo(
    () => ({ scale }),
    [scale],
  );

  return useRender({
    defaultTagName: "span",
    render,
    ref,
    state,
    stateAttributesMapping: { scale: () => null },
    props: mergeProps<"span">(
      {
        children:
          typeof children === "function"
            ? children(state)
            : (children ?? `${Math.round(scale * 100)}%`),
      },
      elementProps,
    ),
  });
}
