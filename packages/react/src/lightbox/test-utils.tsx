import { act, fireEvent, screen } from "@testing-library/react";
import { expect, vi } from "vitest";
import {
  Lightbox,
  type LightboxRootChangeEventReason,
  type LightboxRootProps,
} from ".";

export type TestItem = {
  id: string;
  src: string;
  alt: string;
  caption?: string | undefined;
};

export const ITEMS: TestItem[] = [
  { id: "a", src: "/a.jpg", alt: "First", caption: "Caption A" },
  { id: "b", src: "/b.jpg", alt: "Second" },
  { id: "c", src: "/c.jpg", alt: "Third" },
];

/** Resolves at once, so the viewer opens without loading a real image. */
export const loadMedia = vi.fn<
  NonNullable<LightboxRootProps<TestItem>["loadMedia"]>
>(() => Promise.resolve({ width: 400, height: 300 }));

export type TestLightboxProps = Partial<LightboxRootProps<TestItem>> & {
  /** Rendered inside each slide's media, after the image. */
  mediaChildren?: ((item: TestItem) => React.ReactNode) | undefined;
  /** Rendered inside each slide, after the media. */
  itemChildren?: ((item: TestItem) => React.ReactNode) | undefined;
  /** Rendered inside the popup, after the controls. */
  popupChildren?: React.ReactNode | undefined;
  /** Values of the items that get a trigger: every item by default. */
  triggerValues?: readonly string[] | undefined;
  /** `crossfade` on every trigger. */
  crossfade?: boolean | undefined;
};

/** A trigger per item and a viewer with every control. */
export function TestLightbox(props: TestLightboxProps): React.ReactElement {
  const {
    items = ITEMS,
    mediaChildren,
    itemChildren,
    popupChildren,
    triggerValues = items.map((item) => item.id),
    crossfade,
    ...rootProps
  } = props;
  return (
    <Lightbox.Root items={items} loadMedia={loadMedia} {...rootProps}>
      {triggerValues.map((value) => (
        <Lightbox.Trigger key={value} value={value} crossfade={crossfade} />
      ))}
      <Lightbox.Portal>
        <Lightbox.Backdrop data-testid="backdrop" />
        <Lightbox.Popup data-testid="popup">
          <Lightbox.Title>Photos</Lightbox.Title>
          <Lightbox.Viewport data-testid="viewport">
            {(item: TestItem) => (
              <Lightbox.Slide data-testid={`slide-${item.id}`}>
                <Lightbox.Media data-testid={`media-${item.id}`}>
                  <img src={item.src} alt={item.alt} />
                  {mediaChildren?.(item)}
                </Lightbox.Media>
                {itemChildren?.(item)}
              </Lightbox.Slide>
            )}
          </Lightbox.Viewport>
          <Lightbox.Description>
            {(item: TestItem) => item.caption}
          </Lightbox.Description>
          <Lightbox.Close>Close</Lightbox.Close>
          <Lightbox.Previous />
          <Lightbox.Counter data-testid="counter" />
          <Lightbox.Next />
          <Lightbox.ZoomOut />
          <Lightbox.ZoomValue data-testid="zoom-value" />
          <Lightbox.ZoomIn />
          <Lightbox.ZoomReset />
          {popupChildren}
        </Lightbox.Popup>
      </Lightbox.Portal>
    </Lightbox.Root>
  );
}

/** Matches the `eventDetails` passed to `onValueChange` for this reason. */
export function changeDetails(reason: LightboxRootChangeEventReason): unknown {
  return expect.objectContaining({ reason });
}

/** Clicks the trigger named `name` and waits for the viewer. */
export async function openLightboxAt(name: string): Promise<void> {
  await act(async () => {
    fireEvent.click(screen.getByRole("button", { name }));
  });
  await screen.findByRole("dialog");
}

export function firePointer(
  type: "pointerDown" | "pointerMove" | "pointerUp",
  element: Element,
  x: number,
  y: number,
  pointerType = "touch",
): void {
  fireEvent[type](element, {
    pointerId: 1,
    pointerType,
    button: 0,
    clientX: x,
    clientY: y,
  });
}

/** Lets a few animation frames run, such as the one `data-starting-style` lasts. */
export function waitForFrames(): Promise<void> {
  return act(
    () =>
      new Promise<void>((resolve) => {
        setTimeout(resolve, 50);
      }),
  );
}

/** Clicks the button named `name` and flushes the update. */
export async function clickButton(name: string): Promise<void> {
  await act(async () => {
    fireEvent.click(screen.getByRole("button", { name }));
  });
}
