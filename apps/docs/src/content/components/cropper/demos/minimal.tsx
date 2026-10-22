"use client";
import * as React from "react";
import { Cropper } from "@logic-ui/react/cropper";
import { classes, photos } from "./_classes";

/** The fewest parts: drag the crop, drag and zoom the image. No handles, so the crop keeps its size. */
export default function ExampleCropperMinimal() {
  return (
    <Cropper.Root
      src={photos.landscape}
      aspectRatio={1}
      className="w-full overflow-hidden rounded-3xl"
    >
      <Cropper.Viewport className={`${classes.viewport} h-80 sm:h-96`}>
        <Cropper.Image className={classes.image} />
        <Cropper.Stencil className={classes.stencil} />
      </Cropper.Viewport>
    </Cropper.Root>
  );
}
