-- Minimal seed data for early local development.

insert into public.users (id, email, full_name, role)
values
  ('11111111-1111-1111-1111-111111111111', 'founder@overtly.local', 'Overtly Founder', 'admin'),
  ('22222222-2222-2222-2222-222222222222', 'cofounder@overtly.local', 'Overtly Cofounder', 'viewer')
on conflict (email) do nothing;

insert into public.sender_accounts (
  id,
  display_name,
  platform,
  internal_owner_user_id
)
values
  ('33333333-3333-3333-3333-333333333333', 'Aishwarya LinkedIn', 'linkedin', '11111111-1111-1111-1111-111111111111'),
  ('44444444-4444-4444-4444-444444444444', 'Sidharth LinkedIn', 'linkedin', '11111111-1111-1111-1111-111111111111')
on conflict do nothing;

insert into public.invite_templates (
  id,
  name,
  version_label,
  target_segment,
  template_text,
  created_by,
  updated_by
)
values
  (
    '55555555-5555-5555-5555-555555555555',
    'Agency Invite V1',
    'v1',
    'agency',
    'Hi {{first_name}}, we are building Overtly for PR and comms teams. We are rolling out free early access for agencies and would love to see if it is relevant for you or your team.',
    '11111111-1111-1111-1111-111111111111',
    '11111111-1111-1111-1111-111111111111'
  ),
  (
    '66666666-6666-6666-6666-666666666666',
    'In-house Invite V1',
    'v1',
    'in_house',
    'Hi {{first_name}}, we are building Overtly for PR and comms teams to automate core workflows and are rolling out free early access to in-house teams.',
    '11111111-1111-1111-1111-111111111111',
    '11111111-1111-1111-1111-111111111111'
  )
on conflict do nothing;
