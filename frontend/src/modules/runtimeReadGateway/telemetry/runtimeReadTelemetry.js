const counters = {
  queryReads: 0,
  errors: 0,
};

export const runtimeReadTelemetry = {
  markQueryRead() {
    counters.queryReads += 1;
  },

  markError() {
    counters.errors += 1;
  },

  getCounters() {
    return { ...counters };
  },
};

export function resetRuntimeReadTelemetryForTests() {
  counters.queryReads = 0;
  counters.errors = 0;
}
