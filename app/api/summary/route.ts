import { readLinecross } from '@/lib/data';

export async function GET() {
  const islandData = readLinecross('island', '2026-03-17');
  const foodData = readLinecross('food', '2026-03-10');

  const islandLine1 = islandData?.lines.line1;
  const foodLine1 = foodData?.lines.line1;

  const islandTotalIn = islandLine1?.totalIn ?? 0;
  const islandTotalOut = islandLine1?.totalOut ?? 0;
  const foodTotalIn = foodLine1?.totalIn ?? 0;
  const foodTotalOut = foodLine1?.totalOut ?? 0;

  return Response.json({
    date: {
      island: '2026-03-17',
      food: '2026-03-10',
    },
    totalVisitors: foodTotalIn + islandTotalIn,
    entrances: [
      {
        name: '食品側',
        camera: 'food',
        line: 'line1',
        totalIn: foodTotalIn,
        totalOut: foodTotalOut,
      },
      {
        name: 'アイランド側',
        camera: 'island',
        line: 'line1',
        totalIn: islandTotalIn,
        totalOut: islandTotalOut,
      },
    ],
  });
}
