import React, { useState, useEffect, useRef } from 'react';
import {
  Download, Upload, Plus, Trash2, Copy, Check,
  Palette, Save
} from 'lucide-react';

const STORAGE_KEY = 'palzzi_color_presets';

// 대중적으로 알려진 실 색상 이름
const WELL_KNOWN_COLORS = {
  '#FF0000': 'Red 빨강',
  '#FF3366': 'Rose 장미',
  '#FF5733': 'Coral 코랄',
  '#FF9933': 'Orange 주황',
  '#FFCC00': 'Gold 골드',
  '#FFFF33': 'Yellow 노랑',
  '#FFFF99': 'Lemon 레몬',
  '#33CC66': 'Emerald 에메랄드',
  '#10B981': 'Jade 비취',
  '#06B6D4': 'Cyan 시안',
  '#3366FF': 'Blue 파랑',
  '#6366F1': 'Indigo 남색',
  '#7C3AED': 'Purple 보라',
  '#A78BFA': 'Lavender 라벤더',
  '#E9D5FF': 'Lilac 라일락',
  '#EC4899': 'Pink 분홍',
  '#F43F5E': 'Crimson 진홍',
  '#F3F4F6': 'White 하양',
  '#D1D5DB': 'Silver 은색',
  '#9CA3AF': 'Gray 회색',
  '#4B5563': 'Dark Gray 진회색',
  '#1F2937': 'Charcoal 차콜',
  '#000000': 'Black 검정',
  '#8B5CF6': 'Violet 바이올렛',
  '#14B8A6': 'Teal 청록',
  '#F59E0B': 'Amber 호박',
  '#F97316': 'Tangerine 귤색',
  '#84CC16': 'Lime 라임',
  '#22C55E': 'Green 초록',
  '#0EA5E9': 'Sky Blue 하늘',
};

function getColorName(hex) {
  const upper = hex.toUpperCase();
  // Try exact match
  if (WELL_KNOWN_COLORS[upper]) return WELL_KNOWN_COLORS[upper];
  // Try to find closest named color
  for (const [key, name] of Object.entries(WELL_KNOWN_COLORS)) {
    if (key.toUpperCase() === upper) return name;
  }
  return hex; // Return hex code if no name found
}

function hexToRgb(hex) {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result ? {
    r: parseInt(result[1], 16),
    g: parseInt(result[2], 16),
    b: parseInt(result[3], 16)
  } : null;
}

function rgbToHex(r, g, b) {
  return '#' + [r, g, b].map(x => {
    const hex = Math.max(0, Math.min(255, x)).toString(16);
    return hex.length === 1 ? '0' + hex : hex;
  }).join('');
}

function loadPresets() {
  try {
    const data = localStorage.getItem(STORAGE_KEY);
    if (data) {
      const parsed = JSON.parse(data);
      if (Array.isArray(parsed)) return parsed;
    }
  } catch (e) {
    console.error('Failed to load presets', e);
  }
  // Default presets
  return [
    {
      id: 'preset-default-1',
      name: '무지개 (Rainbow)',
      colors: ['#FF3366', '#FF9933', '#FFFF33', '#33CC66', '#3366FF', '#A78BFA']
    },
    {
      id: 'preset-default-2',
      name: '오션 (Ocean)',
      colors: ['#06B6D4', '#0EA5E9', '#3366FF', '#6366F1', '#14B8A6', '#10B981']
    },
    {
      id: 'preset-default-3',
      name: '선셋 (Sunset)',
      colors: ['#F43F5E', '#FF5733', '#FF9933', '#F59E0B', '#F97316', '#EC4899']
    },
    {
      id: 'preset-default-4',
      name: '모노크롬 (Monochrome)',
      colors: ['#FFFFFF', '#D1D5DB', '#9CA3AF', '#4B5563', '#1F2937', '#000000']
    }
  ];
}

function savePresets(presets) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(presets));
  } catch (e) {
    console.error('Failed to save presets', e);
  }
}

export default function ColorPresetManager({ 
  onShowToast, 
  onApplyPreset,
  activeColors 
}) {
  const [presets, setPresets] = useState(loadPresets);
  const [isOpen, setIsOpen] = useState(false);
  const [editingPreset, setEditingPreset] = useState(null);
  const [editName, setEditName] = useState('');
  const [editColors, setEditColors] = useState([]);
  const [rgbInput, setRgbInput] = useState('');
  const fileInputRef = useRef(null);

  // Save whenever presets change
  useEffect(() => {
    savePresets(presets);
  }, [presets]);

  const handleOpen = () => {
    setIsOpen(!isOpen);
  };

  const handleDeletePreset = (id) => {
    setPresets(prev => prev.filter(p => p.id !== id));
    if (editingPreset?.id === id) {
      setEditingPreset(null);
    }
    onShowToast('색상 프리셋이 삭제되었습니다.');
  };

  const handleCreatePreset = () => {
    const newPreset = {
      id: 'preset-' + Date.now(),
      name: '새 프리셋',
      colors: ['#FF3366', '#FF9933', '#FFFF33', '#33CC66', '#3366FF', '#A78BFA']
    };
    setPresets(prev => [...prev, newPreset]);
    setEditingPreset(newPreset);
    setEditName(newPreset.name);
    setEditColors([...newPreset.colors]);
    onShowToast('새 프리셋이 생성되었습니다.');
  };

  const handleEditPreset = (preset) => {
    setEditingPreset(preset);
    setEditName(preset.name);
    setEditColors([...preset.colors]);
  };

  const handleSaveEdit = () => {
    if (!editingPreset) return;
    setPresets(prev => prev.map(p => 
      p.id === editingPreset.id 
        ? { ...p, name: editName || 'Unnamed', colors: editColors }
        : p
    ));
    setEditingPreset(null);
    onShowToast('프리셋이 저장되었습니다.');
  };

  const handleCancelEdit = () => {
    setEditingPreset(null);
  };

  const handleAddColor = () => {
    setEditColors(prev => [...prev, '#FFFFFF']);
  };

  const handleRemoveColor = (idx) => {
    if (editColors.length <= 1) return;
    setEditColors(prev => prev.filter((_, i) => i !== idx));
  };

  const handleColorChange = (idx, val) => {
    setEditColors(prev => prev.map((c, i) => i === idx ? val : c));
  };

  const handleRgbPaste = () => {
    // Try to parse RGB from clipboard or input
    const input = rgbInput.trim();
    
    // Try hex format
    if (/^#?[0-9a-fA-F]{6}$/.test(input)) {
      const hex = input.startsWith('#') ? input : '#' + input;
      setEditColors(prev => [...prev, hex]);
      setRgbInput('');
      return;
    }
    
    // Try rgb(r,g,b) format
    const rgbMatch = input.match(/rgb\s*\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*\)/i);
    if (rgbMatch) {
      const hex = rgbToHex(parseInt(rgbMatch[1]), parseInt(rgbMatch[2]), parseInt(rgbMatch[3]));
      setEditColors(prev => [...prev, hex]);
      setRgbInput('');
      return;
    }
    
    // Try r,g,b format
    const commaMatch = input.match(/^\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*$/);
    if (commaMatch) {
      const hex = rgbToHex(parseInt(commaMatch[1]), parseInt(commaMatch[2]), parseInt(commaMatch[3]));
      setEditColors(prev => [...prev, hex]);
      setRgbInput('');
      return;
    }
    
    onShowToast('RGB 형식이 올바르지 않습니다. (#FF0000 또는 rgb(255,0,0) 형식 사용)');
  };

  const handleCopyColor = (hex) => {
    const rgb = hexToRgb(hex);
    if (rgb) {
      const rgbStr = `rgb(${rgb.r}, ${rgb.g}, ${rgb.b})`;
      navigator.clipboard.writeText(rgbStr);
      onShowToast(`RGB 값 복사됨: ${rgbStr}`);
    } else {
      navigator.clipboard.writeText(hex);
      onShowToast(`Hex 값 복사됨: ${hex}`);
    }
  };

  const handleCopyRgb = (hex) => {
    const rgb = hexToRgb(hex);
    if (rgb) {
      const rgbStr = `${rgb.r}, ${rgb.g}, ${rgb.b}`;
      navigator.clipboard.writeText(rgbStr);
      onShowToast(`RGB 복사됨: ${rgbStr}`);
    }
  };

  const handleExportPresets = () => {
    const data = JSON.stringify(presets, null, 2);
    const blob = new Blob([data], { type: 'application/json' });
    const link = document.createElement('a');
    link.download = 'palzzi-color-presets.json';
    link.href = URL.createObjectURL(blob);
    link.click();
    onShowToast('색상 프리셋이 JSON 파일로 내보내기 되었습니다.');
  };

  const handleImportPresets = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const imported = JSON.parse(event.target.result);
        if (Array.isArray(imported)) {
          // Merge with existing presets
          setPresets(prev => {
            const merged = [...prev];
            imported.forEach(p => {
              if (!merged.find(m => m.id === p.id)) {
                merged.push({ ...p, id: 'preset-' + Date.now() + '-' + Math.random().toString(36).substr(2, 5) });
              }
            });
            return merged;
          });
          onShowToast(`${imported.length}개의 프리셋을 가져왔습니다.`);
        }
      } catch (err) {
        onShowToast('파일 형식이 올바르지 않습니다.');
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  return (
    <div style={{ marginBottom: '1rem' }}>
      {/* Toggle Button */}
      <button 
        className="btn btn-secondary" 
        onClick={handleOpen}
        style={{ width: '100%', justifyContent: 'center' }}
      >
        <Palette size={16} /> 색상 프리셋 관리 {isOpen ? '▲' : '▼'}
      </button>

      {isOpen && (
        <div style={{ 
          marginTop: '0.75rem', 
          padding: '1rem', 
          background: 'var(--bg-input)', 
          borderRadius: 'var(--radius-md)',
          border: '1px solid var(--border-light)',
          maxHeight: '420px',
          overflowY: 'auto',
          display: 'flex',
          flexDirection: 'column',
          gap: '0.75rem'
        }}>
          {/* Preset List */}
          {!editingPreset ? (
            <>
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <button className="btn" onClick={handleCreatePreset} style={{ flex: 1, justifyContent: 'center', fontSize: '0.8rem' }}>
                  <Plus size={14} /> 새 프리셋
                </button>
                <button className="btn" onClick={handleExportPresets} style={{ fontSize: '0.8rem' }} title="내보내기">
                  <Upload size={14} />
                </button>
                <button className="btn" onClick={() => fileInputRef.current?.click()} style={{ fontSize: '0.8rem' }} title="가져오기">
                  <Download size={14} />
                </button>
                <input 
                  ref={fileInputRef}
                  type="file" 
                  accept=".json" 
                  style={{ display: 'none' }}
                  onChange={handleImportPresets}
                />
              </div>

              {presets.map(preset => (
                <div 
                  key={preset.id}
                  style={{
                    background: 'rgba(255,255,255,0.03)',
                    border: '1px solid rgba(255,255,255,0.08)',
                    borderRadius: '8px',
                    padding: '0.65rem',
                    cursor: 'pointer',
                    transition: 'all 0.15s',
                  }}
                  onClick={() => {
                    onApplyPreset?.(preset.colors);
                    onShowToast(`'${preset.name}' 프리셋이 적용되었습니다.`);
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.4rem' }}>
                    <span style={{ fontSize: '0.85rem', fontWeight: 600 }}>{preset.name}</span>
                    <div style={{ display: 'flex', gap: '0.25rem' }}>
                      <button 
                        className="btn" 
                        style={{ padding: '0.15rem 0.4rem', fontSize: '0.7rem' }}
                        onClick={(e) => { e.stopPropagation(); handleEditPreset(preset); }}
                      >
                        편집
                      </button>
                      <button 
                        className="btn btn-danger" 
                        style={{ padding: '0.15rem 0.4rem', fontSize: '0.7rem' }}
                        onClick={(e) => { e.stopPropagation(); handleDeletePreset(preset.id); }}
                      >
                        <Trash2 size={10} />
                      </button>
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: '3px', flexWrap: 'wrap' }}>
                    {preset.colors.map((color, idx) => (
                      <div
                        key={idx}
                        style={{
                          width: '24px', height: '24px',
                          backgroundColor: color,
                          borderRadius: '4px',
                          border: '1px solid rgba(255,255,255,0.15)',
                          boxShadow: 'inset 0 1px 2px rgba(0,0,0,0.2)'
                        }}
                        title={`${getColorName(color)}`}
                      />
                    ))}
                  </div>
                </div>
              ))}
            </>
          ) : (
            /* Edit Mode */
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontWeight: 600, fontSize: '0.95rem' }}>프리셋 편집</span>
                <div style={{ display: 'flex', gap: '0.35rem' }}>
                  <button className="btn btn-primary" style={{ padding: '0.25rem 0.6rem', fontSize: '0.75rem' }} onClick={handleSaveEdit}>
                    <Check size={12} /> 저장
                  </button>
                  <button className="btn" style={{ padding: '0.25rem 0.6rem', fontSize: '0.75rem' }} onClick={handleCancelEdit}>
                    취소
                  </button>
                </div>
              </div>

              {/* Name Edit */}
              <div>
                <label className="control-label">프리셋 이름</label>
                <input 
                  type="text" 
                  className="text-input"
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  placeholder="프리셋 이름 입력"
                />
              </div>

              {/* Color list */}
              <div>
                <label className="control-label">색상 목록</label>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem', marginTop: '0.3rem' }}>
                  {editColors.map((color, idx) => (
                    <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <input 
                        type="color" 
                        value={color}
                        onChange={(e) => handleColorChange(idx, e.target.value)}
                        style={{ width: '36px', height: '30px', background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}
                      />
                      <span style={{ fontSize: '0.8rem', fontFamily: 'monospace', minWidth: '70px' }}>{color}</span>
                      <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', flex: 1 }}>{getColorName(color)}</span>
                      <button 
                        className="btn" 
                        style={{ padding: '0.15rem 0.3rem', fontSize: '0.65rem' }}
                        onClick={() => handleCopyColor(color)}
                        title="색상값 복사"
                      >
                        <Copy size={10} />
                      </button>
                      {editColors.length > 1 && (
                        <button 
                          className="btn btn-danger" 
                          style={{ padding: '0.15rem 0.3rem', fontSize: '0.65rem' }}
                          onClick={() => handleRemoveColor(idx)}
                        >
                          <Trash2 size={10} />
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {/* Add new color */}
              <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                <button className="btn" onClick={handleAddColor} style={{ fontSize: '0.8rem' }}>
                  <Plus size={12} /> 색상 추가
                </button>
              </div>

              {/* RGB Input */}
              <div style={{ borderTop: '1px solid var(--border-light)', paddingTop: '0.5rem' }}>
                <label className="control-label">RGB 값으로 색상 추가</label>
                <div style={{ display: 'flex', gap: '0.35rem', marginTop: '0.25rem' }}>
                  <input 
                    type="text" 
                    className="text-input"
                    value={rgbInput}
                    onChange={(e) => setRgbInput(e.target.value)}
                    onKeyDown={(e) => { if (e.key === 'Enter') handleRgbPaste(); }}
                    placeholder='#FF0000 또는 rgb(255,0,0) 또는 255,0,0'
                    style={{ fontSize: '0.8rem', flex: 1 }}
                  />
                  <button className="btn" onClick={handleRgbPaste} style={{ fontSize: '0.75rem' }}>
                    <Plus size={12} /> 추가
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
