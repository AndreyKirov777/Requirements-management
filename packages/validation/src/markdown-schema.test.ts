import { describe, expect, it } from "vitest";
import {
  fileNameMatchesConvention,
  validateMarkdownSchemaRules,
  validateNamingConvention
} from "./markdown-schema";

describe("markdown schema validation", () => {
  it("rejects empty schema selections", () => {
    expect(
      validateMarkdownSchemaRules({
        schemaVersion: "requirements-markdown/v1",
        requiredFrontmatterFields: [],
        requiredBodySections: []
      })
    ).toEqual([
      {
        field: "requiredFrontmatterFields",
        message: "Too small: expected array to have >=1 items"
      },
      {
        field: "requiredBodySections",
        message: "Too small: expected array to have >=1 items"
      }
    ]);
  });

  it("validates custom regex naming rules", () => {
    expect(validateNamingConvention("custom-regex", "[")).toEqual([
      {
        field: "namingConventionPattern",
        message: "Enter a valid regex pattern."
      }
    ]);
  });

  it("matches file names with the selected shared convention", () => {
    expect(
      fileNameMatchesConvention({
        fileName: "123-auth-flow.md",
        kind: "numeric-prefix-kebab-case",
        pattern: null
      })
    ).toBe(true);
    expect(
      fileNameMatchesConvention({
        fileName: "AuthFlow.md",
        kind: "kebab-case",
        pattern: null
      })
    ).toBe(false);
  });
});
