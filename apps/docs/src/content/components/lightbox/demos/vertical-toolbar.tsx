"use client";
import * as React from "react";
import { Lightbox } from "@logic-ui/react/lightbox";
import { Toolbar } from "@logic-ui/react/toolbar";
import { getThumbnailSrc, photos, type Photo } from "./_photos";
import { CloseIcon } from "./_viewer";
import { classes } from "./_classes";

/** Tailwind classes of this demo. */
const local = {
  Vertical:
    "absolute top-1/2 right-[calc(0.75rem+env(safe-area-inset-right))] -translate-y-1/2 flex-col",
  Separator: "my-1 h-px w-4 bg-white/20",
  ZoomValue: "py-1 text-center text-xs text-neutral-400 tabular-nums",
};

export default function ExampleLightboxVerticalToolbar() {
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
          {/* ↑ ↓ move between the actions of a vertical toolbar. */}
          <Toolbar.Root
            orientation="vertical"
            className={`${classes.toolbar} ${local.Vertical} ${classes.control}`}
          >
            <Lightbox.ZoomIn
              render={<Toolbar.Button />}
              className={classes.toolbarButton}
            >
              +
            </Lightbox.ZoomIn>
            {/* Short enough for a narrow toolbar: 1.0x, 2.5x. */}
            <Lightbox.ZoomValue className={local.ZoomValue}>
              {(state) => `${state.scale.toFixed(1)}x`}
            </Lightbox.ZoomValue>
            <Lightbox.ZoomOut
              render={<Toolbar.Button />}
              className={classes.toolbarButton}
            >
              −
            </Lightbox.ZoomOut>
            <Toolbar.Separator className={local.Separator} />
            <Lightbox.ZoomReset
              render={<Toolbar.Button />}
              className={classes.toolbarButton}
            >
              ↺
            </Lightbox.ZoomReset>
          </Toolbar.Root>
        </Lightbox.Popup>
      </Lightbox.Portal>
    </Lightbox.Root>
  );
}
