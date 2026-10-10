"use client";
import * as React from "react";
import { Avatar } from "@logic-ui/react/avatar";
import { Lightbox } from "@logic-ui/react/lightbox";
import { getThumbnailSrc, photos, type Photo } from "./_photos";
import { CloseIcon, DemoTriggers } from "./_viewer";
import { classes } from "./_classes";

/** Tailwind classes of this demo. */
const local = {
  // Leaves room for the strip below the image.
  Viewport:
    "absolute inset-x-0 top-0 bottom-0 cursor-zoom-in gap-x-4 in-data-zoomed:cursor-grab data-dragging:cursor-grabbing",
  Item: "px-4 pt-14 pb-24 md:px-24 md:pt-16",
  // `px-[50%]` lets the first and last thumbnails reach the centre too.
  Strip: `absolute inset-x-0 bottom-0 flex h-24 cursor-grab items-center gap-2.5 overflow-x-auto px-[50%] pb-[env(safe-area-inset-bottom)] data-dragging:cursor-grabbing ${classes.hideScrollbar} ${classes.fadeX}`,
  // Square tiles; the active one grows a little and gets a ring.
  Thumbnail:
    "aspect-square size-14 flex-none cursor-[inherit] overflow-hidden rounded-lg border-none bg-white/10 p-0 opacity-75 outline-offset-2 transition-[scale,opacity] duration-300 ease-[cubic-bezier(0.32,0.72,0,1)] hover:opacity-90 data-active:scale-110 data-active:opacity-100 data-active:outline-2 data-active:outline-white focus-visible:outline-2 focus-visible:outline-white motion-reduce:transition-none",
  Avatar: "flex size-full items-center justify-center",
  AvatarImage: "size-full object-cover",
  AvatarFallback: "size-full animate-pulse bg-white/15",
};

export default function ExampleLightboxThumbnailList() {
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
          {/* ← → show the previous and next photo; drag or scroll the strip to browse. */}
          <Lightbox.ThumbnailList
            className={`${local.Strip} ${classes.control}`}
          >
            {(photo: Photo) => (
              <Lightbox.Thumbnail
                aria-label={photo.alt}
                className={local.Thumbnail}
              >
                {/* Avatar shows the fallback while the thumbnail loads, or if it fails. */}
                <Avatar.Root className={local.Avatar}>
                  <Avatar.Image
                    src={getThumbnailSrc(photo)}
                    alt=""
                    className={local.AvatarImage}
                  />
                  <Avatar.Fallback className={local.AvatarFallback} />
                </Avatar.Root>
              </Lightbox.Thumbnail>
            )}
          </Lightbox.ThumbnailList>
        </Lightbox.Popup>
      </Lightbox.Portal>
    </Lightbox.Root>
  );
}
