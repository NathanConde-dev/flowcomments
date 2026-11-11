export type UpdateRunStatus = 'idle' | 'running' | 'done' | 'failed';

export type UpdateStatusState = {
  status: UpdateRunStatus;
  startedAt: string | null;
  finishedAt: string | null;
  message: string | null;
  logTail: string[];
};

const globalForUpdates = globalThis as unknown as {
  __fcUpdateStatus?: UpdateStatusState;
};

function defaultState(): UpdateStatusState {
  return {
    status: 'idle',
    startedAt: null,
    finishedAt: null,
    message: null,
    logTail: [],
  };
}

export function getUpdateStatus(): UpdateStatusState {
  if (!globalForUpdates.__fcUpdateStatus) {
    globalForUpdates.__fcUpdateStatus = defaultState();
  }
  return globalForUpdates.__fcUpdateStatus;
}

export function setUpdateStatus(patch: Partial<UpdateStatusState>) {
  const current = getUpdateStatus();
  globalForUpdates.__fcUpdateStatus = {
    ...current,
    ...patch,
    logTail: patch.logTail ?? current.logTail,
  };
  return globalForUpdates.__fcUpdateStatus;
}

export function appendUpdateLog(line: string) {
  const current = getUpdateStatus();
  const next = [...current.logTail, line].slice(-80);
  setUpdateStatus({ logTail: next });
}
