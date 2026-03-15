"use client";

import type React from "react";
import type {
  ProjectRecord,
  RepositoryConnectionView,
  RepositorySyncPreviewResult,
  RepositorySyncSettingsView,
  RepositorySyncValidationIssue,
  RepositoryVerificationResult,
  SupportedBodySection,
  SupportedFrontmatterField
} from "@repo/contracts";
import { Button, Card, Input } from "@repo/ui";
import { useEffect, useState } from "react";

const STORAGE_KEY = "requirements-management.project-id";

type ConnectionFormState = {
  projectName: string;
  repositoryOwner: string;
  repositoryName: string;
  installationId: string;
};

type SyncFormState = {
  requirementsRootPath: string;
  namingConventionKind: "kebab-case" | "numeric-prefix-kebab-case" | "custom-regex";
  namingConventionPattern: string;
  branchPolicy: "merged_to_default_branch";
  schemaVersion: "requirements-markdown/v1";
  requiredFrontmatterFields: SupportedFrontmatterField[];
  requiredBodySections: SupportedBodySection[];
};

const initialConnectionFormState: ConnectionFormState = {
  projectName: "",
  repositoryOwner: "",
  repositoryName: "",
  installationId: ""
};

const initialSyncFormState: SyncFormState = {
  requirementsRootPath: "requirements",
  namingConventionKind: "numeric-prefix-kebab-case",
  namingConventionPattern: "",
  branchPolicy: "merged_to_default_branch",
  schemaVersion: "requirements-markdown/v1",
  requiredFrontmatterFields: ["id", "title", "status"],
  requiredBodySections: ["Summary", "Requirements", "Acceptance Criteria"]
};

const supportedFrontmatterFields: SupportedFrontmatterField[] = [
  "id",
  "title",
  "status",
  "owner",
  "lastReviewedAt"
];

const supportedBodySections: SupportedBodySection[] = [
  "Summary",
  "Background",
  "Requirements",
  "Acceptance Criteria",
  "Traceability"
];

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

type RequestError = Error & {
  fieldIssues?: RepositorySyncValidationIssue[];
};

async function requestJson<T>(input: RequestInfo, init?: RequestInit): Promise<T> {
  const response = await fetch(input, init);
  const payload = await response.json();

  if (!response.ok) {
    const code = payload?.error?.code as string | undefined;
    const error = new Error(
      errorMessages[code ?? ""] ?? payload?.error?.message ?? "Request failed."
    ) as RequestError;
    const issues = payload?.error?.details?.issues;

    if (Array.isArray(issues)) {
      error.fieldIssues = issues.filter(
        (issue): issue is RepositorySyncValidationIssue =>
          typeof issue?.field === "string" && typeof issue?.message === "string"
      );
    }

    throw error;
  }

  return payload as T;
}

function feedbackStyle(tone: "success" | "danger" | "neutral") {
  if (tone === "success") {
    return {
      background: "rgba(34, 95, 45, 0.08)",
      color: "var(--success)"
    };
  }

  if (tone === "danger") {
    return {
      background: "rgba(157, 61, 42, 0.1)",
      color: "var(--danger)"
    };
  }

  return {
    background: "rgba(122, 102, 63, 0.1)",
    color: "var(--foreground)"
  };
}

function applySettingsToForm(view: RepositorySyncSettingsView): SyncFormState {
  if (!view.syncConfig) {
    return initialSyncFormState;
  }

  return {
    requirementsRootPath: view.syncConfig.requirementsRootPath,
    namingConventionKind: view.syncConfig.namingConventionKind,
    namingConventionPattern: view.syncConfig.namingConventionPattern ?? "",
    branchPolicy: view.syncConfig.branchPolicy,
    schemaVersion: view.syncConfig.schemaVersion,
    requiredFrontmatterFields: view.syncConfig.requiredFrontmatterFields,
    requiredBodySections: view.syncConfig.requiredBodySections
  };
}

export function RepositoryOnboarding() {
  const [connectionForm, setConnectionForm] = useState(initialConnectionFormState);
  const [syncForm, setSyncForm] = useState(initialSyncFormState);
  const [project, setProject] = useState<ProjectRecord | null>(null);
  const [view, setView] = useState<RepositoryConnectionView | null>(null);
  const [syncView, setSyncView] = useState<RepositorySyncSettingsView | null>(null);
  const [preview, setPreview] = useState<RepositorySyncPreviewResult | null>(null);
  const [fieldIssues, setFieldIssues] = useState<Record<string, string>>({});
  const [pendingConnection, setPendingConnection] = useState(false);
  const [pendingSync, setPendingSync] = useState(false);
  const [feedback, setFeedback] = useState<{ tone: "success" | "danger" | "neutral"; message: string } | null>(null);

  useEffect(() => {
    const storedProjectId = window.localStorage.getItem(STORAGE_KEY);

    if (!storedProjectId) {
      return;
    }

    void requestJson<RepositorySyncSettingsView>(
      `/api/v1/projects/${storedProjectId}/sync-settings`
    )
      .then((storedView) => {
        setProject((current) =>
          current ?? {
            id: storedProjectId,
            name: "Current workspace",
            repositoryStatus: storedView.repositoryConnection ? "connected" : "not_connected",
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
          }
        );
        setSyncView(storedView);
        setSyncForm(applySettingsToForm(storedView));
        setFeedback({
          tone: storedView.syncConfig ? "neutral" : "success",
          message: storedView.syncConfig
            ? "Saved sync settings were restored for this project."
            : "Repository connected. Complete the sync rules below."
        });
      })
      .catch(() => {
        window.localStorage.removeItem(STORAGE_KEY);
      });
  }, []);

  function getFieldIssue(field: string) {
    return fieldIssues[field] ?? null;
  }

  function setFieldIssueMap(issues: RepositorySyncValidationIssue[]) {
    setFieldIssues(
      Object.fromEntries(issues.map((issue) => [issue.field, issue.message]))
    );
  }

  function toggleSelection<T extends string>(
    values: T[],
    nextValue: T
  ): T[] {
    return values.includes(nextValue)
      ? values.filter((value) => value !== nextValue)
      : [...values, nextValue];
  }

  async function handleConnect(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPendingConnection(true);
    setFeedback(null);

    try {
      const correlationId = crypto.randomUUID();
      const nextProject =
        project ??
        (await requestJson<ProjectRecord>("/api/v1/projects", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ name: connectionForm.projectName })
        }));

      const verification = await requestJson<RepositoryVerificationResult>(
        "/api/v1/integrations/github/repository-verifications",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            provider: "github",
            repositoryOwner: connectionForm.repositoryOwner,
            repositoryName: connectionForm.repositoryName,
            installationId: connectionForm.installationId,
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

      const nextSyncView = await requestJson<RepositorySyncSettingsView>(
        `/api/v1/projects/${nextProject.id}/sync-settings`
      );

      window.localStorage.setItem(STORAGE_KEY, nextProject.id);
      setProject(saved.project);
      setView(saved);
      setSyncView(nextSyncView);
      setPreview(null);
      setFeedback({
        tone: "success",
        message:
          "Repository connected. Configure the authoritative requirements scope before ingestion."
      });
    } catch (error) {
      setFeedback({
        tone: "danger",
        message: error instanceof Error ? error.message : "Request failed."
      });
    } finally {
      setPendingConnection(false);
    }
  }

  async function handlePreview() {
    if (!project || !syncView?.repositoryConnection) {
      return;
    }

    setPendingSync(true);
    setFeedback(null);
    setFieldIssues({});

    try {
      const correlationId = crypto.randomUUID();
      const nextPreview = await requestJson<RepositorySyncPreviewResult>(
        `/api/v1/projects/${project.id}/sync-settings/previews`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            projectId: project.id,
            provider: syncView.repositoryConnection.provider,
            repositoryOwner: syncView.repositoryConnection.repositoryOwner,
            repositoryName: syncView.repositoryConnection.repositoryName,
            defaultBranch: syncView.repositoryConnection.defaultBranch,
            requirementsRootPath: syncForm.requirementsRootPath,
            branchPolicy: syncForm.branchPolicy,
            correlationId
          })
        }
      );

      setPreview(nextPreview);
      setFieldIssueMap(nextPreview.issues);
      setFeedback({
        tone: nextPreview.pathExists ? "success" : "danger",
        message: nextPreview.pathExists
          ? "Repository path validated. Review the sample files, then save the rules."
          : "The selected requirements folder could not be validated."
      });
    } catch (error) {
      const issues = error instanceof Error && "fieldIssues" in error
        ? ((error as RequestError).fieldIssues ?? [])
        : [];
      setFieldIssueMap(issues);
      setFeedback({
        tone: "danger",
        message: error instanceof Error ? error.message : "Preview failed."
      });
    } finally {
      setPendingSync(false);
    }
  }

  async function handleSaveSync(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!project) {
      return;
    }

    setPendingSync(true);
    setFeedback(null);
    setFieldIssues({});

    try {
      const correlationId = crypto.randomUUID();
      const saved = await requestJson<RepositorySyncSettingsView>(
        `/api/v1/projects/${project.id}/sync-settings`,
        {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            requirementsRootPath: syncForm.requirementsRootPath,
            namingConventionKind: syncForm.namingConventionKind,
            namingConventionPattern:
              syncForm.namingConventionKind === "custom-regex"
                ? syncForm.namingConventionPattern
                : null,
            branchPolicy: syncForm.branchPolicy,
            schema: {
              schemaVersion: syncForm.schemaVersion,
              requiredFrontmatterFields: syncForm.requiredFrontmatterFields,
              requiredBodySections: syncForm.requiredBodySections
            },
            correlationId
          })
        }
      );

      setSyncView(saved);
      setPreview(saved.preview);
      setSyncForm(applySettingsToForm(saved));
      setFeedback({
        tone: "success",
        message: "Sync rules saved. Later ingestion jobs will use this configuration."
      });
    } catch (error) {
      const issues = error instanceof Error && "fieldIssues" in error
        ? ((error as RequestError).fieldIssues ?? [])
        : [];
      setFieldIssueMap(issues);
      setFeedback({
        tone: "danger",
        message: error instanceof Error ? error.message : "Save failed."
      });
    } finally {
      setPendingSync(false);
    }
  }

  const connectionSummary = syncView?.repositoryConnection
    ? `${syncView.repositoryConnection.repositoryOwner}/${syncView.repositoryConnection.repositoryName}`
    : view?.repositoryConnection
      ? `${view.repositoryConnection.repositoryOwner}/${view.repositoryConnection.repositoryName}`
      : null;

  return (
    <div style={{ display: "grid", gap: "24px" }}>
      <Card style={{ display: "grid", gap: "16px" }}>
        <div>
          <div
            style={{
              fontSize: "0.8rem",
              letterSpacing: "0.18em",
              textTransform: "uppercase",
              color: "var(--muted)"
            }}
          >
            Stories 1.1 and 1.2
          </div>
          <h2 style={{ marginBottom: "8px" }}>Connect a repository and define sync rules</h2>
          <p style={{ margin: 0, color: "var(--muted)", maxWidth: "60ch" }}>
            This setup keeps repository identity separate from authoritative requirement validation rules. Connect first, then define the folder, naming policy, and markdown schema used for sync.
          </p>
        </div>

        <form onSubmit={handleConnect} style={{ display: "grid", gap: "14px" }}>
          <label>
            <div style={{ marginBottom: "6px" }}>Project name</div>
            <Input
              required
              value={connectionForm.projectName}
              onChange={(event) =>
                setConnectionForm((current) => ({
                  ...current,
                  projectName: event.target.value
                }))
              }
            />
          </label>

          <div
            style={{
              display: "grid",
              gap: "14px",
              gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))"
            }}
          >
            <label>
              <div style={{ marginBottom: "6px" }}>Repository owner</div>
              <Input
                required
                value={connectionForm.repositoryOwner}
                onChange={(event) =>
                  setConnectionForm((current) => ({
                    ...current,
                    repositoryOwner: event.target.value
                  }))
                }
              />
            </label>
            <label>
              <div style={{ marginBottom: "6px" }}>Repository name</div>
              <Input
                required
                value={connectionForm.repositoryName}
                onChange={(event) =>
                  setConnectionForm((current) => ({
                    ...current,
                    repositoryName: event.target.value
                  }))
                }
              />
            </label>
          </div>

          <label>
            <div style={{ marginBottom: "6px" }}>GitHub installation reference</div>
            <Input
              required
              value={connectionForm.installationId}
              onChange={(event) =>
                setConnectionForm((current) => ({
                  ...current,
                  installationId: event.target.value
                }))
              }
            />
          </label>

          <div style={{ display: "flex", alignItems: "center", gap: "16px", flexWrap: "wrap" }}>
            <Button disabled={pendingConnection} type="submit">
              {pendingConnection ? "Verifying..." : "Verify and save"}
            </Button>
            <span style={{ color: "var(--muted)" }}>
              Status: {project?.repositoryStatus ?? "not_connected"}
            </span>
          </div>
        </form>

        {feedback ? (
          <div
            style={{
              borderRadius: "16px",
              padding: "12px 14px",
              border: "1px solid var(--border)",
              ...feedbackStyle(feedback.tone)
            }}
          >
            {feedback.message}
          </div>
        ) : null}
      </Card>

      <Card style={{ display: "grid", gap: "12px" }}>
        <h3 style={{ margin: 0 }}>Workspace connection state</h3>
        <div style={{ color: "var(--muted)" }}>
          {connectionSummary ? (
            <>
              Repository <strong>{connectionSummary}</strong> is connected. Sync readiness is{" "}
              <strong>{syncView?.readinessLabel ?? "Configuration incomplete"}</strong>.
            </>
          ) : (
            "No repository connected yet. Complete verification to unlock sync rule configuration."
          )}
        </div>
      </Card>

      {syncView?.repositoryConnection ? (
        <Card style={{ display: "grid", gap: "16px" }}>
          <div>
            <h3 style={{ marginBottom: "8px" }}>Requirement sync configuration</h3>
            <p style={{ margin: 0, color: "var(--muted)", maxWidth: "65ch" }}>
              Define the repository folder, naming policy, and markdown schema that later ingestion must honor.
            </p>
          </div>

          <form onSubmit={handleSaveSync} style={{ display: "grid", gap: "16px" }}>
            <label>
              <div style={{ marginBottom: "6px" }}>Requirements root folder</div>
              <Input
                value={syncForm.requirementsRootPath}
                onChange={(event) =>
                  setSyncForm((current) => ({
                    ...current,
                    requirementsRootPath: event.target.value
                  }))
                }
              />
              {getFieldIssue("requirementsRootPath") ? (
                <div style={{ marginTop: "6px", color: "var(--danger)" }}>
                  {getFieldIssue("requirementsRootPath")}
                </div>
              ) : null}
            </label>

            <label>
              <div style={{ marginBottom: "6px" }}>Naming convention</div>
              <select
                value={syncForm.namingConventionKind}
                onChange={(event) =>
                  setSyncForm((current) => ({
                    ...current,
                    namingConventionKind: event.target.value as SyncFormState["namingConventionKind"]
                  }))
                }
                style={{
                  width: "100%",
                  borderRadius: "14px",
                  border: "1px solid var(--border)",
                  background: "#fffdf9",
                  padding: "12px 14px"
                }}
              >
                <option value="numeric-prefix-kebab-case">Numeric prefix + kebab case</option>
                <option value="kebab-case">Kebab case</option>
                <option value="custom-regex">Custom regex</option>
              </select>
            </label>

            {syncForm.namingConventionKind === "custom-regex" ? (
              <label>
                <div style={{ marginBottom: "6px" }}>Regex pattern</div>
                <Input
                  placeholder="^REQ-[0-9]+-[a-z0-9-]+\\.md$"
                  value={syncForm.namingConventionPattern}
                  onChange={(event) =>
                    setSyncForm((current) => ({
                      ...current,
                      namingConventionPattern: event.target.value
                    }))
                  }
                />
                {getFieldIssue("namingConventionPattern") ? (
                  <div style={{ marginTop: "6px", color: "var(--danger)" }}>
                    {getFieldIssue("namingConventionPattern")}
                  </div>
                ) : null}
              </label>
            ) : null}

            <label>
              <div style={{ marginBottom: "6px" }}>Branch policy</div>
              <select
                value={syncForm.branchPolicy}
                onChange={(event) =>
                  setSyncForm((current) => ({
                    ...current,
                    branchPolicy: event.target.value as SyncFormState["branchPolicy"]
                  }))
                }
                style={{
                  width: "100%",
                  borderRadius: "14px",
                  border: "1px solid var(--border)",
                  background: "#fffdf9",
                  padding: "12px 14px"
                }}
              >
                <option value="merged_to_default_branch">
                  Sync only after merge to the repository default branch
                </option>
              </select>
            </label>

            <div style={{ display: "grid", gap: "10px" }}>
              <div>
                <strong>Required frontmatter fields</strong>
              </div>
              <div
                style={{
                  display: "grid",
                  gap: "10px",
                  gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))"
                }}
              >
                {supportedFrontmatterFields.map((field) => (
                  <label
                    key={field}
                    style={{
                      display: "flex",
                      gap: "8px",
                      alignItems: "center",
                      border: "1px solid var(--border)",
                      borderRadius: "14px",
                      padding: "10px 12px"
                    }}
                  >
                    <input
                      checked={syncForm.requiredFrontmatterFields.includes(field)}
                      type="checkbox"
                      onChange={() =>
                        setSyncForm((current) => ({
                          ...current,
                          requiredFrontmatterFields: toggleSelection(
                            current.requiredFrontmatterFields,
                            field
                          )
                        }))
                      }
                    />
                    <span>{field}</span>
                  </label>
                ))}
              </div>
              {getFieldIssue("schema.requiredFrontmatterFields") ? (
                <div style={{ color: "var(--danger)" }}>
                  {getFieldIssue("schema.requiredFrontmatterFields")}
                </div>
              ) : null}
            </div>

            <div style={{ display: "grid", gap: "10px" }}>
              <div>
                <strong>Allowed body sections</strong>
              </div>
              <div
                style={{
                  display: "grid",
                  gap: "10px",
                  gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))"
                }}
              >
                {supportedBodySections.map((section) => (
                  <label
                    key={section}
                    style={{
                      display: "flex",
                      gap: "8px",
                      alignItems: "center",
                      border: "1px solid var(--border)",
                      borderRadius: "14px",
                      padding: "10px 12px"
                    }}
                  >
                    <input
                      checked={syncForm.requiredBodySections.includes(section)}
                      type="checkbox"
                      onChange={() =>
                        setSyncForm((current) => ({
                          ...current,
                          requiredBodySections: toggleSelection(
                            current.requiredBodySections,
                            section
                          )
                        }))
                      }
                    />
                    <span>{section}</span>
                  </label>
                ))}
              </div>
              {getFieldIssue("schema.requiredBodySections") ? (
                <div style={{ color: "var(--danger)" }}>
                  {getFieldIssue("schema.requiredBodySections")}
                </div>
              ) : null}
            </div>

            <div style={{ display: "flex", gap: "12px", flexWrap: "wrap" }}>
              <Button disabled={pendingSync} onClick={() => void handlePreview()} type="button">
                {pendingSync ? "Working..." : "Validate folder"}
              </Button>
              <Button disabled={pendingSync} type="submit">
                {pendingSync ? "Saving..." : "Save sync rules"}
              </Button>
            </div>
          </form>

          <div
            style={{
              display: "grid",
              gap: "12px",
              padding: "16px",
              borderRadius: "18px",
              border: "1px solid var(--border)",
              background: "#fffdf9"
            }}
          >
            <div>
              <strong>Readiness</strong>: {syncView.readinessLabel}
            </div>
            <div style={{ color: "var(--muted)" }}>
              Branch: <strong>{syncView.repositoryConnection.defaultBranch}</strong>
            </div>
            <div style={{ color: "var(--muted)" }}>
              Ready for webhook ingestion:{" "}
              <strong>{syncView.readyForWebhookIngestion ? "Yes" : "No"}</strong>
            </div>
            {preview?.sampleFiles?.length ? (
              <div style={{ display: "grid", gap: "6px" }}>
                <strong>Sample files</strong>
                {preview.sampleFiles.map((file) => (
                  <code key={file}>{file}</code>
                ))}
              </div>
            ) : null}
            {syncView.syncConfig ? (
              <div style={{ color: "var(--muted)" }}>
                Last validated:{" "}
                <strong>
                  {syncView.syncConfig.validatedAt
                    ? new Date(syncView.syncConfig.validatedAt).toLocaleString()
                    : "Not yet validated"}
                </strong>
              </div>
            ) : null}
          </div>
        </Card>
      ) : null}
    </div>
  );
}
