/** A photo of the demos. The lightbox reads its `id`; the demos pass the rest to the parts. */
export type Photo = {
  id: string;
  src: string;
  alt: string;
  width?: number;
  height?: number;
  caption?: string;
};

/** Photos of different shapes, shared by the lightbox demos. */
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
    caption: "A portrait, taller than wide",
  },
  {
    id: "waterfall",
    src: "https://picsum.photos/id/1035/1600/1600",
    width: 1600,
    height: 1600,
    alt: "Waterfall in a forest",
    caption: "A square image",
  },
  {
    id: "panorama",
    src: "https://picsum.photos/id/1043/2400/1000",
    width: 2400,
    height: 1000,
    alt: "Panorama of a valley",
    caption: "A wide panorama",
  },
  {
    id: "coast",
    src: "https://picsum.photos/id/1050/1600/1067",
    width: 1600,
    height: 1067,
    alt: "Rocky coast",
  },
  {
    id: "jellyfish",
    src: "https://picsum.photos/id/1069/1600/1067",
    width: 1600,
    height: 1067,
    alt: "Jellyfish in dark water",
    caption: "Jellyfish",
  },
  {
    id: "bridge",
    src: "https://picsum.photos/id/1067/1067/1600",
    width: 1067,
    height: 1600,
    alt: "City street",
  },
  {
    id: "mountains",
    src: "https://picsum.photos/id/1018/1600/1067",
    width: 1600,
    height: 1067,
    alt: "Mountains under a cloudy sky",
    caption: "Mountains",
  },
];

/** A smaller version of a photo, for thumbnails. */
export function getThumbnailSrc(photo: Photo) {
  return photo.src.replace(
    /\/(\d+)\/(\d+)$/,
    (_, width: string, height: string) => {
      const scale = 240 / Math.max(Number(width), Number(height));
      return `/${Math.round(Number(width) * scale)}/${Math.round(Number(height) * scale)}`;
    },
  );
}

/** An image that always fails to load, at once and without a request. */
export const BROKEN_SRC = "data:image/png;base64,broken";

/** A photo or a video of the demos that mix both. */
export type MediaItem = Photo & { type: "image" | "video" };

/** Short public videos: a CC0 clip from MDN's examples, and Blender's open movie. */
export const videos: MediaItem[] = [
  {
    id: "flower",
    type: "video",
    src: "https://interactive-examples.mdn.mozilla.net/media/cc0-videos/flower.mp4",
    alt: "A flower opening",
    caption: "Blooming",
  },
  {
    id: "bunny",
    type: "video",
    src: "https://test-videos.co.uk/vids/bigbuckbunny/mp4/h264/720/Big_Buck_Bunny_720_10s_1MB.mp4",
    width: 1280,
    height: 720,
    alt: "Big Buck Bunny, © Blender Foundation, CC BY 3.0",
    caption: "Big Buck Bunny",
  },
];
