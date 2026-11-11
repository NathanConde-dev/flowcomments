export const ACCOUNT_TIMEZONES = [
  { value: 'America/Sao_Paulo', label: 'Brasília (GMT-3)' },
  { value: 'America/Manaus', label: 'Manaus (GMT-4)' },
  { value: 'America/Belem', label: 'Belém (GMT-3)' },
  { value: 'America/Fortaleza', label: 'Fortaleza (GMT-3)' },
  { value: 'America/Recife', label: 'Recife (GMT-3)' },
  { value: 'America/Bahia', label: 'Salvador (GMT-3)' },
  { value: 'America/Cuiaba', label: 'Cuiabá (GMT-4)' },
  { value: 'America/Porto_Velho', label: 'Porto Velho (GMT-4)' },
  { value: 'America/Rio_Branco', label: 'Rio Branco (GMT-5)' },
  { value: 'America/Noronha', label: 'Fernando de Noronha (GMT-2)' },
  { value: 'America/New_York', label: 'Nova York (GMT-5/-4)' },
  { value: 'America/Chicago', label: 'Chicago (GMT-6/-5)' },
  { value: 'America/Denver', label: 'Denver (GMT-7/-6)' },
  { value: 'America/Los_Angeles', label: 'Los Angeles (GMT-8/-7)' },
  { value: 'America/Mexico_City', label: 'Cidade do México (GMT-6)' },
  { value: 'America/Argentina/Buenos_Aires', label: 'Buenos Aires (GMT-3)' },
  { value: 'America/Santiago', label: 'Santiago (GMT-4/-3)' },
  { value: 'America/Bogota', label: 'Bogotá (GMT-5)' },
  { value: 'America/Lima', label: 'Lima (GMT-5)' },
  { value: 'Europe/Lisbon', label: 'Lisboa (GMT+0/+1)' },
  { value: 'Europe/London', label: 'Londres (GMT+0/+1)' },
  { value: 'Europe/Paris', label: 'Paris (GMT+1/+2)' },
  { value: 'Europe/Madrid', label: 'Madrid (GMT+1/+2)' },
  { value: 'Europe/Berlin', label: 'Berlim (GMT+1/+2)' },
  { value: 'Europe/Rome', label: 'Roma (GMT+1/+2)' },
  { value: 'UTC', label: 'UTC' },
] as const;

export type AccountTimezone = (typeof ACCOUNT_TIMEZONES)[number]['value'];

export function isAccountTimezone(value: string): value is AccountTimezone {
  return ACCOUNT_TIMEZONES.some((tz) => tz.value === value);
}

export const DEFAULT_ACCOUNT_TIMEZONE: AccountTimezone = 'America/Sao_Paulo';
