import type {
  CreateResearchedProspectInput,
  CreateInviteTemplateInput,
  CreateOrganizationInput,
  CreateSenderAccountInput,
  InviteTemplate,
  LocationHeatmapEntry,
  Overview,
  LogInviteAttemptInput,
  OutreachAttempt,
  Organization,
  OrganizationPeoplePreview,
  OrganizationListResponse,
  ProspectListItem,
  SenderAccount,
  UpdateInviteTemplateInput,
  UpdateOrganizationInput,
  UpdateSenderAccountInput,
  UpdateProspectInput,
  UpdateProspectWorkflowInput
} from "@overtly/shared";
import { sql } from "../lib/db";

type ProspectRow = {
  id: string;
  full_name: string;
  linkedin_profile_url: string;
  photo_url: string | null;
  sender_account_id: string | null;
  invite_template_id: string | null;
  title: string;
  organization_id: string;
  organization_name: string;
  organization_type:
    | "agency"
    | "in_house"
    | "brand"
    | "startup"
    | "consultancy"
    | "other";
  priority: "low" | "medium" | "high" | "urgent";
  segment: "agency" | "in_house" | "founder" | "consultant" | "other" | null;
  lifecycle_status:
    | "researched"
    | "invite_sent"
    | "accepted"
    | "accepted_silent"
    | "follow_up_active"
    | "replied"
    | "positive_interest"
    | "deferred"
    | "scheduling"
    | "call_booked"
    | "not_interested"
    | "archived";
  accepted_status: "unknown" | "pending" | "accepted" | "not_accepted";
  follow_up_stage:
    | "none"
    | "follow_up_1_due"
    | "follow_up_1_sent"
    | "follow_up_2_due"
    | "follow_up_2_sent"
    | "follow_up_3_due"
    | "follow_up_3_sent"
    | "replied"
    | "snoozed"
    | "archived";
  next_action_type: string | null;
  latest_sender_account_name: string | null;
  location_text: string | null;
  region: string | null;
  notes: string | null;
  created_at: string | Date;
  updated_at: string | Date;
};

type SenderAccountRow = {
  id: string;
  display_name: string;
  platform: string;
  platform_profile_url: string | null;
  photo_url: string | null;
  is_active: boolean;
  notes: string | null;
  created_at: string | Date;
  updated_at: string | Date;
};

type OrganizationRow = {
  id: string;
  name: string;
  domain: string | null;
  logo_url: string | null;
  linkedin_company_url: string | null;
  organization_type:
    | "agency"
    | "in_house"
    | "brand"
    | "startup"
    | "consultancy"
    | "other";
  segment: ProspectRow["segment"];
  region: string | null;
  location_text: string | null;
  current_status: string | null;
  employee_count_text: string | null;
  alternate_contact_recommended: boolean;
  contact_count: number | string;
  active_opportunity_count: number | string;
  last_contacted_at: string | Date | null;
  notes: string | null;
  is_previous_employer: boolean;
  created_at: string | Date;
  updated_at: string | Date;
  people_preview?: unknown;
};

type OrganizationProspectPreviewRow = {
  id: string;
  full_name: string;
  title: string;
  linkedin_profile_url: string;
  lifecycle_status: ProspectRow["lifecycle_status"];
};

type InviteTemplateRow = {
  id: string;
  name: string;
  version_label: string;
  target_segment: ProspectRow["segment"];
  audience_tags: string[] | string | null;
  template_text: string;
  notes: string | null;
  is_active: boolean;
  created_at: string | Date;
  updated_at: string | Date;
};

type InviteTemplatePerformanceRow = {
  id: string;
  name: string;
  version_label: string;
  audience_tags: string[] | string | null;
  is_active: boolean;
  sends: number | string;
  accepts: number | string;
  replies: number | string;
  accept_rate: number | string;
  reply_rate: number | string;
  score: number | string;
  last_used_at: string | Date | null;
};

type OutreachAttemptRow = {
  id: string;
  prospect_id: string;
  organization_id: string;
  sender_account_id: string;
  sender_account_name: string;
  invite_template_id: string | null;
  invite_template_name: string | null;
  attempt_number: number;
  sender_account_attempt_number: number;
  channel: string;
  attempt_type: string;
  invite_note_text: string | null;
  sent_at: string | Date | null;
  status:
    | "draft"
    | "sent"
    | "pending_acceptance"
    | "accepted"
    | "no_acceptance"
    | "retry_eligible"
    | "follow_up_active"
    | "replied"
    | "completed"
    | "archived";
  status_detail: string | null;
  retry_eligible_at: string | Date | null;
  follow_up_cadence_days: number[] | string;
  organization_escalation_recommended: boolean;
  last_outcome_at: string | Date | null;
  notes: string | null;
  created_at: string | Date;
  updated_at: string | Date;
};

type OverviewRange = {
  startDate?: string | null;
  endDate?: string | null;
};

function toIsoString(value: string | Date): string {
  return value instanceof Date ? value.toISOString() : value;
}

let organizationPreviousEmployerColumnPromise: Promise<boolean> | null = null;

async function hasOrganizationPreviousEmployerColumn() {
  if (!organizationPreviousEmployerColumnPromise) {
    organizationPreviousEmployerColumnPromise = sql<{ exists: boolean }[]>`
      select exists (
        select 1
        from information_schema.columns
        where table_schema = 'public'
          and table_name = 'organizations'
          and column_name = 'is_previous_employer'
      ) as exists
    `.then((rows) => Boolean(rows[0]?.exists));
  }

  return organizationPreviousEmployerColumnPromise;
}

function toListItem(row: ProspectRow): ProspectListItem {
  return {
    id: row.id,
    fullName: row.full_name,
    linkedinProfileUrl: row.linkedin_profile_url,
    photoUrl: row.photo_url,
    senderAccountId: row.sender_account_id,
    inviteTemplateId: row.invite_template_id,
    title: row.title,
    organizationId: row.organization_id,
    organizationName: row.organization_name,
    organizationType: row.organization_type,
    priority: row.priority,
    segment: row.segment,
    lifecycleStatus: row.lifecycle_status,
    acceptedStatus: row.accepted_status,
    followUpStage: row.follow_up_stage,
    nextActionType: row.next_action_type,
    latestSenderAccountName: row.latest_sender_account_name,
    locationText: row.location_text,
    region: row.region,
    notes: row.notes,
    createdAt: toIsoString(row.created_at),
    updatedAt: toIsoString(row.updated_at)
  };
}

function toSenderAccount(row: SenderAccountRow): SenderAccount {
  return {
    id: row.id,
    displayName: row.display_name,
    platform: row.platform,
    platformProfileUrl: row.platform_profile_url,
    photoUrl: row.photo_url,
    isActive: row.is_active,
    notes: row.notes,
    createdAt: toIsoString(row.created_at),
    updatedAt: toIsoString(row.updated_at)
  };
}

function toOrganizationPeoplePreview(row: OrganizationProspectPreviewRow): OrganizationPeoplePreview {
  return {
    id: row.id,
    fullName: row.full_name,
    title: row.title,
    linkedinProfileUrl: row.linkedin_profile_url,
    lifecycleStatus: row.lifecycle_status
  };
}

function toOrganization(row: OrganizationRow): Organization {
  const peoplePreview = Array.isArray(row.people_preview)
    ? (row.people_preview as OrganizationProspectPreviewRow[]).map(toOrganizationPeoplePreview)
    : typeof row.people_preview === "string"
      ? (JSON.parse(row.people_preview) as OrganizationProspectPreviewRow[]).map(toOrganizationPeoplePreview)
      : [];

  return {
    id: row.id,
    name: row.name,
    domain: row.domain,
    logoUrl: row.logo_url,
    linkedinCompanyUrl: row.linkedin_company_url,
    organizationType: row.organization_type,
    segment: row.segment,
    region: row.region,
    locationText: row.location_text,
    currentStatus: row.current_status,
    employeeCountText: row.employee_count_text,
    alternateContactRecommended: row.alternate_contact_recommended,
    contactCount: Number(row.contact_count || 0),
    activeOpportunityCount: Number(row.active_opportunity_count || 0),
    lastContactedAt: row.last_contacted_at ? toIsoString(row.last_contacted_at) : null,
    notes: row.notes,
    isPreviousEmployer: row.is_previous_employer,
    peoplePreview,
    createdAt: toIsoString(row.created_at),
    updatedAt: toIsoString(row.updated_at)
  };
}

function toInviteTemplate(row: InviteTemplateRow): InviteTemplate {
  const audienceTags =
    Array.isArray(row.audience_tags)
      ? row.audience_tags
      : typeof row.audience_tags === "string"
        ? (JSON.parse(row.audience_tags) as string[])
        : [];

  return {
    id: row.id,
    name: row.name,
    versionLabel: row.version_label,
    targetSegment: row.target_segment,
    audienceTags,
    templateText: row.template_text,
    notes: row.notes,
    isActive: row.is_active,
    createdAt: toIsoString(row.created_at),
    updatedAt: toIsoString(row.updated_at)
  };
}

function toPerformanceRow(row: InviteTemplatePerformanceRow) {
  const audienceTags =
    Array.isArray(row.audience_tags)
      ? row.audience_tags
      : typeof row.audience_tags === "string"
        ? (JSON.parse(row.audience_tags) as string[])
        : [];

  return {
    id: row.id,
    name: row.name,
    versionLabel: row.version_label,
    audienceTags,
    isActive: row.is_active,
    sends: Number(row.sends ?? 0),
    accepts: Number(row.accepts ?? 0),
    replies: Number(row.replies ?? 0),
    acceptRate: Number(row.accept_rate ?? 0),
    replyRate: Number(row.reply_rate ?? 0),
    score: Number(row.score ?? 0),
    lastUsedAt: row.last_used_at ? toIsoString(row.last_used_at) : null
  };
}

function toOutreachAttempt(row: OutreachAttemptRow): OutreachAttempt {
  return {
    id: row.id,
    prospectId: row.prospect_id,
    organizationId: row.organization_id,
    senderAccountId: row.sender_account_id,
    senderAccountName: row.sender_account_name,
    inviteTemplateId: row.invite_template_id,
    inviteTemplateName: row.invite_template_name,
    attemptNumber: row.attempt_number,
    senderAccountAttemptNumber: row.sender_account_attempt_number,
    channel: row.channel,
    attemptType: row.attempt_type,
    inviteNoteText: row.invite_note_text,
    sentAt: row.sent_at ? toIsoString(row.sent_at) : null,
    status: row.status,
    statusDetail: row.status_detail,
    retryEligibleAt: row.retry_eligible_at ? toIsoString(row.retry_eligible_at) : null,
    followUpCadenceDays:
      typeof row.follow_up_cadence_days === "string"
        ? (JSON.parse(row.follow_up_cadence_days) as number[])
        : row.follow_up_cadence_days,
    organizationEscalationRecommended: row.organization_escalation_recommended,
    lastOutcomeAt: row.last_outcome_at ? toIsoString(row.last_outcome_at) : null,
    notes: row.notes,
    createdAt: toIsoString(row.created_at),
    updatedAt: toIsoString(row.updated_at)
  };
}

function normalizeLinkedInProfileUrl(value: string) {
  return value.trim().toLowerCase().replace(/\?.*$/, "").replace(/\/$/, "");
}

function normalizeOrganizationName(value: string) {
  return value.trim().replace(/\s+/g, " ");
}

function normalizeComparableUrl(value: string | null | undefined) {
  if (!value) {
    return "";
  }

  return value.trim().toLowerCase().replace(/^https?:\/\//, "").replace(/\/$/, "");
}

const countryNameAliases: Record<string, string> = {
  usa: "United States of America",
  us: "United States of America",
  "united states": "United States of America",
  "united states of america": "United States of America",
  uk: "United Kingdom",
  "united kingdom": "United Kingdom",
  england: "United Kingdom",
  scotland: "United Kingdom",
  wales: "United Kingdom",
  uae: "United Arab Emirates",
  "united arab emirates": "United Arab Emirates",
  ksa: "Saudi Arabia",
  "saudi arabia": "Saudi Arabia",
  czechia: "Czechia",
  "czech republic": "Czechia",
  "south korea": "South Korea",
  korea: "South Korea"
};

function normalizeCountryCandidate(value: string) {
  return value.trim().toLowerCase().replace(/\./g, "");
}

function extractCountryFromLocation(region: string | null, locationText: string | null) {
  const candidates = [locationText, region]
    .filter((value): value is string => Boolean(value?.trim()))
    .flatMap((value) => value.split("|"))
    .map((value) => value.trim())
    .filter(Boolean);

  for (const candidate of candidates) {
    const pieces = candidate
      .split(",")
      .map((value) => value.trim())
      .filter(Boolean);

    const lastPiece = pieces[pieces.length - 1] ?? candidate;
    const normalized = normalizeCountryCandidate(lastPiece);

    if (countryNameAliases[normalized]) {
      return countryNameAliases[normalized];
    }

    if (lastPiece.length >= 3 && !/\d/.test(lastPiece)) {
      return lastPiece;
    }
  }

  return null;
}

function buildRangeClause(column: string, range: OverviewRange) {
  const clauses: string[] = [];
  const values: string[] = [];

  if (range.startDate) {
    values.push(range.startDate);
    clauses.push(`${column} >= $${values.length}`);
  }

  if (range.endDate) {
    values.push(range.endDate);
    clauses.push(`${column} <= $${values.length}`);
  }

  return {
    clause: clauses.length ? ` and ${clauses.join(" and ")}` : "",
    values
  };
}

export class ProspectRepository {
  private async findOrCreateOrganization(
    input: Pick<UpdateProspectInput, "organizationName" | "organizationType">
  ) {
    const now = new Date().toISOString();
    const normalizedName = normalizeOrganizationName(input.organizationName);
    const supportsPreviousEmployerFlag = await hasOrganizationPreviousEmployerColumn();

    return sql.begin(async (tx) => {
      const existingOrganizations = await tx<{
        id: string;
        name: string;
        organization_type: ProspectRow["organization_type"];
      }[]>`
        select id, name, organization_type
        from public.organizations
        where lower(regexp_replace(trim(name), '\s+', ' ', 'g')) = lower(${normalizedName})
          ${supportsPreviousEmployerFlag ? sql`and is_previous_employer = false` : sql``}
        limit 1
      `;

      const existingOrganization = existingOrganizations[0];

      if (existingOrganization) {
        if (existingOrganization.organization_type !== input.organizationType) {
          await tx`
            update public.organizations
            set organization_type = ${input.organizationType},
                updated_at = ${now}
            where id = ${existingOrganization.id}
          `;
        }

        return {
          id: existingOrganization.id,
          name: existingOrganization.name,
          organization_type: input.organizationType
        };
      }

      const insertedOrganizations = await tx<{
        id: string;
        name: string;
        organization_type: ProspectRow["organization_type"];
      }[]>`
        ${supportsPreviousEmployerFlag
          ? sql`
              insert into public.organizations (
                name,
                organization_type,
                is_previous_employer,
                created_at,
                updated_at
              )
              values (
                ${normalizedName},
                ${input.organizationType},
                false,
                ${now},
                ${now}
              )
              returning id, name, organization_type
            `
          : sql`
              insert into public.organizations (
                name,
                organization_type,
                created_at,
                updated_at
              )
              values (
                ${normalizedName},
                ${input.organizationType},
                ${now},
                ${now}
              )
              returning id, name, organization_type
            `}
      `;

      return insertedOrganizations[0];
    });
  }

  async createResearchedProspect(
    input: CreateResearchedProspectInput
  ): Promise<ProspectListItem> {
    const now = new Date().toISOString();
    const organization = await this.findOrCreateOrganization(input);

    const existingProspects = await sql<{ id: string }[]>`
      select id
      from public.prospects
      where linkedin_profile_url = ${input.linkedinProfileUrl}
      limit 1
    `;

    if (existingProspects[0]) {
      const updated = await sql<ProspectRow[]>`
        update public.prospects
        set
          organization_id = ${organization.id},
          full_name = ${input.fullName.trim()},
          photo_url = ${input.photoUrl ?? null},
          sender_account_id = ${input.senderAccountId ?? null},
          invite_template_id = ${input.inviteTemplateId ?? null},
          title = ${input.title.trim()},
          priority = ${input.priority ?? "medium"},
          segment = ${input.segment ?? null},
          location_text = ${input.locationText ?? null},
          region = ${input.region ?? null},
          icp_type = ${input.icpType ?? null},
          notes = ${input.notes ?? null},
          updated_at = ${now}
        from public.organizations
        where public.prospects.id = ${existingProspects[0].id}
          and public.organizations.id = public.prospects.organization_id
        returning
          public.prospects.id,
          public.prospects.full_name,
          public.prospects.linkedin_profile_url,
          public.prospects.photo_url,
          public.prospects.sender_account_id,
          public.prospects.invite_template_id,
          public.prospects.title,
          public.prospects.organization_id,
          public.organizations.name as organization_name,
          public.organizations.organization_type,
          public.prospects.priority,
          public.prospects.segment,
          public.prospects.lifecycle_status,
          public.prospects.accepted_status,
          public.prospects.follow_up_stage,
          public.prospects.next_action_type,
          null::text as latest_sender_account_name,
          public.prospects.location_text,
          public.prospects.region,
          public.prospects.notes,
          public.prospects.created_at,
          public.prospects.updated_at
      `;

      return toListItem(updated[0]);
    }

    const inserted = await sql<ProspectRow[]>`
      with inserted as (
        insert into public.prospects (
          organization_id,
          full_name,
          linkedin_profile_url,
          photo_url,
          sender_account_id,
          invite_template_id,
          title,
          priority,
          location_text,
          region,
          segment,
          icp_type,
          lifecycle_status,
          accepted_status,
          follow_up_stage,
          notes,
          created_at,
          updated_at
        )
        values (
          ${organization.id},
          ${input.fullName.trim()},
          ${input.linkedinProfileUrl},
          ${input.photoUrl ?? null},
          ${input.senderAccountId ?? null},
          ${input.inviteTemplateId ?? null},
          ${input.title.trim()},
          ${input.priority ?? "medium"},
          ${input.locationText ?? null},
          ${input.region ?? null},
          ${input.segment ?? null},
          ${input.icpType ?? null},
          'researched',
          'unknown',
          'none',
          ${input.notes ?? null},
          ${now},
          ${now}
        )
        returning *
      )
      select
        inserted.id,
        inserted.full_name,
        inserted.linkedin_profile_url,
        inserted.photo_url,
        inserted.sender_account_id,
        inserted.invite_template_id,
        inserted.title,
        inserted.organization_id,
        organizations.name as organization_name,
        organizations.organization_type,
        inserted.priority,
        inserted.segment,
        inserted.lifecycle_status,
        inserted.accepted_status,
        inserted.follow_up_stage,
        inserted.next_action_type,
        null::text as latest_sender_account_name,
        inserted.location_text,
        inserted.region,
        inserted.notes,
        inserted.created_at,
        inserted.updated_at
      from inserted
      join public.organizations on organizations.id = inserted.organization_id
    `;

    return toListItem(inserted[0]);
  }

  async listProspects(): Promise<ProspectListItem[]> {
    const rows = await sql<ProspectRow[]>`
      select
        prospects.id,
        prospects.full_name,
        prospects.linkedin_profile_url,
        prospects.photo_url,
        prospects.sender_account_id,
        prospects.invite_template_id,
        prospects.title,
        prospects.organization_id,
        organizations.name as organization_name,
        organizations.organization_type,
        prospects.priority,
        prospects.segment,
        prospects.lifecycle_status,
        prospects.accepted_status,
        prospects.follow_up_stage,
        prospects.next_action_type,
        latest_attempt.sender_account_name as latest_sender_account_name,
        prospects.location_text,
        prospects.region,
        prospects.notes,
        prospects.created_at,
        prospects.updated_at
      from public.prospects
      join public.organizations on organizations.id = prospects.organization_id
      left join lateral (
        select sender_accounts.display_name as sender_account_name
        from public.outreach_attempts
        join public.sender_accounts on sender_accounts.id = outreach_attempts.sender_account_id
        where outreach_attempts.prospect_id = prospects.id
        order by outreach_attempts.sent_at desc nulls last, outreach_attempts.created_at desc
        limit 1
      ) as latest_attempt on true
      order by prospects.created_at desc
    `;

    return rows.map(toListItem);
  }

  async getOverview(range: OverviewRange = {}): Promise<Overview> {
    const inviteRange = buildRangeClause("sent_at", range);
    const prospectRange = buildRangeClause("updated_at", range);
    const followUpRange = buildRangeClause("next_action_due_at", range);

    const invitesSentRows = await sql.unsafe<{ count: number }[]>(
      `
      select count(*)::int as count
      from public.outreach_attempts
      where attempt_type = 'invite'${inviteRange.clause}
    `,
      inviteRange.values as never[]
    );

    const acceptedRows = await sql.unsafe<{ count: number }[]>(
      `
      select count(*)::int as count
      from public.prospects
      where accepted_status = 'accepted'${prospectRange.clause}
    `,
      prospectRange.values as never[]
    );

    const acceptedSilentRows = await sql.unsafe<{ count: number }[]>(
      `
      select count(*)::int as count
      from public.prospects
      where lifecycle_status = 'accepted_silent'${prospectRange.clause}
    `,
      prospectRange.values as never[]
    );

    const followUpsDueRows = await sql.unsafe<{ count: number }[]>(
      `
      select count(*)::int as count
      from public.prospects
      where
        next_action_due_at is not null
        and next_action_type like 'send_follow_up_%'${followUpRange.clause}
    `,
      followUpRange.values as never[]
    );

    const positiveInterestRows = await sql.unsafe<{ count: number }[]>(
      `
      select count(*)::int as count
      from public.prospects
      where lifecycle_status = 'positive_interest'${prospectRange.clause}
    `,
      prospectRange.values as never[]
    );

    const callsBookedRows = await sql.unsafe<{ count: number }[]>(
      `
      select count(*)::int as count
      from public.prospects
      where lifecycle_status = 'call_booked'${prospectRange.clause}
    `,
      prospectRange.values as never[]
    );

    return {
      invitesSent: Number(invitesSentRows[0]?.count ?? 0),
      accepted: Number(acceptedRows[0]?.count ?? 0),
      acceptedSilent: Number(acceptedSilentRows[0]?.count ?? 0),
      followUpsDue: Number(followUpsDueRows[0]?.count ?? 0),
      positiveInterest: Number(positiveInterestRows[0]?.count ?? 0),
      callsBooked: Number(callsBookedRows[0]?.count ?? 0)
    };
  }

  async getLocationHeatmap(range: OverviewRange = {}): Promise<LocationHeatmapEntry[]> {
    const prospectRange = buildRangeClause("updated_at", range);
    const rows = await sql.unsafe<{
      location_text: string | null;
      region: string | null;
    }[]>(
      `
      select location_text, region
      from public.prospects
      where (location_text is not null or region is not null)${prospectRange.clause}
    `,
      prospectRange.values as never[]
    );

    const counts = new Map<string, number>();

    for (const row of rows) {
      const country = extractCountryFromLocation(row.region, row.location_text);

      if (!country) continue;

      counts.set(country, (counts.get(country) ?? 0) + 1);
    }

    return Array.from(counts.entries())
      .map(([country, count]) => ({ country, count }))
      .sort((left, right) => right.count - left.count || left.country.localeCompare(right.country));
  }

  async getProspectByLinkedInUrl(linkedinProfileUrl: string): Promise<ProspectListItem | null> {
    const rows = await sql<ProspectRow[]>`
      select
        prospects.id,
        prospects.full_name,
        prospects.linkedin_profile_url,
        prospects.photo_url,
        prospects.sender_account_id,
        prospects.invite_template_id,
        prospects.title,
        prospects.organization_id,
        organizations.name as organization_name,
        organizations.organization_type,
        prospects.priority,
        prospects.segment,
        prospects.lifecycle_status,
        prospects.accepted_status,
        prospects.follow_up_stage,
        prospects.next_action_type,
        latest_attempt.sender_account_name as latest_sender_account_name,
        prospects.location_text,
        prospects.region,
        prospects.notes,
        prospects.created_at,
        prospects.updated_at
      from public.prospects
      join public.organizations on organizations.id = prospects.organization_id
      left join lateral (
        select sender_accounts.display_name as sender_account_name
        from public.outreach_attempts
        join public.sender_accounts on sender_accounts.id = outreach_attempts.sender_account_id
        where outreach_attempts.prospect_id = prospects.id
        order by outreach_attempts.sent_at desc nulls last, outreach_attempts.created_at desc
        limit 1
      ) as latest_attempt on true
      where regexp_replace(lower(trim(trailing '/' from prospects.linkedin_profile_url)), '\\?.*$', '', 'g') =
        ${normalizeLinkedInProfileUrl(linkedinProfileUrl)}
      limit 1
    `;

    return rows[0] ? toListItem(rows[0]) : null;
  }

  async listSenderAccounts(): Promise<SenderAccount[]> {
    const rows = await sql<SenderAccountRow[]>`
      select
        id,
        display_name,
        platform,
        platform_profile_url,
        photo_url,
        is_active,
        notes,
        created_at,
        updated_at
      from public.sender_accounts
      order by created_at asc
    `;

    return rows.map(toSenderAccount);
  }

  async createSenderAccount(input: CreateSenderAccountInput): Promise<SenderAccount> {
    const now = new Date().toISOString();
    const rows = await sql<SenderAccountRow[]>`
      insert into public.sender_accounts (
        display_name,
        platform,
        platform_profile_url,
        photo_url,
        is_active,
        notes,
        created_at,
        updated_at
      )
      values (
        ${input.displayName.trim()},
        ${input.platform.trim() || "linkedin"},
        ${input.platformProfileUrl ?? null},
        ${input.photoUrl ?? null},
        ${input.isActive ?? true},
        ${input.notes ?? null},
        ${now},
        ${now}
      )
      returning
        id,
        display_name,
        platform,
        platform_profile_url,
        photo_url,
        is_active,
        notes,
        created_at,
        updated_at
    `;

    return toSenderAccount(rows[0]);
  }

  async updateSenderAccount(
    id: string,
    input: UpdateSenderAccountInput
  ): Promise<SenderAccount | null> {
    const now = new Date().toISOString();
    const rows = await sql<SenderAccountRow[]>`
      update public.sender_accounts
      set
        display_name = ${input.displayName.trim()},
        platform = ${input.platform.trim() || "linkedin"},
        platform_profile_url = ${input.platformProfileUrl ?? null},
        photo_url = ${input.photoUrl ?? null},
        is_active = ${input.isActive ?? true},
        notes = ${input.notes ?? null},
        updated_at = ${now}
      where id = ${id}
      returning
        id,
        display_name,
        platform,
        platform_profile_url,
        photo_url,
        is_active,
        notes,
        created_at,
        updated_at
    `;

    return rows[0] ? toSenderAccount(rows[0]) : null;
  }

  async listInviteTemplates(): Promise<InviteTemplate[]> {
    const rows = await sql<InviteTemplateRow[]>`
      select
        id,
        name,
        version_label,
        target_segment,
        audience_tags,
        template_text,
        notes,
        is_active,
        created_at,
        updated_at
      from public.invite_templates
      order by created_at asc
    `;

    return rows.map(toInviteTemplate);
  }

  async createInviteTemplate(input: CreateInviteTemplateInput): Promise<InviteTemplate> {
    const now = new Date().toISOString();
    const rows = await sql<InviteTemplateRow[]>`
      insert into public.invite_templates (
        name,
        version_label,
        target_segment,
        audience_tags,
        template_text,
        notes,
        is_active,
        created_at,
        updated_at
      )
      values (
        ${input.name.trim()},
        ${input.versionLabel.trim()},
        ${input.targetSegment ?? null},
        ${JSON.stringify(input.audienceTags ?? [])},
        ${input.templateText.trim()},
        ${input.notes ?? null},
        ${input.isActive ?? true},
        ${now},
        ${now}
      )
      returning
        id,
        name,
        version_label,
        target_segment,
        audience_tags,
        template_text,
        notes,
        is_active,
        created_at,
        updated_at
    `;

    return toInviteTemplate(rows[0]);
  }

  async updateInviteTemplate(
    id: string,
    input: UpdateInviteTemplateInput
  ): Promise<InviteTemplate | null> {
    const now = new Date().toISOString();
    const rows = await sql<InviteTemplateRow[]>`
      update public.invite_templates
      set
        name = ${input.name.trim()},
        version_label = ${input.versionLabel.trim()},
        target_segment = ${input.targetSegment ?? null},
        audience_tags = ${JSON.stringify(input.audienceTags ?? [])},
        template_text = ${input.templateText.trim()},
        notes = ${input.notes ?? null},
        is_active = ${input.isActive ?? true},
        updated_at = ${now}
      where id = ${id}
      returning
        id,
        name,
        version_label,
        target_segment,
        audience_tags,
        template_text,
        notes,
        is_active,
        created_at,
        updated_at
    `;

    return rows[0] ? toInviteTemplate(rows[0]) : null;
  }

  async deleteInviteTemplate(id: string): Promise<boolean> {
    const rows = await sql<{ id: string }[]>`
      delete from public.invite_templates
      where id = ${id}
      returning id
    `;

    return Boolean(rows[0]);
  }

  async listInviteTemplatePerformance(): Promise<
    Array<{
      id: string;
      name: string;
      versionLabel: string;
      audienceTags: string[];
      isActive: boolean;
      sends: number;
      accepts: number;
      replies: number;
      acceptRate: number;
      replyRate: number;
      score: number;
      lastUsedAt: string | null;
    }>
  > {
    const rows = await sql<InviteTemplatePerformanceRow[]>`
      with latest_attempt_per_prospect as (
        select distinct on (outreach_attempts.prospect_id)
          outreach_attempts.prospect_id,
          outreach_attempts.invite_template_id,
          outreach_attempts.sent_at,
          outreach_attempts.created_at
        from public.outreach_attempts
        order by outreach_attempts.prospect_id, outreach_attempts.sent_at desc nulls last, outreach_attempts.created_at desc
      ),
      sends_by_template as (
        select
          invite_template_id,
          count(*)::int as sends,
          max(sent_at) as last_used_at
        from public.outreach_attempts
        where invite_template_id is not null
        group by invite_template_id
      ),
      outcomes_by_template as (
        select
          latest_attempt_per_prospect.invite_template_id,
          count(distinct case when prospects.accepted_status = 'accepted' then prospects.id end)::int as accepts,
          count(distinct case when prospects.lifecycle_status = 'replied' then prospects.id end)::int as replies
        from latest_attempt_per_prospect
        join public.prospects on prospects.id = latest_attempt_per_prospect.prospect_id
        where latest_attempt_per_prospect.invite_template_id is not null
        group by latest_attempt_per_prospect.invite_template_id
      )
      select
        invite_templates.id,
        invite_templates.name,
        invite_templates.version_label,
        invite_templates.audience_tags,
        invite_templates.is_active,
        coalesce(sends_by_template.sends, 0) as sends,
        coalesce(outcomes_by_template.accepts, 0) as accepts,
        coalesce(outcomes_by_template.replies, 0) as replies,
        case
          when coalesce(sends_by_template.sends, 0) = 0 then 0
          else round(
            coalesce(outcomes_by_template.accepts, 0)::numeric * 100
            / coalesce(sends_by_template.sends, 0),
            1
          )
        end as accept_rate,
        case
          when coalesce(sends_by_template.sends, 0) = 0 then 0
          else round(
            coalesce(outcomes_by_template.replies, 0)::numeric * 100
            / coalesce(sends_by_template.sends, 0),
            1
          )
        end as reply_rate,
        case
          when coalesce(sends_by_template.sends, 0) = 0 then 0
          else round(
            (
              (
                coalesce(outcomes_by_template.accepts, 0)::numeric * 100
                / coalesce(sends_by_template.sends, 0)
              ) * 0.45
            ) + (
              (
                coalesce(outcomes_by_template.replies, 0)::numeric * 100
                / coalesce(sends_by_template.sends, 0)
              ) * 0.55
            ),
            1
          )
        end as score,
        sends_by_template.last_used_at
      from public.invite_templates
      left join sends_by_template on sends_by_template.invite_template_id = invite_templates.id
      left join outcomes_by_template on outcomes_by_template.invite_template_id = invite_templates.id
      order by invite_templates.updated_at desc, invite_templates.created_at desc
    `;

    return rows.map((row) => ({
      id: row.id,
      name: row.name,
      versionLabel: row.version_label,
      audienceTags:
        Array.isArray(row.audience_tags)
          ? row.audience_tags
          : typeof row.audience_tags === "string"
            ? (JSON.parse(row.audience_tags) as string[])
            : [],
      isActive: row.is_active,
      sends: Number(row.sends ?? 0),
      accepts: Number(row.accepts ?? 0),
      replies: Number(row.replies ?? 0),
      acceptRate: Number(row.accept_rate ?? 0),
      replyRate: Number(row.reply_rate ?? 0),
      score: Number(row.score ?? 0),
      lastUsedAt: row.last_used_at ? toIsoString(row.last_used_at) : null
    }));
  }

  async listOutreachAttempts(prospectId: string): Promise<OutreachAttempt[]> {
    const rows = await sql<OutreachAttemptRow[]>`
      select
        outreach_attempts.id,
        outreach_attempts.prospect_id,
        outreach_attempts.organization_id,
        outreach_attempts.sender_account_id,
        sender_accounts.display_name as sender_account_name,
        outreach_attempts.invite_template_id,
        invite_templates.name as invite_template_name,
        outreach_attempts.attempt_number,
        outreach_attempts.sender_account_attempt_number,
        outreach_attempts.channel,
        outreach_attempts.attempt_type,
        outreach_attempts.invite_note_text,
        outreach_attempts.sent_at,
        outreach_attempts.status,
        outreach_attempts.status_detail,
        outreach_attempts.retry_eligible_at,
        outreach_attempts.follow_up_cadence_days,
        outreach_attempts.organization_escalation_recommended,
        outreach_attempts.last_outcome_at,
        outreach_attempts.notes,
        outreach_attempts.created_at,
        outreach_attempts.updated_at
      from public.outreach_attempts
      join public.sender_accounts on sender_accounts.id = outreach_attempts.sender_account_id
      left join public.invite_templates on invite_templates.id = outreach_attempts.invite_template_id
      where outreach_attempts.prospect_id = ${prospectId}
      order by outreach_attempts.sent_at desc nulls last, outreach_attempts.created_at desc
    `;

    return rows.map(toOutreachAttempt);
  }

  async createInviteAttempt(
    prospectId: string,
    input: LogInviteAttemptInput
  ): Promise<{ prospect: ProspectListItem; outreachAttempt: OutreachAttempt } | null> {
    const now = new Date().toISOString();
    const sentAt = input.sentAt ?? now;

    return sql.begin(async (tx) => {
      const prospectRows = await tx<ProspectRow[]>`
        select *
        from public.prospects
        where id = ${prospectId}
        limit 1
      `;

      const prospect = prospectRows[0];

      if (!prospect) {
        return null;
      }

      const senderAccountRows = await tx<{ id: string }[]>`
        select id
        from public.sender_accounts
        where id = ${input.senderAccountId}
          and is_active = true
        limit 1
      `;

      if (!senderAccountRows[0]) {
        return null;
      }

      const attemptCountRows = await tx<{ count: string }[]>`
        select count(*)::text as count
        from public.outreach_attempts
        where prospect_id = ${prospectId}
      `;

      const senderAttemptCountRows = await tx<{ count: string }[]>`
        select count(*)::text as count
        from public.outreach_attempts
        where prospect_id = ${prospectId}
          and sender_account_id = ${input.senderAccountId}
      `;

      const attemptNumber = Number(attemptCountRows[0]?.count ?? "0") + 1;
      const senderAccountAttemptNumber = Number(senderAttemptCountRows[0]?.count ?? "0") + 1;

      const outreachRows = await tx<OutreachAttemptRow[]>`
        with inserted as (
          insert into public.outreach_attempts (
            prospect_id,
            organization_id,
            sender_account_id,
            invite_template_id,
            attempt_number,
            sender_account_attempt_number,
            channel,
            attempt_type,
            invite_note_text,
            sent_at,
            status,
            status_detail,
            retry_eligible_at,
            organization_escalation_recommended,
            notes,
            created_at,
            updated_at
          )
          values (
            ${prospectId},
            ${prospect.organization_id},
            ${input.senderAccountId},
            ${input.inviteTemplateId ?? null},
            ${attemptNumber},
            ${senderAccountAttemptNumber},
            'linkedin',
            'invite',
            ${input.inviteNoteText ?? null},
            ${sentAt},
            'sent',
            'Invite logged manually.',
            null,
            false,
            ${input.notes ?? null},
            ${now},
            ${now}
          )
          returning *
        )
        select
          inserted.id,
          inserted.prospect_id,
          inserted.organization_id,
          inserted.sender_account_id,
          sender_accounts.display_name as sender_account_name,
          inserted.invite_template_id,
          invite_templates.name as invite_template_name,
          inserted.attempt_number,
          inserted.sender_account_attempt_number,
          inserted.channel,
          inserted.attempt_type,
          inserted.invite_note_text,
          inserted.sent_at,
          inserted.status,
          inserted.status_detail,
          inserted.retry_eligible_at,
          inserted.follow_up_cadence_days,
          inserted.organization_escalation_recommended,
          inserted.last_outcome_at,
          inserted.notes,
          inserted.created_at,
          inserted.updated_at
        from inserted
        join public.sender_accounts on sender_accounts.id = inserted.sender_account_id
        left join public.invite_templates on invite_templates.id = inserted.invite_template_id
      `;

      const updatedProspectRows = await tx<ProspectRow[]>`
        update public.prospects
        set
          lifecycle_status = 'invite_sent',
          accepted_status = 'pending',
          follow_up_stage = 'follow_up_1_due',
          next_action_type = 'send_follow_up_1',
          next_action_due_at = (${sentAt})::timestamptz + interval '2 days',
          last_contacted_at = ${sentAt},
          updated_at = ${now}
        where id = ${prospectId}
        returning *
      `;

      await tx`
        update public.organizations
        set
          last_contacted_at = ${sentAt},
          updated_at = ${now}
        where id = ${prospect.organization_id}
      `;

      const updatedProspect = await tx<ProspectRow[]>`
        select
          prospects.id,
          prospects.full_name,
          prospects.linkedin_profile_url,
          prospects.photo_url,
          prospects.sender_account_id,
          prospects.invite_template_id,
          prospects.title,
          prospects.organization_id,
          organizations.name as organization_name,
          organizations.organization_type,
          prospects.priority,
          prospects.segment,
          prospects.lifecycle_status,
          prospects.accepted_status,
          prospects.follow_up_stage,
          prospects.next_action_type,
          latest_attempt.sender_account_name as latest_sender_account_name,
          prospects.location_text,
          prospects.region,
          prospects.notes,
          prospects.created_at,
          prospects.updated_at
        from public.prospects
        join public.organizations on organizations.id = prospects.organization_id
        left join lateral (
          select sender_accounts.display_name as sender_account_name
          from public.outreach_attempts
          join public.sender_accounts on sender_accounts.id = outreach_attempts.sender_account_id
          where outreach_attempts.prospect_id = prospects.id
          order by outreach_attempts.sent_at desc nulls last, outreach_attempts.created_at desc
          limit 1
        ) as latest_attempt on true
        where prospects.id = ${prospectId}
        limit 1
      `;

      return {
        prospect: toListItem(updatedProspect[0]),
        outreachAttempt: toOutreachAttempt(outreachRows[0])
      };
    });
  }

  async getProspectById(id: string): Promise<ProspectListItem | null> {
    const rows = await sql<ProspectRow[]>`
      select
        prospects.id,
        prospects.full_name,
        prospects.linkedin_profile_url,
        prospects.photo_url,
        prospects.sender_account_id,
        prospects.invite_template_id,
        prospects.title,
        prospects.organization_id,
        organizations.name as organization_name,
        organizations.organization_type,
        prospects.priority,
        prospects.segment,
        prospects.lifecycle_status,
        prospects.accepted_status,
        prospects.follow_up_stage,
        prospects.next_action_type,
        latest_attempt.sender_account_name as latest_sender_account_name,
        prospects.location_text,
        prospects.region,
        prospects.notes,
        prospects.created_at,
        prospects.updated_at
      from public.prospects
      join public.organizations on organizations.id = prospects.organization_id
      left join lateral (
        select sender_accounts.display_name as sender_account_name
        from public.outreach_attempts
        join public.sender_accounts on sender_accounts.id = outreach_attempts.sender_account_id
        where outreach_attempts.prospect_id = prospects.id
        order by outreach_attempts.sent_at desc nulls last, outreach_attempts.created_at desc
        limit 1
      ) as latest_attempt on true
      where prospects.id = ${id}
      limit 1
    `;

    return rows[0] ? toListItem(rows[0]) : null;
  }

  async updateProspectPriority(
    id: string,
    priority: ProspectRow["priority"]
  ): Promise<ProspectListItem | null> {
    const now = new Date().toISOString();

    const rows = await sql<ProspectRow[]>`
      update public.prospects
      set
        priority = ${priority},
        updated_at = ${now}
      from public.organizations
      where public.prospects.id = ${id}
        and public.organizations.id = public.prospects.organization_id
      returning
        public.prospects.id,
        public.prospects.full_name,
        public.prospects.linkedin_profile_url,
        public.prospects.photo_url,
        public.prospects.sender_account_id,
        public.prospects.invite_template_id,
        public.prospects.title,
        public.prospects.organization_id,
        public.organizations.name as organization_name,
        public.organizations.organization_type,
        public.prospects.priority,
        public.prospects.segment,
        public.prospects.lifecycle_status,
        public.prospects.accepted_status,
        public.prospects.follow_up_stage,
        public.prospects.next_action_type,
        null::text as latest_sender_account_name,
        public.prospects.location_text,
        public.prospects.region,
        public.prospects.notes,
        public.prospects.created_at,
        public.prospects.updated_at
    `;

    return rows[0] ? toListItem(rows[0]) : null;
  }

  async updateProspect(id: string, input: UpdateProspectInput): Promise<ProspectListItem | null> {
    const now = new Date().toISOString();
    const organization = await this.findOrCreateOrganization(input);

    const rows = await sql<ProspectRow[]>`
      update public.prospects
      set
        organization_id = ${organization.id},
        full_name = ${input.fullName.trim()},
        linkedin_profile_url = ${input.linkedinProfileUrl},
        photo_url = ${input.photoUrl ?? null},
        sender_account_id = ${input.senderAccountId ?? null},
        invite_template_id = ${input.inviteTemplateId ?? null},
        title = ${input.title.trim()},
        priority = ${input.priority},
        segment = ${input.segment ?? null},
        location_text = ${input.locationText ?? null},
        region = ${input.region ?? null},
        icp_type = ${input.icpType ?? null},
        notes = ${input.notes ?? null},
        updated_at = ${now}
      from public.organizations
      where public.prospects.id = ${id}
        and public.organizations.id = public.prospects.organization_id
      returning
        public.prospects.id,
        public.prospects.full_name,
        public.prospects.linkedin_profile_url,
        public.prospects.photo_url,
        public.prospects.sender_account_id,
        public.prospects.invite_template_id,
        public.prospects.title,
        public.prospects.organization_id,
        public.organizations.name as organization_name,
        public.organizations.organization_type,
        public.prospects.priority,
        public.prospects.segment,
        public.prospects.lifecycle_status,
        public.prospects.accepted_status,
        public.prospects.follow_up_stage,
        public.prospects.next_action_type,
        null::text as latest_sender_account_name,
        public.prospects.location_text,
        public.prospects.region,
        public.prospects.notes,
        public.prospects.created_at,
        public.prospects.updated_at
    `;

    return rows[0] ? toListItem(rows[0]) : null;
  }

  async updateProspectWorkflow(
    id: string,
    input: UpdateProspectWorkflowInput
  ): Promise<ProspectListItem | null> {
    const now = new Date().toISOString();

    const setFragments: string[] = [];
    const values: unknown[] = [];
    const pushValue = (value: unknown) => {
      values.push(value);
      return `$${values.length}`;
    };

    if (input.lifecycleStatus) {
      setFragments.push(`lifecycle_status = ${pushValue(input.lifecycleStatus)}`);
    }

    if (input.acceptedStatus) {
      setFragments.push(`accepted_status = ${pushValue(input.acceptedStatus)}`);
    }

    if (input.followUpStage) {
      setFragments.push(`follow_up_stage = ${pushValue(input.followUpStage)}`);
    }

    if (input.nextActionType !== undefined) {
      setFragments.push(`next_action_type = ${pushValue(input.nextActionType)}`);
    }

    if (input.nextActionDueAt !== undefined) {
      setFragments.push(`next_action_due_at = ${pushValue(input.nextActionDueAt)}`);
    }

    if (input.lastContactedAt !== undefined) {
      setFragments.push(`last_contacted_at = ${pushValue(input.lastContactedAt)}`);
    }

    if (input.lastRepliedAt !== undefined) {
      setFragments.push(`last_replied_at = ${pushValue(input.lastRepliedAt)}`);
    }

    if (input.retryRecommended !== undefined) {
      setFragments.push(`retry_recommended = ${pushValue(input.retryRecommended)}`);
    }

    if (input.alternateContactRecommended !== undefined) {
      setFragments.push(`alternate_contact_recommended = ${pushValue(input.alternateContactRecommended)}`);
    }

    if (!setFragments.length) {
      return this.getProspectById(id);
    }

    setFragments.push(`updated_at = ${pushValue(now)}`);
    values.push(id);
    const idPlaceholder = `$${values.length}`;

    const query = sql.unsafe<ProspectRow[]>(`
      update public.prospects
      set ${setFragments.join(", ")}
      where id = ${idPlaceholder}
      returning *
    `, values as never[]);

    const updatedProspectRows = await query;

    if (!updatedProspectRows[0]) {
      return null;
    }

    const joinedRows = await sql<ProspectRow[]>`
      select
        prospects.id,
        prospects.full_name,
        prospects.linkedin_profile_url,
        prospects.photo_url,
        prospects.sender_account_id,
        prospects.invite_template_id,
        prospects.title,
        prospects.organization_id,
        organizations.name as organization_name,
        organizations.organization_type,
        prospects.priority,
        prospects.segment,
        prospects.lifecycle_status,
        prospects.accepted_status,
        prospects.follow_up_stage,
        prospects.next_action_type,
        latest_attempt.sender_account_name as latest_sender_account_name,
        prospects.location_text,
        prospects.region,
        prospects.notes,
        prospects.created_at,
        prospects.updated_at
      from public.prospects
      join public.organizations on organizations.id = prospects.organization_id
      left join lateral (
        select sender_accounts.display_name as sender_account_name
        from public.outreach_attempts
        join public.sender_accounts on sender_accounts.id = outreach_attempts.sender_account_id
        where outreach_attempts.prospect_id = prospects.id
        order by outreach_attempts.sent_at desc nulls last, outreach_attempts.created_at desc
        limit 1
      ) as latest_attempt on true
      where prospects.id = ${id}
      limit 1
    `;

    return joinedRows[0] ? toListItem(joinedRows[0]) : null;
  }

  async deleteProspect(id: string): Promise<boolean> {
    const rows = await sql<{ id: string }[]>`
      delete from public.prospects
      where id = ${id}
      returning id
    `;

    return Boolean(rows[0]);
  }

  async listOrganizations(): Promise<Organization[]> {
    const supportsPreviousEmployerFlag = await hasOrganizationPreviousEmployerColumn();
    const rows = supportsPreviousEmployerFlag
      ? await sql<OrganizationRow[]>`
          select
            organizations.id,
            organizations.name,
            organizations.domain,
            organizations.logo_url,
            organizations.linkedin_company_url,
            organizations.organization_type,
            organizations.segment,
            organizations.region,
            organizations.location_text,
            organizations.current_status,
            organizations.employee_count_text,
            organizations.alternate_contact_recommended,
            count(prospects.id)::int as contact_count,
            organizations.active_opportunity_count,
            organizations.last_contacted_at,
            organizations.notes,
            organizations.is_previous_employer,
            organizations.created_at,
            organizations.updated_at,
            coalesce(
              json_agg(
                json_build_object(
                  'id', prospects.id,
                  'full_name', prospects.full_name,
                  'title', prospects.title,
                  'linkedin_profile_url', prospects.linkedin_profile_url,
                  'lifecycle_status', prospects.lifecycle_status
                )
                order by prospects.updated_at desc
              ) filter (where prospects.id is not null),
              '[]'::json
            ) as people_preview
          from public.organizations
          left join public.prospects on prospects.organization_id = organizations.id
          group by organizations.id
          order by organizations.is_previous_employer asc, coalesce(max(prospects.updated_at), organizations.updated_at) desc, lower(organizations.name) asc
        `
      : await sql<OrganizationRow[]>`
          select
            organizations.id,
            organizations.name,
            organizations.domain,
            organizations.logo_url,
            organizations.linkedin_company_url,
            organizations.organization_type,
            organizations.segment,
            organizations.region,
            organizations.location_text,
            organizations.current_status,
            organizations.employee_count_text,
            organizations.alternate_contact_recommended,
            count(prospects.id)::int as contact_count,
            organizations.active_opportunity_count,
            organizations.last_contacted_at,
            organizations.notes,
            false as is_previous_employer,
            organizations.created_at,
            organizations.updated_at,
            coalesce(
              json_agg(
                json_build_object(
                  'id', prospects.id,
                  'full_name', prospects.full_name,
                  'title', prospects.title,
                  'linkedin_profile_url', prospects.linkedin_profile_url,
                  'lifecycle_status', prospects.lifecycle_status
                )
                order by prospects.updated_at desc
              ) filter (where prospects.id is not null),
              '[]'::json
            ) as people_preview
          from public.organizations
          left join public.prospects on prospects.organization_id = organizations.id
          group by organizations.id
          order by coalesce(max(prospects.updated_at), organizations.updated_at) desc, lower(organizations.name) asc
        `;

    return rows.map(toOrganization);
  }

  async getOrganizationById(id: string): Promise<Organization | null> {
    const supportsPreviousEmployerFlag = await hasOrganizationPreviousEmployerColumn();
    const rows = supportsPreviousEmployerFlag
      ? await sql<OrganizationRow[]>`
          select
            organizations.id,
            organizations.name,
            organizations.domain,
            organizations.logo_url,
            organizations.linkedin_company_url,
            organizations.organization_type,
            organizations.segment,
            organizations.region,
            organizations.location_text,
            organizations.current_status,
            organizations.employee_count_text,
            organizations.alternate_contact_recommended,
            count(prospects.id)::int as contact_count,
            organizations.active_opportunity_count,
            organizations.last_contacted_at,
            organizations.notes,
            organizations.is_previous_employer,
            organizations.created_at,
            organizations.updated_at,
            coalesce(
              json_agg(
                json_build_object(
                  'id', prospects.id,
                  'full_name', prospects.full_name,
                  'title', prospects.title,
                  'linkedin_profile_url', prospects.linkedin_profile_url,
                  'lifecycle_status', prospects.lifecycle_status
                )
                order by prospects.updated_at desc
              ) filter (where prospects.id is not null),
              '[]'::json
            ) as people_preview
          from public.organizations
          left join public.prospects on prospects.organization_id = organizations.id
          where organizations.id = ${id}
          group by organizations.id
          limit 1
        `
      : await sql<OrganizationRow[]>`
          select
            organizations.id,
            organizations.name,
            organizations.domain,
            organizations.logo_url,
            organizations.linkedin_company_url,
            organizations.organization_type,
            organizations.segment,
            organizations.region,
            organizations.location_text,
            organizations.current_status,
            organizations.employee_count_text,
            organizations.alternate_contact_recommended,
            count(prospects.id)::int as contact_count,
            organizations.active_opportunity_count,
            organizations.last_contacted_at,
            organizations.notes,
            false as is_previous_employer,
            organizations.created_at,
            organizations.updated_at,
            coalesce(
              json_agg(
                json_build_object(
                  'id', prospects.id,
                  'full_name', prospects.full_name,
                  'title', prospects.title,
                  'linkedin_profile_url', prospects.linkedin_profile_url,
                  'lifecycle_status', prospects.lifecycle_status
                )
                order by prospects.updated_at desc
              ) filter (where prospects.id is not null),
              '[]'::json
            ) as people_preview
          from public.organizations
          left join public.prospects on prospects.organization_id = organizations.id
          where organizations.id = ${id}
          group by organizations.id
          limit 1
        `;

    return rows[0] ? toOrganization(rows[0]) : null;
  }

  async createOrganization(input: CreateOrganizationInput): Promise<Organization> {
    const now = new Date().toISOString();
    const normalizedName = normalizeOrganizationName(input.name);
    const normalizedDomain = normalizeComparableUrl(input.domain);
    const normalizedLinkedInCompanyUrl = normalizeComparableUrl(input.linkedinCompanyUrl);
    const comparableDomain = normalizedDomain || null;
    const comparableLinkedInCompanyUrl = normalizedLinkedInCompanyUrl || null;
    const supportsPreviousEmployerFlag = await hasOrganizationPreviousEmployerColumn();

    const existingOrganizations = await sql<{
      id: string;
    }[]>`
      select id
      from public.organizations
      where (
        lower(trim(name)) = lower(${normalizedName})
        or (
          ${comparableLinkedInCompanyUrl}::text is not null
          and lower(trim(trailing '/' from regexp_replace(coalesce(linkedin_company_url, ''), '^https?://', '', 'i'))) =
            lower(trim(trailing '/' from ${comparableLinkedInCompanyUrl}::text))
        )
        or (
          ${comparableDomain}::text is not null
          and lower(trim(trailing '/' from regexp_replace(coalesce(domain, ''), '^https?://', '', 'i'))) =
            lower(trim(trailing '/' from ${comparableDomain}::text))
        )
      )
      ${supportsPreviousEmployerFlag ? sql`and is_previous_employer = ${input.isPreviousEmployer ?? false}` : sql``}
      limit 1
    `;

    const existingOrganization = existingOrganizations[0];

    if (existingOrganization) {
      const updated = await this.updateOrganization(existingOrganization.id, {
        name: normalizedName,
        domain: input.domain ?? null,
        logoUrl: input.logoUrl ?? null,
        linkedinCompanyUrl: input.linkedinCompanyUrl ?? null,
        organizationType: input.organizationType,
        segment: input.segment ?? null,
        region: input.region ?? null,
        locationText: input.locationText ?? null,
        currentStatus: input.currentStatus ?? null,
        employeeCountText: input.employeeCountText ?? null,
        notes: input.notes ?? null,
        isPreviousEmployer: input.isPreviousEmployer ?? false
      });

      if (!updated) {
        throw new Error("Could not reuse existing organization.");
      }

      return updated;
    }

    const rows = supportsPreviousEmployerFlag
      ? await sql<OrganizationRow[]>`
          insert into public.organizations (
            name,
            domain,
            logo_url,
            linkedin_company_url,
            organization_type,
            segment,
            region,
            location_text,
            current_status,
            employee_count_text,
            alternate_contact_recommended,
            contact_count,
            active_opportunity_count,
            last_contacted_at,
            notes,
            is_previous_employer,
            created_at,
            updated_at
          )
          values (
            ${normalizedName},
            ${input.domain ?? null},
            ${input.logoUrl ?? null},
            ${input.linkedinCompanyUrl ?? null},
            ${input.organizationType},
            ${input.segment ?? null},
            ${input.region ?? null},
            ${input.locationText ?? null},
            ${input.currentStatus ?? null},
            ${input.employeeCountText ?? null},
            false,
            0,
            0,
            null,
            ${input.notes ?? null},
            ${input.isPreviousEmployer ?? false},
            ${now},
            ${now}
          )
          returning
            id,
            name,
            domain,
            logo_url,
            linkedin_company_url,
            organization_type,
            segment,
            region,
            location_text,
            current_status,
            employee_count_text,
            alternate_contact_recommended,
            contact_count,
            active_opportunity_count,
            last_contacted_at,
            notes,
            is_previous_employer,
            created_at,
            updated_at,
            '[]'::json as people_preview
      `
      : await sql<OrganizationRow[]>`
          insert into public.organizations (
            name,
            domain,
            logo_url,
            linkedin_company_url,
            organization_type,
            segment,
            region,
            location_text,
            current_status,
            employee_count_text,
            alternate_contact_recommended,
            contact_count,
            active_opportunity_count,
            last_contacted_at,
            notes,
            created_at,
            updated_at
          )
          values (
            ${normalizedName},
            ${input.domain ?? null},
            ${input.logoUrl ?? null},
            ${input.linkedinCompanyUrl ?? null},
            ${input.organizationType},
            ${input.segment ?? null},
            ${input.region ?? null},
            ${input.locationText ?? null},
            ${input.currentStatus ?? null},
            ${input.employeeCountText ?? null},
            false,
            0,
            0,
            null,
            ${input.notes ?? null},
            ${now},
            ${now}
          )
          returning
            id,
            name,
            domain,
            logo_url,
            linkedin_company_url,
            organization_type,
            segment,
            region,
            location_text,
            current_status,
            employee_count_text,
            alternate_contact_recommended,
            contact_count,
            active_opportunity_count,
            last_contacted_at,
            notes,
            false as is_previous_employer,
            created_at,
            updated_at,
            '[]'::json as people_preview
      `;

    return toOrganization(rows[0]);
  }

  async updateOrganization(id: string, input: UpdateOrganizationInput): Promise<Organization | null> {
    const now = new Date().toISOString();
    const supportsPreviousEmployerFlag = await hasOrganizationPreviousEmployerColumn();
    const rows = supportsPreviousEmployerFlag
      ? await sql<OrganizationRow[]>`
          update public.organizations
          set
            name = ${input.name.trim()},
            domain = ${input.domain ?? null},
            logo_url = ${input.logoUrl ?? null},
            linkedin_company_url = ${input.linkedinCompanyUrl ?? null},
            organization_type = ${input.organizationType},
            segment = ${input.segment ?? null},
            region = ${input.region ?? null},
            location_text = ${input.locationText ?? null},
            current_status = ${input.currentStatus ?? null},
            employee_count_text = ${input.employeeCountText ?? null},
            notes = ${input.notes ?? null},
            is_previous_employer = ${input.isPreviousEmployer ?? false},
            updated_at = ${now}
          where id = ${id}
          returning
            id,
            name,
            domain,
            logo_url,
            linkedin_company_url,
            organization_type,
            segment,
            region,
            location_text,
            current_status,
            employee_count_text,
            alternate_contact_recommended,
            contact_count,
            active_opportunity_count,
            last_contacted_at,
            notes,
            is_previous_employer,
            created_at,
            updated_at,
            '[]'::json as people_preview
      `
      : await sql<OrganizationRow[]>`
          update public.organizations
          set
            name = ${input.name.trim()},
            domain = ${input.domain ?? null},
            logo_url = ${input.logoUrl ?? null},
            linkedin_company_url = ${input.linkedinCompanyUrl ?? null},
            organization_type = ${input.organizationType},
            segment = ${input.segment ?? null},
            region = ${input.region ?? null},
            location_text = ${input.locationText ?? null},
            current_status = ${input.currentStatus ?? null},
            employee_count_text = ${input.employeeCountText ?? null},
            notes = ${input.notes ?? null},
            updated_at = ${now}
          where id = ${id}
          returning
            id,
            name,
            domain,
            logo_url,
            linkedin_company_url,
            organization_type,
            segment,
            region,
            location_text,
            current_status,
            employee_count_text,
            alternate_contact_recommended,
            contact_count,
            active_opportunity_count,
            last_contacted_at,
            notes,
            false as is_previous_employer,
            created_at,
            updated_at,
            '[]'::json as people_preview
      `;

    return rows[0] ? toOrganization(rows[0]) : null;
  }

  async deleteOrganization(id: string): Promise<boolean> {
    const rows = await sql<{ id: string }[]>`
      delete from public.organizations
      where id = ${id}
      returning id
    `;

    return Boolean(rows[0]);
  }
}
