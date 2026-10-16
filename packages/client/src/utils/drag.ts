/** Pointer travel (px) that turns a press into a drag; anything shorter stays a click. */
export const DRAG_THRESHOLD_PX = 6;

export function exceedsDragThreshold(dx: number, dy: number): boolean {
  return dx * dx + dy * dy >= DRAG_THRESHOLD_PX * DRAG_THRESHOLD_PX;
}
