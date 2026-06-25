export function renderHelixCord(ctx, canvas, history, numThreads, slotsHistory, bandColors) {
  const nb = numThreads / 2;
  const dotR = Math.max(5, Math.min(14, 4 + nb * 1.8));
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.fillStyle = '#0c0e18';
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  // 헬릭스 코드 렌더링 로직
  const cx = canvas.width / 2;
  history.forEach((step, t) => {
    const y = 25 + t * 10;
    if (y > canvas.height) return;
    step.forEach((color, i) => {
      const angle = (i / numThreads) * Math.PI * 2 + (t * 0.2);
      ctx.fillStyle = color;
      ctx.beginPath();
      ctx.arc(cx + Math.cos(angle) * 30, y, dotR, 0, Math.PI * 2);
      ctx.fill();
    });
  });
}

export function renderFlatBraid(ctx, canvas, history, numThreads, slotsHistory) {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.fillStyle = '#0c0e18';
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  const numPos = numThreads / 2;
  const cellW = canvas.width / numPos;
  const cellH = Math.max(4, Math.min(12, (canvas.height - 30) / (slotsHistory.length || 1)));

  slotsHistory.forEach((row, t) => {
    const y = 18 + t * cellH;
    row.forEach((color, p) => {
      ctx.fillStyle = color || '#333';
      ctx.fillRect(p * cellW, y, cellW, cellH);
    });
  });
}

export const BRAID_RENDERERS = [
  { id: 'helixCord', name: '🌀 헬릭스 코드', renderer: renderHelixCord },
  { id: 'flatBraid', name: '📐 평면 펼쳐보기', renderer: renderFlatBraid },
];