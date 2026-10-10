"use client";
import * as React from "react";
import { Lightbox } from "@logic-ui/react/lightbox";
import { getThumbnailSrc, photos, type Photo } from "./_photos";
import { CloseIcon } from "./_viewer";
import { classes } from "./_classes";

/** Tailwind classes of this demo. */
const local = {
  Panel:
    "absolute inset-x-0 bottom-0 flex items-end gap-4 bg-linear-to-t from-black/75 to-transparent px-6 pt-12 pb-[calc(1.25rem+env(safe-area-inset-bottom))]",
  Position: "text-[0.8125rem] text-neutral-400 tabular-nums",
  Description: "m-0 flex flex-col gap-0.5 text-sm [&_span]:text-neutral-300",
};

export default function ExampleLightboxCaptions() {
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
          {/* A function child builds the caption from the item shown. */}
          <div className={`${local.Panel} ${classes.control}`}>
            <Lightbox.Counter className={local.Position} />
            <Lightbox.Description className={local.Description}>
              {(photo: Photo) => (
                <React.Fragment>
                  <strong>{photo.caption ?? "Untitled"}</strong>
                  <span>{photo.alt}</span>
                </React.Fragment>
              )}
            </Lightbox.Description>
          </div>
        </Lightbox.Popup>
      </Lightbox.Portal>
    </Lightbox.Root>
  );
}
