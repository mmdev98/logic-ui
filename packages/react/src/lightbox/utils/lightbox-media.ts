import { type LightboxMediaSize } from "../types";
import type { LightboxMediaStatus } from "../media/lightbox-media";

/** Tags `Lightbox.Media` fits, measures and listens to. */
const MEDIA_TAGS = new Set(["IMG", "VIDEO", "IFRAME"]);

/**
 * The element `Lightbox.Media` shows: its first direct child that is an
 * `<img>`, a `<video>` or an `<iframe>`, or the `<img>` of a direct
 * `<picture>`. Other children (a spinner, an error message) are ignored.
 */
export function findLightboxMediaElement(box: Element): HTMLElement | null {
  for (const child of Array.from(box.children)) {
    if (MEDIA_TAGS.has(child.tagName)) return child as HTMLElement;
    if (child.tagName === "PICTURE") {
      const image = child.querySelector(":scope > img");
      if (image) return image as HTMLElement;
    }
  }
  return null;
}

/**
 * Makes a media element fill its `Lightbox.Media` box, and keeps the
 * browser from dragging an image away (the gestures handle drags). Returns
 * the function that restores the element.
 */
export function fillLightboxMediaBox(element: HTMLElement): () => void {
  const { style } = element;
  const previous = {
    display: style.display,
    width: style.width,
    height: style.height,
    objectFit: style.objectFit,
  };
  style.display = "block";
  style.width = "100%";
  style.height = "100%";
  style.objectFit = "contain";
  const isImage = element.tagName === "IMG";
  const draggable = element.getAttribute("draggable");
  if (isImage) element.setAttribute("draggable", "false");
  return () => {
    Object.assign(style, previous);
    style.transform = "";
    if (!isImage) return;
    if (draggable === null) element.removeAttribute("draggable");
    else element.setAttribute("draggable", draggable);
  };
}

/** Whether the media can zoom: only images do. */
export function isLightboxMediaZoomable(element: HTMLElement | null): boolean {
  return element?.tagName === "IMG";
}

/** Whether the media plays and can be paused: a video. */
export function isLightboxMediaPlayable(element: HTMLElement | null): boolean {
  return element?.tagName === "VIDEO";
}

/** Natural size of an image or a video, or `null` until it is known. */
export function getLightboxMediaNaturalSize(
  element: HTMLElement,
): LightboxMediaSize | null {
  const media = element as Partial<HTMLImageElement & HTMLVideoElement>;
  const width = media.naturalWidth || media.videoWidth;
  const height = media.naturalHeight || media.videoHeight;
  return width && height ? { width, height } : null;
}

/**
 * Loading state of a media element as it is now, before any event: an image
 * from the cache is already loaded, a video may have data already. An
 * iframe is loading until its `load` event. No media element counts as loaded.
 */
export function getLightboxMediaStatus(
  element: HTMLElement | null,
): LightboxMediaStatus {
  if (!element) return "loaded";
  if (element.tagName === "IMG") {
    const image = element as HTMLImageElement;
    return image.complete && image.naturalWidth > 0 ? "loaded" : "loading";
  }
  if (element.tagName === "VIDEO") {
    const video = element as HTMLVideoElement;
    if (video.error) return "error";
    // `HAVE_CURRENT_DATA`: the first frame can be shown.
    return video.readyState >= 2 ? "loaded" : "loading";
  }
  return "loading";
}
