import { readLinecross } from '@/lib/data';

export async function GET() {
  const islandData = readLinecross('island', '2026-03-17');
  const foodData = readLinecross('food', '2026-03-10');

  // Build 24-hour array
  const hours = Array.from({ length: 24 }, (_, h) => ({
    jstHour: h,
    label: `${h}:00`,
    inFlow: 0,
    outFlow: 0,
    occupancy: 0,
  }));

  // Add island line1
  if (islandData?.lines.line1) {
    for (const entry of islandData.lines.line1.hourly) {
      hours[entry.jstHour].inFlow += entry.countIn;
      hours[entry.jstHour].outFlow += entry.countOut;
    }
  }

  // Add food line1
  if (foodData?.lines.line1) {
    for (const entry of foodData.lines.line1.hourly) {
      hours[entry.jstHour].inFlow += entry.countIn;
      hours[entry.jstHour].outFlow += entry.countOut;
    }
  }

  // Calculate cumulative occupancy
  let cumIn = 0;
  let cumOut = 0;
  for (const h of hours) {
    cumIn += h.inFlow;
    cumOut += h.outFlow;
    h.occupancy = cumIn - cumOut;
  }

  return Response.json({ hours });
}
