import { GitHubConnectionService } from "@repo/domain";

declare global {
  var __repositoryConnectionService: GitHubConnectionService | undefined;
}

export function getRepositoryConnectionService() {
  if (!globalThis.__repositoryConnectionService) {
    globalThis.__repositoryConnectionService = new GitHubConnectionService();
  }

  return globalThis.__repositoryConnectionService;
}
