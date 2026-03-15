import {
  type RepositoryNamingConventionKind,
  RepositorySyncSchemaRulesSchema,
  type RepositorySyncValidationIssue
} from "@repo/contracts";

const namingConventionExpressions: Record<
  Exclude<RepositoryNamingConventionKind, "custom-regex">,
  RegExp
> = {
  "kebab-case": /^[a-z0-9]+(?:-[a-z0-9]+)*\.md$/,
  "numeric-prefix-kebab-case": /^\d+(?:-\d+)*-[a-z0-9]+(?:-[a-z0-9]+)*\.md$/
};

export const CANONICAL_MARKDOWN_SCHEMA_VERSION = "requirements-markdown/v1" as const;

export function validateMarkdownSchemaRules(input: unknown): RepositorySyncValidationIssue[] {
  const result = RepositorySyncSchemaRulesSchema.safeParse(input);

  if (result.success) {
    return [];
  }

  return result.error.issues.map((issue) => ({
    field: issue.path.join(".") || "schema",
    message: issue.message
  }));
}

export function validateNamingConvention(
  kind: RepositoryNamingConventionKind,
  pattern: string | null
): RepositorySyncValidationIssue[] {
  if (kind !== "custom-regex") {
    return [];
  }

  if (!pattern) {
    return [
      {
        field: "namingConventionPattern",
        message: "Provide a regex pattern for the custom naming convention."
      }
    ];
  }

  try {
    new RegExp(pattern);
    return [];
  } catch {
    return [
      {
        field: "namingConventionPattern",
        message: "Enter a valid regex pattern."
      }
    ];
  }
}

export function fileNameMatchesConvention(input: {
  fileName: string;
  kind: RepositoryNamingConventionKind;
  pattern: string | null;
}): boolean {
  if (input.kind === "custom-regex") {
    if (!input.pattern) {
      return false;
    }

    return new RegExp(input.pattern).test(input.fileName);
  }

  return namingConventionExpressions[input.kind].test(input.fileName);
}
