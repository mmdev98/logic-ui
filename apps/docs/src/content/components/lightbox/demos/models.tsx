"use client";
import * as React from "react";
import { Lightbox, type LightboxItemValue } from "@logic-ui/react/lightbox";
import { useStableCallback } from "@logic-ui/react/utils";
import { cn } from "cn";
import { ChevronIcon, CloseIcon } from "./_icons";

type WeaponClass =
  | "Assault rifle"
  | "Submachine gun"
  | "Marksman rifle"
  | "Sniper rifle"
  | "Sidearm"
  | "Launcher";

type Weapon = {
  id: string;
  src: string;
  name: string;
  weaponClass: WeaponClass;
  /** Primary or secondary slot of the loadout. */
  slot: "Primary" | "Secondary";
};

const asset = (id: string) => `https://static.poly.pizza/${id}.glb`;

/** Models by austincford on Poly Pizza, CC BY 3.0. */
const weapons: Weapon[] = [
  {
    id: "mdr",
    src: asset("ca730343-aade-4dff-9dfc-f9252715c1ca"),
    name: "MDR",
    weaponClass: "Assault rifle",
    slot: "Primary",
  },
  {
    id: "mpx",
    src: asset("b74662ef-4f3c-4e79-a059-190f8f92a5c4"),
    name: "MPX",
    weaponClass: "Submachine gun",
    slot: "Primary",
  },
  {
    id: "mpsd",
    src: asset("31e903e2-89ed-41ee-94ad-d88ceb08104c"),
    name: "MPSD",
    weaponClass: "Submachine gun",
    slot: "Primary",
  },
  {
    id: "mk14",
    src: asset("46945263-4815-4c5c-b802-a71ed9f0e2fb"),
    name: "MK14",
    weaponClass: "Marksman rifle",
    slot: "Primary",
  },
  {
    id: "m21",
    src: asset("b4fb3a42-2f16-47cb-a05d-a2d99ea4f0d3"),
    name: "M21 EBR",
    weaponClass: "Marksman rifle",
    slot: "Primary",
  },
  {
    id: "srsa1",
    src: asset("2417d371-8951-4049-8f79-b085869920bb"),
    name: "SRSA1",
    weaponClass: "Sniper rifle",
    slot: "Primary",
  },
  {
    id: "prc",
    src: asset("55a7dfe7-02c3-45a4-95d4-b6fdca2cd4de"),
    name: "Precision rifle",
    weaponClass: "Sniper rifle",
    slot: "Primary",
  },
  {
    id: "p320",
    src: asset("7f0c0ad8-fa76-4f87-b6ac-356b3da3025a"),
    name: "P320",
    weaponClass: "Sidearm",
    slot: "Secondary",
  },
  {
    id: "p226",
    src: asset("adfb7fcb-343d-42b2-8546-704606a66f30"),
    name: "P226",
    weaponClass: "Sidearm",
    slot: "Secondary",
  },
  {
    id: "revolver",
    src: asset("9d476060-01ae-4e47-bca6-dadb8e43c3f7"),
    name: "Revolver",
    weaponClass: "Sidearm",
    slot: "Secondary",
  },
  {
    id: "rpg",
    src: asset("07fbe965-5ca5-4d46-8198-fbbe27c23a00"),
    name: "RPG",
    weaponClass: "Launcher",
    slot: "Secondary",
  },
];

/** The weapons, class by class, in the order of `weapons`. */
const groups = weapons.reduce<{ weaponClass: WeaponClass; items: Weapon[] }[]>(
  (result, weapon) => {
    const last = result.at(-1);
    if (last?.weaponClass === weapon.weaponClass) last.items.push(weapon);
    else result.push({ weaponClass: weapon.weaponClass, items: [weapon] });
    return result;
  },
  [],
);

/** Whether the weapon opens its class in the strip of cards. */
function isFirstOfClass(weapon: Weapon): boolean {
  const index = weapons.indexOf(weapon);
  return weapons[index - 1]?.weaponClass !== weapon.weaponClass;
}

const pad = (value: number) => String(value).padStart(2, "0");

/**
 * Fades with the viewer: in after it opens, out as it closes or is pulled
 * away.
 */
const control =
  "opacity-[calc(1_-_var(--lightbox-dismiss-progress,0)*1.5)] transition-[opacity,translate] duration-(--lightbox-flight-duration) ease-(--lightbox-flight-easing) in-data-swiping:transition-none in-data-starting-style:opacity-0 in-data-ending-style:pointer-events-none in-data-ending-style:opacity-0";

// Corner brackets in `--bracket`, drawn with gradients: a short line along
// each edge from each corner. Written out, so Tailwind finds them.
const tileBrackets =
  "before:[background:linear-gradient(var(--bracket),var(--bracket))_top_left/10px_1px_no-repeat,linear-gradient(var(--bracket),var(--bracket))_top_left/1px_10px_no-repeat,linear-gradient(var(--bracket),var(--bracket))_top_right/10px_1px_no-repeat,linear-gradient(var(--bracket),var(--bracket))_top_right/1px_10px_no-repeat,linear-gradient(var(--bracket),var(--bracket))_bottom_left/10px_1px_no-repeat,linear-gradient(var(--bracket),var(--bracket))_bottom_left/1px_10px_no-repeat,linear-gradient(var(--bracket),var(--bracket))_bottom_right/10px_1px_no-repeat,linear-gradient(var(--bracket),var(--bracket))_bottom_right/1px_10px_no-repeat]";
const cardBrackets =
  "[background:linear-gradient(var(--bracket),var(--bracket))_top_left/12px_1px_no-repeat,linear-gradient(var(--bracket),var(--bracket))_top_left/1px_12px_no-repeat,linear-gradient(var(--bracket),var(--bracket))_top_right/12px_1px_no-repeat,linear-gradient(var(--bracket),var(--bracket))_top_right/1px_12px_no-repeat,linear-gradient(var(--bracket),var(--bracket))_bottom_left/12px_1px_no-repeat,linear-gradient(var(--bracket),var(--bracket))_bottom_left/1px_12px_no-repeat,linear-gradient(var(--bracket),var(--bracket))_bottom_right/12px_1px_no-repeat,linear-gradient(var(--bracket),var(--bracket))_bottom_right/1px_12px_no-repeat]";

/** Tailwind classes of this demo. */
const local = {
  Armory:
    "flex w-full max-w-2xl flex-col gap-6 border border-white/8 bg-[#0b0d0c] p-5 text-[#d9dfd2] select-none",
  Heading: "flex items-baseline justify-between border-b border-white/8 pb-3",
  HeadingTitle: "m-0 text-xl font-black tracking-[0.18em] text-white uppercase",
  HeadingMeta: "font-mono text-[0.6875rem] tracking-widest text-[#c6f432]",
  Group: "flex flex-col gap-2",
  GroupLabel:
    "m-0 flex items-center gap-3 font-mono text-[0.6875rem] tracking-[0.25em] text-[#8a9384] uppercase after:h-px after:flex-1 after:bg-white/8",
  Grid: "grid grid-cols-2 gap-2 sm:grid-cols-3",
  Card: "flex min-w-0 flex-col",
  // The live model doesn't take the pointer, so a press on the tile opens
  // the viewer. Corner brackets light up under the pointer.
  Trigger: cn(
    "group relative aspect-[16/10] w-full cursor-pointer overflow-hidden border border-white/8 bg-[radial-gradient(ellipse_at_50%_60%,rgb(198_244_50/0.07),transparent_70%),linear-gradient(#121513,#0d0f0e)] p-0 transition-[border-color] duration-200 hover:border-[#c6f432]/40 data-flying:invisible data-popup-open:invisible focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#c6f432]",
    "before:pointer-events-none before:absolute before:inset-1 before:opacity-0 before:transition-opacity before:duration-200 before:[--bracket:#c6f432] hover:before:opacity-100",
    tileBrackets,
  ),
  TileNumber:
    "absolute top-2 left-2.5 font-mono text-[0.625rem] tracking-widest text-[#8a9384]",
  // Where the model sits, and the still of it that holds its place while it
  // is in the viewer.
  TileHost:
    "pointer-events-none relative size-full [&>img]:absolute [&>img]:inset-0 [&>img]:size-full [&>model-viewer]:size-full",
  CardName:
    "m-0 mt-1.5 truncate text-[0.8125rem] font-bold tracking-[0.12em] text-white uppercase",
  CardClass:
    "m-0 truncate font-mono text-[0.625rem] tracking-[0.2em] text-[#8a9384] uppercase",
  Credit: "m-0 font-mono text-[0.625rem] text-[#5f665b]",

  // The viewer.
  Backdrop:
    "fixed inset-0 bg-[rgb(6_8_7/calc(0.985*(1_-_var(--lightbox-dismiss-progress,0))))] backdrop-blur-[calc(16px*(1_-_var(--lightbox-dismiss-progress,0)))] transition-[background-color,backdrop-filter] duration-(--lightbox-flight-duration) ease-(--lightbox-flight-easing) data-swiping:transition-none data-starting-style:bg-transparent data-starting-style:backdrop-blur-none data-ending-style:bg-transparent data-ending-style:backdrop-blur-none",
  Popup: "fixed inset-0 text-[#d9dfd2] select-none outline-none",
  // A spotlight on a grid floor, behind the weapon.
  Stage: cn(
    "pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_45%_40%_at_50%_45%,rgb(198_244_50/0.09),transparent_70%),linear-gradient(rgb(255_255_255/0.035)_1px,transparent_1px),linear-gradient(90deg,rgb(255_255_255/0.035)_1px,transparent_1px)] bg-size-[100%_100%,56px_56px,56px_56px] mask-radial-[70%_65%] mask-radial-from-20% mask-radial-at-[50%_45%]",
    control,
  ),
  Viewport: "absolute inset-0 select-none",
  Slide:
    "px-[max(1rem,env(safe-area-inset-left))] pt-[calc(7rem+env(safe-area-inset-top))] pb-[calc(10.5rem+env(safe-area-inset-bottom))] md:px-32",
  // Drag to rotate: `data-base-ui-swipe-ignore` keeps every drag on the
  // weapon, so it never swipes or pulls the viewer to close. The arrows, the
  // cards and ← → move between the weapons.
  ViewerHost:
    "size-full cursor-grab active:cursor-grabbing [&>model-viewer]:size-full",
  TopBar: cn(
    "absolute inset-x-0 top-0 flex items-start justify-between gap-4 px-[max(1.25rem,env(safe-area-inset-left))] pt-[calc(1.25rem+env(safe-area-inset-top))]",
    control,
    "in-data-starting-style:-translate-y-3 in-data-ending-style:-translate-y-3",
  ),
  Breadcrumb:
    "m-0 flex items-center gap-2 font-mono text-[0.6875rem] tracking-[0.25em] text-[#8a9384] uppercase [&_b]:font-normal [&_b]:text-[#c6f432]",
  // The name slides in from the side the weapon came from.
  Name: "m-0 mt-1 text-4xl leading-none font-black tracking-[0.08em] text-white uppercase transition-[opacity,translate] duration-300 ease-out data-starting-style:opacity-0 data-starting-style:transition-none data-starting-style:data-[activation-direction=left]:-translate-x-6 data-starting-style:data-[activation-direction=right]:translate-x-6 sm:text-5xl",
  Counter:
    "font-mono text-sm tracking-widest text-[#8a9384] tabular-nums [&_b]:font-normal [&_b]:text-white",
  TopActions: "flex items-center gap-4",
  Square:
    "flex size-10 cursor-pointer items-center justify-center border border-white/15 bg-black/40 text-white transition-[border-color,background-color] duration-150 hover:border-[#c6f432] hover:bg-[#c6f432]/10 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#c6f432] [&_svg]:size-4",
  Side: cn("absolute top-1/2 z-10 -mt-6 hidden md:block", control),
  // A square that fills with the accent.
  Arrow:
    "group flex cursor-pointer border-none bg-transparent p-0 text-white data-disabled:pointer-events-none data-disabled:opacity-20",
  ArrowBox:
    "flex size-12 items-center justify-center border border-white/20 bg-black/40 transition-[border-color,background-color,color,scale] duration-150 group-hover:border-[#c6f432] group-hover:bg-[#c6f432] group-hover:text-black group-active:scale-95 group-focus-visible:outline-2 group-focus-visible:outline-offset-2 group-focus-visible:outline-[#c6f432] [&_svg]:size-5",
  Footer: cn(
    "absolute inset-x-0 bottom-0 flex flex-col items-center gap-3 px-3 pb-[calc(1.25rem+env(safe-area-inset-bottom))]",
    control,
    "in-data-starting-style:translate-y-3 in-data-ending-style:translate-y-3",
  ),
  // `px-[50%]` of the tray lets the first and last cards reach its centre,
  // where the active one is scrolled to.
  Tray: "w-[min(100%,46rem)] border-y border-white/8 bg-black/50 backdrop-blur-md",
  Strip:
    "relative flex items-end gap-1.5 overflow-x-auto px-[50%] pt-7 pb-3.5 [scrollbar-width:none] data-overflow-end:mask-r-from-85% data-overflow-start:mask-l-from-85% [&::-webkit-scrollbar]:hidden",
  // A class opens with a gap, and its name above its first card.
  Thumbnail: cn(
    "relative flex h-16 w-28 flex-none cursor-pointer flex-col border border-white/8 bg-[linear-gradient(#141715,#0e100f)] p-1.5 text-left transition-[opacity,border-color,translate] duration-300 ease-[cubic-bezier(0.32,0.72,0,1)]",
    "opacity-55 hover:not-data-active:-translate-y-0.5 hover:not-data-active:border-white/20 hover:not-data-active:opacity-90 data-active:border-transparent data-active:opacity-100",
    "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#c6f432]",
    "data-first-of-class:not-first:ml-5",
  ),
  ThumbnailClass:
    "absolute -top-5 left-0 font-mono text-[0.5625rem] tracking-[0.25em] whitespace-nowrap text-[#c6f432] uppercase",
  ThumbnailImage:
    "pointer-events-none absolute inset-x-1 top-0.5 bottom-3.5 m-auto max-h-full max-w-full object-contain drop-shadow-[0_3px_4px_rgb(0_0_0/0.6)]",
  ThumbnailName:
    "relative mt-auto truncate font-mono text-[0.5625rem] tracking-[0.15em] text-white uppercase",
  // Glides to the active card with the slides: accent brackets, a glow
  // inside, and a lit bar under it.
  Indicator: cn(
    "pointer-events-none absolute top-(--active-thumbnail-top) left-(--active-thumbnail-left) h-(--active-thumbnail-height) w-(--active-thumbnail-width) [--bracket:#c6f432]",
    cardBrackets,
    "shadow-[inset_0_-24px_32px_-20px_rgb(198_244_50/0.25)]",
    "after:absolute after:inset-x-3 after:-bottom-2 after:h-0.5 after:bg-[#c6f432] after:shadow-[0_0_12px_2px_rgb(198_244_50/0.6)]",
  ),
  Hint: "m-0 hidden font-mono text-[0.625rem] tracking-[0.2em] text-[#5f665b] uppercase sm:block",
};

/** The parts of `<model-viewer>`'s API the demo uses, once it is upgraded. */
type ModelViewerElement = HTMLElement & {
  loaded?: boolean;
  toDataURL?: (type?: string) => string;
  getCameraOrbit?: () => { toString: () => string };
  cameraOrbit?: string;
  jumpCameraToGoal?: () => void;
};

function nextFrame() {
  return new Promise<void>((resolve) => {
    requestAnimationFrame(() => resolve());
  });
}

/**
 * A `<model-viewer>` for the weapon, made outside React, side on with the
 * muzzle to the left.
 */
function createModelElement(weapon: Weapon): ModelViewerElement {
  const element = document.createElement("model-viewer");
  element.setAttribute("src", weapon.src);
  element.setAttribute("alt", `3D model: ${weapon.name}`);
  element.setAttribute("loading", "eager");
  element.setAttribute("camera-orbit", "-90deg 80deg auto");
  element.setAttribute("auto-rotate-delay", "0");
  element.setAttribute("rotation-per-second", "30deg");
  element.setAttribute("interaction-prompt", "none");
  element.setAttribute("disable-zoom", "");
  element.setAttribute("disable-pan", "");
  element.setAttribute("environment-image", "neutral");
  element.setAttribute("exposure", "1.1");
  element.setAttribute("shadow-intensity", "1.2");
  element.setAttribute("shadow-softness", "0.8");
  return element;
}

/**
 * Puts the model in `host`, rotatable by drag only in the viewer, and waits
 * until it has drawn itself at its new size: its canvas follows a frame later.
 */
async function moveModel(
  element: HTMLElement | undefined,
  host: HTMLElement | null | undefined,
) {
  const model = element as ModelViewerElement | undefined;
  if (!model || !host || model.parentElement === host) return;
  // Kept through the move: on its own it goes back to `camera-orbit`, and
  // loses the angle it was dragged to.
  const orbit = model.getCameraOrbit?.().toString();
  if (orbit) model.cameraOrbit = orbit;
  model.toggleAttribute("camera-controls", host.dataset.viewer !== undefined);
  host.append(model);
  model.jumpCameraToGoal?.();
  await nextFrame();
  await nextFrame();
}

/**
 * Lets the model turn, or holds it still. A still model isn't drawn again on
 * every frame, so the flights stay smooth.
 */
function setModelMoving(element: HTMLElement | undefined, moving: boolean) {
  element?.toggleAttribute("auto-rotate", moving);
}

/** A picture of the model as it is now, or `null` before it has loaded. */
function takeStill(element: HTMLElement | undefined): string | null {
  const model = element as ModelViewerElement | undefined;
  if (!model?.loaded) return null;
  return model.toDataURL?.("image/png") ?? null;
}

/**
 * Shows a still of the model in its tile, in place of the model while it is
 * away or settling back in: the tile never shows empty.
 */
function showStill(element: HTMLElement | undefined, tile: HTMLElement | null) {
  const src = takeStill(element);
  if (!tile || !src) return;
  const still = tile.querySelector("img") ?? document.createElement("img");
  still.alt = "";
  still.src = src;
  tile.append(still);
}

function hideStill(tile: HTMLElement | null) {
  tile?.querySelector("img")?.remove();
}

/**
 * An armory of 3D weapons. A weapon turns on its tile under the pointer and
 * opens in one viewer, to be rotated. Dragging rotates it instead of swiping
 * or closing the viewer; the arrows, the cards and ← → move between them,
 * and Escape flies the one shown back to its tile, turned as you left it.
 */
export default function ExampleLightboxModels(): React.ReactElement {
  // One `<model-viewer>` per weapon, for the page: the same element moves
  // between its tile and its slide, so the viewer shows it exactly as it
  // was, and nothing is loaded twice.
  const elementsRef = React.useRef(new Map<string, ModelViewerElement>());
  const tilesRef = React.useRef(new Map<string, HTMLElement>());
  const hostsRef = React.useRef(new Map<string, HTMLElement>());
  const hostRefs = React.useRef(
    new Map<
      string,
      (host: HTMLDivElement | null) => (() => void) | undefined
    >(),
  );
  const [value, setValue] = React.useState<LightboxItemValue>(weapons[0].id);
  // At once: a trigger reports its weapon just before the viewer opens.
  const valueRef = React.useRef(value);
  const [hovered, setHovered] = React.useState<string | null>(null);
  // On the page, flying, or open with the weapon shown landed.
  const [stage, setStage] = React.useState<"closed" | "flying" | "open">(
    "closed",
  );
  const [thumbnails, setThumbnails] = React.useState<Record<string, string>>(
    {},
  );

  React.useEffect(() => {
    // Registers the custom element; the elements are upgraded once it is.
    // Always at full resolution: on a slow GPU it would otherwise switch
    // resolution mid-flight, and the weapon would blink.
    void import("@google/model-viewer").then(({ ModelViewerElement }) => {
      ModelViewerElement.minimumRenderScale = 1;
    });
    const elements = elementsRef.current;
    for (const weapon of weapons) {
      const element = createModelElement(weapon);
      elements.set(weapon.id, element);
      void moveModel(element, tilesRef.current.get(weapon.id));
    }
    return () => {
      for (const element of elements.values()) element.remove();
      elements.clear();
    };
  }, []);

  // On the page, the weapon under the pointer turns. In the viewer, the one
  // shown turns once it has landed. Nothing moves in flight.
  React.useEffect(() => {
    for (const [id, element] of elementsRef.current)
      setModelMoving(
        element,
        stage === "closed" ? id === hovered : stage === "open" && id === value,
      );
  }, [stage, value, hovered]);

  /** Back in its tile, where its still holds its place until it has drawn. */
  const returnModel = useStableCallback(async (id: string) => {
    const tile = tilesRef.current.get(id) ?? null;
    const element = elementsRef.current.get(id);
    await moveModel(element, tile);
    // Unless it has left again meanwhile, for a slide that mounted again.
    if (element?.parentElement === tile) hideStill(tile);
  });

  /**
   * The weapon's place in its slide, one stable ref per weapon. A slide is
   * there for the weapon shown and its neighbours: the model moves in when it
   * mounts, leaving a still in its tile, and goes home when it unmounts.
   */
  const getHostRef = (id: string) => {
    const cached = hostRefs.current.get(id);
    if (cached) return cached;
    const ref = (host: HTMLDivElement | null) => {
      if (!host) return undefined;
      const element = elementsRef.current.get(id);
      hostsRef.current.set(id, host);
      showStill(element, tilesRef.current.get(id) ?? null);
      setModelMoving(element, false);
      void moveModel(element, host);
      return () => {
        if (hostsRef.current.get(id) === host) hostsRef.current.delete(id);
        if (element?.parentElement === host) void returnModel(id);
      };
    };
    hostRefs.current.set(id, ref);
    return ref;
  };

  return (
    <Lightbox.Root
      items={weapons}
      maxScale={1}
      value={value}
      onValueChange={(next) => {
        valueRef.current = next;
        setValue(next);
      }}
      onOpenChange={async (open) => {
        setStage("flying");
        const elements = elementsRef.current;
        // Still while it flies, both ways.
        for (const element of elements.values()) setModelMoving(element, false);
        if (!open) {
          // The tiles show the weapons as they were turned in the viewer,
          // for when they land.
          for (const id of hostsRef.current.keys())
            showStill(elements.get(id), tilesRef.current.get(id) ?? null);
          return;
        }
        // The cards: each weapon as it is on its tile now.
        const stills: Record<string, string> = {};
        for (const [id, element] of elements) {
          const still = takeStill(element);
          if (still) stills[id] = still;
        }
        setThumbnails(stills);
        // The viewer is mounted out of sight before it opens, and waits for
        // this: the weapon moves into its slide and draws at its size, then
        // flies out of its tile.
        const id = String(valueRef.current);
        const element = elements.get(id);
        for (
          let frame = 0;
          element?.parentElement !== hostsRef.current.get(id) && frame < 60;
          frame += 1
        )
          await nextFrame();
        await nextFrame();
        await nextFrame();
      }}
      onOpenChangeComplete={(open) => setStage(open ? "open" : "closed")}
    >
      <section aria-label="Armory" className={local.Armory}>
        <header className={local.Heading}>
          <h3 className={local.HeadingTitle}>Armory</h3>
          <span className={local.HeadingMeta}>
            {pad(weapons.length)} weapons
          </span>
        </header>
        {groups.map((group) => (
          <div key={group.weaponClass} className={local.Group}>
            <p className={local.GroupLabel}>
              {group.items[0].slot} · {group.weaponClass}
            </p>
            <div className={local.Grid}>
              {group.items.map((weapon) => (
                <div key={weapon.id} className={local.Card}>
                  <Lightbox.Trigger
                    value={weapon.id}
                    aria-label={`Inspect the ${weapon.name}`}
                    className={local.Trigger}
                    onPointerEnter={() => setHovered(weapon.id)}
                    onPointerLeave={() => setHovered(null)}
                    onFocus={() => setHovered(weapon.id)}
                    onBlur={() => setHovered(null)}
                  >
                    <div
                      ref={(tile) => {
                        if (tile) tilesRef.current.set(weapon.id, tile);
                        else tilesRef.current.delete(weapon.id);
                      }}
                      className={local.TileHost}
                    />
                    <span className={local.TileNumber}>
                      {pad(weapons.indexOf(weapon) + 1)}
                    </span>
                  </Lightbox.Trigger>
                  <p className={local.CardName}>{weapon.name}</p>
                  <p className={local.CardClass}>{weapon.weaponClass}</p>
                </div>
              ))}
            </div>
          </div>
        ))}
        <p className={local.Credit}>
          Models by austincford on Poly Pizza, CC BY 3.0.
        </p>
      </section>

      <Lightbox.Portal>
        <Lightbox.Backdrop className={local.Backdrop} />
        <Lightbox.Popup className={local.Popup}>
          <div className={local.Stage} />
          <Lightbox.Viewport className={local.Viewport}>
            {(weapon: Weapon) => (
              <Lightbox.Slide className={local.Slide}>
                <Lightbox.Media width={16} height={10}>
                  <div
                    ref={getHostRef(weapon.id)}
                    data-viewer=""
                    data-base-ui-swipe-ignore=""
                    className={local.ViewerHost}
                  />
                </Lightbox.Media>
              </Lightbox.Slide>
            )}
          </Lightbox.Viewport>

          <header className={local.TopBar}>
            <div>
              <Lightbox.Description className={local.Breadcrumb}>
                {(weapon: Weapon) => (
                  <>
                    {weapon.slot} <span aria-hidden>/</span>
                    <b>{weapon.weaponClass}</b>
                  </>
                )}
              </Lightbox.Description>
              <Lightbox.Title className={local.Name}>
                {(weapon: Weapon) => weapon.name}
              </Lightbox.Title>
            </div>
            <div className={local.TopActions}>
              <Lightbox.Counter className={local.Counter}>
                {(state) => (
                  <>
                    <b>{pad(state.index + 1)}</b> / {pad(state.count)}
                  </>
                )}
              </Lightbox.Counter>
              <Lightbox.Close className={local.Square}>
                <CloseIcon />
              </Lightbox.Close>
            </div>
          </header>

          <div
            className={`${local.Side} left-[max(1.5rem,env(safe-area-inset-left))] in-data-starting-style:-translate-x-3 in-data-ending-style:-translate-x-3`}
          >
            <Lightbox.Previous className={local.Arrow}>
              <span className={local.ArrowBox}>
                <ChevronIcon direction="left" />
              </span>
            </Lightbox.Previous>
          </div>
          <div
            className={`${local.Side} right-[max(1.5rem,env(safe-area-inset-right))] in-data-starting-style:translate-x-3 in-data-ending-style:translate-x-3`}
          >
            <Lightbox.Next className={local.Arrow}>
              <span className={local.ArrowBox}>
                <ChevronIcon direction="right" />
              </span>
            </Lightbox.Next>
          </div>

          <footer className={local.Footer}>
            <div className={local.Tray}>
              <Lightbox.ThumbnailList className={local.Strip}>
                {(weapon: Weapon) => (
                  <Lightbox.Thumbnail
                    aria-label={`${weapon.name}, ${weapon.weaponClass}`}
                    data-first-of-class={
                      isFirstOfClass(weapon) ? "" : undefined
                    }
                    className={local.Thumbnail}
                  >
                    {isFirstOfClass(weapon) && (
                      <span aria-hidden className={local.ThumbnailClass}>
                        {weapon.weaponClass}
                      </span>
                    )}
                    {thumbnails[weapon.id] && (
                      <img
                        src={thumbnails[weapon.id]}
                        alt=""
                        className={local.ThumbnailImage}
                      />
                    )}
                    <span aria-hidden className={local.ThumbnailName}>
                      {weapon.name}
                    </span>
                  </Lightbox.Thumbnail>
                )}
                <Lightbox.ThumbnailIndicator className={local.Indicator} />
              </Lightbox.ThumbnailList>
            </div>
            <p className={local.Hint}>
              Drag to inspect · ← → browse · Esc back
            </p>
          </footer>
        </Lightbox.Popup>
      </Lightbox.Portal>
    </Lightbox.Root>
  );
}
