"use client";
import * as React from "react";
import { Lightbox } from "@logic-ui/react/lightbox";
import { getThumbnailSrc, photos, type Photo } from "./_photos";
import { CloseIcon } from "./_icons";
import { classes } from "./_classes";

const items = photos.slice(0, 4);

/** Only the parts a viewer needs: swipe, zoom, pull to dismiss and Esc still work. */
export default function ExampleLightboxMinimal() {
  return (
    <Lightbox.Root items={items}>
      {/* Three columns across a phone, a row of squares on larger screens. */}
      <div className="grid w-full grid-cols-3 gap-2 select-none sm:flex sm:w-auto sm:flex-wrap sm:items-center">
        {items.map((photo) => (
          <Lightbox.Trigger
            key={photo.id}
            value={photo.id}
            className={`${classes.trigger} aspect-square w-full rounded-xl sm:size-24`}
          >
            <img
              src={getThumbnailSrc(photo)}
              alt=""
              className={classes.triggerImage}
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
              <Lightbox.Slide className={classes.slide}>
                <Lightbox.Media width={photo.width} height={photo.height}>
                  <img src={photo.src} alt={photo.alt} />
                </Lightbox.Media>
              </Lightbox.Slide>
            )}
          </Lightbox.Viewport>
          <div className={`${classes.topBar} ${classes.controlTop}`}>
            <Lightbox.Close className={`${classes.iconButton} ms-auto`}>
              <CloseIcon />
            </Lightbox.Close>
          </div>
        </Lightbox.Popup>
      </Lightbox.Portal>
    </Lightbox.Root>
  );
}
