const counters = {
  repositoryVerificationSucceeded: 0,
  repositoryVerificationFailed: 0,
  repositorySyncValidationAttempts: 0,
  repositorySyncConfigurationSaved: 0,
  ingestionWebhookAccepted: 0,
  ingestionWebhookDuplicate: 0,
  ingestionJobsCompleted: 0,
  ingestionJobsDeadLettered: 0
};

export const connectionMetrics = {
  trackSuccess() {
    counters.repositoryVerificationSucceeded += 1;
  },
  trackFailure() {
    counters.repositoryVerificationFailed += 1;
  },
  trackSyncValidationAttempt() {
    counters.repositorySyncValidationAttempts += 1;
  },
  trackSyncConfigurationSaved() {
    counters.repositorySyncConfigurationSaved += 1;
  },
  trackIngestionWebhookAccepted() {
    counters.ingestionWebhookAccepted += 1;
  },
  trackIngestionWebhookDuplicate() {
    counters.ingestionWebhookDuplicate += 1;
  },
  trackIngestionJobCompleted() {
    counters.ingestionJobsCompleted += 1;
  },
  trackIngestionJobDeadLettered() {
    counters.ingestionJobsDeadLettered += 1;
  },
  snapshot() {
    return { ...counters };
  },
  reset() {
    counters.repositoryVerificationSucceeded = 0;
    counters.repositoryVerificationFailed = 0;
    counters.repositorySyncValidationAttempts = 0;
    counters.repositorySyncConfigurationSaved = 0;
    counters.ingestionWebhookAccepted = 0;
    counters.ingestionWebhookDuplicate = 0;
    counters.ingestionJobsCompleted = 0;
    counters.ingestionJobsDeadLettered = 0;
  }
};
