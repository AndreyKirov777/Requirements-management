const counters = {
  repositoryVerificationSucceeded: 0,
  repositoryVerificationFailed: 0,
  repositorySyncValidationAttempts: 0,
  repositorySyncConfigurationSaved: 0
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
  snapshot() {
    return { ...counters };
  },
  reset() {
    counters.repositoryVerificationSucceeded = 0;
    counters.repositoryVerificationFailed = 0;
    counters.repositorySyncValidationAttempts = 0;
    counters.repositorySyncConfigurationSaved = 0;
  }
};
