"use client";
import * as React from "react";
import { Lightbox } from "@logic-ui/react/lightbox";
import { Toolbar } from "@logic-ui/react/toolbar";
import { getThumbnailSrc, photos } from "./_photos";
import { ChevronIcon, DemoViewer } from "./_viewer";
import { classes } from "./_classes";

const zoomFormat = new Intl.NumberFormat(undefined, {
  maximumFractionDigits: 1,
});

export default function ExampleLightboxCustomValues() {
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
      <DemoViewer
        toolbar={
          <Toolbar.Root className={classes.toolbar}>
            <Lightbox.Previous
              render={<Toolbar.Button />}
              className={classes.toolbarButton}
            >
              <ChevronIcon direction="left" />
            </Lightbox.Previous>
            {/* A function child formats the position and the scale. */}
            <Lightbox.Counter className={classes.value}>
              {(state) => `Photo ${state.index + 1} of ${state.count}`}
            </Lightbox.Counter>
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
            <Lightbox.ZoomValue className={classes.value}>
              {(state) => `${zoomFormat.format(state.scale)}×`}
            </Lightbox.ZoomValue>
            <Lightbox.ZoomIn
              render={<Toolbar.Button />}
              className={classes.toolbarButton}
            >
              +
            </Lightbox.ZoomIn>
          </Toolbar.Root>
        }
      />
    </Lightbox.Root>
  );
}
