# Overtly Internal GTM Tool

Internal outbound ops system for Overtly's manual LinkedIn invite workflow.

## Workspace

```txt
apps/
  dashboard          Next.js internal app
  api                Fastify backend API
  chrome-extension   LinkedIn capture extension
packages/
  shared             Shared types and contracts
supabase/
  migrations         Database migrations
  seed.sql           Local seed data
docs/
  product-spec.md
  architecture.md
  data-model.md
```

## Current status

This repository is scaffolded and ready to use with `npm` workspaces.

## Next steps

1. Install dependencies
2. Create the initial database schema
3. Build the dashboard, API, and extension foundations
