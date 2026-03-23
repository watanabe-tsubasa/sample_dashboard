import { readHeatmapCumulative } from '@/lib/data';

export async function GET() {
  const data = readHeatmapCumulative('island', '2026-03-17');
  if (!data) {
    return Response.json({ error: 'Not found' }, { status: 404 });
  }

  return Response.json({
    date: data.date,
    camera: 'island',
    maxValue: data.maxValue,
    grid: data.grid,
    activeRegion: data.activeRegion,
    thumbnailPath: '/data/heatmap/thumbnail.jpg',
  });
}
