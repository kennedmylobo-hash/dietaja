const DAY_NAMES = ['domingo', 'segunda', 'terça', 'quarta', 'quinta', 'sexta', 'sábado'];
const DAY_NAMES_SHORT = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];

function getNextDayOfWeek(dayOfWeek: number, afterDate: Date = new Date()): Date {
  const result = new Date(afterDate);
  result.setDate(result.getDate() + ((dayOfWeek + 7 - result.getDay()) % 7 || 7));
  return result;
}

export function getCutoffDate(cutoffDay: number, cutoffTime: string): Date {
  const now = new Date();
  const cutoff = getNextDayOfWeek(cutoffDay, now);
  const [hours, minutes] = cutoffTime.split(':').map(Number);
  cutoff.setHours(hours, minutes, 0, 0);
  if (cutoff.getTime() <= now.getTime()) {
    return getNextDayOfWeek(cutoffDay, new Date(now.getTime() + 86400000));
  }
  return cutoff;
}

export function isBeforeCutoff(cutoffDay: number, cutoffTime: string): boolean {
  const now = new Date();
  const cutoff = getNextDayOfWeek(cutoffDay, now);
  const [hours, minutes] = cutoffTime.split(':').map(Number);
  cutoff.setHours(hours, minutes, 0, 0);
  return now.getTime() < cutoff.getTime();
}

export function getNextAvailableDeliveryDates(
  deliveryDays: number[],
  cutoffDay: number,
  cutoffTime: string,
  productionDay: number,
  maxDates: number = 4
): { date: Date; label: string; fullLabel: string; }[] {
  const now = new Date();
  const beforeCutoff = isBeforeCutoff(cutoffDay, cutoffTime);
  const nextProduction = getNextDayOfWeek(productionDay, beforeCutoff ? now : new Date(now.getTime() + 86400000));

  const dates: { date: Date; label: string; fullLabel: string; }[] = [];
  const seen = new Set<string>();

  for (let week = 0; week < 3 && dates.length < maxDates; week++) {
    for (const day of deliveryDays) {
      const d = getNextDayOfWeek(day, new Date(nextProduction.getTime() + week * 7 * 86400000));
      if (d.getTime() <= nextProduction.getTime() + (week === 0 ? 0 : -86400000)) continue;
      const key = d.toISOString().split('T')[0];
      if (seen.has(key)) continue;
      seen.add(key);
      const dayName = DAY_NAMES[d.getDay()];
      const dayShort = DAY_NAMES_SHORT[d.getDay()];
      const dateStr = d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
      dates.push({
        date: d,
        label: `${dayShort} - ${dateStr}`,
        fullLabel: `${dayName.charAt(0).toUpperCase() + dayName.slice(1)}, ${d.toLocaleDateString('pt-BR', { day: '2-digit', month: 'long' })}`,
      });
    }
  }

  return dates;
}

export function isDateEnabled(date: Date, deliveryDays: number[]): boolean {
  return deliveryDays.includes(date.getDay());
}

export function formatDateLong(date: Date): string {
  return date.toLocaleDateString('pt-BR', {
    weekday: 'long',
    day: '2-digit',
    month: 'long',
  });
}

export { DAY_NAMES, DAY_NAMES_SHORT };
