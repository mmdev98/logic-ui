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

export type CropperZoomInProps = CropperActionProps;

export type CropperZoomInState = CropperActionState;

/**
 * Zooms the image in by one step. Disabled at the closest view.
 * Renders a `<button>` element.
 */
export function CropperZoomIn(props: CropperZoomInProps): React.ReactElement {
  const { zoom } = useCropperRootStateContext();
  return useCropperAction({
    props,
    disabled: zoom > 0.999,
    reason: REASONS.zoomInPress,
    onAction: (actions) => actions.zoom(CROPPER_ZOOM_STEP),
    label: "Zoom in",
  });
}
