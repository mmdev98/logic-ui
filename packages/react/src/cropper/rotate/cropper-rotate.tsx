"use client";

import * as React from "react";
import { CROPPER_ROTATE_ANGLE } from "../constants";
import * as REASONS from "../cropper-reasons";
import {
  type CropperActionProps,
  type CropperActionState,
  useCropperAction,
} from "../use-cropper-action";

export type CropperRotateState = CropperActionState;

export interface CropperRotateProps extends CropperActionProps {
  /**
   * Degrees to turn the image by, clockwise; negative turns it counterclockwise.
   * @default 90
   */
  angle?: number | undefined;
}

/**
 * Turns the image by `angle` degrees.
 * Renders a `<button>` element.
 */
export function CropperRotate(props: CropperRotateProps): React.ReactElement {
  const { angle = CROPPER_ROTATE_ANGLE, ...actionProps } = props;
  return useCropperAction({
    props: actionProps,
    reason: REASONS.rotatePress,
    onAction: (actions) => actions.rotate(angle),
    label: angle < 0 ? "Rotate counterclockwise" : "Rotate clockwise",
  });
}
