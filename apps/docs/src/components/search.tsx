"use client";

import { Dialog } from "@logic-ui/react/dialog";
import { useRouter } from "next/navigation";
import * as React from "react";
import { withBasePath } from "@/lib/base-path";
import type { SearchEntry } from "@/lib/markdown";
import { SearchIcon } from "./icons";
import { ScrollArea } from "./scroll-area";

let indexPromise: Promise<SearchEntry[]> | undefined;

/** Fetches the index built by `/search-index.json` once, on first open. */
function loadIndex(): Promise<SearchEntry[]> {
  indexPromise ??= fetch(withBasePath("/search-index.json"))
    .then((response) => response.json() as Promise<SearchEntry[]>)
    .catch((error: unknown) => {
      indexPromise = undefined;
      throw error;
    });
  return indexPromise;
}

function rank(entries: SearchEntry[], query: string): SearchEntry[] {
  const terms = query.toLowerCase().split(/\s+/).filter(Boolean);
  if (terms.length === 0) {
    return [];
  }

  return entries
    .map((entry) => {
      const heading = (entry.heading ?? "").toLowerCase();
      const page = entry.page.toLowerCase();
      const text = entry.text.toLowerCase();
      let score = 0;
      for (const term of terms) {
        if (heading.startsWith(term) || page.startsWith(term)) {
          score += 10;
        } else if (heading.includes(term) || page.includes(term)) {
          score += 6;
        } else if (text.includes(term)) {
          score += 1;
        } else {
          return null;
        }
      }
      return { entry, score: entry.heading === null ? score + 2 : score };
    })
    .filter((result) => result !== null)
    .sort((a, b) => b.score - a.score)
    .slice(0, 20)
    .map((result) => result.entry);
}

function getSnippet(text: string, query: string): string {
  const term = query.toLowerCase().split(/\s+/).find(Boolean) ?? "";
  const index = text.toLowerCase().indexOf(term);
  const start = Math.max(0, index - 40);
  return (
    (start > 0 ? "…" : "") +
    text.slice(start, start + 120) +
    (text.length > start + 120 ? "…" : "")
  );
}

export function Search(): React.ReactElement {
  const router = useRouter();
  const [open, setOpen] = React.useState(false);
  const [query, setQuery] = React.useState("");
  const [entries, setEntries] = React.useState<SearchEntry[]>([]);
  const [active, setActive] = React.useState(0);
  const listId = React.useId();

  const results = React.useMemo(() => rank(entries, query), [entries, query]);

  React.useEffect(() => {
    function onKeyDown(event: KeyboardEvent): void {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        setOpen((value) => !value);
      }
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  React.useEffect(() => {
    if (open) {
      loadIndex().then(setEntries, () => setEntries([]));
    }
  }, [open]);

  // Keeps the result chosen with the arrow keys in view.
  React.useEffect(() => {
    document
      .getElementById(`${listId}-${active}`)
      ?.scrollIntoView({ block: "nearest" });
  }, [listId, active]);

  function go(entry: SearchEntry | undefined): void {
    if (!entry) {
      return;
    }
    setOpen(false);
    setQuery("");
    router.push(entry.href);
  }

  function onInputKeyDown(event: React.KeyboardEvent<HTMLInputElement>): void {
    if (event.key === "ArrowDown") {
      event.preventDefault();
      setActive((index) => Math.min(index + 1, results.length - 1));
    } else if (event.key === "ArrowUp") {
      event.preventDefault();
      setActive((index) => Math.max(index - 1, 0));
    } else if (event.key === "Enter") {
      event.preventDefault();
      go(results[active]);
    }
  }

  return (
    <Dialog.Root open={open} onOpenChange={setOpen}>
      <Dialog.Trigger
        aria-label="Search docs"
        className="flex size-8 cursor-pointer items-center justify-center gap-2 border border-line bg-panel text-sm text-faint transition-colors hover:border-line-strong hover:text-muted sm:w-56 sm:justify-start sm:pr-1.5 sm:pl-2.5"
      >
        <SearchIcon />
        <span className="hidden sm:inline">Search docs</span>
        <kbd className="ml-auto hidden border border-line px-1.5 font-mono text-[10px] text-faint sm:inline">
          Ctrl K
        </kbd>
      </Dialog.Trigger>
      <Dialog.Portal>
        <Dialog.Backdrop className="fixed inset-0 bg-black/70 backdrop-blur-sm transition-opacity duration-150 data-ending-style:opacity-0 data-starting-style:opacity-0" />
        <Dialog.Popup className="fixed top-[12vh] left-1/2 flex max-h-[70vh] w-[min(40rem,calc(100vw-2rem))] -translate-x-1/2 flex-col overflow-hidden border border-line-strong bg-panel shadow-2xl shadow-black transition-[opacity,scale] duration-150 data-ending-style:scale-98 data-ending-style:opacity-0 data-starting-style:scale-98 data-starting-style:opacity-0">
          <Dialog.Title className="sr-only">Search the docs</Dialog.Title>
          <div className="flex items-center gap-3 border-b border-line px-4">
            <SearchIcon className="shrink-0 text-faint" />
            <input
              autoFocus
              value={query}
              onChange={(event) => {
                setQuery(event.target.value);
                setActive(0);
              }}
              onKeyDown={onInputKeyDown}
              placeholder="Search components, props, data attributes…"
              role="combobox"
              aria-expanded={results.length > 0}
              aria-controls={listId}
              aria-activedescendant={
                results[active] ? `${listId}-${active}` : undefined
              }
              className="h-12 w-full bg-transparent text-sm text-fg outline-none placeholder:text-faint"
            />
            <kbd className="border border-line px-1.5 font-mono text-[10px] text-faint">
              Esc
            </kbd>
          </div>

          <ScrollArea className="min-h-0 shrink" fadeEdges>
            <ul id={listId} role="listbox" aria-label="Results" className="p-2">
              {query && results.length === 0 ? (
                <li className="px-3 py-8 text-center text-sm text-faint">
                  No results for “{query}”
                </li>
              ) : null}
              {results.map((entry, index) => (
                <li
                  key={entry.href}
                  id={`${listId}-${index}`}
                  role="option"
                  aria-selected={index === active}
                  onMouseMove={() => setActive(index)}
                  onClick={() => go(entry)}
                  className="cursor-pointer px-3 py-2.5 aria-selected:bg-raised"
                >
                  <div className="flex items-baseline gap-2 text-sm">
                    <span className="font-mono text-xs text-faint">
                      {entry.page}
                    </span>
                    {entry.heading ? (
                      <span className="text-fg">{entry.heading}</span>
                    ) : null}
                  </div>
                  {entry.text ? (
                    <p className="mt-0.5 truncate text-xs text-muted">
                      {getSnippet(entry.text, query)}
                    </p>
                  ) : null}
                </li>
              ))}
            </ul>
          </ScrollArea>
        </Dialog.Popup>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
