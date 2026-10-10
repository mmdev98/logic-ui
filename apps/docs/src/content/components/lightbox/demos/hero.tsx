"use client";
import * as React from "react";
import { Lightbox } from "@logic-ui/react/lightbox";
import { Toolbar } from "@logic-ui/react/toolbar";
import { getThumbnailSrc, photos, type Photo } from "./_photos";
import { ChevronIcon, CloseIcon } from "./_viewer";
import { classes } from "./_classes";

const items = photos.slice(0, 5);

export default function ExampleLightbox() {
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
          <div className={`${classes.bottom} ${classes.control}`}>
            <Lightbox.Description className={classes.caption}>
              {(photo: Photo) => photo.caption}
            </Lightbox.Description>
            <Toolbar.Root className={classes.toolbar}>
              <Lightbox.Previous
                render={<Toolbar.Button />}
                className={classes.toolbarButton}
              >
                <ChevronIcon direction="left" />
              </Lightbox.Previous>
              <Lightbox.Counter className={classes.value} />
              <Lightbox.Next
                render={<Toolbar.Button />}
                className={classes.toolbarButton}
              >
                <ChevronIcon direction="right" />
              </Lightbox.Next>
              <Toolbar.Separator className={classes.separator} />
              <Lightbox.ZoomOut
                render={<Toolbar.Button />}
                className={classes.toolbarButton}
              >
                −
              </Lightbox.ZoomOut>
              <Lightbox.ZoomValue className={classes.value} />
              <Lightbox.ZoomIn
                render={<Toolbar.Button />}
                className={classes.toolbarButton}
              >
                +
              </Lightbox.ZoomIn>
            </Toolbar.Root>
          </div>
        </Lightbox.Popup>
      </Lightbox.Portal>
    </Lightbox.Root>
  );
}
