"use client";

import * as React from "react";
import { CROPPER_ZOOM_STEP } from "../constants";
import * as REASONS from "../cropper-reasons";
import { useCropperRootStateContext } from "../root/cropper-root-context";
import {
  type CropperActionProps,
  type CropperActionState,
  useCropperAction,
} from "../use-cropper-action";

export type CropperZoomOutProps = CropperActionProps;

export type CropperZoomOutState = CropperActionState;

/**
 * Zooms the image out by one step. Disabled at the widest view.
 * Renders a `<button>` element.
 */
export function CropperZoomOut(props: CropperZoomOutProps): React.ReactElement {
  const { zoom } = useCropperRootStateContext();
  return useCropperAction({
    props,
    disabled: zoom < 0.001,
    reason: REASONS.zoomOutPress,
    onAction: (actions) => actions.zoom(1 / CROPPER_ZOOM_STEP),
    label: "Zoom out",
  });
}
