import {
  type ParsedRequirementDocument,
  type RepositoryNamingConventionKind,
  type RepositorySyncConfigRecord,
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

function parseFrontmatter(lines: string[]) {
  return Object.fromEntries(
    lines
      .map((line) => {
        const separatorIndex = line.indexOf(":");

        if (separatorIndex === -1) {
          return null;
        }

        const key = line.slice(0, separatorIndex).trim();
        const value = line
          .slice(separatorIndex + 1)
          .trim()
          .replace(/^['"]|['"]$/g, "");

        return key.length > 0 ? [key, value] : null;
      })
      .filter((entry): entry is [string, string] => entry !== null)
  );
}

function parseSections(body: string) {
  const sections: Record<string, string> = {};
  const matches = [
    ...body.matchAll(/^##\s+(.+)\n([\s\S]*?)(?=^##\s+.+|$)/gm)
  ];

  for (const [, heading, content] of matches) {
    sections[heading.trim()] = content.trim();
  }

  return sections;
}

export function parseRequirementMarkdown(input: {
  content: string;
  schema: Pick<
    RepositorySyncConfigRecord,
    "requiredFrontmatterFields" | "requiredBodySections"
  >;
}):
  | { success: true; document: ParsedRequirementDocument }
  | { success: false; issues: RepositorySyncValidationIssue[] } {
  const match = input.content.match(/^---\n([\s\S]*?)\n---\n?([\s\S]*)$/);

  if (!match) {
    return {
      success: false,
      issues: [
        {
          field: "frontmatter",
          message: "Requirement markdown must start with YAML-style frontmatter."
        }
      ]
    };
  }

  const [, frontmatterBlock, body] = match;
  const frontmatter = parseFrontmatter(frontmatterBlock.split("\n"));
  const sections = parseSections(body);
  const issues: RepositorySyncValidationIssue[] = [];

  for (const field of input.schema.requiredFrontmatterFields) {
    if (!frontmatter[field]) {
      issues.push({
        field: `frontmatter.${field}`,
        message: `Frontmatter field "${field}" is required.`
      });
    }
  }

  for (const section of input.schema.requiredBodySections) {
    if (!sections[section]) {
      issues.push({
        field: `sections.${section}`,
        message: `Section "${section}" is required.`
      });
    }
  }

  if (!frontmatter.id) {
    issues.push({
      field: "frontmatter.id",
      message: 'Frontmatter field "id" is required.'
    });
  }

  if (!frontmatter.title) {
    issues.push({
      field: "frontmatter.title",
      message: 'Frontmatter field "title" is required.'
    });
  }

  if (!frontmatter.status) {
    issues.push({
      field: "frontmatter.status",
      message: 'Frontmatter field "status" is required.'
    });
  }

  if (issues.length > 0) {
    return { success: false, issues };
  }

  return {
    success: true,
    document: {
      requirementKey: frontmatter.id,
      title: frontmatter.title,
      status: frontmatter.status,
      frontmatter,
      sections,
      bodyMarkdown: body.trim()
    }
  };
}
