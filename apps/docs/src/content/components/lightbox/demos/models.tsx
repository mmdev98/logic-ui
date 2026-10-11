"use client";
import * as React from "react";
import { Lightbox } from "@logic-ui/react/lightbox";
import { cn } from "cn";
import { CloseIcon } from "./_icons";
import { classes } from "./_classes";

type Model = {
  id: string;
  src: string;
  title: string;
  credit: string;
};

const sample = (name: string) =>
  `https://raw.githubusercontent.com/KhronosGroup/glTF-Sample-Assets/main/Models/${name}/glTF-Binary/${name}.glb`;

/** Khronos glTF sample assets. */
const models: Model[] = [
  {
    id: "chair",
    src: sample("SheenChair"),
    title: "Sheen chair",
    credit: "Wayfair, CC0",
  },
  {
    id: "car",
    src: sample("ToyCar"),
    title: "Toy car",
    credit: "Guido Odendahl, CC0",
  },
  {
    id: "fox",
    src: sample("Fox"),
    title: "Fox",
    credit: "PixelMannen, CC0; rigging by tomkranis, CC BY 4.0",
  },
  {
    id: "truck",
    src: sample("CesiumMilkTruck"),
    title: "Milk truck",
    credit: "Cesium, CC BY 4.0",
  },
];

/** Tailwind classes of this demo. */
const local = {
  Grid: "grid w-full max-w-xl grid-cols-2 gap-3",
  Tile: "flex flex-col gap-2",
  // No background: only the model. The live model doesn't take the pointer,
  // so a press on the tile opens the viewer.
  Trigger:
    "aspect-square w-full cursor-pointer rounded-2xl bg-transparent data-pending:cursor-pointer",
  TileTitle: "m-0 text-sm font-medium",
  TileCredit: "m-0 truncate text-xs text-neutral-500",
  // Where the model sits: in the tile, or in the viewer while it is open.
  TileHost: "pointer-events-none size-full [&>model-viewer]:size-full",
  Slide:
    "px-[max(1rem,env(safe-area-inset-left))] pt-[calc(4.5rem+env(safe-area-inset-top))] pb-[calc(6.5rem+env(safe-area-inset-bottom))] md:px-24",
  // Drag to rotate: `data-base-ui-swipe-ignore` keeps every drag on the
  // model, so it never swipes or pulls the viewer to close.
  ViewerHost:
    "size-full cursor-grab active:cursor-grabbing [&>model-viewer]:size-full",
  Footer: `${classes.bottomBar} ${classes.controlBottom}`,
  Title: "m-0 text-lg font-semibold",
  Hint: "m-0 text-xs text-neutral-400",
};

/**
 * The model's `<model-viewer>`, made once for the page, outside React: the
 * same element moves between the tile and the viewer, so the viewer shows the
 * model exactly as it is, mid-turn and mid-animation, and nothing is loaded
 * or set up twice.
 */
function useModelElement(model: Model): React.RefObject<HTMLElement | null> {
  const elementRef = React.useRef<HTMLElement | null>(null);
  React.useEffect(() => {
    // Registers the custom element; the element below is upgraded once it is.
    void import("@google/model-viewer");
    const element = document.createElement("model-viewer");
    element.setAttribute("src", model.src);
    element.setAttribute("alt", `3D model: ${model.title}`);
    element.setAttribute("loading", "lazy");
    element.setAttribute("auto-rotate", "");
    element.setAttribute("auto-rotate-delay", "0");
    element.setAttribute("rotation-per-second", "20deg");
    element.setAttribute("interaction-prompt", "none");
    element.setAttribute("disable-zoom", "");
    element.setAttribute("disable-pan", "");
    element.setAttribute("shadow-intensity", "1");
    element.setAttribute("autoplay", "");
    elementRef.current = element;
    return () => {
      element.remove();
      elementRef.current = null;
    };
  }, [model]);
  return elementRef;
}

/** Puts the model in `host`: rotatable by drag only in the viewer. */
function moveModel(element: HTMLElement | null, host: HTMLElement | null) {
  if (!element || !host || element.parentElement === host) return;
  element.toggleAttribute("camera-controls", host.dataset.viewer !== undefined);
  host.append(element);
}

/**
 * Holds the model still while it flies, or lets it carry on. A still model
 * isn't drawn again on every frame, so the flight stays smooth; it carries on
 * from where it stopped, spin and animation alike.
 */
function setModelMoving(element: HTMLElement | null, moving: boolean) {
  const model = element as
    (HTMLElement & { play?: () => void; pause?: () => void }) | null;
  if (!model) return;
  model.toggleAttribute("auto-rotate", moving);
  if (moving) model.play?.();
  else model.pause?.();
}

/** One model: a live tile, and a one-item viewer to rotate it in. */
function ModelTile(props: { model: Model }) {
  const { model } = props;
  const elementRef = useModelElement(model);
  const tileHostRef = React.useRef<HTMLDivElement>(null);

  // The model starts in its tile.
  React.useEffect(() => {
    moveModel(elementRef.current, tileHostRef.current);
  }, [elementRef]);

  // The viewer is mounted out of sight before it opens: the model moves into
  // it then, and flies out of the tile with it. Back in the tile once the
  // viewer unmounts, after the flight home.
  const viewerHostRef = React.useCallback(
    (host: HTMLDivElement | null) => {
      if (!host) return undefined;
      moveModel(elementRef.current, host);
      return () => moveModel(elementRef.current, tileHostRef.current);
    },
    [elementRef],
  );

  return (
    <Lightbox.Root
      items={[model]}
      maxScale={1}
      // Still while it flies, both ways; on the move again once it lands.
      onOpenChange={() => setModelMoving(elementRef.current, false)}
      onOpenChangeComplete={() => setModelMoving(elementRef.current, true)}
    >
      <div className={local.Tile}>
        <Lightbox.Trigger
          value={model.id}
          aria-label={`View the ${model.title.toLowerCase()} in 3D`}
          className={cn(classes.trigger, local.Trigger)}
        >
          <div ref={tileHostRef} className={local.TileHost} />
        </Lightbox.Trigger>
        <div>
          <p className={local.TileTitle}>{model.title}</p>
          <p className={local.TileCredit}>{model.credit}</p>
        </div>
      </div>

      <Lightbox.Portal>
        <Lightbox.Backdrop className={classes.backdrop} />
        <Lightbox.Popup className={classes.popup}>
          <Lightbox.Viewport className={classes.viewport}>
            {() => (
              <Lightbox.Slide className={local.Slide}>
                <Lightbox.Media width={1} height={1}>
                  <div
                    ref={viewerHostRef}
                    data-viewer=""
                    data-base-ui-swipe-ignore=""
                    className={local.ViewerHost}
                  />
                </Lightbox.Media>
              </Lightbox.Slide>
            )}
          </Lightbox.Viewport>
          <div className={`${classes.topBar} ${classes.controlTop}`}>
            <span />
            <Lightbox.Close className={classes.iconButton}>
              <CloseIcon />
            </Lightbox.Close>
          </div>
          <footer className={local.Footer}>
            <Lightbox.Title className={local.Title}>
              {model.title}
            </Lightbox.Title>
            <p className={local.Hint}>Drag to rotate · Esc to close</p>
          </footer>
        </Lightbox.Popup>
      </Lightbox.Portal>
    </Lightbox.Root>
  );
}

/**
 * 3D models that spin in their tiles and open to be rotated. Each model is
 * its own one-item lightbox. Dragging rotates the model instead of swiping
 * or closing the viewer; Escape and the button close it, and the model flies
 * back to its tile.
 */
export default function ExampleLightboxModels(): React.ReactElement {
  return (
    <div className={local.Grid}>
      {models.map((model) => (
        <ModelTile key={model.id} model={model} />
      ))}
    </div>
  );
}
