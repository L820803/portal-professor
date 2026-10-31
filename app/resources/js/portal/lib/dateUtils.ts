// Utilitários de data no formato "YYYY-MM-DD" usado em toda a API do e-cidade.

export function toApiDateString(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function todayApiDateString(): string {
  return toApiDateString(new Date());
}

export function formatDatePtBr(apiDate: string): string {
  const [year, month, day] = apiDate.split('-');
  if (!year || !month || !day) return apiDate;
  return `${day}/${month}/${year}`;
}

const WEEKDAYS_PT_BR = [
  'Domingo',
  'Segunda-feira',
  'Terça-feira',
  'Quarta-feira',
  'Quinta-feira',
  'Sexta-feira',
  'Sábado',
];

export function weekdayLabelPtBr(apiDate: string): string {
  const [year, month, day] = apiDate.split('-').map(Number);
  if (!year || !month || !day) return '';
  const date = new Date(year, month - 1, day);
  return WEEKDAYS_PT_BR[date.getDay()];
}

/** As datas do calendário da turma vêm em ISO com hora/fuso; o Calendar quer só "YYYY-MM-DD". */
export function toApiDate(iso?: string): string | undefined {
  return iso ? iso.slice(0, 10) : undefined;
}

export function formatDateTimePtBr(date: Date): string {
  const day = String(date.getDate()).padStart(2, '0');
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const year = date.getFullYear();
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');
  return `${day}/${month}/${year} ${hours}:${minutes}`;
}
