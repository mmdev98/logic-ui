"use client";

import { ownerDocument } from "@base-ui/utils/owner";
import { useIsoLayoutEffect } from "@base-ui/utils/useIsoLayoutEffect";
import * as React from "react";
import type { CropperLoadedImage } from "./cropper-root-context";

export type CropperImageStatus = "idle" | "loading" | "loaded" | "error";

export interface UseCropperImageResult {
  status: CropperImageStatus;
  image: CropperLoadedImage | null;
}

/**
 * Loads `src` in an image element of its own, for its natural size and for
 * `getCanvas()`. Browsers apply the EXIF orientation themselves.
 */
export function useCropperImage(
  src: string | null | undefined,
  crossOrigin: "anonymous" | "use-credentials" | undefined,
  getDocumentElement: () => Element | null,
): UseCropperImageResult {
  const [result, setResult] = React.useState<UseCropperImageResult>({
    status: src ? "loading" : "idle",
    image: null,
  });

  useIsoLayoutEffect(() => {
    if (!src) {
      setResult({ status: "idle", image: null });
      return undefined;
    }
    let cancelled = false;
    setResult((previous) =>
      previous.image?.src === src
        ? previous
        : { status: "loading", image: null },
    );

    const element = ownerDocument(getDocumentElement()).createElement("img");
    if (crossOrigin) element.crossOrigin = crossOrigin;
    const onLoad = () => {
      if (cancelled) return;
      setResult({
        status: "loaded",
        image: {
          src,
          width: element.naturalWidth,
          height: element.naturalHeight,
          element,
        },
      });
    };
    const onError = () => {
      if (!cancelled) setResult({ status: "error", image: null });
    };
    element.addEventListener("load", onLoad);
    element.addEventListener("error", onError);
    element.src = src;

    return () => {
      cancelled = true;
      element.removeEventListener("load", onLoad);
      element.removeEventListener("error", onError);
    };
  }, [src, crossOrigin, getDocumentElement]);

  return result;
}
