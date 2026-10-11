"use client";

import { Dialog, type DialogBackdropProps } from "@base-ui/react/dialog";
import { useMergedRefs } from "@base-ui/utils/useMergedRefs";
import * as React from "react";
import { useLightboxRootContext } from "../root/lightbox-root-context";

export type LightboxBackdropProps = DialogBackdropProps;

/**
 * Covers the page behind the viewer. While the image is pulled to dismiss, it
 * gets `--lightbox-dismiss-progress` (0 to 1), to fade it out:
 * `opacity: calc(1 - var(--lightbox-dismiss-progress, 0))`. While the image
 * flies back, it has `data-ending-style` like any Base UI popup. It has
 * `data-swiping` during a drag: turn its transition off then, or the fade
 * lags behind the finger.
 * Renders a `<div>` element.
 */
export function LightboxBackdrop(
  props: LightboxBackdropProps,
): React.ReactElement {
  const { ref, ...elementProps } = props;

  const { phase, preparing, setBackdropElement } = useLightboxRootContext();
  const mergedRef = useMergedRefs(ref, setBackdropElement);

  return (
    <Dialog.Backdrop
      ref={mergedRef}
      // Held at its starting style while the media loads, so it fades in with
      // the open flight, not before.
      data-starting-style={preparing ? "" : undefined}
      // The dialog stays open while the image flies back; fade out meanwhile.
      data-ending-style={phase === "closing" ? "" : undefined}
      {...elementProps}
    />
  );
}
