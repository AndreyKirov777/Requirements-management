const counters = {
  repositoryVerificationSucceeded: 0,
  repositoryVerificationFailed: 0
};

export const connectionMetrics = {
  trackSuccess() {
    counters.repositoryVerificationSucceeded += 1;
  },
  trackFailure() {
    counters.repositoryVerificationFailed += 1;
  },
  snapshot() {
    return { ...counters };
  },
  reset() {
    counters.repositoryVerificationSucceeded = 0;
    counters.repositoryVerificationFailed = 0;
  }
};
