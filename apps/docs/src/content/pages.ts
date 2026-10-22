import "server-only";
import type { MDXContent } from "mdx/types";

/** Loads each page's MDX, by slug (see `src/nav.ts`). */
export const pageContent: Record<
  string,
  () => Promise<{ default: MDXContent }>
> = {
  "": () => import("./introduction.mdx"),
  "quick-start": () => import("./quick-start.mdx"),
  changelog: () => import("./changelog.mdx"),
  "components/clipboard": () => import("./components/clipboard/index.mdx"),
  "components/cropper": () => import("./components/cropper/index.mdx"),
  "components/lightbox": () => import("./components/lightbox/index.mdx"),
  "handbook/animation": () => import("./handbook/animation/index.mdx"),
  "handbook/composition": () => import("./handbook/composition/index.mdx"),
  "handbook/customization": () => import("./handbook/customization/index.mdx"),
  "handbook/forms": () => import("./handbook/forms/index.mdx"),
  "handbook/styling": () => import("./handbook/styling/index.mdx"),
  "handbook/typescript": () => import("./handbook/typescript/index.mdx"),
};
