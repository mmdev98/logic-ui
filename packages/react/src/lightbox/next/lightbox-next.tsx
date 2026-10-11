"use client";

import * as React from "react";
import { useLightboxRootContext } from "../root/lightbox-root-context";

import { createLightboxChangeEventDetails } from "../utils/lightbox-event-details";
import {
  type LightboxActionProps,
  type LightboxActionState,
  useLightboxAction,
} from "../use-lightbox-action";

export type LightboxNextProps = LightboxActionProps;

export type LightboxNextState = LightboxActionState;

/**
 * Shows the next item. Disabled on the last one.
 * Renders a `<button>` element.
 */
export function LightboxNext(props: LightboxNextProps): React.ReactElement {
  const { hasNext, goToNext } = useLightboxRootContext();
  return useLightboxAction({
    props,
    disabled: !hasNext,
    onAction: (event) =>
      goToNext(
        createLightboxChangeEventDetails(
          "next-press",
          event.nativeEvent,
          event.currentTarget,
        ),
      ),
    label: "Next image",
    shortcut: "ArrowRight",
  });
}
