import {
  GitHubConnectionService,
  RepositorySyncService
} from "@repo/domain";
import {
  InMemoryAuditEntryRepository,
  InMemoryProjectRepository,
  InMemoryRepositoryConnectionRepository,
  InMemoryRepositorySyncConfigRepository
} from "@repo/db";

declare global {
  var __repositoryConnectionService: GitHubConnectionService | undefined;
  var __repositorySyncService: RepositorySyncService | undefined;
  var __projectRepository: InMemoryProjectRepository | undefined;
  var __repositoryConnectionRepository:
    | InMemoryRepositoryConnectionRepository
    | undefined;
  var __repositorySyncConfigRepository:
    | InMemoryRepositorySyncConfigRepository
    | undefined;
  var __auditEntryRepository: InMemoryAuditEntryRepository | undefined;
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
