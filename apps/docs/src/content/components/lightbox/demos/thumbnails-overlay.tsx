"use client";
import * as React from "react";
import { Lightbox } from "@logic-ui/react/lightbox";
import { getThumbnailSrc, photos, type Photo } from "./_photos";
import { CloseIcon, DemoTriggers } from "./_viewer";
import { classes } from "./_classes";

/** Tailwind classes of this demo. */
const local = {
  Bottom:
    "absolute inset-x-0 bottom-0 flex flex-col items-center gap-3 bg-linear-to-t from-black/80 to-transparent px-4 pt-16 pb-[calc(1rem+env(safe-area-inset-bottom))]",
  Caption: "m-0 text-sm",
  // Over the image, centred, and scrolling when the photos don't fit.
  Strip:
    "flex max-w-full gap-2 overflow-x-auto rounded-xl bg-black/50 p-2 backdrop-blur-md",
  Thumbnail:
    "aspect-square size-12 flex-none cursor-pointer overflow-hidden rounded-lg border-none bg-white/10 p-0 outline-offset-1 transition-opacity duration-200 hover:opacity-100 data-active:opacity-100 data-active:outline-2 data-active:outline-white focus-visible:outline-2 focus-visible:outline-white",
  Image: "size-full object-cover",
};

export default function ExampleLightboxThumbnailListOverlay() {
  return (
    <Lightbox.Root items={photos}>
      <DemoTriggers items={photos.slice(0, 4)} />
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
          {/* Floats over the image and hides with the other controls on a tap. */}
          <div className={`${local.Bottom} ${classes.control}`}>
            <Lightbox.Description className={local.Caption}>
              {(photo: Photo) => photo.caption}
            </Lightbox.Description>
            <Lightbox.ThumbnailList
              className={`${local.Strip} ${classes.hideScrollbar} ${classes.fadeX}`}
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
          </div>
        </Lightbox.Popup>
      </Lightbox.Portal>
    </Lightbox.Root>
  );
}
