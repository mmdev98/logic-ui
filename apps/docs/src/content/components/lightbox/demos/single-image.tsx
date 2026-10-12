"use client";
import * as React from "react";
import { Lightbox } from "@logic-ui/react/lightbox";
import { Toolbar } from "@logic-ui/react/toolbar";
import { photos, type Photo } from "./_photos";
import { CloseIcon, ResetIcon, ZoomInIcon, ZoomOutIcon } from "./_icons";
import { classes } from "./_classes";

/** Tailwind classes of this demo. */
const local = {
  Profile: "flex items-center gap-3 select-none",
  // The image grows out of the circle: the flight takes the trigger's radius.
  Avatar: "size-14 rounded-full",
  Name: "m-0 text-sm font-semibold text-white",
  Role: "m-0 text-sm text-neutral-400",
  Heading: "m-0 text-sm font-medium",
};

const portrait = { ...photos[1], caption: "Maya Lindqvist" };
const items = [portrait];

export default function ExampleLightboxSingleImage() {
  return (
    <Lightbox.Root items={items}>
      <div className={local.Profile}>
        <Lightbox.Trigger
          value={portrait.id}
          aria-label="View Maya's photo"
          className={`${classes.trigger} ${local.Avatar}`}
        >
          <img
            loading="lazy"
            src={portrait.src}
            alt=""
            className={classes.triggerImage}
          />
        </Lightbox.Trigger>
        <div>
          <p className={local.Name}>Maya Lindqvist</p>
          <p className={local.Role}>Photographer</p>
        </div>
      </div>

      <Lightbox.Portal>
        <Lightbox.Backdrop className={classes.backdrop} />
        <Lightbox.Popup className={classes.popup}>
          <Lightbox.Viewport className={classes.viewport}>
            {(photo: Photo) => (
              <Lightbox.Slide className={classes.slide}>
                <Lightbox.Media width={photo.width} height={photo.height}>
                  <img src={photo.src} alt={photo.alt} />
                </Lightbox.Media>
              </Lightbox.Slide>
            )}
          </Lightbox.Viewport>
          <header className={`${classes.topBar} ${classes.controlTop}`}>
            <Lightbox.Title className={local.Heading}>
              {(photo: Photo) => photo.caption}
            </Lightbox.Title>
            <Lightbox.Close className={classes.iconButton}>
              <CloseIcon />
            </Lightbox.Close>
          </header>
          {/* One photo: only the zoom. */}
          <footer className={`${classes.bottomBar} ${classes.controlBottom}`}>
            <Toolbar.Root className={classes.toolbar}>
              <Lightbox.ZoomOut
                render={<Toolbar.Button />}
                className={classes.toolbarButton}
              >
                <ZoomOutIcon />
              </Lightbox.ZoomOut>
              <Lightbox.ZoomValue className={classes.toolbarValue} />
              <Lightbox.ZoomIn
                render={<Toolbar.Button />}
                className={classes.toolbarButton}
              >
                <ZoomInIcon />
              </Lightbox.ZoomIn>
              <Toolbar.Separator className={classes.separator} />
              <Lightbox.ZoomReset
                render={<Toolbar.Button />}
                className={classes.toolbarButton}
              >
                <ResetIcon />
              </Lightbox.ZoomReset>
            </Toolbar.Root>
          </footer>
        </Lightbox.Popup>
      </Lightbox.Portal>
    </Lightbox.Root>
  );
}
