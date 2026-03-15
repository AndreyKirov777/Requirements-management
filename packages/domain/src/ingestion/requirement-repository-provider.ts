import type { RepositoryConnectionRecord } from "@repo/contracts";
import { DomainError } from "../shared/domain-error";

export type RepositoryFileData = {
  path: string;
  content: string;
};

export interface RequirementRepositoryProvider {
  fetchRequirementFile(
    connection: RepositoryConnectionRecord,
    input: { commitSha: string; path: string }
  ): Promise<RepositoryFileData>;
}

export class MockRequirementRepositoryProvider
  implements RequirementRepositoryProvider
{
  constructor(
    private readonly files: Record<string, string> = {}
  ) {}

  async fetchRequirementFile(
    _connection: RepositoryConnectionRecord,
    input: { commitSha: string; path: string }
  ): Promise<RepositoryFileData> {
    if (input.path.includes("transient")) {
      throw new DomainError({
        code: "GITHUB_CONTENT_FETCH_FAILED",
        message: "Repository content fetch failed temporarily.",
        details: { path: input.path, commitSha: input.commitSha },
        retryable: true,
        httpStatus: 502
      });
    }

    const content =
      this.files[input.path] ??
      [
        "---",
        `id: ${input.path.replace(/\.md$/, "").replaceAll("/", "-")}`,
        "title: Example requirement",
        "status: approved",
        "---",
        "## Summary",
        "Example summary",
        "",
        "## Requirements",
        "Example requirements",
        "",
        "## Acceptance Criteria",
        "Example acceptance criteria"
      ].join("\n");

    if (content === "__missing__") {
      throw new DomainError({
        code: "GITHUB_CONTENT_FETCH_FAILED",
        message: "Repository content fetch failed because the file is missing.",
        details: { path: input.path, commitSha: input.commitSha },
        retryable: false,
        httpStatus: 404
      });
    }

    return {
      path: input.path,
      content
    };
  }
}
