# PR 427: isolated browser regression

This belongs only to the contributor's `validation/sidebar-browser` branch. It is not production application code and is not part of PR 427.

The workflow checks out **two explicit commits**, bundles each original `app/views/index/app.tsx` with its own original `app/views/map/resize.ts` and `app/views/utils/dispose-scope.ts`, and uses fixed npm dependencies with a committed lockfile. The generated manifest records both commit IDs, any dirty source paths, and dependency versions.

## What this actually verifies

- A real headless Chromium DOM, actual Preact layout lifecycle, actual MapLibre GL 5.21.0 and WebGL rendering (SwiftShader on GitHub's Linux runner).
- Negative control: the old implementation must reproduce significant screen-coordinate drift in **all seven** mobile sidebar transitions. This expected-reproduction control passes when the old implementation exhibits the defects.
- Patched implementation: the same seven transitions must keep geographic landmarks within 0.25 CSS px, including a second snapshot after delayed ResizeObserver delivery; also an equal-height top/bottom swap.
- Route-focus target, running animation, viewport resize, desktop camera center and actual zoom-control button behavior have assertions, not just logged output.
- Pitched/rotated Mercator and a globe surface case check the opposite geographic edge anchor before opening and closing, within 0.75 CSS px. A globe sky-edge case verifies the declared no-pan fallback.
- Screenshots, JSON measurements, failure traces, HTML and JSON reports, and the source manifest are uploaded even on test failure.

## Explicit limitations and adapters

This is **not a full application end-to-end test and not a physical-phone test**. It uses a 390 × 844 CSS-pixel viewport and simple replacement sidebar content/CSS with the application's mobile flex layout and sidebar heights (40vh and 50vh). Geometry rules are based on `app/views/map/main-map.scss` (`.main-map-container` flex direction), `app/views/index/sidebar/_sidebar.scss` (`.action-sidebar` and `.map-sidebar` mobile height rules), and the 56 px mobile navbar. The fixture uses the corresponding `main-map-container`, `action-sidebar`, and `map-sidebar` classes with minimal explicit CSS; it does not compile the full application Sass. Rendering uses local GeoJSON landmarks, not production tiles. Search, alerts, backend/RPC, routing, navbar, remote editing, map-layer helpers and map initialization are explicit fixture adapters listed in `build.mjs`/`state.tsx`. The route-focus adapter deliberately exercises child-component camera changes. No authentication, user data, network tile service, or production app server is involved.

A pass does not validate Safari/iOS, Android hardware/GPU, production routing and services, or the complete production CSS. Any remaining such gap must remain disclosed in the PR.

## Run in GitHub Actions

Push these files to the contributor fork's `validation/sidebar-browser` branch. The push workflow uses the commit SHAs in the workflow's `PATCHED_REF` and `BASELINE_REF` defaults. Change the patched SHA before publishing when testing a new patch. `workflow_dispatch` can also override both SHAs if the workflow is available for dispatch. The workflow has read-only repository permissions and does not push source changes.

The fixture may also be built without launching a browser:

```sh
npm ci --ignore-scripts --no-audit --no-fund
BASELINE_REPO=/absolute/path/to/baseline PATCHED_REPO=/absolute/path/to/patched npm run build
node node_modules/@playwright/test/cli.js test --list
```

Results are evidence only after a completed CI run. Creating these files or compiling them does not mean the browser assertions passed.
