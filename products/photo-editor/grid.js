// グリッド（コラージュ）: 複数の写真を1枚にまとめる。レイアウトの定義と描画（DOM を使わない計算部分）
// レイアウトは「cols × rows のマス目」の上の長方形 [x, y, w, h] の並びで表す。

const g = (id, name, cols, rows, cells) => ({ id, name, cols, rows, cells });
const even = (cols, rows, n = cols * rows) => Array.from({ length: n }, (_, i) => [i % cols, Math.floor(i / cols), 1, 1]);

export const LAYOUTS = {
  2: [g('2h', '横に2つ', 2, 1, even(2, 1)), g('2v', '縦に2つ', 1, 2, even(1, 2)), g('2big', '大小', 3, 1, [[0, 0, 2, 1], [2, 0, 1, 1]])],
  3: [g('3h', '横に3つ', 3, 1, even(3, 1)), g('3v', '縦に3つ', 1, 3, even(1, 3)), g('3l', '左に大きく', 2, 2, [[0, 0, 1, 2], [1, 0, 1, 1], [1, 1, 1, 1]]),
    g('3t', '上に大きく', 2, 2, [[0, 0, 2, 1], [0, 1, 1, 1], [1, 1, 1, 1]]), g('3b', '下に大きく', 2, 2, [[0, 0, 1, 1], [1, 0, 1, 1], [0, 1, 2, 1]])],
  4: [g('4g', '2×2', 2, 2, even(2, 2)), g('4t', '上に大きく', 3, 2, [[0, 0, 3, 1], [0, 1, 1, 1], [1, 1, 1, 1], [2, 1, 1, 1]]),
    g('4l', '左に大きく', 2, 3, [[0, 0, 1, 3], [1, 0, 1, 1], [1, 1, 1, 1], [1, 2, 1, 1]]), g('4h', '横に4つ', 4, 1, even(4, 1)), g('4v', '縦に4つ', 1, 4, even(1, 4))],
  5: [g('5a', '上2・下3', 6, 2, [[0, 0, 3, 1], [3, 0, 3, 1], [0, 1, 2, 1], [2, 1, 2, 1], [4, 1, 2, 1]]), g('5b', '上3・下2', 6, 2, [[0, 0, 2, 1], [2, 0, 2, 1], [4, 0, 2, 1], [0, 1, 3, 1], [3, 1, 3, 1]]),
    g('5l', '左に大きく', 3, 2, [[0, 0, 1, 2], [1, 0, 1, 1], [2, 0, 1, 1], [1, 1, 1, 1], [2, 1, 1, 1]]), g('5c', '真ん中に大きく', 3, 3, [[0, 0, 1, 1], [1, 0, 2, 2], [0, 1, 1, 1], [0, 2, 2, 1], [2, 2, 1, 1]])],
  6: [g('6a', '3×2', 3, 2, even(3, 2)), g('6b', '2×3', 2, 3, even(2, 3)), g('6c', '大きく1つ＋5つ', 3, 3, [[0, 0, 2, 2], [2, 0, 1, 1], [2, 1, 1, 1], [0, 2, 1, 1], [1, 2, 1, 1], [2, 2, 1, 1]])],
  7: [g('7a', '上3・下4', 12, 2, [[0, 0, 4, 1], [4, 0, 4, 1], [8, 0, 4, 1], [0, 1, 3, 1], [3, 1, 3, 1], [6, 1, 3, 1], [9, 1, 3, 1]]),
    g('7b', '大きく1つ＋6つ', 4, 3, [[0, 0, 2, 2], [2, 0, 1, 1], [3, 0, 1, 1], [2, 1, 1, 1], [3, 1, 1, 1], [0, 2, 2, 1], [2, 2, 2, 1]])],
  8: [g('8a', '4×2', 4, 2, even(4, 2)), g('8b', '2×4', 2, 4, even(2, 4)), g('8c', '大きく1つ＋7つ', 4, 3, [[0, 0, 2, 2], [2, 0, 1, 1], [3, 0, 1, 1], [2, 1, 1, 1], [3, 1, 1, 1], [0, 2, 1, 1], [1, 2, 1, 1], [2, 2, 2, 1]])],
  9: [g('9a', '3×3', 3, 3, even(3, 3)), g('9b', '大きく1つ＋8つ', 4, 4, [[0, 0, 2, 2], [2, 0, 1, 1], [3, 0, 1, 1], [2, 1, 1, 1], [3, 1, 1, 1], [0, 2, 1, 1], [1, 2, 1, 1], [0, 3, 2, 1], [2, 2, 2, 2]])],
};
export const GRID_ASPECTS = { '1:1': 1, '4:5': 4 / 5, '3:4': 3 / 4, '9:16': 9 / 16, '16:9': 16 / 9, '3:2': 3 / 2, '4:3': 4 / 3, '2:3': 2 / 3 };
export const MAX_GRID = 9;

export function defaultGrid(ids) {
  const n = Math.min(MAX_GRID, ids.length);
  return { layout: LAYOUTS[n][0].id, aspect: '1:1', gap: 2, margin: 2, radius: 0, bg: '#ffffff', cells: ids.slice(0, n).map((id) => ({ id, zoom: 1, ox: 0, oy: 0 })) };
}
export const layoutById = (n, id) => (LAYOUTS[n] || []).find((l) => l.id === id) || LAYOUTS[n]?.[0];

/**
 * 各マスの位置（px）。gap・margin は短い辺に対する %（0〜10）
 * @returns {{x:number,y:number,w:number,h:number}[]}
 */
export function cellRects(layout, W, H, { gap = 0, margin = 0 } = {}) {
  const m = Math.min(W, H);
  const gp = (gap / 100) * m; const mg = (margin / 100) * m;
  const iw = W - mg * 2 + gp; const ih = H - mg * 2 + gp; // マス目の幅（右端・下端のすき間を含めた計算）
  return layout.cells.map(([x, y, w, h]) => {
    const x0 = mg + (x / layout.cols) * iw; const y0 = mg + (y / layout.rows) * ih;
    const x1 = mg + ((x + w) / layout.cols) * iw - gp; const y1 = mg + ((y + h) / layout.rows) * ih - gp;
    return { x: x0, y: y0, w: Math.max(1, x1 - x0), h: Math.max(1, y1 - y0) };
  });
}

/** 写真をマスいっぱいに表示するときの、切り出す範囲（元画像の px）。zoom 1〜4、ox/oy は -1〜1（はみ出した分の中での位置） */
export function coverSource(iw, ih, cw, ch, { zoom = 1, ox = 0, oy = 0 } = {}) {
  const s = Math.max(cw / iw, ch / ih) * zoom;
  const sw = cw / s; const sh = ch / s;
  const sx = (iw - sw) / 2 * (1 + Math.max(-1, Math.min(1, ox))); const sy = (ih - sh) / 2 * (1 + Math.max(-1, Math.min(1, oy)));
  return { sx, sy, sw, sh };
}

/** 出力の大きさ（長い辺 = longSide） */
export function gridSize(aspect, longSide) {
  const r = GRID_ASPECTS[aspect] || 1;
  return r >= 1 ? { w: longSide, h: Math.round(longSide / r) } : { w: Math.round(longSide * r), h: longSide };
}

/** 描く（ctx は 2D Canvas）。images は cells と同じ順の画像（Canvas / ImageBitmap） */
export function drawGrid(ctx, W, H, grid, images, { selected = -1 } = {}) {
  const n = grid.cells.length;
  const layout = layoutById(n, grid.layout);
  const rects = cellRects(layout, W, H, grid);
  ctx.save();
  ctx.fillStyle = grid.bg; ctx.fillRect(0, 0, W, H);
  const r = (grid.radius / 100) * Math.min(W, H) * 0.25;
  rects.forEach((rc, i) => {
    const img = images[i]; const cell = grid.cells[i];
    ctx.save();
    ctx.beginPath();
    if (r > 0 && ctx.roundRect) ctx.roundRect(rc.x, rc.y, rc.w, rc.h, Math.min(r, rc.w / 2, rc.h / 2)); else ctx.rect(rc.x, rc.y, rc.w, rc.h);
    ctx.clip();
    if (img) {
      const s = coverSource(img.width, img.height, rc.w, rc.h, cell);
      ctx.drawImage(img, s.sx, s.sy, s.sw, s.sh, rc.x, rc.y, rc.w, rc.h);
    } else { ctx.fillStyle = '#888'; ctx.fillRect(rc.x, rc.y, rc.w, rc.h); }
    ctx.restore();
    if (i === selected) {
      ctx.save(); ctx.strokeStyle = '#f2c14e'; ctx.lineWidth = Math.max(3, Math.min(W, H) / 150); ctx.setLineDash([ctx.lineWidth * 3, ctx.lineWidth * 2]);
      ctx.strokeRect(rc.x + ctx.lineWidth / 2, rc.y + ctx.lineWidth / 2, rc.w - ctx.lineWidth, rc.h - ctx.lineWidth); ctx.restore();
    }
  });
  ctx.restore();
  return rects;
}

/** 点（px）がどのマスにあるか（なければ -1） */
export function hitCell(rects, x, y) { return rects.findIndex((r) => x >= r.x && x <= r.x + r.w && y >= r.y && y <= r.y + r.h); }
