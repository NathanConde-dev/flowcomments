import { spawn } from 'child_process';
import path from 'path';
import { appendUpdateLog, getUpdateStatus, setUpdateStatus } from './status';
import { isSelfUpdateEnabled } from './version';

export function startSelfUpdate(): { ok: true } | { ok: false; error: string; statusCode: number } {
  if (!isSelfUpdateEnabled()) {
    return {
      ok: false,
      error: 'Self-update desabilitado. Defina ENABLE_SELF_UPDATE=true no host.',
      statusCode: 403,
    };
  }

  const current = getUpdateStatus();
  if (current.status === 'running') {
    return {
      ok: false,
      error: 'Uma atualização já está em andamento.',
      statusCode: 409,
    };
  }

  const scriptPath = path.join(process.cwd(), 'scripts', 'update.sh');

  setUpdateStatus({
    status: 'running',
    startedAt: new Date().toISOString(),
    finishedAt: null,
    message: 'Atualização iniciada',
    logTail: ['Iniciando scripts/update.sh...'],
  });

  const child = spawn('sh', [scriptPath], {
    cwd: process.cwd(),
    env: process.env,
    detached: true,
    stdio: ['ignore', 'pipe', 'pipe'],
  });

  child.stdout?.on('data', (chunk: Buffer) => {
    chunk
      .toString('utf8')
      .split(/\r?\n/)
      .filter(Boolean)
      .forEach((line) => appendUpdateLog(line));
  });

  child.stderr?.on('data', (chunk: Buffer) => {
    chunk
      .toString('utf8')
      .split(/\r?\n/)
      .filter(Boolean)
      .forEach((line) => appendUpdateLog(line));
  });

  child.on('error', (err) => {
    appendUpdateLog(err.message);
    setUpdateStatus({
      status: 'failed',
      finishedAt: new Date().toISOString(),
      message: err.message,
    });
  });

  child.on('exit', (code) => {
    if (code === 0) {
      setUpdateStatus({
        status: 'done',
        finishedAt: new Date().toISOString(),
        message: 'Atualização concluída. Reinicie se o processo não reiniciou sozinho.',
      });
      appendUpdateLog('Update finished with exit 0');
    } else {
      setUpdateStatus({
        status: 'failed',
        finishedAt: new Date().toISOString(),
        message: `Update falhou (exit ${code ?? 'unknown'})`,
      });
      appendUpdateLog(`Update failed with exit ${code}`);
    }
  });

  child.unref();
  return { ok: true };
}
