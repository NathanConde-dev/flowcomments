const BRASILIA_TZ = 'America/Sao_Paulo';

export function formatBrasiliaDateTime(value: Date | string | number) {
  return new Date(value).toLocaleString('pt-BR', {
    timeZone: BRASILIA_TZ,
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function formatBrasiliaDate(value: Date | string | number) {
  return new Date(value).toLocaleDateString('pt-BR', {
    timeZone: BRASILIA_TZ,
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
}
