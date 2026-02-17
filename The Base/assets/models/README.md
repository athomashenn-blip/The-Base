Place 3D models here for Venue rendering.

Suggested structure:

- `assets/models/fixtures/<manufacturer>/<model>.glb`
- `assets/models/truss/prolyte/<series>.glb`

Then map paths in:

- `data/model-assets.js`

Key formats:

- Fixture key: `"manufacturer::model"` (lowercase, punctuation removed)
  - Example: `"ayrton::argo 6 fx"`
- Truss key: `"series"` lowercase with no spaces
  - Example: `"h30v"`, `"h40v"`, `"x30v"`

Notes:

- Models should be `.glb` or `.gltf`.
- If no mapped model is found, the app uses geometric fallback shapes.
