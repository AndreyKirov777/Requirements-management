import {
  GitHubConnectionService,
  InMemoryIngestionQueuePublisher,
  MockRequirementRepositoryProvider,
  RequirementIngestionService,
  RepositorySyncService
} from "@repo/domain";
import {
  InMemoryAuditEntryRepository,
  InMemoryIngestionEventRepository,
  InMemoryProjectRepository,
  InMemoryRepositoryConnectionRepository,
  InMemoryRepositorySyncConfigRepository,
  InMemoryRequirementRepository,
  InMemoryRequirementRevisionRepository
} from "@repo/db";
import { WebhookIntakeService } from "@repo/domain";

declare global {
  var __repositoryConnectionService: GitHubConnectionService | undefined;
  var __repositorySyncService: RepositorySyncService | undefined;
  var __webhookIntakeService: WebhookIntakeService | undefined;
  var __requirementIngestionService: RequirementIngestionService | undefined;
  var __projectRepository: InMemoryProjectRepository | undefined;
  var __repositoryConnectionRepository:
    | InMemoryRepositoryConnectionRepository
    | undefined;
  var __repositorySyncConfigRepository:
    | InMemoryRepositorySyncConfigRepository
    | undefined;
  var __ingestionEventRepository:
    | InMemoryIngestionEventRepository
    | undefined;
  var __requirementRepository:
    | InMemoryRequirementRepository
    | undefined;
  var __requirementRevisionRepository:
    | InMemoryRequirementRevisionRepository
    | undefined;
  var __auditEntryRepository: InMemoryAuditEntryRepository | undefined;
  var __ingestionQueuePublisher: InMemoryIngestionQueuePublisher | undefined;
  var __requirementRepositoryProvider:
    | MockRequirementRepositoryProvider
    | undefined;
}

function getProjectRepository() {
  if (!globalThis.__projectRepository) {
    globalThis.__projectRepository = new InMemoryProjectRepository();
  }

  return globalThis.__projectRepository;
}

function getConnectionRepository() {
  if (!globalThis.__repositoryConnectionRepository) {
    globalThis.__repositoryConnectionRepository =
      new InMemoryRepositoryConnectionRepository();
  }

  return globalThis.__repositoryConnectionRepository;
}

function getSyncConfigRepository() {
  if (!globalThis.__repositorySyncConfigRepository) {
    globalThis.__repositorySyncConfigRepository =
      new InMemoryRepositorySyncConfigRepository();
  }

  return globalThis.__repositorySyncConfigRepository;
}

function getAuditRepository() {
  if (!globalThis.__auditEntryRepository) {
    globalThis.__auditEntryRepository = new InMemoryAuditEntryRepository();
  }

  return globalThis.__auditEntryRepository;
}

function getIngestionEventRepository() {
  if (!globalThis.__ingestionEventRepository) {
    globalThis.__ingestionEventRepository = new InMemoryIngestionEventRepository();
  }

  return globalThis.__ingestionEventRepository;
}

function getRequirementRepository() {
  if (!globalThis.__requirementRepository) {
    globalThis.__requirementRepository = new InMemoryRequirementRepository();
  }

  return globalThis.__requirementRepository;
}

function getRequirementRevisionRepository() {
  if (!globalThis.__requirementRevisionRepository) {
    globalThis.__requirementRevisionRepository =
      new InMemoryRequirementRevisionRepository();
  }

  return globalThis.__requirementRevisionRepository;
}

function getIngestionQueuePublisher() {
  if (!globalThis.__ingestionQueuePublisher) {
    globalThis.__ingestionQueuePublisher = new InMemoryIngestionQueuePublisher();
  }

  return globalThis.__ingestionQueuePublisher;
}

function getRequirementRepositoryProvider() {
  if (!globalThis.__requirementRepositoryProvider) {
    globalThis.__requirementRepositoryProvider =
      new MockRequirementRepositoryProvider();
  }

  return globalThis.__requirementRepositoryProvider;
}

export function getRepositoryConnectionService() {
  if (!globalThis.__repositoryConnectionService) {
    globalThis.__repositoryConnectionService = new GitHubConnectionService(
      getProjectRepository(),
      getConnectionRepository(),
      getAuditRepository()
    );
  }

  return globalThis.__repositoryConnectionService;
}

export function getRepositorySyncService() {
  if (!globalThis.__repositorySyncService) {
    globalThis.__repositorySyncService = new RepositorySyncService(
      getProjectRepository(),
      getConnectionRepository(),
      getSyncConfigRepository(),
      getAuditRepository()
    );
  }

  return globalThis.__repositorySyncService;
}

export function getWebhookIntakeService() {
  if (!globalThis.__webhookIntakeService) {
    globalThis.__webhookIntakeService = new WebhookIntakeService(
      getProjectRepository(),
      getConnectionRepository(),
      getSyncConfigRepository(),
      getIngestionEventRepository(),
      getAuditRepository(),
      getIngestionQueuePublisher()
    );
  }

  return globalThis.__webhookIntakeService;
}

export function getRequirementIngestionService() {
  if (!globalThis.__requirementIngestionService) {
    globalThis.__requirementIngestionService = new RequirementIngestionService(
      getProjectRepository(),
      getConnectionRepository(),
      getSyncConfigRepository(),
      getIngestionEventRepository(),
      getRequirementRepository(),
      getRequirementRevisionRepository(),
      getAuditRepository(),
      getRequirementRepositoryProvider(),
      getIngestionQueuePublisher()
    );
  }

  return globalThis.__requirementIngestionService;
}

export function getServerIngestionQueuePublisher() {
  return getIngestionQueuePublisher();
}

export function resetServerServices() {
  globalThis.__repositoryConnectionService = undefined;
  globalThis.__repositorySyncService = undefined;
  globalThis.__webhookIntakeService = undefined;
  globalThis.__requirementIngestionService = undefined;
  globalThis.__projectRepository?.clear();
  globalThis.__repositoryConnectionRepository?.clear();
  globalThis.__repositorySyncConfigRepository?.clear();
  globalThis.__ingestionEventRepository?.clear();
  globalThis.__requirementRepository?.clear();
  globalThis.__requirementRevisionRepository?.clear();
  globalThis.__auditEntryRepository?.clear();
  globalThis.__ingestionQueuePublisher?.clear();
}
