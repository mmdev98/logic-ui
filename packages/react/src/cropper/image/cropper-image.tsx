"use client";

import { mergeProps } from "@base-ui/react/merge-props";
import { useRender } from "@base-ui/react/use-render";
import * as React from "react";
import {
  useCropperRootContext,
  useCropperRootStateContext,
} from "../root/cropper-root-context";
import { getCropperBackgroundStyle } from "../utils/cropper-image-style";
import { useCropperViewportContext } from "../viewport/cropper-viewport-context";

export type CropperImageState = {
  /** Whether a change animates. */
  transitioning: boolean;
};

export type CropperImageProps = useRender.ComponentProps<
  "img",
  CropperImageState
>;

/**
 * The image, placed under the crop as the view moves and zooms. Renders
 * nothing until the image is on screen. Its `alt` is empty unless you set one.
 * Renders an `<img>` element.
 */
export function CropperImage(
  props: CropperImageProps,
): React.ReactElement | null {
  const { render, ref, ...elementProps } = props;
  const { image, crossOrigin } = useCropperRootContext();
  const { state: cropperState, transitioning } = useCropperRootStateContext();
  const { inset } = useCropperViewportContext();

  const style = image ? getCropperBackgroundStyle(image, cropperState) : null;

  const state: CropperImageState = React.useMemo(
    () => ({ transitioning }),
    [transitioning],
  );

  return useRender({
    enabled: Boolean(image && style),
    defaultTagName: "img",
    render,
    ref,
    state,
    props: mergeProps<"img">(
      {
        src: image?.src,
        alt: "",
        crossOrigin,
        draggable: false,
        // Drags belong to `Cropper.Viewport`.
        // Placed from the viewport's padding, where the boundary starts.
        style: {
          ...style,
          left: inset.left,
          top: inset.top,
          pointerEvents: "none",
        },
      },
      elementProps,
    ),
  });
}
