import cors from "@fastify/cors";
import Fastify from "fastify";
import {
  createInviteTemplateInputSchema,
  createOrganizationInputSchema,
  createSenderAccountInputSchema,
  createResearchedProspectInputSchema,
  createResearchedProspectResponseSchema,
  deleteProspectResponseSchema,
  inviteTemplateResponseSchema,
  inviteTemplateListResponseSchema,
  inviteTemplatePerformanceListResponseSchema,
  healthResponseSchema,
  organizationDetailResponseSchema,
  organizationListResponseSchema,
  organizationResponseSchema,
  logInviteAttemptInputSchema,
  logInviteAttemptResponseSchema,
  locationHeatmapResponseSchema,
  overviewSchema,
  outreachAttemptListResponseSchema,
  prospectDetailResponseSchema,
  prospectListResponseSchema,
  senderAccountListResponseSchema,
  senderAccountResponseSchema,
  updateProspectInputSchema,
  updateProspectResponseSchema,
  updateProspectPriorityInputSchema,
  updateProspectPriorityResponseSchema,
  updateInviteTemplateInputSchema,
  updateOrganizationInputSchema,
  updateSenderAccountInputSchema,
  updateProspectWorkflowInputSchema,
  updateProspectWorkflowResponseSchema
} from "@overtly/shared";
import { ProspectRepository } from "./repositories/prospect-repository";

const app = Fastify({ logger: true });
const prospectRepository = new ProspectRepository();

async function start() {
  await app.register(cors, {
    origin: true
  });

  app.get("/health", async () => {
    return healthResponseSchema.parse({
      status: "ok",
      service: "api"
    });
  });

  app.get("/v1/overview", async (request) => {
    const query = request.query as {
      startDate?: string;
      endDate?: string;
    };

    const overview = await prospectRepository.getOverview({
      startDate: query.startDate?.trim() || null,
      endDate: query.endDate?.trim() || null
    });

    return overviewSchema.parse(overview);
  });

  app.get("/v1/overview/locations", async (request) => {
    const query = request.query as {
      startDate?: string;
      endDate?: string;
    };

    const items = await prospectRepository.getLocationHeatmap({
      startDate: query.startDate?.trim() || null,
      endDate: query.endDate?.trim() || null
    });

    return locationHeatmapResponseSchema.parse({
      items,
      total: items.length
    });
  });

  app.get("/v1/prospects", async () => {
    const items = await prospectRepository.listProspects();

    return prospectListResponseSchema.parse({
      items,
      total: items.length
    });
  });

  app.get("/v1/prospects/:id", async (request, reply) => {
    const params = request.params as { id?: string };

    if (!params.id) {
      reply.code(400);
      return { message: "Prospect id is required." };
    }

    const item = await prospectRepository.getProspectById(params.id);

    if (!item) {
      reply.code(404);
      return { message: "Prospect not found." };
    }

    return prospectDetailResponseSchema.parse({
      item
    });
  });

  app.get("/v1/prospects/by-url", async (request, reply) => {
    const query = request.query as { linkedinProfileUrl?: string };
    const linkedinProfileUrl = query.linkedinProfileUrl?.trim();

    if (!linkedinProfileUrl) {
      reply.code(400);
      return { message: "LinkedIn profile URL is required." };
    }

    const item = await prospectRepository.getProspectByLinkedInUrl(linkedinProfileUrl);

    if (!item) {
      reply.code(404);
      return { message: "Prospect not found." };
    }

    return prospectDetailResponseSchema.parse({
      item
    });
  });

  app.get("/v1/prospects/:id/outreach-attempts", async (request, reply) => {
    const params = request.params as { id?: string };

    if (!params.id) {
      reply.code(400);
      return { message: "Prospect id is required." };
    }

    const items = await prospectRepository.listOutreachAttempts(params.id);

    return outreachAttemptListResponseSchema.parse({
      items,
      total: items.length
    });
  });

  app.post("/v1/prospects/researched", async (request, reply) => {
    const input = createResearchedProspectInputSchema.parse(request.body);
    const item = await prospectRepository.createResearchedProspect(input);

    reply.code(201);

    return createResearchedProspectResponseSchema.parse({
      item
    });
  });

  app.get("/v1/organizations", async () => {
    const items = await prospectRepository.listOrganizations();

    return organizationListResponseSchema.parse({
      items,
      total: items.length
    });
  });

  app.get("/v1/organizations/:id", async (request, reply) => {
    const params = request.params as { id?: string };

    if (!params.id) {
      reply.code(400);
      return { message: "Organization id is required." };
    }

    const item = await prospectRepository.getOrganizationById(params.id);

    if (!item) {
      reply.code(404);
      return { message: "Organization not found." };
    }

    return organizationDetailResponseSchema.parse({ item });
  });

  app.post("/v1/organizations", async (request, reply) => {
    const input = createOrganizationInputSchema.parse(request.body);
    const item = await prospectRepository.createOrganization(input);

    reply.code(201);

    return organizationResponseSchema.parse({ item });
  });

  app.patch("/v1/organizations/:id", async (request, reply) => {
    const params = request.params as { id?: string };

    if (!params.id) {
      reply.code(400);
      return { message: "Organization id is required." };
    }

    const input = updateOrganizationInputSchema.parse(request.body);
    const item = await prospectRepository.updateOrganization(params.id, input);

    if (!item) {
      reply.code(404);
      return { message: "Organization not found." };
    }

    return organizationResponseSchema.parse({ item });
  });

  app.delete("/v1/organizations/:id", async (request, reply) => {
    const params = request.params as { id?: string };

    if (!params.id) {
      reply.code(400);
      return { message: "Organization id is required." };
    }

    const deleted = await prospectRepository.deleteOrganization(params.id);

    if (!deleted) {
      reply.code(404);
      return { message: "Organization not found." };
    }

    return deleteProspectResponseSchema.parse({ status: "ok" });
  });

  app.get("/v1/sender-accounts", async () => {
    const items = await prospectRepository.listSenderAccounts();

    return senderAccountListResponseSchema.parse({
      items,
      total: items.length
    });
  });

  app.post("/v1/sender-accounts", async (request, reply) => {
    const input = createSenderAccountInputSchema.parse(request.body);
    const item = await prospectRepository.createSenderAccount(input);

    reply.code(201);

    return senderAccountResponseSchema.parse({ item });
  });

  app.patch("/v1/sender-accounts/:id", async (request, reply) => {
    const params = request.params as { id?: string };

    if (!params.id) {
      reply.code(400);
      return { message: "Sender account id is required." };
    }

    const input = updateSenderAccountInputSchema.parse(request.body);
    const item = await prospectRepository.updateSenderAccount(params.id, input);

    if (!item) {
      reply.code(404);
      return { message: "Sender account not found." };
    }

    return senderAccountResponseSchema.parse({ item });
  });

  app.get("/v1/invite-templates", async () => {
    const items = await prospectRepository.listInviteTemplates();

    return inviteTemplateListResponseSchema.parse({
      items,
      total: items.length
    });
  });

  app.get("/v1/invite-templates/performance", async () => {
    const items = await prospectRepository.listInviteTemplatePerformance();

    return inviteTemplatePerformanceListResponseSchema.parse({
      items,
      total: items.length
    });
  });

  app.post("/v1/invite-templates", async (request, reply) => {
    const input = createInviteTemplateInputSchema.parse(request.body);
    const item = await prospectRepository.createInviteTemplate(input);

    reply.code(201);

    return inviteTemplateResponseSchema.parse({ item });
  });

  app.patch("/v1/invite-templates/:id", async (request, reply) => {
    const params = request.params as { id?: string };

    if (!params.id) {
      reply.code(400);
      return { message: "Invite template id is required." };
    }

    const input = updateInviteTemplateInputSchema.parse(request.body);
    const item = await prospectRepository.updateInviteTemplate(params.id, input);

    if (!item) {
      reply.code(404);
      return { message: "Invite template not found." };
    }

    return inviteTemplateResponseSchema.parse({ item });
  });

  app.delete("/v1/invite-templates/:id", async (request, reply) => {
    const params = request.params as { id?: string };

    if (!params.id) {
      reply.code(400);
      return { message: "Invite template id is required." };
    }

    const deleted = await prospectRepository.deleteInviteTemplate(params.id);

    if (!deleted) {
      reply.code(404);
      return { message: "Invite template not found." };
    }

    return deleteProspectResponseSchema.parse({ status: "ok" });
  });

  app.post("/v1/prospects/:id/invites", async (request, reply) => {
    const params = request.params as { id?: string };

    if (!params.id) {
      reply.code(400);
      return { message: "Prospect id is required." };
    }

    const input = logInviteAttemptInputSchema.parse(request.body);
    const result = await prospectRepository.createInviteAttempt(params.id, input);

    if (!result) {
      reply.code(404);
      return { message: "Prospect not found or sender account unavailable." };
    }

    reply.code(201);

    return logInviteAttemptResponseSchema.parse(result);
  });

  app.patch("/v1/prospects/:id/priority", async (request, reply) => {
    const params = request.params as { id?: string };

    if (!params.id) {
      reply.code(400);
      return { message: "Prospect id is required." };
    }

    const input = updateProspectPriorityInputSchema.parse(request.body);
    const item = await prospectRepository.updateProspectPriority(params.id, input.priority);

    if (!item) {
      reply.code(404);
      return { message: "Prospect not found." };
    }

    return updateProspectPriorityResponseSchema.parse({
      item
    });
  });

  app.patch("/v1/prospects/:id", async (request, reply) => {
    const params = request.params as { id?: string };

    if (!params.id) {
      reply.code(400);
      return { message: "Prospect id is required." };
    }

    const input = updateProspectInputSchema.parse(request.body);
    const item = await prospectRepository.updateProspect(params.id, input);

    if (!item) {
      reply.code(404);
      return { message: "Prospect not found." };
    }

    return updateProspectResponseSchema.parse({
      item
    });
  });

  app.patch("/v1/prospects/:id/status", async (request, reply) => {
    const params = request.params as { id?: string };

    if (!params.id) {
      reply.code(400);
      return { message: "Prospect id is required." };
    }

    const input = updateProspectWorkflowInputSchema.parse(request.body);
    const item = await prospectRepository.updateProspectWorkflow(params.id, input);

    if (!item) {
      reply.code(404);
      return { message: "Prospect not found." };
    }

    return updateProspectWorkflowResponseSchema.parse({
      item
    });
  });

  app.delete("/v1/prospects/:id", async (request, reply) => {
    const params = request.params as { id?: string };

    if (!params.id) {
      reply.code(400);
      return { message: "Prospect id is required." };
    }

    const deleted = await prospectRepository.deleteProspect(params.id);

    if (!deleted) {
      reply.code(404);
      return { message: "Prospect not found." };
    }

    return deleteProspectResponseSchema.parse({
      status: "ok"
    });
  });

  const port = Number(process.env.PORT ?? 4000);
  await app.listen({ port, host: "0.0.0.0" });
}

start().catch((error) => {
  app.log.error(error);
  process.exit(1);
});
