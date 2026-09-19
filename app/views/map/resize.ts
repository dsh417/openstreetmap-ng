import type { Map as MaplibreMap } from "maplibre-gl"

/** Keep visible map features in place when a mobile sidebar changes the map height. */
export const resizeMapForSidebar = (
  map: MaplibreMap,
  previousBounds: DOMRectReadOnly,
  preservePosition: boolean,
) => {
  const bounds = map.getContainer().getBoundingClientRect()
  const shouldPan =
    preservePosition &&
    !map.isMoving() &&
    bounds.width === previousBounds.width &&
    bounds.height !== previousBounds.height
  const offsetY =
    bounds.top + bounds.height / 2 - previousBounds.top - previousBounds.height / 2

  map.resize()

  if (shouldPan && offsetY) {
    map.panBy([0, offsetY], { duration: 0 })
  }
}
