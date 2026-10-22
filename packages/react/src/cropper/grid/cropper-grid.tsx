"use client";

import { mergeProps } from "@base-ui/react/merge-props";
import { useRender } from "@base-ui/react/use-render";
import * as React from "react";
import { useCropperRootStateContext } from "../root/cropper-root-context";

export type CropperGridState = {
  /** Whether a drag, pinch or wheel zoom is in progress: show the grid then. */
  interacting: boolean;
  rows: number;
  columns: number;
};

export interface CropperGridProps extends useRender.ComponentProps<
  "div",
  CropperGridState
> {
  /**
   * Number of rows.
   * @default 3
   */
  rows?: number | undefined;
  /**
   * Number of columns.
   * @default 3
   */
  columns?: number | undefined;
}

/**
 * Guides over the crop, such as the rule of thirds: renders `rows` ×
 * `columns` cells, each a `<div>` with `data-row` and `data-column`. Lay
 * them out with `repeat(var(--cropper-grid-columns), 1fr)` and the same for
 * rows, and show them with `data-interacting`. Hidden from assistive
 * technology.
 * Renders a `<div>` element.
 */
export function CropperGrid(props: CropperGridProps): React.ReactElement {
  const { rows = 3, columns = 3, render, ref, ...elementProps } = props;
  const { interacting } = useCropperRootStateContext();

  const cells: React.ReactElement[] = [];
  for (let row = 0; row < rows; row += 1) {
    for (let column = 0; column < columns; column += 1) {
      cells.push(
        <div key={`${row}-${column}`} data-row={row} data-column={column} />,
      );
    }
  }

  const state: CropperGridState = React.useMemo(
    () => ({ interacting, rows, columns }),
    [interacting, rows, columns],
  );

  return useRender({
    defaultTagName: "div",
    render,
    ref,
    state,
    stateAttributesMapping: { rows: () => null, columns: () => null },
    props: mergeProps<"div">(
      {
        "aria-hidden": true,
        children: cells,
        style: {
          "--cropper-grid-rows": rows,
          "--cropper-grid-columns": columns,
        } as React.CSSProperties,
      },
      elementProps,
    ),
  });
}
