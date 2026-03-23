import { readLinecross, getDayOfWeek } from '@/lib/data';
import { type NextRequest } from 'next/server';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ date: string }> }
) {
  const { date } = await params;
  const camera = request.nextUrl.searchParams.get('camera') || 'food';
  const data = readLinecross(camera, date);

  if (!data) {
    return Response.json({ error: 'Not found' }, { status: 404 });
  }

  const line1 = data.lines.line1;
  if (!line1) {
    return Response.json({ error: 'No line1 data' }, { status: 404 });
  }

  let peakHour = { jstHour: 0, label: '0:00', countIn: 0 };
  for (const h of line1.hourly) {
    if (h.countIn > peakHour.countIn) {
      peakHour = { jstHour: h.jstHour, label: `${h.jstHour}:00`, countIn: h.countIn };
    }
  }

  // Build full 24-hour array
  const hourlyMap = new Map(line1.hourly.map(h => [h.jstHour, h]));
  const hourly = Array.from({ length: 24 }, (_, h) => {
    const entry = hourlyMap.get(h);
    return {
      jstHour: h,
      label: `${h}:00`,
      countIn: entry?.countIn ?? 0,
      countOut: entry?.countOut ?? 0,
    };
  });

  return Response.json({
    camera,
    date,
    dayOfWeek: getDayOfWeek(date),
    totalIn: line1.totalIn,
    totalOut: line1.totalOut,
    peakHour,
    hourly,
  });
}
