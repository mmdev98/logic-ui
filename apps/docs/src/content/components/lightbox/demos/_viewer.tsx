"use client";
import * as React from "react";
import { Lightbox } from "@logic-ui/react/lightbox";
import { Toolbar } from "@logic-ui/react/toolbar";
import { classes } from "./_classes";
import { getThumbnailSrc, type Photo } from "./_photos";

/**
 * The standard viewer of the demos: the images, a close button, the caption and a toolbar.
 * Demos that are about something else render it so they can focus on that.
 */
export function DemoViewer(props: { toolbar?: React.ReactNode }) {
  const { toolbar } = props;

  return (
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
          {toolbar ?? (
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
          )}
        </div>
      </Lightbox.Popup>
    </Lightbox.Portal>
  );
}

export function CloseIcon(props: React.ComponentProps<"svg">) {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 16 16"
      fill="none"
      aria-hidden
      {...props}
    >
      <path
        d="M4 4 12 12M12 4 4 12"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
    </svg>
  );
}

export function ChevronIcon(
  props: React.ComponentProps<"svg"> & { direction: "left" | "right" },
) {
  const { direction, ...svgProps } = props;
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 16 16"
      fill="none"
      aria-hidden
      {...svgProps}
    >
      <path
        d={direction === "left" ? "M10 3 5 8l5 5" : "m6 3 5 5-5 5"}
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

/** A row of triggers, one per photo: the page part of the demos about the viewer. */
export function DemoTriggers(props: { items: Photo[] }) {
  const { items } = props;
  return (
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
  );
}

/** A picture with a crack, for images that failed to load. */
export function BrokenImageIcon(props: React.ComponentProps<"svg">) {
  return (
    <svg
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
      {...props}
    >
      <path d="M21 12V5a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v7" />
      <path d="m3 16 4-4 3 3 3-3" />
      <path d="M3 19v0a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-3l-3-3" />
      <path d="m3 3 18 18" />
    </svg>
  );
}
