"use client";
import * as React from "react";
import { DirectionProvider } from "@logic-ui/react/direction-provider";
import { Lightbox } from "@logic-ui/react/lightbox";
import { Toolbar } from "@logic-ui/react/toolbar";
import { getThumbnailSrc, photos, type Photo } from "./_photos";
import { ChevronIcon, CloseIcon } from "./_viewer";
import { classes } from "./_classes";

/**
 * In a right-to-left layout the next photo is on the left: swipe right to go forward, and
 * ← shows the next photo. The viewer reads the direction from CSS. It is portaled to the end
 * of `<body>`, so set `dir` on `Lightbox.Popup` itself.
 */
export default function ExampleLightboxRtl() {
  return (
    <DirectionProvider direction="rtl">
      <Lightbox.Root items={photos}>
        <div dir="rtl" className={classes.row}>
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
          <Lightbox.Popup dir="rtl" className={classes.popup}>
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
            <div className={`${classes.bottom} ${classes.control}`}>
              <Toolbar.Root className={classes.toolbar}>
                <Lightbox.Previous
                  render={<Toolbar.Button />}
                  className={classes.toolbarButton}
                >
                  <ChevronIcon direction="right" />
                </Lightbox.Previous>
                <Lightbox.Counter className={classes.value} />
                <Lightbox.Next
                  render={<Toolbar.Button />}
                  className={classes.toolbarButton}
                >
                  <ChevronIcon direction="left" />
                </Lightbox.Next>
              </Toolbar.Root>
            </div>
          </Lightbox.Popup>
        </Lightbox.Portal>
      </Lightbox.Root>
    </DirectionProvider>
  );
}
