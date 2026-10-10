"use client";
import * as React from "react";
import { Lightbox } from "@logic-ui/react/lightbox";
import { photos, type Photo } from "./_photos";
import { CloseIcon, DemoTriggers } from "./_viewer";
import { classes } from "./_classes";

/** Tailwind classes of this demo. */
const local = {
  // Positioned, so the indicator's CSS variables are measured from it.
  Bar: "absolute bottom-[calc(1.25rem+env(safe-area-inset-bottom))] left-1/2 -translate-x-1/2 rounded-full bg-black/50 p-1.5",
  Dots: "flex gap-1",
  // The button is larger than the dot, so it stays easy to tap.
  Dot: "flex size-6 cursor-pointer items-center justify-center rounded-full border-none bg-transparent p-0 focus-visible:outline-2 focus-visible:outline-white",
  Mark: "size-2 rounded-full bg-white/50",
  // One ring that glides from dot to dot.
  Indicator:
    "pointer-events-none absolute top-(--active-thumbnail-top) left-(--active-thumbnail-left) h-(--active-thumbnail-height) w-(--active-thumbnail-width) rounded-full border-2 border-white transition-[left,top] duration-300 ease-[cubic-bezier(0.32,0.72,0,1)] motion-reduce:transition-none",
};

const items = photos.slice(0, 6);

export default function ExampleLightboxThumbnailsIndicator() {
  return (
    <Lightbox.Root items={items}>
      <DemoTriggers items={items.slice(0, 4)} />
      <Lightbox.Portal>
        <Lightbox.Backdrop className={classes.backdrop} />
        <Lightbox.Popup className={classes.popup}>
          <Lightbox.Title className="sr-only">Photos</Lightbox.Title>
          <Lightbox.Viewport className={classes.viewport}>
            {(photo: Photo) => (
              <Lightbox.Slide className={classes.item}>
                <Lightbox.Media width={photo.width} height={photo.height}>
                  <img src={photo.src} alt={photo.alt} />
                </Lightbox.Media>
              </Lightbox.Slide>
            )}
          </Lightbox.Viewport>
          <Lightbox.Close className={`${classes.close} ${classes.control}`}>
            <CloseIcon />
          </Lightbox.Close>
          <div className={`${local.Bar} ${classes.control}`}>
            <Lightbox.ThumbnailList className={local.Dots}>
              {(photo: Photo) => (
                <Lightbox.Thumbnail
                  aria-label={photo.alt}
                  className={local.Dot}
                >
                  <span className={local.Mark} />
                </Lightbox.Thumbnail>
              )}
            </Lightbox.ThumbnailList>
            <Lightbox.ThumbnailIndicator className={local.Indicator} />
          </div>
        </Lightbox.Popup>
      </Lightbox.Portal>
    </Lightbox.Root>
  );
}
