"use client";
import * as React from "react";
import { Lightbox } from "@logic-ui/react/lightbox";
import { photos, type Photo } from "./_photos";
import { CloseIcon, DemoTriggers } from "./_viewer";
import { classes } from "./_classes";

/** Tailwind classes of this demo. */
const local = {
  Dots: "absolute left-1/2 p-2 -translate-x-1/2 rounded-full bg-black/50 bottom-[calc(1.25rem+env(safe-area-inset-bottom))] flex justify-center gap-2",
  // The button is larger than the dot, so it stays easy to tap.
  Dot: "group flex cursor-pointer items-center justify-center rounded-full border-none bg-transparent p-0 focus-visible:outline-2 focus-visible:outline-white",
  Mark: "size-2 rounded-full bg-white/40 transition-[width,background-color] duration-200 group-hover:bg-white/70 group-data-active:w-5 group-data-active:bg-white",
};

const items = photos.slice(0, 6);

export default function ExampleLightboxThumbnailListDots() {
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
          {/* Thumbnails don't need an image: here each one is a dot. */}
          <Lightbox.ThumbnailList
            className={`${local.Dots} ${classes.control}`}
          >
            {() => (
              <Lightbox.Thumbnail className={local.Dot}>
                <span className={local.Mark} />
              </Lightbox.Thumbnail>
            )}
          </Lightbox.ThumbnailList>
        </Lightbox.Popup>
      </Lightbox.Portal>
    </Lightbox.Root>
  );
}
