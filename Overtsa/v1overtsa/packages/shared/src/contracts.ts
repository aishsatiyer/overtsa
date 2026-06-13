import { z } from "zod";

export const healthResponseSchema = z.object({
  status: z.literal("ok"),
  service: z.string()
});

export const overviewSchema = z.object({
  invitesSent: z.number(),
  accepted: z.number(),
  acceptedSilent: z.number(),
  followUpsDue: z.number(),
  positiveInterest: z.number(),
  callsBooked: z.number()
});

export const locationHeatmapEntrySchema = z.object({
  country: z.string(),
  count: z.number().int().nonnegative()
});

export const locationHeatmapResponseSchema = z.object({
  items: z.array(locationHeatmapEntrySchema),
  total: z.number().int().nonnegative()
});

export const createResearchedProspectInputSchema = z.object({
  fullName: z.string().min(1).max(200),
  linkedinProfileUrl: z.string().url(),
  photoUrl: z.string().url().nullable().optional(),
  senderAccountId: z.string().uuid().nullable().optional(),
  inviteTemplateId: z.string().uuid().nullable().optional(),
  organizationName: z.string().min(1).max(200),
  organizationType: z.enum([
    "agency",
    "in_house",
    "brand",
    "startup",
    "consultancy",
    "other"
  ]),
  title: z.string().min(1).max(200),
  priority: z.enum(["low", "medium", "high", "urgent"]).nullable().optional(),
  segment: z
    .enum(["agency", "in_house", "founder", "consultant", "other"])
    .nullable()
    .optional(),
  locationText: z.string().max(200).nullable().optional(),
  region: z.string().max(120).nullable().optional(),
  icpType: z.string().max(120).nullable().optional(),
  notes: z.string().max(5000).nullable().optional()
});

export const prospectListItemSchema = z.object({
  id: z.string().uuid(),
  fullName: z.string(),
  linkedinProfileUrl: z.string().url(),
  photoUrl: z.string().url().nullable(),
  title: z.string(),
  organizationId: z.string().uuid(),
  organizationName: z.string(),
  organizationType: z.enum([
    "agency",
    "in_house",
    "brand",
    "startup",
    "consultancy",
    "other"
  ]),
  priority: z.enum(["low", "medium", "high", "urgent"]),
  segment: z
    .enum(["agency", "in_house", "founder", "consultant", "other"])
    .nullable(),
  lifecycleStatus: z.enum([
    "researched",
    "invite_sent",
    "accepted",
    "accepted_silent",
    "follow_up_active",
    "replied",
    "positive_interest",
    "deferred",
    "scheduling",
    "call_booked",
    "not_interested",
    "archived"
  ]),
  acceptedStatus: z.enum(["unknown", "pending", "accepted", "not_accepted"]),
  followUpStage: z.enum([
    "none",
    "follow_up_1_due",
    "follow_up_1_sent",
    "follow_up_2_due",
    "follow_up_2_sent",
    "follow_up_3_due",
    "follow_up_3_sent",
    "replied",
    "snoozed",
    "archived"
  ]),
  nextActionType: z.string().nullable(),
  latestSenderAccountName: z.string().nullable(),
  senderAccountId: z.string().uuid().nullable(),
  inviteTemplateId: z.string().uuid().nullable(),
  locationText: z.string().nullable(),
  region: z.string().nullable(),
  notes: z.string().nullable(),
  createdAt: z.string(),
  updatedAt: z.string()
});

export const organizationPeoplePreviewSchema = z.object({
  id: z.string().uuid(),
  fullName: z.string(),
  title: z.string(),
  linkedinProfileUrl: z.string().url(),
  lifecycleStatus: z.enum([
    "researched",
    "invite_sent",
    "accepted",
    "accepted_silent",
    "follow_up_active",
    "replied",
    "positive_interest",
    "deferred",
    "scheduling",
    "call_booked",
    "not_interested",
    "archived"
  ])
});

export const organizationSchema = z.object({
  id: z.string().uuid(),
  name: z.string(),
  domain: z.string().nullable(),
  logoUrl: z.string().url().nullable(),
  linkedinCompanyUrl: z.string().url().nullable(),
  organizationType: z.enum([
    "agency",
    "in_house",
    "brand",
    "startup",
    "consultancy",
    "other"
  ]),
  segment: z
    .enum(["agency", "in_house", "founder", "consultant", "other"])
    .nullable(),
  region: z.string().nullable(),
  locationText: z.string().nullable(),
  currentStatus: z.string().nullable(),
  employeeCountText: z.string().nullable(),
  alternateContactRecommended: z.boolean(),
  contactCount: z.number().int().nonnegative(),
  activeOpportunityCount: z.number().int().nonnegative(),
  lastContactedAt: z.string().nullable(),
  notes: z.string().nullable(),
  isPreviousEmployer: z.boolean(),
  peoplePreview: z.array(organizationPeoplePreviewSchema),
  createdAt: z.string(),
  updatedAt: z.string()
});

export const organizationListResponseSchema = z.object({
  items: z.array(organizationSchema),
  total: z.number().int().nonnegative()
});

export const organizationDetailResponseSchema = z.object({
  item: organizationSchema
});

export const createOrganizationInputSchema = z.object({
  name: z.string().min(1).max(200),
  domain: z.string().max(240).nullable().optional(),
  logoUrl: z.string().url().nullable().optional(),
  linkedinCompanyUrl: z.string().url().nullable().optional(),
  organizationType: z.enum([
    "agency",
    "in_house",
    "brand",
    "startup",
    "consultancy",
    "other"
  ]),
  segment: z
    .enum(["agency", "in_house", "founder", "consultant", "other"])
    .nullable()
    .optional(),
  region: z.string().max(120).nullable().optional(),
  locationText: z.string().max(200).nullable().optional(),
  currentStatus: z.string().max(200).nullable().optional(),
  employeeCountText: z.string().max(120).nullable().optional(),
  notes: z.string().max(5000).nullable().optional(),
  isPreviousEmployer: z.boolean().optional()
});

export const updateOrganizationInputSchema = createOrganizationInputSchema;

export const organizationResponseSchema = z.object({
  item: organizationSchema
});

export const prospectListResponseSchema = z.object({
  items: z.array(prospectListItemSchema),
  total: z.number().int().nonnegative()
});

export const createResearchedProspectResponseSchema = z.object({
  item: prospectListItemSchema
});

export const prospectDetailResponseSchema = z.object({
  item: prospectListItemSchema
});

export const senderAccountSchema = z.object({
  id: z.string().uuid(),
  displayName: z.string(),
  platform: z.string(),
  platformProfileUrl: z.string().url().nullable(),
  photoUrl: z.string().url().nullable(),
  isActive: z.boolean(),
  notes: z.string().nullable(),
  createdAt: z.string(),
  updatedAt: z.string()
});

export const senderAccountListResponseSchema = z.object({
  items: z.array(senderAccountSchema),
  total: z.number().int().nonnegative()
});

export const createSenderAccountInputSchema = z.object({
  displayName: z.string().min(1).max(200),
  platform: z.string().min(1).max(60).default("linkedin"),
  platformProfileUrl: z.string().url().nullable().optional(),
  photoUrl: z.string().url().nullable().optional(),
  isActive: z.boolean().optional(),
  notes: z.string().max(5000).nullable().optional()
});

export const updateSenderAccountInputSchema = createSenderAccountInputSchema;

export const senderAccountResponseSchema = z.object({
  item: senderAccountSchema
});

export const inviteTemplateSchema = z.object({
  id: z.string().uuid(),
  name: z.string(),
  versionLabel: z.string(),
  targetSegment: z
    .enum(["agency", "in_house", "founder", "consultant", "other"])
    .nullable(),
  audienceTags: z.array(z.string()),
  templateText: z.string(),
  notes: z.string().nullable(),
  isActive: z.boolean(),
  createdAt: z.string(),
  updatedAt: z.string()
});

export const inviteTemplateListResponseSchema = z.object({
  items: z.array(inviteTemplateSchema),
  total: z.number().int().nonnegative()
});

export const createInviteTemplateInputSchema = z.object({
  name: z.string().min(1).max(200),
  versionLabel: z.string().min(1).max(60),
  targetSegment: z
    .enum(["agency", "in_house", "founder", "consultant", "other"])
    .nullable()
    .optional(),
  audienceTags: z.array(z.string().min(1).max(60)).default([]),
  templateText: z.string().min(1).max(5000),
  notes: z.string().max(5000).nullable().optional(),
  isActive: z.boolean().optional()
});

export const updateInviteTemplateInputSchema = createInviteTemplateInputSchema;

export const inviteTemplateResponseSchema = z.object({
  item: inviteTemplateSchema
});

export const inviteTemplatePerformanceSchema = z.object({
  id: z.string().uuid(),
  name: z.string(),
  versionLabel: z.string(),
  audienceTags: z.array(z.string()),
  isActive: z.boolean(),
  sends: z.number().int().nonnegative(),
  accepts: z.number().int().nonnegative(),
  replies: z.number().int().nonnegative(),
  acceptRate: z.number(),
  replyRate: z.number(),
  score: z.number(),
  lastUsedAt: z.string().nullable()
});

export const inviteTemplatePerformanceListResponseSchema = z.object({
  items: z.array(inviteTemplatePerformanceSchema),
  total: z.number().int().nonnegative()
});

export const outreachAttemptSchema = z.object({
  id: z.string().uuid(),
  prospectId: z.string().uuid(),
  organizationId: z.string().uuid(),
  senderAccountId: z.string().uuid(),
  senderAccountName: z.string(),
  inviteTemplateId: z.string().uuid().nullable(),
  inviteTemplateName: z.string().nullable(),
  attemptNumber: z.number().int().positive(),
  senderAccountAttemptNumber: z.number().int().positive(),
  channel: z.string(),
  attemptType: z.string(),
  inviteNoteText: z.string().nullable(),
  sentAt: z.string().nullable(),
  status: z.enum([
    "draft",
    "sent",
    "pending_acceptance",
    "accepted",
    "no_acceptance",
    "retry_eligible",
    "follow_up_active",
    "replied",
    "completed",
    "archived"
  ]),
  statusDetail: z.string().nullable(),
  retryEligibleAt: z.string().nullable(),
  followUpCadenceDays: z.array(z.number().int().positive()),
  organizationEscalationRecommended: z.boolean(),
  lastOutcomeAt: z.string().nullable(),
  notes: z.string().nullable(),
  createdAt: z.string(),
  updatedAt: z.string()
});

export const outreachAttemptListResponseSchema = z.object({
  items: z.array(outreachAttemptSchema),
  total: z.number().int().nonnegative()
});

export const logInviteAttemptInputSchema = z.object({
  senderAccountId: z.string().uuid(),
  inviteTemplateId: z.string().uuid().nullable().optional(),
  inviteNoteText: z.string().max(5000).nullable().optional(),
  sentAt: z.string().datetime().nullable().optional(),
  notes: z.string().max(5000).nullable().optional()
});

export const logInviteAttemptResponseSchema = z.object({
  prospect: prospectListItemSchema,
  outreachAttempt: outreachAttemptSchema
});

export const updateProspectPriorityInputSchema = z.object({
  priority: z.enum(["low", "medium", "high", "urgent"])
});

export const updateProspectPriorityResponseSchema = z.object({
  item: prospectListItemSchema
});

export const updateProspectInputSchema = z.object({
  fullName: z.string().min(1).max(200),
  linkedinProfileUrl: z.string().url(),
  photoUrl: z.string().url().nullable().optional(),
  senderAccountId: z.string().uuid().nullable().optional(),
  inviteTemplateId: z.string().uuid().nullable().optional(),
  organizationName: z.string().min(1).max(200),
  organizationType: z.enum([
    "agency",
    "in_house",
    "brand",
    "startup",
    "consultancy",
    "other"
  ]),
  title: z.string().min(1).max(200),
  priority: z.enum(["low", "medium", "high", "urgent"]),
  segment: z
    .enum(["agency", "in_house", "founder", "consultant", "other"])
    .nullable()
    .optional(),
  locationText: z.string().max(200).nullable().optional(),
  region: z.string().max(120).nullable().optional(),
  icpType: z.string().max(120).nullable().optional(),
  notes: z.string().max(5000).nullable().optional()
});

export const updateProspectResponseSchema = z.object({
  item: prospectListItemSchema
});

export const updateProspectWorkflowInputSchema = z.object({
  lifecycleStatus: z
    .enum([
      "researched",
      "invite_sent",
      "accepted",
      "accepted_silent",
      "follow_up_active",
      "replied",
      "positive_interest",
      "deferred",
      "scheduling",
      "call_booked",
      "not_interested",
      "archived"
    ])
    .optional(),
  acceptedStatus: z.enum(["unknown", "pending", "accepted", "not_accepted"]).optional(),
  followUpStage: z
    .enum([
      "none",
      "follow_up_1_due",
      "follow_up_1_sent",
      "follow_up_2_due",
      "follow_up_2_sent",
      "follow_up_3_due",
      "follow_up_3_sent",
      "replied",
      "snoozed",
      "archived"
    ])
    .optional(),
  nextActionType: z.string().max(120).nullable().optional(),
  nextActionDueAt: z.string().datetime().nullable().optional(),
  lastContactedAt: z.string().datetime().nullable().optional(),
  lastRepliedAt: z.string().datetime().nullable().optional(),
  retryRecommended: z.boolean().optional(),
  alternateContactRecommended: z.boolean().optional()
});

export const updateProspectWorkflowResponseSchema = z.object({
  item: prospectListItemSchema
});

export const deleteProspectResponseSchema = z.object({
  status: z.literal("ok")
});

export type CreateResearchedProspectInput = z.infer<
  typeof createResearchedProspectInputSchema
>;
export type Overview = z.infer<typeof overviewSchema>;
export type LocationHeatmapEntry = z.infer<typeof locationHeatmapEntrySchema>;
export type LocationHeatmapResponse = z.infer<typeof locationHeatmapResponseSchema>;
export type ProspectListItem = z.infer<typeof prospectListItemSchema>;
export type OrganizationPeoplePreview = z.infer<typeof organizationPeoplePreviewSchema>;
export type Organization = z.infer<typeof organizationSchema>;
export type OrganizationListResponse = z.infer<typeof organizationListResponseSchema>;
export type OrganizationDetailResponse = z.infer<typeof organizationDetailResponseSchema>;
export type CreateOrganizationInput = z.infer<typeof createOrganizationInputSchema>;
export type UpdateOrganizationInput = z.infer<typeof updateOrganizationInputSchema>;
export type OrganizationResponse = z.infer<typeof organizationResponseSchema>;
export type ProspectListResponse = z.infer<typeof prospectListResponseSchema>;
export type ProspectDetailResponse = z.infer<typeof prospectDetailResponseSchema>;
export type SenderAccount = z.infer<typeof senderAccountSchema>;
export type SenderAccountListResponse = z.infer<typeof senderAccountListResponseSchema>;
export type CreateSenderAccountInput = z.infer<typeof createSenderAccountInputSchema>;
export type UpdateSenderAccountInput = z.infer<typeof updateSenderAccountInputSchema>;
export type SenderAccountResponse = z.infer<typeof senderAccountResponseSchema>;
export type InviteTemplate = z.infer<typeof inviteTemplateSchema>;
export type InviteTemplateListResponse = z.infer<typeof inviteTemplateListResponseSchema>;
export type CreateInviteTemplateInput = z.infer<typeof createInviteTemplateInputSchema>;
export type UpdateInviteTemplateInput = z.infer<typeof updateInviteTemplateInputSchema>;
export type InviteTemplateResponse = z.infer<typeof inviteTemplateResponseSchema>;
export type InviteTemplatePerformance = z.infer<typeof inviteTemplatePerformanceSchema>;
export type InviteTemplatePerformanceListResponse = z.infer<
  typeof inviteTemplatePerformanceListResponseSchema
>;
export type OutreachAttempt = z.infer<typeof outreachAttemptSchema>;
export type OutreachAttemptListResponse = z.infer<typeof outreachAttemptListResponseSchema>;
export type LogInviteAttemptInput = z.infer<typeof logInviteAttemptInputSchema>;
export type LogInviteAttemptResponse = z.infer<typeof logInviteAttemptResponseSchema>;
export type UpdateProspectPriorityInput = z.infer<typeof updateProspectPriorityInputSchema>;
export type UpdateProspectInput = z.infer<typeof updateProspectInputSchema>;
export type UpdateProspectWorkflowInput = z.infer<typeof updateProspectWorkflowInputSchema>;
export type UpdateProspectWorkflowResponse = z.infer<typeof updateProspectWorkflowResponseSchema>;
