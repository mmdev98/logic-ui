"use client";
import * as React from "react";
import { Cropper, type CropperRootActions } from "@logic-ui/react/cropper";
import { classes, handleClasses, handlePositions, photos } from "./_classes";
import { FlipIcon, RotateIcon } from "./_icons";
import { ZoomDial } from "./_zoom-dial";

const ratios = [
  { label: "Free", value: undefined },
  { label: "Square", value: 1 },
  { label: "4:5", value: 4 / 5 },
  { label: "16:9", value: 16 / 9 },
];

/** A phone photo editor: aspect chips, a zoom dial, rotate, flip, and the result. */
export default function ExampleCropperHero() {
  const actionsRef = React.useRef<CropperRootActions>(null);
  const [aspectRatio, setAspectRatio] = React.useState<number | undefined>();
  const [result, setResult] = React.useState<string | null>(null);

  function done() {
    const canvas = actionsRef.current?.getCanvas({ maxWidth: 1200 });
    if (canvas) setResult(canvas.toDataURL("image/jpeg", 0.9));
  }

  if (result) {
    return (
      <div className={classes.phone}>
        <div className={classes.topBar}>
          <span />
          <p className={classes.title}>Saved</p>
          <button
            type="button"
            className={classes.doneButton}
            onClick={() => setResult(null)}
          >
            Edit
          </button>
        </div>
        <div className="flex h-[420px] items-center justify-center p-6">
          <img
            src={result}
            alt="The cropped photo"
            className="max-h-full max-w-full rounded-2xl shadow-2xl shadow-black"
          />
        </div>
        <div className="h-[132px]" />
      </div>
    );
  }

  return (
    <Cropper.Root
      src={photos.landscape}
      aspectRatio={aspectRatio}
      actionsRef={actionsRef}
      className={classes.phone}
    >
      <div className={classes.topBar}>
        <Cropper.Reset className={classes.textButton}>Reset</Cropper.Reset>
        <p className={classes.title}>Crop</p>
        <button type="button" className={classes.doneButton} onClick={done}>
          Done
        </button>
      </div>

      <Cropper.Viewport className={`${classes.viewport} h-[420px]`}>
        <Cropper.Image className={classes.image} />
        <Cropper.Stencil className={classes.stencil}>
          <Cropper.Grid className={classes.grid} />
          {handlePositions.map((position) => (
            <Cropper.Handle
              key={position}
              position={position}
              className={handleClasses[position]}
            />
          ))}
        </Cropper.Stencil>
      </Cropper.Viewport>

      <div className="flex flex-col gap-3 pt-4">
        <ZoomDial />
        <div className={classes.chips}>
          {ratios.map((ratio) => (
            <button
              key={ratio.label}
              type="button"
              aria-pressed={aspectRatio === ratio.value}
              onClick={() => setAspectRatio(ratio.value)}
              className={classes.chip}
            >
              {ratio.label}
            </button>
          ))}
        </div>
      </div>

      <div className={classes.toolbar}>
        <Cropper.Rotate angle={-90} className={classes.iconButton}>
          <RotateIcon direction="counterclockwise" />
        </Cropper.Rotate>
        <Cropper.Flip className={classes.iconButton}>
          <FlipIcon />
        </Cropper.Flip>
        <Cropper.Rotate className={classes.iconButton}>
          <RotateIcon direction="clockwise" />
        </Cropper.Rotate>
      </div>
    </Cropper.Root>
  );
}
