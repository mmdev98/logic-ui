"use client";
import * as React from "react";
import { Lightbox } from "@logic-ui/react/lightbox";
import { getThumbnailSrc, photos, type Photo } from "./_photos";
import { CloseIcon } from "./_viewer";
import { classes } from "./_classes";

/** Tailwind classes of this demo. */
const local = {
  Viewport:
    "absolute inset-0 cursor-zoom-in gap-x-2 in-data-zoomed:cursor-grab data-dragging:cursor-grabbing",
  Item: "p-0",
  TopBar:
    "absolute inset-x-0 top-0 flex items-center justify-between bg-black/55 px-2 pb-2 pt-[calc(0.5rem+env(safe-area-inset-top))] backdrop-blur-md",
  BottomBar:
    "absolute inset-x-0 bottom-0 flex min-h-12 items-center justify-center bg-black/55 px-4 pt-2 pb-[calc(0.5rem+env(safe-area-inset-bottom))] backdrop-blur-md",
  Title: "text-[0.9375rem] font-semibold tabular-nums",
  Caption: "m-0 text-sm",
  BarButton:
    "flex size-10 cursor-pointer items-center justify-center rounded-full border-none bg-transparent text-lg text-inherit",
};

/**
 * Like a phone's photo app: the image fills the screen width, and a tap hides the bars.
 * Try it on a phone, or with the browser's device toolbar.
 */
export default function ExampleLightboxEdgeToEdge() {
  return (
    <Lightbox.Root items={photos}>
      <div className={classes.row}>
        {photos.slice(0, 4).map((photo) => (
          <Lightbox.Trigger
            key={photo.id}
            value={photo.id}
            className={classes.thumbnail}
          >
            <img
              src={getThumbnailSrc(photo)}
              alt=""
              className={classes.thumbnailImage}
            />
          </Lightbox.Trigger>
        ))}
      </div>
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
          <header className={`${local.TopBar} ${classes.control}`}>
            <Lightbox.Close className={local.BarButton}>
              <CloseIcon />
            </Lightbox.Close>
            <Lightbox.Counter className={local.Title} />
            {/* Balances the close button so the counter stays centred. */}
            <span aria-hidden className="size-10" />
          </header>
          <footer className={`${local.BottomBar} ${classes.control}`}>
            <Lightbox.Description className={local.Caption}>
              {(photo: Photo) => photo.caption}
            </Lightbox.Description>
          </footer>
        </Lightbox.Popup>
      </Lightbox.Portal>
    </Lightbox.Root>
  );
}
