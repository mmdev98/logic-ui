"use client";

import * as React from "react";
import { useLightboxRootContext } from "../root/lightbox-root-context";

import { createLightboxChangeEventDetails } from "../utils/lightbox-event-details";
import * as REASONS from "../lightbox-reasons";
import {
  type LightboxActionProps,
  type LightboxActionState,
  useLightboxAction,
} from "../use-lightbox-action";

export type LightboxPreviousProps = LightboxActionProps;

export type LightboxPreviousState = LightboxActionState;

/**
 * Shows the previous item. Disabled on the first one.
 * Renders a `<button>` element.
 */
export function LightboxPrevious(
  props: LightboxPreviousProps,
): React.ReactElement {
  const { hasPrevious, goToPrevious } = useLightboxRootContext();
  return useLightboxAction({
    props,
    disabled: !hasPrevious,
    onAction: (event) =>
      goToPrevious(
        createLightboxChangeEventDetails(
          REASONS.previousPress,
          event.nativeEvent,
          event.currentTarget,
        ),
      ),
    label: "Previous image",
    shortcut: "ArrowLeft",
  });
}
