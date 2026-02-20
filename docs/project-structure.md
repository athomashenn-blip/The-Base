# The Base Project Structure

This repo uses a single canonical app root at:

- `/Users/andrew/Documents/The Base`

## Runtime entry pages

- `index.html` - Engineering app
- `projects.html` - Projects page
- `reports.html` - Reports page
- `settings.html` - Settings page
- `login.html` - Local login page

## Data and assets

- `data/` - Runtime data stores and calculators
- `assets/gdtf/models/` - Runtime 3D fixture models
- `assets/gdtf/previews/` - Runtime fixture preview images
- `assets/models/` - Additional runtime 3D models

## Non-runtime import folders

These are intentionally excluded from git and can be emptied safely:

- `assets/gdtf/inbox/` - Raw import archives
- `assets/gdtf/extracted/` - Temporary extraction output

## Cleanliness rules

- Do not create nested project copies inside this folder.
- Keep only one canonical root.
- Keep import archives and extraction output out of git.
