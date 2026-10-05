// 服薬スケジュール: 各薬の時刻（"HH:MM"）と、その日の服用記録から状態を出す
export function doseStatus(times, takenTimes, now = new Date()) {
  const toMin = (s) => { const [hh, mm] = s.split(':').map(Number); return hh * 60 + mm; };
  const cur = now.getHours() * 60 + now.getMinutes();
  return times.map((t) => {
    const taken = takenTimes.includes(t);
    const diff = cur - toMin(t);
    return { time: t, state: taken ? 'taken' : diff > 60 ? 'missed' : diff >= 0 ? 'due' : 'upcoming' };
  });
}
