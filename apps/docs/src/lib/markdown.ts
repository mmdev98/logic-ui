import "server-only";
import * as fs from "node:fs";
import * as path from "node:path";
import GithubSlugger from "github-slugger";
import { getPageHref, type DocPage } from "@/nav";
import {
  getComponentApi,
  selectApiParts,
  type ApiAttribute,
  type ApiProp,
  type ComponentApi,
} from "./api";
import { readDemoFiles } from "./demo-files";
import { getInstallCommands } from "./install";

const CONTENT_DIR = path.join(process.cwd(), "src/content");

/**
 * Plain Markdown versions of the pages, for llms.txt and the search index.
 * The MDX source is rewritten with string replacements: demos become code
 * fences, `<ApiReference>` becomes tables, `<InstallCommand>` becomes one
 * command per package manager, other components are dropped.
 */

/** The page's MDX source, with LF line endings even where Git checks it out with CRLF. */
export function getPageSource(page: DocPage): string {
  return fs
    .readFileSync(path.join(CONTENT_DIR, page.file), "utf8")
    .replaceAll("\r\n", "\n");
}

function escapeCell(value: string): string {
  return value.replaceAll("|", "\\|").replace(/\s*\n\s*/g, " ");
}

function table(headers: string[], rows: string[][]): string {
  if (rows.length === 0) {
    return "";
  }
  return [
    `| ${headers.join(" | ")} |`,
    `| ${headers.map(() => "---").join(" | ")} |`,
    ...rows.map((row) => `| ${row.map(escapeCell).join(" | ")} |`),
  ].join("\n");
}

function propsTable(props: ApiProp[]): string {
  return table(
    ["Prop", "Type", "Default", "Description"],
    props.map((prop) => [
      prop.required ? `${prop.name} (required)` : prop.name,
      `\`${prop.type}\``,
      prop.default ? `\`${prop.default}\`` : "-",
      describeProp(prop),
    ]),
  );
}

/** A prop's description, then each value of a union with its note. */
function describeProp(prop: ApiProp): string {
  const values = (prop.values ?? [])
    .filter((value) => value.description)
    .map((value) => `\`"${value.value}"\`: ${value.description}`);
  return [prop.description, ...values].filter(Boolean).join(" ") || "-";
}

function attributesTable(header: string, attributes: ApiAttribute[]): string {
  return table(
    [header, "Description"],
    attributes.map((attribute) => [
      `\`${attribute.name}\``,
      attribute.description,
    ]),
  );
}

export function apiToMarkdown(api: ComponentApi, order?: string[]): string {
  const prefix = api.namespace ? `${api.namespace}.` : "";
  const parts = selectApiParts(api, order).map((part) =>
    [
      `### ${prefix}${part.name}`,
      part.description,
      propsTable(part.props),
      attributesTable("Data attribute", part.dataAttributes),
      attributesTable("CSS variable", part.cssVariables),
    ]
      .filter(Boolean)
      .join("\n\n"),
  );
  const types = api.types.map((type) =>
    [
      `### ${type.name}`,
      type.description,
      type.kind === "union"
        ? table(
            ["Value", "Description"],
            type.members.map((member) => [
              `\`${member.name}\``,
              member.description,
            ]),
          )
        : propsTable(type.members),
    ]
      .filter(Boolean)
      .join("\n\n"),
  );
  return [...parts, ...types].join("\n\n");
}

/** A demo as code fences. Shared files (`_classes.ts`) are printed once per page, at first use. */
function demoToMarkdown(
  page: DocPage,
  src: string,
  printed: Set<string>,
): string {
  const entry = path.resolve(CONTENT_DIR, path.dirname(page.file), src);
  return readDemoFiles(entry)
    .filter((file) => !printed.has(file.name) && printed.add(file.name))
    .map((file) => {
      const language = file.name.split(".").pop();
      return `\`\`\`${language} title="${file.name}"\n${file.code.trimEnd()}\n\`\`\``;
    })
    .join("\n\n");
}

/** `<ApiReference component="lightbox" parts={["Root", "Trigger"]} />`, `parts` optional. */
const API_REFERENCE =
  /<ApiReference\s+component="([^"]+)"(?:\s+parts=\{\[([^\]]*)\]\})?\s*\/>/g;

/** `<InstallCommand package="@logic-ui/react" />`. */
const INSTALL_COMMAND = /<InstallCommand\s+package="([^"]+)"\s*\/>/g;

function installToMarkdown(packageName: string): string {
  const lines = getInstallCommands(packageName).map((entry) => entry.command);
  return `\`\`\`bash\n${lines.join("\n")}\n\`\`\``;
}

function parsePartNames(list: string | undefined): string[] | undefined {
  return list?.match(/"(\w+)"/g)?.map((name) => name.slice(1, -1));
}

/** The page as Markdown: title, description, then the content without MDX syntax. */
export function getPageMarkdown(page: DocPage): string {
  const printed = new Set<string>();
  // Odd segments are code fences, left as they are.
  const body = getPageSource(page)
    .split(/(^```[\s\S]*?^```)/m)
    .map((segment, index) =>
      index % 2 === 1
        ? segment
        : segment
            // Drop other components first, so the code the next steps insert stays whole.
            .replace(
              /<(?!Demo\b|ApiReference\b|InstallCommand\b)[A-Z]\w*[^>]*\/>/g,
              "",
            )
            .replace(INSTALL_COMMAND, (_, packageName: string) =>
              installToMarkdown(packageName),
            )
            .replace(/<Demo\s+src="([^"]+)"\s*\/>/g, (_, src: string) =>
              demoToMarkdown(page, src, printed),
            )
            .replace(API_REFERENCE, (_, component: string, order?: string) =>
              apiToMarkdown(getComponentApi(component), parsePartNames(order)),
            ),
    )
    .join("")
    .replace(/\n{3,}/g, "\n\n")
    .trim();

  return `# ${page.title}\n\n${page.description}\n\n${body}\n`;
}

function toPlainText(markdown: string): string {
  return markdown
    .replace(/```[\s\S]*?```/g, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1")
    .replace(/[`*_>|#]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/** Text of a Markdown heading as rehype-slug sees it: no backticks, bold or links. */
function toHeadingText(markdown: string): string {
  return markdown
    .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1")
    .replace(/[`*_]/g, "")
    .trim();
}

/** Anchor of a part in `ApiReference`, prefixed so it can't clash with MDX headings. */
export function getPartAnchor(name: string): string {
  return `api-${name.replace(/([a-z])([A-Z])/g, "$1-$2").toLowerCase()}`;
}

/** Anchor of a type in `ApiReference`. */
export function getTypeAnchor(name: string): string {
  return `type-${name.replace(/([a-z])([A-Z])/g, "$1-$2").toLowerCase()}`;
}

export interface PageSection {
  id: string;
  heading: string;
  level: number;
  text: string;
}

/**
 * The page's headings in order, with the text under each: the MDX headings
 * (ids as rehype-slug gives them) and, where `<ApiReference>` stands, its parts
 * and types (ids as `ApiReference` gives them).
 */
export function getPageSections(page: DocPage): PageSection[] {
  const source = getPageSource(page)
    .replace(/```[\s\S]*?```/g, "")
    // Prettier wraps a long `<ApiReference>` over several lines; read it as one.
    .replace(API_REFERENCE, (tag) => tag.replace(/\s+/g, " "));
  const slugger = new GithubSlugger();
  const sections: PageSection[] = [];
  let text: string[] = [];

  const flush = (): void => {
    const last = sections.at(-1);
    if (last) {
      last.text = toPlainText(text.join("\n")).slice(0, 400);
    }
    text = [];
  };

  for (const line of source.split("\n")) {
    const heading = line.match(/^(#{2,6}) (.+)$/);
    const apiReference = [...line.matchAll(API_REFERENCE)][0];

    if (heading) {
      flush();
      const title = toHeadingText(heading[2]!);
      sections.push({
        id: slugger.slug(title),
        heading: title,
        level: heading[1]!.length,
        text: "",
      });
    } else if (apiReference) {
      flush();
      const api = getComponentApi(apiReference[1]!);
      const order = parsePartNames(apiReference[2]);
      const prefix = api.namespace ? `${api.namespace}.` : "";
      for (const part of selectApiParts(api, order)) {
        sections.push({
          id: getPartAnchor(part.name),
          heading: `${prefix}${part.name}`,
          level: 3,
          text: toPlainText(
            [
              part.description,
              ...part.props.map((prop) => prop.name),
              ...part.dataAttributes.map((a) => a.name),
            ].join(" "),
          ),
        });
      }
      for (const type of api.types) {
        sections.push({
          id: getTypeAnchor(type.name),
          heading: type.name,
          level: 3,
          text: toPlainText(
            `${type.description} ${type.members.map((member) => member.name).join(" ")}`,
          ),
        });
      }
    } else {
      text.push(line);
    }
  }
  flush();
  return sections;
}

export interface SearchEntry {
  /** Page title. */
  page: string;
  /** Heading of the section, or `null` for the page itself. */
  heading: string | null;
  href: string;
  text: string;
}

/** Search entries for a page: the page itself, then one per section. */
export function getSearchEntries(page: DocPage): SearchEntry[] {
  const href = getPageHref(page);
  return [
    { page: page.title, heading: null, href, text: page.description },
    ...getPageSections(page).map((section) => ({
      page: page.title,
      heading: section.heading,
      href: `${href}#${section.id}`,
      text: section.text,
    })),
  ];
}
