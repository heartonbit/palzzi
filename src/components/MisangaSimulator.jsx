import React, { useState, useEffect, useRef } from 'react';
import { 
  MISANGA_TEMPLATES, 
  KNOT_TYPES, 
  computeFullMisangaPattern, 
  generateMisangaSvg,
  downloadCanvasAsPng,
  downloadTextFile
} from '../utils/weavingHelper';
import PlaybackControl from './PlaybackControl';
import ColorPresetManager from './ColorPresetManager';
import { Download, Share2, Plus, Minus, Info } from 'lucide-react';

// Default color palettes indexed by thread count
const DEFAULT_THREAD_PALETTES = {
  4:  ['#FF3366', '#3366FF', '#FFFF33', '#33CC66'],
  6:  ['#FF3366', '#3366FF', '#FFFFFF', '#FF9933', '#33CC66', '#A78BFA'],
  8:  ['#FF3366', '#FF9933', '#FFFF33', '#33CC66', '#33CC66', '#FFFF33', '#FF9933', '#FF3366'],
  10: ['#FF3366', '#FF9933', '#FFFF33', '#33CC66', '#3366FF', '#3366FF', '#33CC66', '#FFFF33', '#FF9933', '#FF3366'],
  12: ['#FF3366', '#FF9933', '#FFFF33', '#33CC66', '#3366FF', '#A78BFA', '#A78BFA', '#3366FF', '#33CC66', '#FFFF33', '#FF9933', '#FF3366'],
};

// Build a fresh grid for given thread count and row count
function buildDefaultGrid(numThreads, numRows = 8) {
  const rows = [];
  for (let r = 0; r < numRows; r++) {
    const isEven = r % 2 === 1;
    const numKnots = isEven ? Math.floor((numThreads - 2) / 2) : Math.floor(numThreads / 2);
    rows.push(Array(numKnots).fill(KNOT_TYPES.FORWARD));
  }
  return rows;
}

export default function MisangaSimulator({ onShowToast }) {
  const [templateId, setTemplateId] = useState('chevron');
  const [numThreads, setNumThreads] = useState(MISANGA_TEMPLATES.chevron.threads);
  const [initialColors, setInitialColors] = useState([...MISANGA_TEMPLATES.chevron.initialColors]);
  const [grid, setGrid] = useState(JSON.parse(JSON.stringify(MISANGA_TEMPLATES.chevron.grid)));
  
  const [currentStep, setCurrentStep] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [speed, setSpeed] = useState(1.0);
  
  const [selectedColorIdx, setSelectedColorIdx] = useState(0);
  const [customColor, setCustomColor] = useState(initialColors[0]);
  
  const chartCanvasRef = useRef(null);
  const finishedCanvasRef = useRef(null);
  const playbackIntervalRef = useRef(null);

  // Load Template
  const handleTemplateChange = (id) => {
    setTemplateId(id);
    const template = MISANGA_TEMPLATES[id];
    if (template) {
      setNumThreads(template.threads);
      setInitialColors([...template.initialColors]);
      setGrid(JSON.parse(JSON.stringify(template.grid)));
      setCurrentStep(0);
      setIsPlaying(false);
      setSelectedColorIdx(0);
    }
  };

  // Change thread count
  const handleNumThreadsChange = (val) => {
    const count = parseInt(val);
    // Only even counts are valid for misanga
    setNumThreads(count);
    setTemplateId('custom');
    const freshColors = DEFAULT_THREAD_PALETTES[count] || DEFAULT_THREAD_PALETTES[8];
    setInitialColors([...freshColors]);
    setGrid(buildDefaultGrid(count, grid.length));
    setCurrentStep(0);
    setIsPlaying(false);
    setSelectedColorIdx(0);
    onShowToast(`${count}가닥 배치로 변경되었습니다.`);
  };

  // Color picker selection
  const handleColorSwatchClick = (idx) => {
    setSelectedColorIdx(idx);
    setCustomColor(initialColors[idx]);
  };

  const handleColorChange = (e) => {
    const val = e.target.value;
    setCustomColor(val);
    const newColors = [...initialColors];
    newColors[selectedColorIdx] = val;
    setInitialColors(newColors);
  };

  // Grid editing: Add/Remove Rows
  const addRow = () => {
    const N = initialColors.length;
    const isNextEven = grid.length % 2 === 1;
    const numKnots = isNextEven ? Math.floor((N - 2) / 2) : Math.floor(N / 2);
    const newRow = Array(numKnots).fill(KNOT_TYPES.FORWARD);
    setGrid([...grid, newRow]);
    onShowToast("새 행이 추가되었습니다.");
  };

  const removeRow = () => {
    if (grid.length <= 2) return;
    setGrid(grid.slice(0, -1));
    if (currentStep > grid.length - 1) {
      setCurrentStep(grid.length - 1);
    }
    onShowToast("마지막 행이 제거되었습니다.");
  };

  // Playback handlers
  const handlePlayPause = () => {
    setIsPlaying(!isPlaying);
  };

  const handleStepForward = () => {
    if (currentStep < grid.length) {
      setCurrentStep(currentStep + 1);
    } else {
      setIsPlaying(false);
    }
  };

  const handleStepBackward = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleFirstStep = () => {
    setCurrentStep(0);
    setIsPlaying(false);
  };

  const handleLastStep = () => {
    setCurrentStep(grid.length);
    setIsPlaying(false);
  };

  // Auto-play interval
  useEffect(() => {
    if (isPlaying) {
      playbackIntervalRef.current = setInterval(() => {
        setCurrentStep((prev) => {
          if (prev >= grid.length) {
            setIsPlaying(false);
            return prev;
          }
          return prev + 1;
        });
      }, speed * 1000);
    } else {
      clearInterval(playbackIntervalRef.current);
    }
    
    return () => clearInterval(playbackIntervalRef.current);
  }, [isPlaying, speed, grid.length]);

  // Compute positions
  const { threadPositionsByRow, knotColorsByRow } = computeFullMisangaPattern(initialColors, grid);

  // Render Pattern Chart
  useEffect(() => {
    const canvas = chartCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    
    const cellWidth = 40;
    const cellHeight = 35;
    const N = initialColors.length;
    
    canvas.width = (N + 1) * cellWidth;
    canvas.height = (grid.length + 1) * cellHeight + 20;
    
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    // Draw background
    ctx.fillStyle = '#0c0e18';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    // Draw step highlight
    if (currentStep > 0 && currentStep <= grid.length) {
      ctx.fillStyle = 'rgba(124, 58, 237, 0.15)';
      ctx.fillRect(0, 20 + (currentStep - 1) * cellHeight, canvas.width, cellHeight);
      
      ctx.strokeStyle = 'rgba(124, 58, 237, 0.4)';
      ctx.lineWidth = 1;
      ctx.strokeRect(0, 20 + (currentStep - 1) * cellHeight, canvas.width, cellHeight);
    }

    // Draw thread lines
    for (let r = 0; r < grid.length; r++) {
      const isEven = r % 2 === 1;
      const current = threadPositionsByRow[r];
      const next = threadPositionsByRow[r + 1];
      
      const yStart = 20 + r * cellHeight + cellHeight / 2;
      const yEnd = 20 + (r + 1) * cellHeight + cellHeight / 2;
      
      ctx.lineWidth = 3.5;
      ctx.lineCap = 'round';
      
      if (!isEven) {
        // Odd Row: Pairs (0,1), (2,3)
        for (let k = 0; k < N / 2; k++) {
          const L = 2 * k;
          const R = 2 * k + 1;
          const xL = (L + 1) * cellWidth;
          const xR = (R + 1) * cellWidth;
          const xCenter = (xL + xR) / 2;
          const yCenter = (yStart + yEnd) / 2;
          
          // Left thread
          ctx.strokeStyle = current[L];
          ctx.beginPath();
          ctx.moveTo(xL, yStart);
          ctx.lineTo(xCenter, yCenter);
          ctx.lineTo(xR, yEnd);
          ctx.stroke();
          
          // Right thread
          ctx.strokeStyle = current[R];
          ctx.beginPath();
          ctx.moveTo(xR, yStart);
          ctx.lineTo(xCenter, yCenter);
          ctx.lineTo(xL, yEnd);
          ctx.stroke();
        }
      } else {
        // Even Row: Pairs (1,2), (3,4)... Outer straight
        // Left outer
        ctx.strokeStyle = current[0];
        ctx.beginPath();
        ctx.moveTo(cellWidth, yStart);
        ctx.lineTo(cellWidth, yEnd);
        ctx.stroke();
        
        // Right outer
        ctx.strokeStyle = current[N - 1];
        ctx.beginPath();
        ctx.moveTo(N * cellWidth, yStart);
        ctx.lineTo(N * cellWidth, yEnd);
        ctx.stroke();
        
        for (let k = 0; k < (N - 2) / 2; k++) {
          const L = 2 * k + 1;
          const R = 2 * k + 2;
          const xL = (L + 1) * cellWidth;
          const xR = (R + 1) * cellWidth;
          const xCenter = (xL + xR) / 2;
          const yCenter = (yStart + yEnd) / 2;
          
          ctx.strokeStyle = current[L];
          ctx.beginPath();
          ctx.moveTo(xL, yStart);
          ctx.lineTo(xCenter, yCenter);
          ctx.lineTo(xR, yEnd);
          ctx.stroke();
          
          ctx.strokeStyle = current[R];
          ctx.beginPath();
          ctx.moveTo(xR, yStart);
          ctx.lineTo(xCenter, yCenter);
          ctx.lineTo(xL, yEnd);
          ctx.stroke();
        }
      }
    }
    
    // Draw Knots
    for (let r = 0; r < grid.length; r++) {
      const isEven = r % 2 === 1;
      const yCenter = 20 + r * cellHeight + cellHeight / 2;
      const rowKnots = grid[r];
      
      if (!isEven) {
        for (let k = 0; k < N / 2; k++) {
          const type = rowKnots[k] || KNOT_TYPES.NONE;
          if (type === KNOT_TYPES.NONE) continue;
          
          const xCenter = (2 * k + 1.5) * cellWidth;
          const knotCol = (type === KNOT_TYPES.FORWARD || type === KNOT_TYPES.FORWARD_BACKWARD) 
            ? threadPositionsByRow[r][2 * k] 
            : threadPositionsByRow[r][2 * k + 1];
          
          // Circle
          ctx.beginPath();
          ctx.arc(xCenter, yCenter, 12, 0, 2 * Math.PI);
          ctx.fillStyle = '#11131f';
          ctx.fill();
          ctx.strokeStyle = knotCol;
          ctx.lineWidth = 2.5;
          ctx.stroke();
          
          // Symbol arrow
          ctx.fillStyle = '#ffffff';
          ctx.font = 'bold 12px sans-serif';
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          let sym = '↗';
          if (type === KNOT_TYPES.BACKWARD) sym = '↖';
          if (type === KNOT_TYPES.FORWARD_BACKWARD) sym = '↪';
          if (type === KNOT_TYPES.BACKWARD_FORWARD) sym = '↩';
          ctx.fillText(sym, xCenter, yCenter);
        }
      } else {
        for (let k = 0; k < (N - 2) / 2; k++) {
          const type = rowKnots[k] || KNOT_TYPES.NONE;
          if (type === KNOT_TYPES.NONE) continue;
          
          const xCenter = (2 * k + 2.5) * cellWidth;
          const knotCol = (type === KNOT_TYPES.FORWARD || type === KNOT_TYPES.FORWARD_BACKWARD)
            ? threadPositionsByRow[r][2 * k + 1]
            : threadPositionsByRow[r][2 * k + 2];
            
          ctx.beginPath();
          ctx.arc(xCenter, yCenter, 12, 0, 2 * Math.PI);
          ctx.fillStyle = '#11131f';
          ctx.fill();
          ctx.strokeStyle = knotCol;
          ctx.lineWidth = 2.5;
          ctx.stroke();
          
          ctx.fillStyle = '#ffffff';
          ctx.font = 'bold 12px sans-serif';
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          let sym = '↗';
          if (type === KNOT_TYPES.BACKWARD) sym = '↖';
          if (type === KNOT_TYPES.FORWARD_BACKWARD) sym = '↪';
          if (type === KNOT_TYPES.BACKWARD_FORWARD) sym = '↩';
          ctx.fillText(sym, xCenter, yCenter);
        }
      }
    }
  }, [grid, initialColors, currentStep, threadPositionsByRow]);

  // Render Finished Bracelet View
  useEffect(() => {
    const canvas = finishedCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    
    const cellWidth = 24;
    const beadHeight = 16;
    const N = initialColors.length;
    
    canvas.width = (N + 1) * cellWidth;
    canvas.height = 380;
    
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = '#0c0e18';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    // We stack row by row. We only draw rows that have been woven (r < currentStep)
    // To make it look nice, we can draw them stacked from the top down.
    for (let r = 0; r < currentStep; r++) {
      const isEven = r % 2 === 1;
      const y = 30 + r * (beadHeight - 3); // Overlap slightly to give woven texture
      const knotsRow = grid[r];
      
      if (!isEven) {
        // Odd row
        for (let k = 0; k < N / 2; k++) {
          const type = knotsRow[k];
          if (type === KNOT_TYPES.NONE) continue;
          
          const x = (2 * k + 1) * cellWidth;
          const knotCol = (type === KNOT_TYPES.FORWARD || type === KNOT_TYPES.FORWARD_BACKWARD) 
            ? threadPositionsByRow[r][2 * k] 
            : threadPositionsByRow[r][2 * k + 1];
            
          ctx.fillStyle = knotCol;
          // Draw bead capsule
          ctx.beginPath();
          ctx.roundRect(x + 2, y, cellWidth * 2 - 4, beadHeight, 6);
          ctx.fill();
          
          // Bead details (highlight & shading)
          ctx.fillStyle = 'rgba(255,255,255,0.15)';
          ctx.fillRect(x + 5, y + 2, cellWidth * 2 - 10, 3);
          
          ctx.fillStyle = 'rgba(0,0,0,0.2)';
          ctx.fillRect(x + 5, y + beadHeight - 5, cellWidth * 2 - 10, 3);
        }
      } else {
        // Even row
        // Outer strands
        ctx.fillStyle = threadPositionsByRow[r][0];
        ctx.beginPath();
        ctx.roundRect(cellWidth + 2, y, cellWidth - 4, beadHeight, 4);
        ctx.fill();
        
        ctx.fillStyle = threadPositionsByRow[r][N - 1];
        ctx.beginPath();
        ctx.roundRect(N * cellWidth + 2, y, cellWidth - 4, beadHeight, 4);
        ctx.fill();
        
        for (let k = 0; k < (N - 2) / 2; k++) {
          const type = knotsRow[k];
          if (type === KNOT_TYPES.NONE) continue;
          
          const x = (2 * k + 2) * cellWidth;
          const knotCol = (type === KNOT_TYPES.FORWARD || type === KNOT_TYPES.FORWARD_BACKWARD)
            ? threadPositionsByRow[r][2 * k + 1]
            : threadPositionsByRow[r][2 * k + 2];
            
          ctx.fillStyle = knotCol;
          ctx.beginPath();
          ctx.roundRect(x + 2, y, cellWidth * 2 - 4, beadHeight, 6);
          ctx.fill();
          
          // Bead details
          ctx.fillStyle = 'rgba(255,255,255,0.15)';
          ctx.fillRect(x + 5, y + 2, cellWidth * 2 - 10, 3);
          
          ctx.fillStyle = 'rgba(0,0,0,0.2)';
          ctx.fillRect(x + 5, y + beadHeight - 5, cellWidth * 2 - 10, 3);
        }
      }
    }
  }, [currentStep, grid, initialColors, threadPositionsByRow]);

  // Click on chart canvas to edit knot
  const handleChartClick = (e) => {
    const canvas = chartCanvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    
    const cellWidth = 40;
    const cellHeight = 35;
    const N = initialColors.length;
    
    // Find row
    const r = Math.floor((y - 20) / cellHeight);
    if (r < 0 || r >= grid.length) return;
    
    const isEven = r % 2 === 1;
    let clickKnotIdx = -1;
    
    if (!isEven) {
      // Odd row: pairs (0,1), (2,3)
      for (let k = 0; k < N / 2; k++) {
        const xCenter = (2 * k + 1.5) * cellWidth;
        const dist = Math.sqrt((x - xCenter) ** 2 + (y - (20 + r * cellHeight + cellHeight / 2)) ** 2);
        if (dist <= 16) {
          clickKnotIdx = k;
          break;
        }
      }
    } else {
      // Even row
      for (let k = 0; k < (N - 2) / 2; k++) {
        const xCenter = (2 * k + 2.5) * cellWidth;
        const dist = Math.sqrt((x - xCenter) ** 2 + (y - (20 + r * cellHeight + cellHeight / 2)) ** 2);
        if (dist <= 16) {
          clickKnotIdx = k;
          break;
        }
      }
    }
    
    if (clickKnotIdx !== -1) {
      // Cycle knot types
      const cycle = [
        KNOT_TYPES.FORWARD,
        KNOT_TYPES.BACKWARD,
        KNOT_TYPES.FORWARD_BACKWARD,
        KNOT_TYPES.BACKWARD_FORWARD,
        KNOT_TYPES.NONE
      ];
      const currentKnot = grid[r][clickKnotIdx] || KNOT_TYPES.NONE;
      const nextIdx = (cycle.indexOf(currentKnot) + 1) % cycle.length;
      const nextKnot = cycle[nextIdx];
      
      const newGrid = JSON.parse(JSON.stringify(grid));
      newGrid[r][clickKnotIdx] = nextKnot;
      setGrid(newGrid);
      
      onShowToast(`매듭이 ${nextKnot} (으)로 변경되었습니다.`);
    }
  };

  // Export functions
  const handleExportPng = () => {
    const canvas = finishedCanvasRef.current;
    if (canvas) {
      downloadCanvasAsPng(canvas, `palzzi-misanga-${templateId}.png`);
      onShowToast("완성본 이미지가 PNG로 내보내기 되었습니다.");
    }
  };

  const handleExportSvg = () => {
    const svgContent = generateMisangaSvg(initialColors, grid);
    downloadTextFile(svgContent, `palzzi-misanga-${templateId}.svg`, 'image/svg+xml');
    onShowToast("도안 차트가 SVG로 내보내기 되었습니다.");
  };

  return (
    <div className="workspace-grid">
      {/* Sidebar Controls */}
      <div className="glass-panel">
        <div>
          <h2>실팔찌 (미산가)</h2>
          <p>전통적인 V자 패턴, 사선 무늬 등을 시뮬레이션하고 매듭 방향을 직접 커스텀해보세요.</p>
        </div>

        {/* Template Select */}
        <div className="control-group">
          <label className="control-label">패턴 템플릿</label>
          <select 
            className="select-input" 
            value={templateId} 
            onChange={(e) => handleTemplateChange(e.target.value)}
          >
            <option value="chevron">V자 패턴 (Chevron)</option>
            <option value="candyStripe">사선 패턴 (Candy Stripe)</option>
            <option value="diamond">다이아몬드 패턴 (Diamond)</option>
            {templateId === 'custom' && <option value="custom">커스텀 (Custom)</option>}
          </select>
        </div>

        {/* Thread Count Select */}
        <div className="control-group">
          <label className="control-label">실 개수 (가닥 수)</label>
          <select
            className="select-input"
            value={numThreads}
            onChange={(e) => handleNumThreadsChange(e.target.value)}
          >
            <option value="4">4가닥</option>
            <option value="6">6가닥</option>
            <option value="8">8가닥 (기본)</option>
            <option value="10">10가닥</option>
            <option value="12">12가닥</option>
          </select>
        </div>

        {/* Color Palette customization */}
        <div className="control-group">
          <label className="control-label">실 색상 조합 커스텀</label>
          <div className="palette-grid">
            {initialColors.map((color, idx) => (
              <div 
                key={idx}
                className={`color-swatch ${selectedColorIdx === idx ? 'active' : ''}`}
                style={{ backgroundColor: color }}
                onClick={() => handleColorSwatchClick(idx)}
                title={`Thread ${idx + 1}`}
              />
            ))}
          </div>
          
          <div style={{ marginTop: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <span style={{ fontSize: '0.85rem', color: '#9ca3af' }}>선택된 실 #{selectedColorIdx + 1}:</span>
            <input 
              type="color" 
              value={customColor} 
              onChange={handleColorChange} 
              style={{ background: 'none', border: 'none', cursor: 'pointer', width: '40px', height: '30px' }}
            />
          </div>
        </div>

        {/* Grid Sizer */}
        <div className="control-group">
          <label className="control-label">패턴 길이 (행 수 조절)</label>
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <button className="btn" onClick={addRow} style={{ flex: 1 }}>
              <Plus size={16} /> 행 추가
            </button>
            <button className="btn btn-danger" onClick={removeRow} style={{ flex: 1 }} disabled={grid.length <= 2}>
              <Minus size={16} /> 행 제거
            </button>
          </div>
        </div>

        {/* Color Preset Manager */}
        <ColorPresetManager 
          onShowToast={onShowToast}
          activeColors={initialColors}
          onApplyPreset={(colors) => {
            setInitialColors([...colors]);
            setCustomColor(colors[0]);
            setCurrentStep(0);
            setIsPlaying(false);
          }}
        />

        {/* Help box */}
        <div style={{ padding: '0.75rem', background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)', borderRadius: '8px', fontSize: '0.8rem', display: 'flex', gap: '0.5rem' }}>
          <Info size={16} className="text-cyan" style={{ flexShrink: 0, marginTop: '2px' }} />
          <div style={{ color: '#9ca3af', lineHeight: '1.4' }}>
            **도안 편집 안내**:<br />
            우측 도안 뷰에서 동그라미 매듭(↗ ↖ ↪ ↩)을 클릭하면 매듭 유형이 즉시 순환 변경됩니다.
          </div>
        </div>
      </div>

      {/* Main Workspace */}
      <div className="visualizers-container">
        <div className="visualizers-split">
          {/* Chart View */}
          <div className="view-card">
            <div className="view-card-header">
              <span className="view-card-title">도안 차트 (Pattern Chart)</span>
              <div style={{ display: 'flex', gap: '0.35rem' }}>
                <button className="btn" style={{ padding: '0.25rem 0.5rem', fontSize: '0.75rem' }} onClick={handleExportSvg} title="SVG 도안 다운로드">
                  <Download size={12} /> SVG
                </button>
              </div>
            </div>
            <div className="canvas-wrapper" style={{ overflowY: 'auto' }}>
              <canvas 
                ref={chartCanvasRef} 
                onClick={handleChartClick}
                style={{ cursor: 'pointer' }}
              />
            </div>
          </div>

          {/* Finished View */}
          <div className="view-card">
            <div className="view-card-header">
              <span className="view-card-title">완성본 2D 프리뷰 (Finished View)</span>
              <button className="btn btn-secondary" style={{ padding: '0.25rem 0.5rem', fontSize: '0.75rem' }} onClick={handleExportPng} title="PNG 이미지 다운로드">
                <Download size={12} /> PNG
              </button>
            </div>
            <div className="canvas-wrapper">
              <canvas ref={finishedCanvasRef} />
            </div>
          </div>
        </div>

        {/* Playback Controls */}
        <PlaybackControl
          currentStep={currentStep}
          totalSteps={grid.length}
          isPlaying={isPlaying}
          onPlayPause={handlePlayPause}
          onStepForward={handleStepForward}
          onStepBackward={handleStepBackward}
          onFirstStep={handleFirstStep}
          onLastStep={handleLastStep}
          speed={speed}
          onSpeedChange={setSpeed}
          stepLabel="진행 단계 (Row)"
        />
      </div>
    </div>
  );
}
