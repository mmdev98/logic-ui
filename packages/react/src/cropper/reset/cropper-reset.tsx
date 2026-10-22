"use client";

import * as React from "react";
import * as REASONS from "../cropper-reasons";
import {
  type CropperActionProps,
  type CropperActionState,
  useCropperAction,
} from "../use-cropper-action";

export type CropperResetProps = CropperActionProps;

export type CropperResetState = CropperActionState;

/**
 * Starts over with the default crop, rotation and view.
 * Renders a `<button>` element.
 */
export function CropperReset(props: CropperResetProps): React.ReactElement {
  return useCropperAction({
    props,
    reason: REASONS.resetPress,
    onAction: (actions) => actions.reset(),
    label: "Reset",
  });
}
