"use client";
import * as React from "react";
import {
  useCropperRootContext,
  useCropperRootStateContext,
} from "@logic-ui/react/cropper";
import { Slider } from "@logic-ui/react/slider";

/**
 * A ruler you scrub to zoom, like a phone's photo editor: a Base UI slider
 * bound to the cropper's zoom, from 0 (whole image) to 1 (closest), with
 * ticks and a yellow needle.
 */
export function ZoomDial() {
  const { actions, status } = useCropperRootContext();
  const { zoom } = useCropperRootStateContext();
  return (
    <div className="flex flex-col items-center gap-1 px-8">
      <span className="font-mono text-[11px] text-[#ffd60a] tabular-nums">
        {Math.round(zoom * 100)}
      </span>
      <Slider.Root
        aria-label="Zoom"
        min={0}
        max={1}
        step={0.005}
        value={zoom}
        disabled={status !== "loaded"}
        onValueChange={(value) => actions.setZoom(value as number)}
        className="w-full touch-none"
      >
        <Slider.Control className="flex h-9 cursor-ew-resize items-center">
          {/* A tick every 5%, a long one every 25%, fading out at both ends. */}
          <Slider.Track className="relative h-7 w-full">
            <div
              aria-hidden
              className="absolute inset-x-0 top-1/2 h-4 -translate-y-1/2 bg-[repeating-linear-gradient(90deg,rgb(255_255_255/0.75)_0_1px,transparent_1px_25%),repeating-linear-gradient(90deg,rgb(255_255_255/0.3)_0_1px,transparent_1px_5%)] bg-[length:calc(100%+1px)_100%,calc(100%+1px)_60%] bg-center bg-no-repeat [mask-image:linear-gradient(90deg,transparent,black_12%,black_88%,transparent)]"
            />
            <Slider.Thumb className="h-7 w-[3px] rounded-full bg-[#ffd60a] outline-none focus-visible:ring-2 focus-visible:ring-[#ffd60a]/50 focus-visible:ring-offset-2 focus-visible:ring-offset-black" />
          </Slider.Track>
        </Slider.Control>
      </Slider.Root>
    </div>
  );
}
