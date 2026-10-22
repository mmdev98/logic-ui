"use client";

import { mergeProps } from "@base-ui/react/merge-props";
import { useRender } from "@base-ui/react/use-render";
import { ownerWindow } from "@base-ui/utils/owner";
import { useIsoLayoutEffect } from "@base-ui/utils/useIsoLayoutEffect";
import { useMergedRefs } from "@base-ui/utils/useMergedRefs";
import * as React from "react";
import { CROPPER_STATE_ATTRIBUTES } from "../cropper-state-attributes";
import type { CropperRootStatus } from "../root/cropper-root";
import {
  useCropperRootContext,
  useCropperRootStateContext,
} from "../root/cropper-root-context";
import type { CropperSize } from "../types";
import { getCropperPreviewStyle } from "../utils/cropper-image-style";

export type CropperPreviewState = {
  /** Where the image is: `data-loading`, `data-loaded` or `data-error`. */
  status: CropperRootStatus;
  /** Whether a change animates. */
  transitioning: boolean;
};

export type CropperPreviewProps = useRender.ComponentProps<
  "div",
  CropperPreviewState
>;

/**
 * Shows the cropped part of the image, live, scaled to fit the element.
 * Give it the crop's ratio with `aspect-(--cropper-aspect-ratio)`; with
 * another ratio, the crop is centered and the image shows around it.
 * Renders a `<div>` element with an `<img>` inside.
 */
export function CropperPreview(props: CropperPreviewProps): React.ReactElement {
  const { render, ref, ...elementProps } = props;
  const { image, crossOrigin, status } = useCropperRootContext();
  const { state: cropperState, transitioning } = useCropperRootStateContext();
  const elementRef = React.useRef<HTMLDivElement | null>(null);
  const mergedRef = useMergedRefs(ref, elementRef);
  const [size, setSize] = React.useState<CropperSize | null>(null);

  useIsoLayoutEffect(() => {
    const element = elementRef.current;
    if (!element) return undefined;
    const measure = () => {
      const { clientWidth: width, clientHeight: height } = element;
      setSize((previous) =>
        previous?.width === width && previous.height === height
          ? previous
          : { width, height },
      );
    };
    measure();
    const win = ownerWindow(element);
    if (typeof win.ResizeObserver === "undefined") {
      win.addEventListener("resize", measure);
      return () => win.removeEventListener("resize", measure);
    }
    const observer = new win.ResizeObserver(measure);
    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  const imageStyle =
    image && size ? getCropperPreviewStyle(image, cropperState, size) : null;

  const state: CropperPreviewState = React.useMemo(
    () => ({ status, transitioning }),
    [status, transitioning],
  );

  return useRender({
    defaultTagName: "div",
    render,
    ref: mergedRef,
    state,
    stateAttributesMapping: CROPPER_STATE_ATTRIBUTES,
    props: mergeProps<"div">(
      {
        children:
          image && imageStyle ? (
            <img
              src={image.src}
              alt=""
              crossOrigin={crossOrigin}
              draggable={false}
              style={{ ...imageStyle, pointerEvents: "none" }}
            />
          ) : null,
        // The image is placed against it, and clipped by it.
        style: { position: "relative", overflow: "hidden" },
      },
      elementProps,
    ),
  });
}
