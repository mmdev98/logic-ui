"use client";
import * as React from "react";
import { Lightbox } from "@logic-ui/react/lightbox";
import { getThumbnailSrc, photos, type Photo } from "./_photos";
import { CloseIcon, DemoTriggers } from "./_viewer";
import { classes } from "./_classes";

/** Tailwind classes of this demo. */
const local = {
  // Leaves room for the strip on the left.
  Viewport:
    "absolute inset-y-0 right-0 left-24 cursor-zoom-in gap-x-4 in-data-zoomed:cursor-grab data-dragging:cursor-grabbing",
  Item: "px-4 py-14 md:px-16",
  Strip:
    "absolute inset-y-0 left-0 flex w-24 flex-col items-center gap-2 overflow-y-auto border-r border-white/10 bg-black/40 px-4 py-[calc(1rem+env(safe-area-inset-top))]",
  Thumbnail:
    "aspect-square w-full flex-none cursor-pointer overflow-hidden rounded-md border-2 border-transparent bg-white/10 p-0 opacity-75 transition-opacity duration-150 hover:opacity-100 data-active:border-white data-active:opacity-100 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white",
  Image: "size-full object-cover",
};

export default function ExampleLightboxThumbnailListSide() {
  return (
    <Lightbox.Root items={photos}>
      <DemoTriggers items={photos.slice(0, 4)} />
      <Lightbox.Portal>
        <Lightbox.Backdrop className={classes.backdrop} />
        <Lightbox.Popup className={classes.popup}>
          <Lightbox.Title className="sr-only">Photos</Lightbox.Title>
          <Lightbox.Viewport className={local.Viewport}>
            {(photo: Photo) => (
              <Lightbox.Slide className={local.Item}>
                <Lightbox.Media width={photo.width} height={photo.height}>
                  <img src={photo.src} alt={photo.alt} />
                </Lightbox.Media>
              </Lightbox.Slide>
            )}
          </Lightbox.Viewport>
          <Lightbox.Close className={`${classes.close} ${classes.control}`}>
            <CloseIcon />
          </Lightbox.Close>
          {/* ↑ ↓ move between the thumbnails of a vertical strip. */}
          <Lightbox.ThumbnailList
            orientation="vertical"
            className={`${local.Strip} ${classes.hideScrollbar} ${classes.fadeY} ${classes.control}`}
          >
            {(photo: Photo) => (
              <Lightbox.Thumbnail
                aria-label={photo.alt}
                className={local.Thumbnail}
              >
                <img
                  src={getThumbnailSrc(photo)}
                  alt=""
                  className={local.Image}
                />
              </Lightbox.Thumbnail>
            )}
          </Lightbox.ThumbnailList>
        </Lightbox.Popup>
      </Lightbox.Portal>
    </Lightbox.Root>
  );
}
