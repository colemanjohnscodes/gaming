const DAY = new Intl.DateTimeFormat("en-CA", {
  timeZone: "America/Chicago",
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});

export function startOfTennesseeDay(now = new Date()): string {
  const day = DAY.format(now);
  const minute = 60_000;
  let utc = Date.parse(`${day}T06:00:00.000Z`);
  while (DAY.format(new Date(utc - minute)) === day) {
    utc -= minute;
  }
  while (DAY.format(new Date(utc)) !== day) {
    utc += minute;
  }
  return new Date(utc).toISOString();
}
