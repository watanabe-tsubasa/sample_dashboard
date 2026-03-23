import fs from 'fs';
import path from 'path';

const PARSED_DIR = path.join(process.cwd(), 'app', 'data', 'parsed');

export interface LineCrossHourly {
  utcHour: number;
  jstHour: number;
  countIn: number;
  countOut: number;
}

export interface LineData {
  coords: { sx: number; sy: number; ex: number; ey: number };
  hourly: LineCrossHourly[];
  totalIn: number;
  totalOut: number;
}

export interface LineCrossData {
  date: string;
  timezone: string;
  lines: Record<string, LineData>;
}

export interface HeatmapCumulative {
  date: string;
  maxValue: number;
  grid: number[][];
  activeRegion: { minRow: number; maxRow: number; minCol: number; maxCol: number };
}

export function readLinecross(camera: string, date: string): LineCrossData | null {
  const filePath = path.join(PARSED_DIR, camera, 'linecross', `${date}.json`);
  if (!fs.existsSync(filePath)) return null;
  return JSON.parse(fs.readFileSync(filePath, 'utf-8'));
}

export function listLinecrossDates(camera: string): string[] {
  const dir = path.join(PARSED_DIR, camera, 'linecross');
  if (!fs.existsSync(dir)) return [];
  return fs.readdirSync(dir)
    .filter(f => f.endsWith('.json'))
    .map(f => f.replace('.json', ''))
    .sort();
}

export function readHeatmapCumulative(camera: string, date: string): HeatmapCumulative | null {
  const filePath = path.join(PARSED_DIR, camera, 'heatmap', `${date}_cumulative.json`);
  if (!fs.existsSync(filePath)) return null;
  return JSON.parse(fs.readFileSync(filePath, 'utf-8'));
}

const DAY_OF_WEEK_JA = ['日', '月', '火', '水', '木', '金', '土'];

export function getDayOfWeek(dateStr: string): string {
  const d = new Date(dateStr + 'T00:00:00+09:00');
  return DAY_OF_WEEK_JA[d.getUTCDay()];
}
