import React, { useState, useEffect, useRef } from 'react';
import { MACRAME_TUTORIAL } from '../utils/weavingHelper';
import PlaybackControl from './PlaybackControl';
import { Info, HelpCircle } from 'lucide-react';

export default function MacrameSimulator({ onShowToast }) {
  const [currentStepIdx, setCurrentStepIdx] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [speed, setSpeed] = useState(2.0);
  
  const canvasRef = useRef(null);
  const playbackIntervalRef = useRef(null);
  
  const totalSteps = MACRAME_TUTORIAL.length - 1;
  const currentStepData = MACRAME_TUTORIAL[currentStepIdx];

  // Playback actions
  const handlePlayPause = () => {
    setIsPlaying(!isPlaying);
  };

  const handleStepForward = () => {
    if (currentStepIdx < totalSteps) {
      setCurrentStepIdx(currentStepIdx + 1);
    } else {
      setIsPlaying(false);
      onShowToast("튜토리얼이 완료되었습니다!");
    }
  };

  const handleStepBackward = () => {
    if (currentStepIdx > 0) {
      setCurrentStepIdx(currentStepIdx - 1);
    }
  };

  const handleFirstStep = () => {
    setCurrentStepIdx(0);
    setIsPlaying(false);
  };

  const handleLastStep = () => {
    setCurrentStepIdx(totalSteps);
    setIsPlaying(false);
  };

  // Autoplay
  useEffect(() => {
    if (isPlaying) {
      playbackIntervalRef.current = setInterval(() => {
        setCurrentStepIdx(prev => {
          if (prev >= totalSteps) {
            setIsPlaying(false);
            onShowToast("튜토리얼이 완료되었습니다!");
            return prev;
          }
          return prev + 1;
        });
      }, speed * 1000);
    } else {
      clearInterval(playbackIntervalRef.current);
    }
    return () => clearInterval(playbackIntervalRef.current);
  }, [isPlaying, speed]);

  // Canvas Drawing
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    
    canvas.width = 460;
    canvas.height = 360;
    
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    // Background
    ctx.fillStyle = '#0c0e18';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    const cx = canvas.width / 2;
    const cy = canvas.height / 2;
    
    // Draw depending on Knot Type
    switch (currentStepData.diagramType) {
      case 'LARKS_HEAD':
        drawLarksHead(ctx, cx, cy);
        break;
      case 'SQUARE_KNOT_LEFT':
        drawSquareKnot(ctx, cx, cy, true);
        break;
      case 'SQUARE_KNOT_RIGHT':
        drawSquareKnot(ctx, cx, cy, false);
        break;
      case 'HALF_HITCH':
        drawHalfHitch(ctx, cx, cy);
        break;
      default:
        break;
    }
  }, [currentStepIdx]);

  // Drawing functions
  const drawLarksHead = (ctx, cx, cy) => {
    // Wooden rod/bar
    ctx.fillStyle = '#8b5a2b';
    ctx.beginPath();
    ctx.roundRect(50, 80, 360, 24, 6);
    ctx.fill();
    ctx.strokeStyle = '#5c3a1a';
    ctx.lineWidth = 2;
    ctx.stroke();
    
    // Thread: Golden/orange rope
    ctx.lineWidth = 10;
    ctx.lineCap = 'round';
    ctx.strokeStyle = '#f59e0b'; // Working thread color
    
    // Rope loop behind the bar
    ctx.beginPath();
    ctx.arc(cx, 80, 20, Math.PI, 0, false);
    ctx.stroke();
    
    // Rope passing over the front of the bar
    ctx.beginPath();
    ctx.moveTo(cx - 20, 80);
    ctx.lineTo(cx - 20, 110);
    ctx.quadraticCurveTo(cx - 20, 130, cx - 10, 130);
    ctx.lineTo(cx - 10, 320);
    ctx.stroke();
    
    ctx.beginPath();
    ctx.moveTo(cx + 20, 80);
    ctx.lineTo(cx + 20, 110);
    ctx.quadraticCurveTo(cx + 20, 130, cx + 10, 130);
    ctx.lineTo(cx + 10, 320);
    ctx.stroke();
    
    // The cross loop in front
    ctx.beginPath();
    ctx.moveTo(cx - 30, 110);
    ctx.lineTo(cx + 30, 110);
    ctx.strokeStyle = '#d97706';
    ctx.lineWidth = 11;
    ctx.stroke();
  };

  const drawSquareKnot = (ctx, cx, cy, isLeft) => {
    // 4 vertical cords at top
    const spacing = 35;
    const x1 = cx - 1.5 * spacing;
    const x2 = cx - 0.5 * spacing;
    const x3 = cx + 0.5 * spacing;
    const x4 = cx + 1.5 * spacing;
    
    // Colors
    const colCore = '#06b6d4'; // Cyan
    const colWorking = '#f59e0b'; // Gold
    
    ctx.lineWidth = 8;
    ctx.lineCap = 'round';
    
    // Draw top segments
    ctx.strokeStyle = colWorking;
    ctx.beginPath(); ctx.moveTo(x1, 30); ctx.lineTo(x1, 100); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(x4, 30); ctx.lineTo(x4, 100); ctx.stroke();
    
    ctx.strokeStyle = colCore;
    ctx.beginPath(); ctx.moveTo(x2, 30); ctx.lineTo(x2, 320); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(x3, 30); ctx.lineTo(x3, 320); ctx.stroke();
    
    // Draw loops based on side
    if (isLeft) {
      // Cord 1 (left) goes OVER core, under Cord 4 (right)
      // Represented by a curve from x1,100 to x4,130
      ctx.strokeStyle = colWorking;
      ctx.beginPath();
      ctx.moveTo(x1, 100);
      ctx.bezierCurveTo(x1 + 10, 140, x4 - 10, 110, x4 - 15, 140);
      ctx.stroke();
      
      // Cord 4 (right) goes UNDER core, over Cord 1 (left)
      ctx.beginPath();
      ctx.moveTo(x4, 100);
      ctx.bezierCurveTo(x4 + 10, 130, x1 - 10, 110, x1, 160);
      ctx.stroke();
      
      // Bottom straight tails
      ctx.beginPath(); ctx.moveTo(x4 - 15, 140); ctx.lineTo(x4, 320); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(x1, 160); ctx.lineTo(x1, 320); ctx.stroke();
      
      // Draw Knot center highlight
      ctx.fillStyle = '#7c3aed';
      ctx.beginPath();
      ctx.arc(cx, 130, 14, 0, 2*Math.PI);
      ctx.fill();
    } else {
      // Right half
      ctx.strokeStyle = colWorking;
      ctx.beginPath();
      ctx.moveTo(x4, 100);
      ctx.bezierCurveTo(x4 - 10, 140, x1 + 10, 110, x1 + 15, 140);
      ctx.stroke();
      
      ctx.beginPath();
      ctx.moveTo(x1, 100);
      ctx.bezierCurveTo(x1 - 10, 130, x4 + 10, 110, x4, 160);
      ctx.stroke();
      
      ctx.beginPath(); ctx.moveTo(x1 + 15, 140); ctx.lineTo(x1, 320); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(x4, 160); ctx.lineTo(x4, 320); ctx.stroke();
      
      ctx.fillStyle = '#7c3aed';
      ctx.beginPath();
      ctx.arc(cx, 130, 14, 0, 2*Math.PI);
      ctx.fill();
    }
  };

  const drawHalfHitch = (ctx, cx, cy) => {
    // Diagonal Core Cord
    ctx.strokeStyle = '#06b6d4'; // Core
    ctx.lineWidth = 10;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(80, 80);
    ctx.lineTo(380, 260);
    ctx.stroke();
    
    // Working Cords looping around core
    ctx.strokeStyle = '#f59e0b'; // Working
    ctx.lineWidth = 7;
    
    const loops = [140, 200, 260];
    loops.forEach((lx) => {
      const ly = 80 + (lx - 80) * 0.6; // Y coordinate on the diagonal
      
      // Vertical rope entering loop
      ctx.beginPath();
      ctx.moveTo(lx, 40);
      ctx.lineTo(lx, ly - 20);
      ctx.stroke();
      
      // Loop arc
      ctx.beginPath();
      ctx.arc(lx - 10, ly, 15, 1.5 * Math.PI, 0.5 * Math.PI, false);
      ctx.stroke();
      
      // Vertical tail going down
      ctx.beginPath();
      ctx.moveTo(lx - 10, ly + 15);
      ctx.lineTo(lx - 10, 320);
      ctx.stroke();
    });
  };

  return (
    <div className="macrame-grid">
      {/* Visualizer card */}
      <div className="view-card" style={{ minHeight: '420px' }}>
        <div className="view-card-header">
          <span className="view-card-title">매듭 시각 구조 차트 (Knot Structure)</span>
          <div className="playback-status">
            Step: <span style={{ color: '#fff' }}>{currentStepIdx + 1}</span> / {totalSteps + 1}
          </div>
        </div>
        <div className="canvas-wrapper">
          <canvas ref={canvasRef} />
        </div>
        
        {/* Playback controller */}
        <PlaybackControl
          currentStep={currentStepIdx}
          totalSteps={totalSteps}
          isPlaying={isPlaying}
          onPlayPause={handlePlayPause}
          onStepForward={handleStepForward}
          onStepBackward={handleStepBackward}
          onFirstStep={handleFirstStep}
          onLastStep={handleLastStep}
          speed={speed}
          onSpeedChange={setSpeed}
          stepLabel="단계"
        />
      </div>

      {/* Tutorial detail instructions */}
      <div className="macrame-tutorial-card">
        <div>
          <h2>매듭 교육 가이드</h2>
          <p>마크라메의 3대 필수 매듭법을 시각화 애니메이션과 설명을 따라 차근차근 배워보세요.</p>
        </div>

        {/* Current Instruction Step */}
        <div className="instruction-step">
          <div className="step-number-badge">{currentStepIdx + 1}</div>
          <div className="step-details">
            <h3>{currentStepData.title}</h3>
            <p>{currentStepData.description}</p>
          </div>
        </div>

        {/* Cord Roles Panel */}
        <div className="control-group">
          <label className="control-label">가닥별 역할 및 상태</label>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', marginTop: '0.25rem' }}>
            {currentStepData.cords.map((cord, idx) => (
              <div 
                key={idx}
                style={{ 
                  display: 'flex', 
                  justifyContent: 'space-between', 
                  alignItems: 'center', 
                  padding: '0.5rem 0.75rem', 
                  background: 'rgba(255,255,255,0.02)', 
                  border: '1px solid rgba(255,255,255,0.05)',
                  borderRadius: '6px' 
                }}
              >
                <span style={{ fontSize: '0.9rem', fontWeight: 500 }}>
                  실 가닥 {idx + 1}
                </span>
                <span className={`guide-badge ${cord.type === 'working' ? 'guide-badge-working' : 'guide-badge-core'}`}>
                  {cord.type === 'working' ? '엮는줄 (Working)' : '기둥줄 (Core)'}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Tip helper */}
        <div style={{ padding: '0.75rem', background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)', borderRadius: '8px', fontSize: '0.8rem', display: 'flex', gap: '0.5rem' }}>
          <HelpCircle size={16} className="text-gold" style={{ flexShrink: 0, marginTop: '2px' }} />
          <div style={{ color: '#9ca3af', lineHeight: '1.4' }}>
            **마크라메 팁**:<br />
            엮는줄은 실의 소모량이 기둥줄에 비해 훨씬 많으므로 실제 제작시 약 4~6배 더 길게 잘라야 합니다.
          </div>
        </div>
      </div>
    </div>
  );
}
