do $$
begin
  create type public.prospect_priority as enum ('low', 'medium', 'high', 'urgent');
exception
  when duplicate_object then null;
end $$;

alter table public.prospects
add column if not exists priority public.prospect_priority not null default 'medium';
