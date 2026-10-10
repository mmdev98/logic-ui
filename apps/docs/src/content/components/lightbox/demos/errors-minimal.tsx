"use client";
import * as React from "react";
import { Lightbox } from "@logic-ui/react/lightbox";
import { BROKEN_SRC, getThumbnailSrc, photos, type Photo } from "./_photos";
import { CloseIcon } from "./_viewer";
import { classes } from "./_classes";

/** Tailwind classes of this demo. */
const local = {
  Media: "group",
  // The failed image keeps its space but isn't drawn.
  Image: "group-data-error:invisible",
  Fallback:
    "absolute inset-0 hidden items-center justify-center text-sm text-neutral-400 group-data-error:flex",
};

/** The second photo fails to load in the viewer; its thumbnail still works. */
const items = photos.slice(0, 3).map((photo, index) => ({
  ...photo,
  thumbnail: getThumbnailSrc(photo),
  src: index === 1 ? BROKEN_SRC : photo.src,
}));

export default function ExampleLightboxErrorsMinimal() {
  return (
    <Lightbox.Root items={items}>
      <div className={classes.row}>
        {items.map((photo) => (
          <Lightbox.Trigger
            key={photo.id}
            value={photo.id}
            className={classes.thumbnail}
          >
            <img
              src={photo.thumbnail}
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
          <Lightbox.Viewport className={classes.viewport}>
            {(photo: Photo) => (
              <Lightbox.Slide className={classes.item}>
                <Lightbox.Media
                  width={photo.width}
                  height={photo.height}
                  className={local.Media}
                >
                  <img
                    src={photo.src}
                    alt={photo.alt}
                    className={local.Image}
                  />
                  {/* Shown only when the image fails, with `data-error`. */}
                  <p className={local.Fallback}>
                    This image couldn’t be loaded.
                  </p>
                </Lightbox.Media>
              </Lightbox.Slide>
            )}
          </Lightbox.Viewport>
          <Lightbox.Close className={`${classes.close} ${classes.control}`}>
            <CloseIcon />
          </Lightbox.Close>
        </Lightbox.Popup>
      </Lightbox.Portal>
    </Lightbox.Root>
  );
}
