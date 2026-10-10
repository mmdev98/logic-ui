"use client";
import * as React from "react";
import { Lightbox } from "@logic-ui/react/lightbox";
import { useMediaQuery } from "@logic-ui/react/unstable-use-media-query";
import { getThumbnailSrc, photos, type Photo } from "./_photos";
import { CloseIcon, DemoTriggers } from "./_viewer";
import { classes } from "./_classes";

/** Tailwind classes of this demo. */
const local = {
  // Room for the strip: below the image on phones, beside it from medium screens up.
  Viewport:
    "absolute inset-x-0 top-0 bottom-24 cursor-zoom-in gap-x-4 in-data-zoomed:cursor-grab data-dragging:cursor-grabbing md:bottom-0 md:left-28",
  Item: "px-4 pt-14 pb-4 md:px-16 md:py-14",
  Strip:
    "absolute flex gap-1.5 overflow-auto data-[orientation=horizontal]:inset-x-0 data-[orientation=horizontal]:bottom-0 data-[orientation=horizontal]:h-24 data-[orientation=horizontal]:px-[calc(50%-2rem)] data-[orientation=horizontal]:pt-4 data-[orientation=horizontal]:pb-[calc(1rem+env(safe-area-inset-bottom))] data-[orientation=vertical]:inset-y-0 data-[orientation=vertical]:left-0 data-[orientation=vertical]:w-28 data-[orientation=vertical]:flex-col data-[orientation=vertical]:items-center data-[orientation=vertical]:py-[calc(50vh-2.5rem)]",
  Thumbnail:
    "size-16 flex-none cursor-pointer overflow-hidden rounded-md border-2 border-transparent bg-white/10 p-0 opacity-50 transition-opacity duration-150 hover:opacity-100 data-active:border-white data-active:opacity-100 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white md:size-20",
  Image: "size-full object-cover",
  // Fades the edges that hide thumbnails, along the current orientation.
  Fade: "data-[orientation=horizontal]:data-overflow-start:mask-l-from-85% data-[orientation=horizontal]:data-overflow-end:mask-r-from-85% data-[orientation=vertical]:data-overflow-start:mask-t-from-85% data-[orientation=vertical]:data-overflow-end:mask-b-from-85%",
};

export default function ExampleLightboxThumbnailListResponsive() {
  // The orientation sets the arrow keys, so it follows the layout.
  const wide = useMediaQuery("(min-width: 48rem)", {});
  const orientation = wide ? "vertical" : "horizontal";

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
          {/* Styled through `data-orientation`, so one class list fits both layouts. */}
          <Lightbox.ThumbnailList
            orientation={orientation}
            className={`${local.Strip} ${local.Fade} ${classes.hideScrollbar} ${classes.control}`}
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
