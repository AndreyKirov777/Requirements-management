import type { ProjectRecord } from "@repo/contracts";

export interface ProjectRepository {
  create(input: { name: string }): Promise<ProjectRecord>;
  findById(projectId: string): Promise<ProjectRecord | null>;
  setRepositoryStatus(
    projectId: string,
    repositoryStatus: ProjectRecord["repositoryStatus"]
  ): Promise<ProjectRecord | null>;
}

const projects = new Map<string, ProjectRecord>();

export class InMemoryProjectRepository implements ProjectRepository {
  async create(input: { name: string }): Promise<ProjectRecord> {
    const timestamp = new Date().toISOString();
    const project: ProjectRecord = {
      id: crypto.randomUUID(),
      name: input.name,
      repositoryStatus: "not_connected",
      createdAt: timestamp,
      updatedAt: timestamp
    };

    projects.set(project.id, project);
    return project;
  }

  async findById(projectId: string): Promise<ProjectRecord | null> {
    return projects.get(projectId) ?? null;
  }

  async setRepositoryStatus(projectId: string, repositoryStatus: ProjectRecord["repositoryStatus"]) {
    const project = projects.get(projectId);

    if (!project) {
      return null;
    }

    const nextProject: ProjectRecord = {
      ...project,
      repositoryStatus,
      updatedAt: new Date().toISOString()
    };

    projects.set(projectId, nextProject);
    return nextProject;
  }

  clear() {
    projects.clear();
  }
}
