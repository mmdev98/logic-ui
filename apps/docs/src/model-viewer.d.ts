import type * as React from "react";

/** The attributes of `<model-viewer>` the demos use. */
interface ModelViewerAttributes extends React.HTMLAttributes<HTMLElement> {
  src?: string;
  alt?: string;
  poster?: string;
  loading?: "auto" | "lazy" | "eager";
  "camera-controls"?: boolean;
  "auto-rotate"?: boolean;
  "auto-rotate-delay"?: number;
  "rotation-per-second"?: string;
  "camera-orbit"?: string;
  "disable-zoom"?: boolean;
  "disable-pan"?: boolean;
  "interaction-prompt"?: "auto" | "none";
  "shadow-intensity"?: number;
  exposure?: number;
  "environment-image"?: string;
  autoplay?: boolean;
}

declare module "react" {
  namespace JSX {
    interface IntrinsicElements {
      "model-viewer": ModelViewerAttributes & React.RefAttributes<HTMLElement>;
    }
  }
}
