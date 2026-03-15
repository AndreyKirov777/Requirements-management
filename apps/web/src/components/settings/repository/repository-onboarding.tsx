"use client";

import type React from "react";
import type {
  ProjectRecord,
  RepositoryConnectionView,
  RepositoryVerificationResult
} from "@repo/contracts";
import { Button, Card, Input } from "@repo/ui";
import { useState } from "react";

type FormState = {
  projectName: string;
  repositoryOwner: string;
  repositoryName: string;
  installationId: string;
};

const initialFormState: FormState = {
  projectName: "",
  repositoryOwner: "",
  repositoryName: "",
  installationId: ""
};

const errorMessages: Record<string, string> = {
  GITHUB_AUTHENTICATION_FAILED:
    "Authentication failed. Reconnect the GitHub installation and try again.",
  GITHUB_AUTHORIZATION_FAILED:
    "Authorization failed. Grant this installation access to the repository, then retry.",
  GITHUB_REPOSITORY_NOT_FOUND:
    "Repository lookup failed. Check the owner and repository name.",
  GITHUB_CONNECTION_VERIFICATION_FAILED:
    "GitHub verification failed unexpectedly. Retry once, then inspect logs if it persists."
};

async function requestJson<T>(input: RequestInfo, init?: RequestInit): Promise<T> {
  const response = await fetch(input, init);
  const payload = await response.json();

  if (!response.ok) {
    const code = payload?.error?.code as string | undefined;
    throw new Error(errorMessages[code ?? ""] ?? payload?.error?.message ?? "Request failed.");
  }

  return payload as T;
}

export function RepositoryOnboarding() {
  const [form, setForm] = useState(initialFormState);
  const [project, setProject] = useState<ProjectRecord | null>(null);
  const [view, setView] = useState<RepositoryConnectionView | null>(null);
  const [pending, setPending] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    setFeedback(null);

    try {
      const correlationId = crypto.randomUUID();
      const nextProject =
        project ??
        (await requestJson<ProjectRecord>("/api/v1/projects", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ name: form.projectName })
        }));

      const verification = await requestJson<RepositoryVerificationResult>(
        "/api/v1/integrations/github/repository-verifications",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            provider: "github",
            repositoryOwner: form.repositoryOwner,
            repositoryName: form.repositoryName,
            installationId: form.installationId,
            correlationId
          })
        }
      );

      const saved = await requestJson<RepositoryConnectionView>(
        `/api/v1/projects/${nextProject.id}/repository-connections`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            provider: verification.provider,
            repositoryOwner: verification.repositoryOwner,
            repositoryName: verification.repositoryName,
            repositoryId: verification.repositoryId,
            defaultBranch: verification.defaultBranch,
            credentialReference: verification.credentialReference,
            connectedAt: verification.connectionTimestamp,
            lastVerifiedAt: verification.connectionTimestamp,
            correlationId
          })
        }
      );

      setProject(saved.project);
      setView(saved);
      setFeedback("Repository connected. Requirement sync setup is ready for the next step.");
    } catch (error) {
      setFeedback(error instanceof Error ? error.message : "Request failed.");
    } finally {
      setPending(false);
    }
  }

  return (
    <div style={{ display: "grid", gap: "24px" }}>
      <Card style={{ display: "grid", gap: "16px" }}>
        <div>
          <div style={{ fontSize: "0.8rem", letterSpacing: "0.18em", textTransform: "uppercase", color: "var(--muted)" }}>
            Story 1.1
          </div>
          <h2 style={{ marginBottom: "8px" }}>Connect a GitHub repository</h2>
          <p style={{ margin: 0, color: "var(--muted)", maxWidth: "60ch" }}>
            This flow verifies repository access before saving the connection. Sync configuration and ingestion stay out of scope until the next story.
          </p>
        </div>

        <form onSubmit={handleSubmit} style={{ display: "grid", gap: "14px" }}>
          <label>
            <div style={{ marginBottom: "6px" }}>Project name</div>
            <Input
              required
              value={form.projectName}
              onChange={(event) =>
                setForm((current) => ({ ...current, projectName: event.target.value }))
              }
            />
          </label>

          <div style={{ display: "grid", gap: "14px", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))" }}>
            <label>
              <div style={{ marginBottom: "6px" }}>Repository owner</div>
              <Input
                required
                value={form.repositoryOwner}
                onChange={(event) =>
                  setForm((current) => ({ ...current, repositoryOwner: event.target.value }))
                }
              />
            </label>
            <label>
              <div style={{ marginBottom: "6px" }}>Repository name</div>
              <Input
                required
                value={form.repositoryName}
                onChange={(event) =>
                  setForm((current) => ({ ...current, repositoryName: event.target.value }))
                }
              />
            </label>
          </div>

          <label>
            <div style={{ marginBottom: "6px" }}>GitHub installation reference</div>
            <Input
              required
              value={form.installationId}
              onChange={(event) =>
                setForm((current) => ({ ...current, installationId: event.target.value }))
              }
            />
          </label>

          <div style={{ display: "flex", alignItems: "center", gap: "16px", flexWrap: "wrap" }}>
            <Button disabled={pending} type="submit">
              {pending ? "Verifying..." : "Verify and save"}
            </Button>
            <span style={{ color: "var(--muted)" }}>
              Status: {view?.project.repositoryStatus ?? "not_connected"}
            </span>
          </div>

          {feedback ? (
            <div
              style={{
                borderRadius: "16px",
                padding: "12px 14px",
                border: "1px solid var(--border)",
                background: feedback.startsWith("Repository connected")
                  ? "rgba(34, 95, 45, 0.08)"
                  : "rgba(157, 61, 42, 0.1)",
                color: feedback.startsWith("Repository connected")
                  ? "var(--success)"
                  : "var(--danger)"
              }}
            >
              {feedback}
            </div>
          ) : null}
        </form>
      </Card>

      <Card style={{ display: "grid", gap: "12px" }}>
        <h3 style={{ margin: 0 }}>Workspace connection state</h3>
        <div style={{ color: "var(--muted)" }}>
          {view?.repositoryConnection ? (
            <>
              GitHub repository <strong>{view.repositoryConnection.repositoryOwner}/{view.repositoryConnection.repositoryName}</strong> on branch{" "}
              <strong>{view.repositoryConnection.defaultBranch}</strong> is connected. The workspace is ready for sync rule configuration.
            </>
          ) : (
            "No repository connected yet. Complete verification to unlock the next setup step."
          )}
        </div>
      </Card>
    </div>
  );
}
