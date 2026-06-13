alter table public.prospects
  add column if not exists sender_account_id uuid references public.sender_accounts(id) on delete set null,
  add column if not exists invite_template_id uuid references public.invite_templates(id) on delete set null;

create index if not exists idx_prospects_sender_account_id on public.prospects (sender_account_id);
create index if not exists idx_prospects_invite_template_id on public.prospects (invite_template_id);
