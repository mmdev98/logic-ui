"use client";

import * as React from "react";
import * as REASONS from "../cropper-reasons";
import {
  type CropperActionProps,
  type CropperActionState,
  useCropperAction,
} from "../use-cropper-action";

/**
 * The axis the image is mirrored across, as seen on screen:
 * - `"horizontal"`: left and right swap.
 * - `"vertical"`: top and bottom swap.
 */
export type CropperFlipOrientation = "horizontal" | "vertical";

export type CropperFlipState = CropperActionState;

export interface CropperFlipProps extends CropperActionProps {
  /**
   * The axis the image is mirrored across.
   * @default "horizontal"
   */
  orientation?: CropperFlipOrientation | undefined;
}

/**
 * Mirrors the image.
 * Renders a `<button>` element.
 */
export function CropperFlip(props: CropperFlipProps): React.ReactElement {
  const { orientation = "horizontal", ...actionProps } = props;
  const horizontal = orientation === "horizontal";
  return useCropperAction({
    props: actionProps,
    reason: REASONS.flipPress,
    onAction: (actions) => actions.flip(horizontal, !horizontal),
    label: horizontal ? "Flip horizontally" : "Flip vertically",
  });
}
