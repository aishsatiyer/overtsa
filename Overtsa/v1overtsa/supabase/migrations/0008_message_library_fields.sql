alter table public.invite_templates
  add column if not exists audience_tags jsonb not null default '[]'::jsonb,
  add column if not exists notes text;
