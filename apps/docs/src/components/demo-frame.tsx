"use client";

import { Collapsible } from "@logic-ui/react/collapsible";
import { Tabs } from "@logic-ui/react/tabs";
import { cn } from "cn";
import * as React from "react";
import { CopyButton } from "./copy-button";
import { ScrollArea } from "./scroll-area";

export interface DemoFrameFile {
  name: string;
  code: string;
  html: string;
}

export function DemoFrame(props: {
  files: DemoFrameFile[];
  className?: string;
  children: React.ReactNode;
}): React.ReactElement {
  const { files, className, children } = props;
  const [file, setFile] = React.useState(files[0]?.name ?? "");
  const current = files.find((entry) => entry.name === file) ?? files[0];

  return (
    <Collapsible.Root
      className={cn(
        "not-prose my-6 overflow-hidden border border-line",
        className,
      )}
    >
      <div className="bg-dots flex min-h-48 flex-wrap items-center justify-center gap-4 bg-canvas p-3 sm:p-8 md:p-12">
        {children}
      </div>

      <Tabs.Root value={file} onValueChange={(value) => setFile(String(value))}>
        <div className="flex h-10 items-center gap-2 border-t border-line bg-panel pr-1.5 pl-2">
          <Collapsible.Trigger className="group flex h-7 shrink-0 cursor-pointer items-center gap-1.5 px-2 font-mono text-xs whitespace-nowrap text-muted hover:bg-raised hover:text-fg">
            <span
              aria-hidden
              className="transition-transform group-data-panel-open:rotate-90"
            >
              ›
            </span>
            <span className="group-data-panel-open:hidden">Show code</span>
            <span className="hidden group-data-panel-open:inline">
              Hide code
            </span>
          </Collapsible.Trigger>

          <ScrollArea
            className="ml-auto max-w-[60%] min-w-0"
            hideScrollbar
            fadeEdges
          >
            <Tabs.List className="relative flex w-max items-center gap-0.5">
              {files.map((entry) => (
                <Tabs.Tab
                  key={entry.name}
                  value={entry.name}
                  className="h-7 shrink-0 cursor-pointer px-2 font-mono text-xs text-faint hover:text-fg data-active:bg-raised data-active:text-fg"
                >
                  {entry.name}
                </Tabs.Tab>
              ))}
            </Tabs.List>
          </ScrollArea>
          {current ? (
            <CopyButton value={current.code} label={`Copy ${current.name}`} />
          ) : null}
        </div>

        <Collapsible.Panel className="h-(--collapsible-panel-height) overflow-hidden border-t border-line bg-panel transition-[height] duration-200 data-ending-style:h-0 data-starting-style:h-0">
          {files.map((entry) => (
            <Tabs.Panel key={entry.name} value={entry.name}>
              <ScrollArea viewportProps={{ className: "max-h-120" }}>
                <div
                  className="w-max min-w-full px-4 py-3.5 font-mono text-[13px] leading-6"
                  dangerouslySetInnerHTML={{ __html: entry.html }}
                />
              </ScrollArea>
            </Tabs.Panel>
          ))}
        </Collapsible.Panel>
      </Tabs.Root>
    </Collapsible.Root>
  );
}
