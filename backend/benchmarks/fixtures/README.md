# Benchmark Fixtures

This directory holds test data for the SpotMe benchmark suite.

## `faces/` — Labeled Face Dataset (Required for `bench:accuracy`)

The accuracy benchmark needs real face photos organized by identity. Add your own
dataset here before running `npm run bench:accuracy`.

### Expected Structure

```
fixtures/faces/
├── alice/
│   ├── alice_01.jpg
│   ├── alice_02.jpg
│   └── alice_03.jpg
├── bob/
│   ├── bob_01.jpg
│   ├── bob_02.jpg
│   └── bob_03.jpg
└── charlie/
    ├── charlie_01.jpg
    └── charlie_02.jpg
```

Each subfolder name is treated as a "person identity". All photos in the same
folder are assumed to be the same person (positive pairs). Photos from different
folders are different people (negative pairs).

### Recommended Dataset

- **LFW (Labeled Faces in the Wild)** — the standard benchmark dataset
  - Download: https://vis-www.cs.umass.edu/lfw/
  - Use ~10-20 identities with 5-10 photos each
  - Extract and place the `lfw/` subfolders here

- **Or use any collection of face photos** you have access to

### Minimum Requirements

- At least 2 different people
- At least 2 photos per person
- Each photo should clearly show one face
- JPEG or PNG format
- Reasonable resolution (face should be at least ~50px across)

## `test-upload.jpg` — Upload Benchmark Image

A small image used by `bench-upload.ts`. The committed file is a 22-byte
JPEG header (valid magic bytes, **no image data**) — `canvas.loadImage`
cannot decode it, so the bench E2E numbers measure the worker's
decode-failure + retry path, NOT face inference (see METRICS.md). Replace
it with an actual photo (500KB–2MB) for realistic processing timing; if
absent, the script creates an equivalent synthetic header.
