// 予定を iCalendar（.ics）にする。テキストは RFC 5545 に従ってエスケープ。
const esc = (s) => String(s).replace(/\\/g, '\\\\').replace(/;/g, '\;').replace(/,/g, '\\,').replace(/\r?\n/g, '\\n');
const dt = (date, time) => `${date.replace(/-/g, '')}${time ? `T${time.replace(':', '')}00` : ''}`;
export function toIcs(events, now = new Date()) {
  const stamp = now.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');
  const lines = ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//happy-ideas//family-schedule//JA'];
  events.forEach((e, i) => {
    lines.push('BEGIN:VEVENT', `UID:${stamp}-${i}@happy-ideas`, `DTSTAMP:${stamp}`);
    if (e.time) { lines.push(`DTSTART:${dt(e.date, e.time)}`); }
    else { const d = new Date(`${e.date}T00:00:00`); d.setDate(d.getDate() + 1); const next = `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, '0')}${String(d.getDate()).padStart(2, '0')}`; lines.push(`DTSTART;VALUE=DATE:${dt(e.date)}`, `DTEND;VALUE=DATE:${next}`); }
    lines.push(`SUMMARY:${esc(e.title)}`);
    if (e.who) lines.push(`DESCRIPTION:${esc(`担当: ${e.who}`)}`);
    lines.push('END:VEVENT');
  });
  lines.push('END:VCALENDAR');
  return lines.join('\r\n');
}
