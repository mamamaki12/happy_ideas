// Canvas に日本語を折り返して描く（禁則は簡易）
export function wrapLines(ctx, text, maxWidth) {
  const lines = [];
  for (const para of String(text).split('\n')) {
    let line = '';
    for (const ch of [...para]) {
      if (ctx.measureText(line + ch).width > maxWidth && line) {
        // 句読点は行頭に来ないよう前の行に付ける
        if ('、。，．）」』！？'.includes(ch)) { line += ch; lines.push(line); line = ''; continue; }
        lines.push(line); line = ch;
      } else line += ch;
    }
    lines.push(line);
  }
  return lines;
}
export function drawWrapped(ctx, text, x, y, maxWidth, lineHeight, maxLines = 99) {
  const lines = wrapLines(ctx, text, maxWidth).slice(0, maxLines);
  lines.forEach((l, i) => ctx.fillText(l, x, y + i * lineHeight));
  return lines.length;
}
export const canvasToBlob = (c, type = 'image/png') => new Promise((r) => c.toBlob(r, type, 0.92));
