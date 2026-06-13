export type ProspectLifecycleStatus =
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

export type ProspectSegment =
  | "agency"
  | "in_house"
  | "founder"
  | "consultant"
  | "other";

export type OrganizationType =
  | "agency"
  | "in_house"
  | "brand"
  | "startup"
  | "consultancy"
  | "other";

export type AcceptedStatus = "unknown" | "pending" | "accepted" | "not_accepted";

export type FollowUpStage =
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

export type ProspectPriority = "low" | "medium" | "high" | "urgent";
