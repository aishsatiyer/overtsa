alter table public.sender_accounts
  add column if not exists photo_url text;
