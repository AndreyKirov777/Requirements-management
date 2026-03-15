import type {
  RepositoryConnectionRecord,
  RepositorySyncPreviewInput,
  RepositorySyncPreviewResult
} from "@repo/contracts";
import { DomainError } from "../shared/domain-error";

export interface RepositoryScopeProvider {
  previewRequirementsPath(
    connection: RepositoryConnectionRecord,
    input: RepositorySyncPreviewInput
  ): Promise<RepositorySyncPreviewResult>;
}

function buildSampleFiles(rootPath: string) {
  return [
    `${rootPath}/001-product-overview.md`,
    `${rootPath}/002-user-authentication.md`
  ];
}

export class MockRepositoryScopeProvider implements RepositoryScopeProvider {
  async previewRequirementsPath(
    connection: RepositoryConnectionRecord,
    input: RepositorySyncPreviewInput
  ): Promise<RepositorySyncPreviewResult> {
    if (connection.provider !== input.provider) {
      throw new DomainError({
        code: "VALIDATION_ERROR",
        message: "Repository provider mismatch for sync preview.",
        details: {
          expectedProvider: connection.provider,
          receivedProvider: input.provider
        },
        httpStatus: 400
      });
    }

    const looksMissing =
      input.requirementsRootPath.includes("missing") ||
      input.requirementsRootPath.includes("unknown");

    if (looksMissing) {
      return {
        pathExists: false,
        branch: input.defaultBranch,
        sampleFiles: [],
        issues: [
          {
            field: "requirementsRootPath",
            message:
              "That folder was not found on the connected repository branch. Choose an existing repository-relative path."
          }
        ]
      };
    }

    return {
      pathExists: true,
      branch: input.defaultBranch,
      sampleFiles: buildSampleFiles(input.requirementsRootPath),
      issues: []
    };
  }
}
