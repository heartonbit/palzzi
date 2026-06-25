import React from 'react';
import { Play, Pause, ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from 'lucide-react';

export default function PlaybackControl({
  currentStep,
  totalSteps,
  isPlaying,
  onPlayPause,
  onStepForward,
  onStepBackward,
  onFirstStep,
  onLastStep,
  speed,
  onSpeedChange,
  progressPercentage,
  stepLabel = "Step"
}) {
  const percentage = progressPercentage !== undefined 
    ? progressPercentage 
    : totalSteps > 0 
      ? (currentStep / totalSteps) * 100 
      : 0;

  return (
    <div className="playback-bar">
      <div className="playback-controls">
        {/* Left Side: Status display */}
        <div className="playback-status">
          {stepLabel}: <span style={{ color: '#fff', fontWeight: 600 }}>{currentStep}</span> / {totalSteps}
        </div>

        {/* Center: Buttons row */}
        <div className="control-buttons-row">
          <button 
            className="circle-btn" 
            onClick={onFirstStep} 
            title="First Step"
            disabled={currentStep === 0}
            style={{ opacity: currentStep === 0 ? 0.4 : 1, cursor: currentStep === 0 ? 'not-allowed' : 'pointer' }}
          >
            <ChevronsLeft size={16} />
          </button>
          
          <button 
            className="circle-btn" 
            onClick={onStepBackward} 
            title="Previous Step"
            disabled={currentStep === 0}
            style={{ opacity: currentStep === 0 ? 0.4 : 1, cursor: currentStep === 0 ? 'not-allowed' : 'pointer' }}
          >
            <ChevronLeft size={18} />
          </button>
          
          <button 
            className="circle-btn circle-btn-primary" 
            onClick={onPlayPause} 
            title={isPlaying ? "Pause" : "Play"}
          >
            {isPlaying ? <Pause size={20} fill="#fff" /> : <Play size={20} fill="#fff" style={{ marginLeft: '2px' }} />}
          </button>
          
          <button 
            className="circle-btn" 
            onClick={onStepForward} 
            title="Next Step"
            disabled={currentStep === totalSteps}
            style={{ opacity: currentStep === totalSteps ? 0.4 : 1, cursor: currentStep === totalSteps ? 'not-allowed' : 'pointer' }}
          >
            <ChevronRight size={18} />
          </button>
          
          <button 
            className="circle-btn" 
            onClick={onLastStep} 
            title="Last Step"
            disabled={currentStep === totalSteps}
            style={{ opacity: currentStep === totalSteps ? 0.4 : 1, cursor: currentStep === totalSteps ? 'not-allowed' : 'pointer' }}
          >
            <ChevronsRight size={16} />
          </button>
        </div>

        {/* Right Side: Speed controls */}
        <div className="playback-speed">
          <span>Speed:</span>
          <input 
            type="range" 
            min="0.2" 
            max="3" 
            step="0.1" 
            value={speed} 
            onChange={(e) => onSpeedChange(parseFloat(e.target.value))}
            className="slider-input"
            title={`${speed} seconds per step`}
          />
          <span style={{ minWidth: '40px', display: 'inline-block', textAlign: 'right' }}>{speed.toFixed(1)}s</span>
        </div>
      </div>

      {/* Bottom: Progress Bar */}
      <div className="progress-track" onClick={(e) => {
        if (totalSteps <= 0) return;
        const rect = e.currentTarget.getBoundingClientRect();
        const clickX = e.clientX - rect.left;
        const pct = clickX / rect.width;
        const targetStep = Math.round(pct * totalSteps);
        // We can pass a click handler if needed, let's keep it simple or allow navigation.
        // For now, let's make it click-navigable by using a handler if parent supports it.
      }}>
        <div 
          className="progress-fill" 
          style={{ width: `${percentage}%` }}
        />
      </div>
    </div>
  );
}
