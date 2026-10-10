"use client";
import * as React from "react";
import { Lightbox } from "@logic-ui/react/lightbox";
import { getThumbnailSrc, photos, type Photo } from "./_photos";
import { CloseIcon } from "./_viewer";
import { classes } from "./_classes";

/** Tailwind classes of this demo. */
const local = {
  Backdrop:
    "fixed inset-0 bg-[rgb(10_10_20/calc(0.85*(1_-_var(--lightbox-dismiss-progress,0))))] backdrop-blur-[calc(16px*(1_-_var(--lightbox-dismiss-progress,0)))] transition-[background-color,backdrop-filter] duration-300 data-dragging:transition-none data-starting-style:bg-transparent data-starting-style:backdrop-blur-none data-ending-style:bg-transparent data-ending-style:backdrop-blur-none",
  SlideUp:
    "-translate-y-[calc(4rem*var(--lightbox-dismiss-progress,0))] transition-[translate,opacity] duration-200 in-data-dragging:transition-none in-data-ending-style:opacity-0 in-data-starting-style:opacity-0",
  SlideDown:
    "translate-y-[calc(4rem*var(--lightbox-dismiss-progress,0))] transition-[translate,opacity] duration-200 in-data-dragging:transition-none in-data-ending-style:opacity-0 in-data-starting-style:opacity-0",
};

/**
 * Drag the image down or up to close. `--lightbox-dismiss-progress` goes from 0 to 1 on the
 * backdrop and the popup: here it fades and un-blurs the page, and slides the controls away.
 */
export default function ExampleLightboxDismissEffects() {
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
        <Lightbox.Backdrop className={local.Backdrop} />
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
          <Lightbox.Close className={`${classes.close} ${local.SlideUp}`}>
            <CloseIcon />
          </Lightbox.Close>
          <div className={`${classes.bottom} ${local.SlideDown}`}>
            <Lightbox.Counter className={classes.caption} />
          </div>
        </Lightbox.Popup>
      </Lightbox.Portal>
    </Lightbox.Root>
  );
}
