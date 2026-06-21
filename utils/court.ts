export function getCourtSports(court: { sport?: string; sports?: string[] }): string[] {
  if (court.sports?.length) return court.sports;
  if (!court.sport) return [];
  try {
    const parsed = JSON.parse(court.sport);
    return Array.isArray(parsed) ? parsed : [court.sport];
  } catch {
    return [court.sport];
  }
}
