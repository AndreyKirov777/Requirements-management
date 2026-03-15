import { describe, expect, it } from "vitest";
import { renderToString } from "react-dom/server";
import { RepositoryOnboarding } from "../../src/components/settings/repository/repository-onboarding";

describe("RepositoryOnboarding", () => {
  it("renders the disconnected state", () => {
    const html = renderToString(<RepositoryOnboarding />);

    expect(html).toContain("No repository connected yet");
    expect(html).toContain("Verify and save");
    expect(html).toContain("Connect a repository and define sync rules");
  });
});
