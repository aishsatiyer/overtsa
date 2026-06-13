# Repository Guidance

## Project shape

This repo is a monorepo with:

* `apps/dashboard` for the Next.js internal app
* `apps/api` for the Fastify backend
* `apps/chrome-extension` for the LinkedIn extension
* `packages/shared` for shared contracts and types

## Current expectations

* Respect the product rules in `docs/product-spec.md`
* Respect system boundaries in `docs/architecture.md`
* Respect the entity model in `docs/data-model.md`
* Keep LinkedIn actions manual
* Do not introduce hidden automation

## Implementation posture

* Backend owns important workflow logic and database writes
* Dashboard and extension should stay thin relative to business logic
* Keep the extension active-page aware, not a hidden account monitor
