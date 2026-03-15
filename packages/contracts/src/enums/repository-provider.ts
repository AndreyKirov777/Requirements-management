import { z } from "zod";

export const RepositoryProviderSchema = z.enum(["github", "gitlab"]);
export type RepositoryProvider = z.infer<typeof RepositoryProviderSchema>;

export const RepositoryConnectionStatusSchema = z.enum(["connected", "not_connected"]);
export type RepositoryConnectionStatus = z.infer<typeof RepositoryConnectionStatusSchema>;
