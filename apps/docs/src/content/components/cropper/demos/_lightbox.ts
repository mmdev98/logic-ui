/** A photo of the gallery demo. The lightbox reads its `id`. */
export type Photo = {
  id: string;
  src: string;
  alt: string;
  width?: number;
  height?: number;
  caption?: string;
};

/** Photos of different shapes, served with CORS headers so they can be cropped. */
export const photos: Photo[] = [
  {
    id: "valley",
    src: "https://picsum.photos/id/1015/1600/1067",
    width: 1600,
    height: 1067,
    alt: "River valley between cliffs",
    caption: "River valley",
  },
  {
    id: "portrait",
    src: "https://picsum.photos/id/1027/1067/1600",
    width: 1067,
    height: 1600,
    alt: "Portrait of a woman",
    caption: "Portrait",
  },
  {
    id: "waterfall",
    src: "https://picsum.photos/id/1035/1600/1600",
    width: 1600,
    height: 1600,
    alt: "Waterfall in a forest",
    caption: "Waterfall",
  },
  {
    id: "panorama",
    src: "https://picsum.photos/id/1043/2400/1000",
    width: 2400,
    height: 1000,
    alt: "Panorama of a valley",
    caption: "Panorama",
  },
  {
    id: "coast",
    src: "https://picsum.photos/id/1050/1600/1067",
    width: 1600,
    height: 1067,
    alt: "Rocky coast",
    caption: "Coast",
  },
];

/** A smaller version of a photo, for thumbnails. An edited photo (a data URL) is used as is. */
export function getThumbnailSrc(photo: Photo): string {
  return photo.src.replace(
    /\/(\d+)\/(\d+)$/,
    (_, width: string, height: string) => {
      const scale = 240 / Math.max(Number(width), Number(height));
      return `/${Math.round(Number(width) * scale)}/${Math.round(Number(height) * scale)}`;
    },
  );
}

/**
 * The controls of the viewer fade and slide off the edge of the screen they
 * sit on while the photo is pulled to dismiss, and when a tap hides them or
 * the viewer opens and closes, timed with the photo's flight.
 */
const control =
  "opacity-[calc(1_-_var(--lightbox-dismiss-progress,0)*1.5)] transition-[opacity,translate] duration-(--lightbox-flight-duration) ease-(--lightbox-flight-easing) in-data-swiping:transition-none in-data-controls-hidden:pointer-events-none in-data-controls-hidden:opacity-0 in-data-starting-style:opacity-0 in-data-ending-style:pointer-events-none in-data-ending-style:opacity-0 motion-reduce:translate-none";

/** Tailwind classes of the Lightbox around the cropper. */
export const viewer = {
  // Triggers. While the viewer shows a trigger's photo, hide the trigger but
  // keep its space: the photo looks like it left its slot.
  trigger:
    "group relative cursor-pointer overflow-hidden border-none bg-white/5 p-0 data-flying:invisible data-popup-open:invisible focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white",
  triggerImage:
    "size-full object-cover transition-opacity duration-300 group-data-pending:opacity-60",

  backdrop:
    "fixed inset-0 bg-[rgb(8_8_12/calc(0.92*(1_-_var(--lightbox-dismiss-progress,0))))] backdrop-blur-[calc(20px*(1_-_var(--lightbox-dismiss-progress,0)))] transition-[background-color,backdrop-filter] duration-(--lightbox-flight-duration) ease-(--lightbox-flight-easing) data-swiping:transition-none data-starting-style:bg-transparent data-starting-style:backdrop-blur-none data-ending-style:bg-transparent data-ending-style:backdrop-blur-none",
  popup: "fixed inset-0 text-white select-none outline-none",
  viewport:
    "absolute inset-0 cursor-default gap-x-4 select-none in-data-zoomed:cursor-grab in-data-zoomed:data-swiping:cursor-grabbing",

  /** A control at the top: it slides up and away. */
  controlTop: `${control} -translate-y-[calc((100%+1rem)*1.5*var(--lightbox-dismiss-progress,0))] in-data-controls-hidden:-translate-y-4 in-data-starting-style:-translate-y-4 in-data-ending-style:-translate-y-[max(1rem,calc((100%+1rem)*1.5*var(--lightbox-dismiss-progress,0)))]`,
  /** A control at the bottom: it slides down and away. */
  controlBottom: `${control} translate-y-[calc((100%+1rem)*1.5*var(--lightbox-dismiss-progress,0))] in-data-controls-hidden:translate-y-4 in-data-starting-style:translate-y-4 in-data-ending-style:translate-y-[max(1rem,calc((100%+1rem)*1.5*var(--lightbox-dismiss-progress,0)))]`,

  iconButton:
    "flex size-10 cursor-pointer items-center justify-center rounded-full border-none bg-white/10 text-white backdrop-blur-md transition-colors hover:not-data-disabled:bg-white/20 data-disabled:cursor-default data-disabled:opacity-35 focus-visible:outline-2 focus-visible:outline-white",
  counter:
    "flex h-10 items-center px-2.5 text-sm font-medium whitespace-nowrap text-white/90 tabular-nums",

  // The caption slides in from the side the photo came from.
  enter:
    "transition-[opacity,translate] duration-300 ease-out data-starting-style:opacity-0 data-starting-style:transition-none data-starting-style:data-[activation-direction=left]:-translate-x-5 data-starting-style:data-[activation-direction=right]:translate-x-5 motion-reduce:transition-none",

  // The thumbnail strip scrolls without a scrollbar, fading at its ends, with
  // a ring that glides to the active thumbnail.
  strip:
    "relative flex max-w-full gap-2 overflow-x-auto px-[50%] py-1.5 [scrollbar-width:none] data-overflow-end:mask-r-from-85% data-overflow-start:mask-l-from-85% [&::-webkit-scrollbar]:hidden",
  indicator:
    "pointer-events-none absolute top-(--active-thumbnail-top) left-(--active-thumbnail-left) h-(--active-thumbnail-height) w-(--active-thumbnail-width) rounded-lg outline-2 outline-offset-2 outline-white",
};
