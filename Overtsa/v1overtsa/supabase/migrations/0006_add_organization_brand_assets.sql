alter table public.organizations
add column if not exists logo_url text;

alter table public.organizations
add column if not exists employee_count_text text;
