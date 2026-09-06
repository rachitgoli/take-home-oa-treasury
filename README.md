# Label Verification

Checks alcohol beverage label artwork against the data submitted in a COLA
application, so a compliance agent can see field-by-field whether the label
matches the paperwork.

Built for the TTB take-home exercise. The assignment brief is in
[`docs/ASSIGNMENT.md`](docs/ASSIGNMENT.md).

## Status

Early. The application skeleton runs; the verification pipeline is in progress.

## Requirements

- Node.js 20 or newer (developed on 22.17)
- npm 10 or newer

## Setup

```bash
npm install
npm run dev
```

The app runs at http://localhost:3000.

## Scripts

| Command         | Purpose                        |
| --------------- | ------------------------------ |
| `npm run dev`   | Start the dev server           |
| `npm run build` | Production build               |
| `npm start`     | Serve a production build       |
| `npm run lint`  | Lint with ESLint               |

## Approach

Verification is split into two independent stages so each can be tested and
swapped on its own:

1. **Extraction** reads the label image and returns the TTB fields as
   structured data.
2. **Comparison** checks each extracted field against the application value
   using rules specific to that field.

The comparison stage is deliberately not a single string match. The fields have
genuinely different tolerances: a brand name that differs only in casing is
still the same brand, an alcohol content of `45% Alc./Vol. (90 Proof)` and a
recorded `45` are the same figure, and the government health warning has to be
exact, because altered or re-cased warning text is itself grounds for
rejection.

## Tech stack

| Concern   | Choice                                  |
| --------- | --------------------------------------- |
| Framework | Next.js 16 (App Router)                 |
| Language  | TypeScript                              |
| UI        | React 19, Tailwind CSS v4               |
| API       | Next.js route handlers                  |
| Hosting   | Vercel                                  |

One framework covers the UI and the API, which keeps this a single codebase
with a single deployment — appropriate for a prototype that has to be handed
over as a working URL.

## Assumptions

- Standalone prototype. No integration with the COLA system, and no
  persistence of uploaded images or application data.
- Uploads are downscaled in the browser before being sent, to stay within the
  request body limit on Vercel's hosting tier and to keep verification within
  the response time budget the interviews called for.

## Limitations

Tracked as the implementation proceeds; see Status above.
