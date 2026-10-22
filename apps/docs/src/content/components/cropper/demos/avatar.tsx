"use client";
import * as React from "react";
import { Cropper } from "@logic-ui/react/cropper";
import { classes, photos } from "./_classes";
import { ZoomDial } from "./_zoom-dial";

/**
 * A profile picture: the circle keeps its size and the photo moves and zooms
 * behind it. A ruler drives the zoom; the preview shows the result live.
 */
export default function ExampleCropperAvatar() {
  return (
    <Cropper.Root
      src={photos.portrait}
      stencilSize={{ width: 260, height: 260 }}
      imageRestriction="stencil"
      className={classes.phone}
    >
      <div className={classes.topBar}>
        <span className="w-14" />
        <p className={classes.title}>Move and scale</p>
        <Cropper.Preview className="size-9 shrink-0 rounded-full bg-white/10 ring-2 ring-white/20" />
      </div>
      <Cropper.Viewport className={`${classes.viewport} h-[420px]`}>
        <Cropper.Image className={classes.image} />
        <Cropper.Stencil
          aria-label="Profile picture"
          className={`${classes.stencil} rounded-full`}
        />
      </Cropper.Viewport>
      <div className="pt-4 pb-6">
        <ZoomDial />
      </div>
    </Cropper.Root>
  );
}
