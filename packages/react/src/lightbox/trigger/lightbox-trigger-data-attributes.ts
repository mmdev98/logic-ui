/**
 * Present while its image loads before the viewer opens.
 */
export const pending = "data-pending";

/**
 * Present while the image flies from it or back to it, even another item's
 * image that `closeTarget` sends here. Hide the trigger meanwhile: the image
 * lands in an empty slot.
 */
export const flying = "data-flying";

/**
 * Present with `crossfade`: it shows something other than the media it
 * opens, and the image crossfades with a copy of it during the flights.
 */
export const crossfade = "data-crossfade";

/**
 * Present while another trigger's image loads.
 */
export const disabled = "data-disabled";

/**
 * Present on the trigger the image will fly back to: the one of the item
 * shown, or the one `closeTarget` picks, such as a "+5" tile. From the start
 * of the opening flight to the end of the closing one. Hide the thumbnail
 * meanwhile and keep its space (`visibility: hidden`), like a phone's photo
 * app: the image always lands in an empty slot.
 */
export const popupOpen = "data-popup-open";
