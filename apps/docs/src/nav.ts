/**
 * Every docs page, in sidebar order. This is the one list the sidebar, the
 * routes, search and llms.txt read. Add a page here and its MDX file in
 * `src/content/pages.ts`.
 */
export interface DocPage {
  /** URL under `/docs`; `""` is `/docs` itself. */
  slug: string;
  title: string;
  description: string;
  /** MDX file under `src/content`. */
  file: string;
  /** Library entry point whose API the page documents (`src/<api>`). */
  api?: string;
  /**
   * Badge next to the title: `"new"` for a recent page, `"preview"` for an API
   * that may still change.
   */
  badge?: "new" | "preview";
}

/** A sidebar entry that opens another site instead of a page here. */
export interface ExternalLink {
  title: string;
  href: string;
}

export interface DocSection {
  title: string;
  pages: DocPage[];
  /** Listed after the pages; each opens its own site in a new tab. */
  links?: ExternalLink[];
}

export const sections: DocSection[] = [
  {
    title: "Overview",
    pages: [
      {
        slug: "",
        title: "Introduction",
        description: "Unstyled React components for accessible interfaces.",
        file: "introduction.mdx",
      },
      {
        slug: "quick-start",
        title: "Quick start",
        description:
          "Install the package, render a primitive and style it with its data attributes.",
        file: "quick-start.mdx",
      },
      {
        slug: "changelog",
        title: "Changelog",
        description: "What changed in each release.",
        file: "changelog.mdx",
      },
    ],
  },
  {
    title: "Handbook",
    pages: [
      {
        slug: "handbook/styling",
        title: "Styling",
        description:
          "A guide to styling Base UI components with your preferred styling engine.",
        file: "handbook/styling/index.mdx",
      },
      {
        slug: "handbook/animation",
        title: "Animation",
        description: "A guide to animating Base UI components.",
        file: "handbook/animation/index.mdx",
      },
      {
        slug: "handbook/composition",
        title: "Composition",
        description:
          "A guide to composing Base UI components with your own React components.",
        file: "handbook/composition/index.mdx",
      },
      {
        slug: "handbook/customization",
        title: "Customization",
        description:
          "A guide to customizing the behavior of Base UI components.",
        file: "handbook/customization/index.mdx",
      },
      {
        slug: "handbook/forms",
        title: "Forms",
        description: "A guide to building forms with Base UI components.",
        file: "handbook/forms/index.mdx",
      },
      {
        slug: "handbook/typescript",
        title: "TypeScript",
        description: "A guide to using TypeScript with Base UI.",
        file: "handbook/typescript/index.mdx",
      },
    ],
  },
  {
    title: "Components",
    pages: [
      {
        slug: "components/clipboard",
        title: "Clipboard",
        description:
          "A button that copies a value and shows that it was copied.",
        file: "components/clipboard/index.mdx",
        api: "clipboard",
        badge: "preview",
      },
      {
        slug: "components/cropper",
        title: "Cropper",
        description:
          "An image cropper with handles, a fixed or free aspect ratio, zoom, rotation and touch gestures.",
        file: "components/cropper/index.mdx",
        api: "cropper",
        badge: "preview",
      },
      {
        slug: "components/lightbox",
        title: "Lightbox",
        description:
          "A full-screen viewer that opens from its triggers, with mobile gestures and zoom.",
        file: "components/lightbox/index.mdx",
        api: "lightbox",
        badge: "preview",
      },
    ],
  },
  {
    title: "Base UI",
    pages: [],
    links: [
      {
        title: "Accordion",
        href: "https://base-ui.com/react/components/accordion",
      },
      {
        title: "Alert Dialog",
        href: "https://base-ui.com/react/components/alert-dialog",
      },
      {
        title: "Autocomplete",
        href: "https://base-ui.com/react/components/autocomplete",
      },
      { title: "Avatar", href: "https://base-ui.com/react/components/avatar" },
      { title: "Button", href: "https://base-ui.com/react/components/button" },
      {
        title: "Checkbox",
        href: "https://base-ui.com/react/components/checkbox",
      },
      {
        title: "Checkbox Group",
        href: "https://base-ui.com/react/components/checkbox-group",
      },
      {
        title: "Collapsible",
        href: "https://base-ui.com/react/components/collapsible",
      },
      {
        title: "Combobox",
        href: "https://base-ui.com/react/components/combobox",
      },
      {
        title: "Context Menu",
        href: "https://base-ui.com/react/components/context-menu",
      },
      { title: "Dialog", href: "https://base-ui.com/react/components/dialog" },
      { title: "Drawer", href: "https://base-ui.com/react/components/drawer" },
      { title: "Field", href: "https://base-ui.com/react/components/field" },
      {
        title: "Fieldset",
        href: "https://base-ui.com/react/components/fieldset",
      },
      { title: "Form", href: "https://base-ui.com/react/components/form" },
      { title: "Input", href: "https://base-ui.com/react/components/input" },
      { title: "Menu", href: "https://base-ui.com/react/components/menu" },
      {
        title: "Menubar",
        href: "https://base-ui.com/react/components/menubar",
      },
      { title: "Meter", href: "https://base-ui.com/react/components/meter" },
      {
        title: "Navigation Menu",
        href: "https://base-ui.com/react/components/navigation-menu",
      },
      {
        title: "Number Field",
        href: "https://base-ui.com/react/components/number-field",
      },
      {
        title: "OTP Field",
        href: "https://base-ui.com/react/components/otp-field",
      },
      {
        title: "Popover",
        href: "https://base-ui.com/react/components/popover",
      },
      {
        title: "Preview Card",
        href: "https://base-ui.com/react/components/preview-card",
      },
      {
        title: "Progress",
        href: "https://base-ui.com/react/components/progress",
      },
      { title: "Radio", href: "https://base-ui.com/react/components/radio" },
      {
        title: "Scroll Area",
        href: "https://base-ui.com/react/components/scroll-area",
      },
      { title: "Select", href: "https://base-ui.com/react/components/select" },
      {
        title: "Separator",
        href: "https://base-ui.com/react/components/separator",
      },
      { title: "Slider", href: "https://base-ui.com/react/components/slider" },
      { title: "Switch", href: "https://base-ui.com/react/components/switch" },
      { title: "Tabs", href: "https://base-ui.com/react/components/tabs" },
      { title: "Toast", href: "https://base-ui.com/react/components/toast" },
      { title: "Toggle", href: "https://base-ui.com/react/components/toggle" },
      {
        title: "Toggle Group",
        href: "https://base-ui.com/react/components/toggle-group",
      },
      {
        title: "Toolbar",
        href: "https://base-ui.com/react/components/toolbar",
      },
      {
        title: "Tooltip",
        href: "https://base-ui.com/react/components/tooltip",
      },
    ],
  },
  {
    title: "Utils",
    pages: [],
    links: [
      {
        title: "CSP Provider",
        href: "https://base-ui.com/react/utils/csp-provider",
      },
      {
        title: "Direction Provider",
        href: "https://base-ui.com/react/utils/direction-provider",
      },
      {
        title: "mergeProps",
        href: "https://base-ui.com/react/utils/merge-props",
      },
      {
        title: "useRender",
        href: "https://base-ui.com/react/utils/use-render",
      },
    ],
  },
];

export const pages: DocPage[] = sections.flatMap((section) => section.pages);

export function getPageHref(page: DocPage): string {
  return page.slug ? `/docs/${page.slug}` : "/docs";
}

export function findPage(slug: string): DocPage | undefined {
  return pages.find((page) => page.slug === slug);
}

export function getSection(page: DocPage): DocSection {
  return sections.find((section) => section.pages.includes(page))!;
}

export const SITE = {
  name: "Logic UI",
  packageName: "@logic-ui/react",
  repository: "https://github.com/mmdev98/logic-ui",
};
