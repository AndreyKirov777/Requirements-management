import type {
  GitHubVerificationInput,
  RepositoryVerificationResult
} from "@repo/contracts";
import { DomainError } from "../shared/domain-error";

export type GitHubRepositoryVerifier = (
  input: GitHubVerificationInput
) => Promise<RepositoryVerificationResult>;

export const verifyGitHubRepositoryAccess: GitHubRepositoryVerifier = async (input) => {
  const owner = input.repositoryOwner.toLowerCase();
  const repo = input.repositoryName.toLowerCase();

  if (input.installationId.startsWith("bad-auth")) {
    throw new DomainError({
      code: "GITHUB_AUTHENTICATION_FAILED",
      message: "GitHub could not authenticate the provided installation reference.",
      details: {
        repositoryOwner: owner,
        repositoryName: repo
      },
      httpStatus: 401
    });
  }

  if (input.installationId.startsWith("forbidden")) {
    throw new DomainError({
      code: "GITHUB_AUTHORIZATION_FAILED",
      message: "The GitHub installation does not have access to this repository.",
      details: {
        repositoryOwner: owner,
        repositoryName: repo
      },
      httpStatus: 403
    });
  }

  if (repo === "missing") {
    throw new DomainError({
      code: "GITHUB_REPOSITORY_NOT_FOUND",
      message: "GitHub could not find that repository.",
      details: {
        repositoryOwner: owner,
        repositoryName: repo
      },
      httpStatus: 404
    });
  }

  const connectionTimestamp = new Date().toISOString();

  return {
    provider: "github",
    repositoryOwner: owner,
    repositoryName: repo,
    repositoryId: `${owner}/${repo}`,
    defaultBranch: "main",
    connectionTimestamp,
    status: "connected",
    readyForNextSetupStep: true,
    credentialReference: `github-installation:${input.installationId}`
  };
};
