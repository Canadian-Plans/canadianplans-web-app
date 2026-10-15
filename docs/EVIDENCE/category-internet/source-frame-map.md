# Source frame map

| Route                      | Desktop frame                  | Natural canvas | Mobile frame                 | Natural canvas |
| -------------------------- | ------------------------------ | -------------- | ---------------------------- | -------------- |
| `/home-internet/vancouver` | `154:2` · Vancouver Local      | 1440 × 7504    | `252:360` · Vancouver Mobile | 390 × 11620    |
| `/home-internet/ontario`   | `186:2` · Ontario Province Hub | 1440 × 7483    | `256:510` · Ontario Mobile   | 390 × 11488    |

Source PNG exports are in `source/`. `source/154-2.png`, `source/186-2.png`, `source/252-360.png`, and `source/256-510.png` are natural-size screenshots. The `*-source.png` siblings are scaled exports returned with the original design contexts.

Exact static assets used by the map are in `apps/site-1/public/design/category-internet/`. The map backdrops, coverage fill/ring, pin, and status marker are exported SVG/PNG assets. Road strokes and viewport clipping are layout geometry from the Figma metadata; no road artwork asset was supplied.
