import { withBasePath } from "@/lib/base-path";
import { sections, SITE } from "@/nav";

export const dynamic = "force-static";

/**
 * Index of the docs for language models (https://llmstxt.org): one link per
 * page to its Markdown version, grouped by section.
 */
export function GET(): Response {
  const body = [
    `# ${SITE.name}`,
    "",
    `This is the documentation for the \`${SITE.packageName}\` package.`,
    "It contains a collection of components and utilities for building user interfaces in React.",
    "The library is designed to be composable and styling agnostic.",
    "The Tailwind CSS examples are written for Tailwind CSS v4. If `package.json` uses Tailwind CSS v3, automatically convert unsupported styles to v3-compatible equivalents.",
    "",
    ...sections.flatMap((section) => [
      `## ${section.title}`,
      "",
      ...section.pages.map(
        (page) =>
          `- [${page.title}](${withBasePath(`/md/${page.slug || "index"}.md`)}): ${page.description}`,
      ),
      ...(section.links ?? []).map((link) => `- [${link.title}](${link.href})`),
      "",
    ]),
  ].join("\n");

  return new Response(body, {
    headers: { "Content-Type": "text/plain; charset=utf-8" },
  });
}
