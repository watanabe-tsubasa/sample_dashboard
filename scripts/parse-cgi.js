const fs = require('fs');
const path = require('path');

const DATA_DIR = path.join(__dirname, '..', 'app', 'data');
const PARSED_DIR = path.join(DATA_DIR, 'parsed');
const PUBLIC_HEATMAP_DIR = path.join(__dirname, '..', 'public', 'data', 'heatmap');

function splitByBoundary(buffer, boundary) {
  const boundaryBuf = Buffer.from(boundary);
  const parts = [];
  let start = 0;
  while (start < buffer.length) {
    const idx = buffer.indexOf(boundaryBuf, start);
    if (idx === -1) break;
    if (start > 0) {
      parts.push(buffer.slice(start, idx));
    }
    start = idx + boundaryBuf.length;
  }
  if (start < buffer.length) {
    parts.push(buffer.slice(start));
  }
  return parts;
}

function parsePart(partBuffer) {
  // Find the empty line separating headers from body (CRLFCRLF)
  const crlfcrlf = Buffer.from('\r\n\r\n');
  const headerEnd = partBuffer.indexOf(crlfcrlf);
  if (headerEnd === -1) return null;

  const headerStr = partBuffer.slice(0, headerEnd).toString('utf-8');
  const body = partBuffer.slice(headerEnd + 4);

  // Extract filename
  const filenameMatch = headerStr.match(/filename="([^"]+)"/);
  if (!filenameMatch) return null;

  const filename = filenameMatch[1];
  const contentType = headerStr.includes('text/plain') ? 'text' : 'image';

  return { filename, contentType, body };
}

function parseLinecrossCsv(csvText) {
  const lines = csvText.trim().split(/\r?\n/);
  if (lines.length < 2) return null;

  // Header line: s_yyyymmdd,s_hhmm,e_yyyymmdd,e_hhmm,p_hhmm,timezone,summertime
  const header = lines[0].split(',');
  const startDate = header[0];
  const startTime = header[1];
  const endDate = header[2];
  const endTime = header[3];
  const timezone = header[5];

  // Parse UTC hour from start time
  const utcHour = parseInt(startTime.substring(0, 2), 10);

  // Lines 1-8
  const lineData = [];
  for (let i = 1; i < lines.length && i <= 8; i++) {
    const parts = lines[i].split(',').map(Number);
    if (parts.length >= 6) {
      lineData.push({
        lineIndex: i,
        sx: parts[0], sy: parts[1],
        ex: parts[2], ey: parts[3],
        countIn: parts[4], countOut: parts[5]
      });
    }
  }

  return {
    startDate, startTime, endDate, endTime, timezone, utcHour,
    lines: lineData
  };
}

function parseHeatmapCsv(csvText) {
  const lines = csvText.trim().split(/\r?\n/);
  if (lines.length < 2) return null;

  const header = lines[0].split(',');
  const startDate = header[0];
  const startTime = header[1];
  const timezone = header[5];
  const utcHour = parseInt(startTime.substring(0, 2), 10);

  const grid = [];
  for (let i = 1; i < lines.length; i++) {
    const row = lines[i].split(',').map(Number);
    grid.push(row);
  }

  return { startDate, startTime, timezone, utcHour, grid };
}

function processLinecross(cgiPath, camera) {
  const buffer = fs.readFileSync(cgiPath);
  const parts = splitByBoundary(buffer, '--myboundary');

  // Group by JST date
  const dateMap = {};

  for (const part of parts) {
    const parsed = parsePart(part);
    if (!parsed || parsed.contentType !== 'text') continue;
    if (!parsed.filename.startsWith('mov_obj_cnt_')) continue;

    const csvText = parsed.body.toString('utf-8');
    const csvData = parseLinecrossCsv(csvText);
    if (!csvData) continue;

    // Convert UTC to JST
    const utcDateStr = csvData.startDate;
    // If UTC hour + 9 >= 24, it's the next day in JST
    const year = parseInt(utcDateStr.substring(0, 4), 10);
    const month = parseInt(utcDateStr.substring(4, 6), 10) - 1;
    const day = parseInt(utcDateStr.substring(6, 8), 10);
    const utcDate = new Date(Date.UTC(year, month, day, csvData.utcHour));
    const jstDate = new Date(utcDate.getTime() + 9 * 60 * 60 * 1000);
    const jstDateStr = `${jstDate.getUTCFullYear()}-${String(jstDate.getUTCMonth() + 1).padStart(2, '0')}-${String(jstDate.getUTCDate()).padStart(2, '0')}`;

    if (!dateMap[jstDateStr]) {
      dateMap[jstDateStr] = {
        date: jstDateStr,
        timezone: csvData.timezone,
        linesMap: {}
      };
    }

    for (const ld of csvData.lines) {
      // Skip lines with all zeros (not configured)
      if (ld.sx === 0 && ld.sy === 0 && ld.ex === 0 && ld.ey === 0) continue;

      const lineKey = `line${ld.lineIndex}`;
      if (!dateMap[jstDateStr].linesMap[lineKey]) {
        dateMap[jstDateStr].linesMap[lineKey] = {
          coords: { sx: ld.sx, sy: ld.sy, ex: ld.ex, ey: ld.ey },
          hourly: [],
          totalIn: 0,
          totalOut: 0
        };
      }
      dateMap[jstDateStr].linesMap[lineKey].hourly.push({
        utcHour: csvData.utcHour,
        jstHour: jstDate.getUTCHours(),
        countIn: ld.countIn,
        countOut: ld.countOut
      });
      dateMap[jstDateStr].linesMap[lineKey].totalIn += ld.countIn;
      dateMap[jstDateStr].linesMap[lineKey].totalOut += ld.countOut;
    }
  }

  // Write JSON files
  const outDir = path.join(PARSED_DIR, camera, 'linecross');
  fs.mkdirSync(outDir, { recursive: true });

  for (const [dateStr, data] of Object.entries(dateMap)) {
    // Sort hourly by jstHour
    const lines = {};
    for (const [lineKey, lineData] of Object.entries(data.linesMap)) {
      lineData.hourly.sort((a, b) => a.jstHour - b.jstHour);
      lines[lineKey] = lineData;
    }

    const output = {
      date: dateStr,
      timezone: data.timezone,
      lines
    };

    fs.writeFileSync(
      path.join(outDir, `${dateStr}.json`),
      JSON.stringify(output, null, 2)
    );
    console.log(`  Written: ${camera}/linecross/${dateStr}.json`);
  }
}

function processHeatmap(cgiPath, camera) {
  const buffer = fs.readFileSync(cgiPath);
  const parts = splitByBoundary(buffer, '--myboundary');

  const hourlyGrids = [];
  const thumbnails = [];

  for (const part of parts) {
    const parsed = parsePart(part);
    if (!parsed) continue;

    if (parsed.contentType === 'text' && parsed.filename.startsWith('heatmap_mov_info_')) {
      const csvText = parsed.body.toString('utf-8');
      const csvData = parseHeatmapCsv(csvText);
      if (csvData) {
        hourlyGrids.push(csvData);
      }
    } else if (parsed.filename.endsWith('.jpg') || parsed.filename.endsWith('.jpeg')) {
      // Extract JPEG - trim trailing whitespace/CRLF
      let jpegBody = parsed.body;
      // Find JPEG end marker FFD9
      const ffd9 = Buffer.from([0xFF, 0xD9]);
      const endIdx = jpegBody.indexOf(ffd9);
      if (endIdx !== -1) {
        jpegBody = jpegBody.slice(0, endIdx + 2);
      }

      // Extract timestamp from filename
      const match = parsed.filename.match(/index_(\d{12})_/);
      if (match) {
        const ts = match[1];
        const utcHour = parseInt(ts.substring(8, 10), 10);
        thumbnails.push({ utcHour, data: jpegBody, filename: parsed.filename });
      }
    }
  }

  if (hourlyGrids.length === 0) return;

  // Determine JST date from first entry
  const first = hourlyGrids[0];
  const year = parseInt(first.startDate.substring(0, 4), 10);
  const month = parseInt(first.startDate.substring(4, 6), 10) - 1;
  const day = parseInt(first.startDate.substring(6, 8), 10);
  const utcDate = new Date(Date.UTC(year, month, day, first.utcHour));
  const jstDate = new Date(utcDate.getTime() + 9 * 60 * 60 * 1000);
  const jstDateStr = `${jstDate.getUTCFullYear()}-${String(jstDate.getUTCMonth() + 1).padStart(2, '0')}-${String(jstDate.getUTCDate()).padStart(2, '0')}`;

  // Cumulative grid
  const cumulativeGrid = Array.from({ length: 64 }, () => new Array(64).fill(0));
  let maxValue = 0;

  for (const hg of hourlyGrids) {
    if (hg.grid.length !== 64) continue;
    for (let r = 0; r < 64; r++) {
      for (let c = 0; c < Math.min(hg.grid[r].length, 64); c++) {
        cumulativeGrid[r][c] += hg.grid[r][c];
        if (cumulativeGrid[r][c] > maxValue) maxValue = cumulativeGrid[r][c];
      }
    }
  }

  // Find active region
  let minRow = 63, maxRow = 0, minCol = 63, maxCol = 0;
  for (let r = 0; r < 64; r++) {
    for (let c = 0; c < 64; c++) {
      if (cumulativeGrid[r][c] > 0) {
        minRow = Math.min(minRow, r);
        maxRow = Math.max(maxRow, r);
        minCol = Math.min(minCol, c);
        maxCol = Math.max(maxCol, c);
      }
    }
  }

  const outDir = path.join(PARSED_DIR, camera, 'heatmap');
  fs.mkdirSync(outDir, { recursive: true });

  // Write cumulative
  const cumulativeOutput = {
    date: jstDateStr,
    maxValue,
    grid: cumulativeGrid,
    activeRegion: { minRow, maxRow, minCol, maxCol }
  };
  fs.writeFileSync(
    path.join(outDir, `${jstDateStr}_cumulative.json`),
    JSON.stringify(cumulativeOutput)
  );
  console.log(`  Written: ${camera}/heatmap/${jstDateStr}_cumulative.json`);

  // Write hourly
  const hourlyOutput = {
    date: jstDateStr,
    hours: hourlyGrids.map(hg => {
      const jstH = (hg.utcHour + 9) % 24;
      return {
        utcHour: hg.utcHour,
        jstHour: jstH,
        grid: hg.grid
      };
    }).sort((a, b) => a.jstHour - b.jstHour)
  };
  fs.writeFileSync(
    path.join(outDir, `${jstDateStr}_hourly.json`),
    JSON.stringify(hourlyOutput)
  );
  console.log(`  Written: ${camera}/heatmap/${jstDateStr}_hourly.json`);

  // Save thumbnails
  const thumbDir = path.join(outDir, 'thumbnails');
  fs.mkdirSync(thumbDir, { recursive: true });

  // Also copy the best thumbnail (busiest hour = 16:00 JST = 07:00 UTC) to public
  fs.mkdirSync(PUBLIC_HEATMAP_DIR, { recursive: true });

  let bestThumb = null;
  let bestHour = -1;

  for (const thumb of thumbnails) {
    const jstHour = (thumb.utcHour + 9) % 24;
    const outPath = path.join(thumbDir, `${String(jstHour).padStart(2, '0')}.jpg`);
    fs.writeFileSync(outPath, thumb.data);

    // Find the one closest to 16:00 JST
    if (bestThumb === null || Math.abs(jstHour - 16) < Math.abs(bestHour - 16)) {
      bestThumb = thumb;
      bestHour = jstHour;
    }
  }

  if (bestThumb) {
    const publicPath = path.join(PUBLIC_HEATMAP_DIR, 'thumbnail.jpg');
    fs.writeFileSync(publicPath, bestThumb.data);
    console.log(`  Written: public/data/heatmap/thumbnail.jpg (JST ${bestHour}:00)`);
  }

  console.log(`  Written: ${thumbnails.length} thumbnails`);
}

// Main
console.log('Parsing CGI files...');

// Island camera
const islandLinecross = path.join(DATA_DIR, 'island', 'linecross.cgi');
const islandHeatmap = path.join(DATA_DIR, 'island', 'heatmap.cgi');
const foodLinecross = path.join(DATA_DIR, 'food', 'linecross.cgi');

if (fs.existsSync(islandLinecross)) {
  console.log('Processing island/linecross.cgi...');
  processLinecross(islandLinecross, 'island');
}

if (fs.existsSync(islandHeatmap)) {
  console.log('Processing island/heatmap.cgi...');
  processHeatmap(islandHeatmap, 'island');
}

if (fs.existsSync(foodLinecross)) {
  console.log('Processing food/linecross.cgi...');
  processLinecross(foodLinecross, 'food');
}

console.log('Done!');
