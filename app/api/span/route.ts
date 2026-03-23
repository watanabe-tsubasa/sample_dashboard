import { readLinecross, listLinecrossDates, getDayOfWeek } from '@/lib/data';
import { type NextRequest } from 'next/server';

export async function GET(request: NextRequest) {
  const camera = request.nextUrl.searchParams.get('camera') || 'food';
  const dates = listLinecrossDates(camera);

  const days = dates.map(date => {
    const data = readLinecross(camera, date);
    const line1 = data?.lines.line1;
    if (!line1) return null;

    let peakHour = { jstHour: 0, countIn: 0 };
    for (const h of line1.hourly) {
      if (h.countIn > peakHour.countIn) {
        peakHour = { jstHour: h.jstHour, countIn: h.countIn };
      }
    }

    return {
      date,
      dayOfWeek: getDayOfWeek(date),
      totalIn: line1.totalIn,
      totalOut: line1.totalOut,
      peakHour,
    };
  }).filter(Boolean);

  return Response.json({
    camera,
    line: 'line1',
    days,
  });
}
