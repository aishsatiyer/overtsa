create extension if not exists "pgcrypto";

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create type public.user_role as enum (
  'admin',
  'editor',
  'viewer'
);

create type public.organization_type as enum (
  'agency',
  'in_house',
  'brand',
  'startup',
  'consultancy',
  'other'
);

create type public.prospect_segment as enum (
  'agency',
  'in_house',
  'founder',
  'consultant',
  'other'
);

create type public.prospect_lifecycle_status as enum (
  'researched',
  'invite_sent',
  'accepted',
  'accepted_silent',
  'follow_up_active',
  'replied',
  'positive_interest',
  'deferred',
  'scheduling',
  'call_booked',
  'not_interested',
  'archived'
);

create type public.accepted_status as enum (
  'unknown',
  'pending',
  'accepted',
  'not_accepted'
);

create type public.follow_up_stage as enum (
  'none',
  'follow_up_1_due',
  'follow_up_1_sent',
  'follow_up_2_due',
  'follow_up_2_sent',
  'follow_up_3_due',
  'follow_up_3_sent',
  'replied',
  'snoozed',
  'archived'
);

create type public.outreach_attempt_status as enum (
  'draft',
  'sent',
  'pending_acceptance',
  'accepted',
  'no_acceptance',
  'retry_eligible',
  'follow_up_active',
  'replied',
  'completed',
  'archived'
);

create type public.follow_up_event_status as enum (
  'due',
  'sent',
  'skipped',
  'snoozed',
  'replied_after',
  'archived'
);

create type public.reply_category as enum (
  'positive_interest',
  'demo_request',
  'one_pager_request',
  'info_request',
  'email_handoff',
  'meeting_interest',
  'scheduling_response',
  'deferred',
  'constraint',
  'not_interested',
  'referral',
  'other'
);

create table public.users (
  id uuid primary key default gen_random_uuid(),
  email text not null unique,
  full_name text not null,
  role public.user_role not null default 'editor',
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.sender_accounts (
  id uuid primary key default gen_random_uuid(),
  display_name text not null,
  platform text not null default 'linkedin',
  platform_profile_url text,
  internal_owner_user_id uuid references public.users(id) on delete set null,
  is_active boolean not null default true,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.organizations (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  domain text,
  linkedin_company_url text,
  organization_type public.organization_type not null default 'other',
  segment public.prospect_segment,
  region text,
  location_text text,
  current_status text,
  alternate_contact_recommended boolean not null default false,
  contact_count integer not null default 0,
  active_opportunity_count integer not null default 0,
  last_contacted_at timestamptz,
  notes text,
  is_previous_employer boolean not null default false,
  created_by uuid references public.users(id) on delete set null,
  updated_by uuid references public.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.prospects (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  full_name text not null,
  linkedin_profile_url text not null unique,
  email text,
  title text not null,
  location_text text,
  region text,
  segment public.prospect_segment,
  icp_type text,
  lifecycle_status public.prospect_lifecycle_status not null default 'researched',
  accepted_status public.accepted_status not null default 'unknown',
  follow_up_stage public.follow_up_stage not null default 'none',
  next_action_type text,
  next_action_due_at timestamptz,
  last_contacted_at timestamptz,
  last_replied_at timestamptz,
  retry_recommended boolean not null default false,
  alternate_contact_recommended boolean not null default false,
  notes text,
  created_by uuid references public.users(id) on delete set null,
  updated_by uuid references public.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.invite_templates (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  version_label text not null,
  target_segment public.prospect_segment,
  template_text text not null,
  is_active boolean not null default true,
  created_by uuid references public.users(id) on delete set null,
  updated_by uuid references public.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.outreach_attempts (
  id uuid primary key default gen_random_uuid(),
  prospect_id uuid not null references public.prospects(id) on delete cascade,
  organization_id uuid not null references public.organizations(id) on delete cascade,
  sender_account_id uuid not null references public.sender_accounts(id) on delete restrict,
  invite_template_id uuid references public.invite_templates(id) on delete set null,
  attempt_number integer not null,
  sender_account_attempt_number integer not null,
  channel text not null default 'linkedin',
  attempt_type text not null default 'invite',
  invite_note_text text,
  sent_at timestamptz,
  status public.outreach_attempt_status not null default 'draft',
  status_detail text,
  retry_eligible_at timestamptz,
  follow_up_cadence_days jsonb not null default '[2,7,14]'::jsonb,
  organization_escalation_recommended boolean not null default false,
  last_outcome_at timestamptz,
  notes text,
  created_by uuid references public.users(id) on delete set null,
  updated_by uuid references public.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint outreach_attempts_prospect_attempt_unique unique (prospect_id, attempt_number),
  constraint outreach_attempts_sender_attempt_unique unique (prospect_id, sender_account_id, sender_account_attempt_number)
);

create table public.follow_up_events (
  id uuid primary key default gen_random_uuid(),
  outreach_attempt_id uuid not null references public.outreach_attempts(id) on delete cascade,
  prospect_id uuid not null references public.prospects(id) on delete cascade,
  organization_id uuid not null references public.organizations(id) on delete cascade,
  sender_account_id uuid not null references public.sender_accounts(id) on delete restrict,
  follow_up_number integer not null,
  message_text text,
  template_label text,
  suggested_by_ai boolean not null default false,
  sent_manually boolean not null default true,
  sent_at timestamptz,
  status public.follow_up_event_status not null default 'due',
  notes text,
  created_by uuid references public.users(id) on delete set null,
  updated_by uuid references public.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint follow_up_events_unique_number unique (outreach_attempt_id, follow_up_number)
);

create table public.replies (
  id uuid primary key default gen_random_uuid(),
  prospect_id uuid not null references public.prospects(id) on delete cascade,
  organization_id uuid not null references public.organizations(id) on delete cascade,
  outreach_attempt_id uuid not null references public.outreach_attempts(id) on delete cascade,
  reply_text text not null,
  replied_at timestamptz not null,
  reply_category public.reply_category not null default 'other',
  sentiment text,
  interest_level text,
  requested_asset text,
  email_mentioned text,
  scheduling_detail text,
  timing_signal text,
  constraint_type text,
  objection_text text,
  next_action_type text,
  notes text,
  created_by uuid references public.users(id) on delete set null,
  updated_by uuid references public.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index idx_organizations_name on public.organizations (name);
create index idx_prospects_organization_id on public.prospects (organization_id);
create index idx_prospects_lifecycle_status on public.prospects (lifecycle_status);
create index idx_prospects_follow_up_stage on public.prospects (follow_up_stage);
create index idx_outreach_attempts_prospect_id on public.outreach_attempts (prospect_id);
create index idx_outreach_attempts_sender_account_id on public.outreach_attempts (sender_account_id);
create index idx_outreach_attempts_status on public.outreach_attempts (status);
create index idx_follow_up_events_outreach_attempt_id on public.follow_up_events (outreach_attempt_id);
create index idx_replies_outreach_attempt_id on public.replies (outreach_attempt_id);
create index idx_replies_reply_category on public.replies (reply_category);

create trigger set_users_updated_at
before update on public.users
for each row execute function public.set_updated_at();

create trigger set_sender_accounts_updated_at
before update on public.sender_accounts
for each row execute function public.set_updated_at();

create trigger set_organizations_updated_at
before update on public.organizations
for each row execute function public.set_updated_at();

create trigger set_prospects_updated_at
before update on public.prospects
for each row execute function public.set_updated_at();

create trigger set_invite_templates_updated_at
before update on public.invite_templates
for each row execute function public.set_updated_at();

create trigger set_outreach_attempts_updated_at
before update on public.outreach_attempts
for each row execute function public.set_updated_at();

create trigger set_follow_up_events_updated_at
before update on public.follow_up_events
for each row execute function public.set_updated_at();

create trigger set_replies_updated_at
before update on public.replies
for each row execute function public.set_updated_at();
