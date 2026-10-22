import type { CropperRootStatus } from "./root/cropper-root";

/**
 * Names the `data-*` attributes of the state fields shared by the parts:
 * `status` becomes `data-loading`, `data-loaded` or `data-error`.
 */
export const CROPPER_STATE_ATTRIBUTES = {
  status: (value: CropperRootStatus) =>
    value === "idle" ? null : { [`data-${value}`]: "" },
};
