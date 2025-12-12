const BRAZIL_TIMEZONE = 'America/Sao_Paulo';

export function getHoursAgoInBrazil(hours: number): Date {
  const now = new Date();

  // Get current time components in Brazil timezone
  const brazilParts = new Intl.DateTimeFormat('en-US', {
    timeZone: BRAZIL_TIMEZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  }).formatToParts(now);

  const partsMap: Record<string, string> = {};
  brazilParts.forEach(part => {
    partsMap[part.type] = part.value;
  });

  // Create date in Brazil timezone (as if it were local)
  const brazilNow = new Date(
    parseInt(partsMap.year!),
    parseInt(partsMap.month!) - 1,
    parseInt(partsMap.day!),
    parseInt(partsMap.hour!),
    parseInt(partsMap.minute!),
    parseInt(partsMap.second!),
  );

  // Calculate offset between UTC and Brazil timezone
  const offset = brazilNow.getTime() - now.getTime();

  // Subtract hours in Brazil timezone
  const hoursAgoInBrazil = new Date(
    brazilNow.getTime() - hours * 60 * 60 * 1000,
  );

  // Convert back to UTC for database comparison
  return new Date(hoursAgoInBrazil.getTime() - offset);
}
