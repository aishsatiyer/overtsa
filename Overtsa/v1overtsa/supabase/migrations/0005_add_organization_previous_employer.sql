alter table public.organizations
add column if not exists is_previous_employer boolean not null default false;
