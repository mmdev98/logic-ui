"use client";
import * as React from "react";
import { Lightbox } from "@logic-ui/react/lightbox";
import { Toolbar } from "@logic-ui/react/toolbar";
import { getThumbnailSrc, photos } from "./_photos";
import { ChevronIcon, DemoViewer } from "./_viewer";
import { classes } from "./_classes";

export default function ExampleLightboxToolbar() {
  return (
    <Lightbox.Root items={photos}>
      <div className={classes.row}>
        {photos.map((photo) => (
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
            <Lightbox.ZoomReset
              render={<Toolbar.Button />}
              className={classes.toolbarButton}
            >
              ↺
            </Lightbox.ZoomReset>
          </Toolbar.Root>
        }
      />
    </Lightbox.Root>
  );
}
