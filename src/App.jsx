import React, { useState, useEffect, useCallback } from 'react';
import MisangaSimulator from './components/MisangaSimulator';
import KumihimoSimulator from './components/KumihimoSimulator';
import MacrameSimulator from './components/MacrameSimulator';
import { Share2, Save, Edit3, Check } from 'lucide-react';

export default function App() {
  const [activeTab, setActiveTab] = useState('kumihimo');
  const [projectName, setProjectName] = useState('나의 첫 팔찌 작품');
  const [isEditingName, setIsEditingName] = useState(false);
  const [toastMessage, setToastMessage] = useState('');
  const [savedProjects, setSavedProjects] = useState([]);

  const showToast = useCallback((msg) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(''), 3000);
  }, []);

  useEffect(() => {
    const loaded = localStorage.getItem('palzzi_projects');
    if (loaded) {
      try { setSavedProjects(JSON.parse(loaded)); }
      catch (e) { console.error(e); }
    }

    const params = new URLSearchParams(window.location.search);
    const sharedData = params.get('data');
    if (sharedData) {
      try {
        const decoded = decodeURIComponent(escape(window.atob(sharedData)));
        const project = JSON.parse(decoded);
        if (project.projectName) setProjectName(project.projectName);
        if (project.craftType) {
          setActiveTab(project.craftType.toLowerCase());
          showToast(`공유된 '${project.projectName}' 도안을 불러왔습니다!`);
        }
      } catch (err) {
        showToast("공유 링크가 올바르지 않습니다.");
      }
    }
  }, []);

  const saveToLocalStorage = () => {
    const newProject = {
      id: 'palzzi-' + Date.now(),
      projectName,
      craftType: activeTab.toUpperCase(),
      timestamp: new Date().toLocaleString()
    };
    const updated = [...savedProjects, newProject];
    setSavedProjects(updated);
    localStorage.setItem('palzzi_projects', JSON.stringify(updated));
    showToast(`'${projectName}' 프로젝트 목록에 저장되었습니다.`);
  };

  const generateShareLink = () => {
    try {
      const projectData = { projectName, craftType: activeTab.toUpperCase(), timestamp: Date.now() };
      const jsonStr = JSON.stringify(projectData);
      const b64 = window.btoa(unescape(encodeURIComponent(jsonStr)));
      const shareUrl = `${window.location.origin}${window.location.pathname}?data=${b64}`;
      navigator.clipboard.writeText(shareUrl);
      showToast("공유용 URL이 클립보드에 복사되었습니다!");
    } catch (e) {
      showToast("공유 링크 생성에 실패했습니다.");
    }
  };

  return (
    <div className="app-container">
      <header className="top-header">
        <div className="logo-section">
          <div className="logo-icon">Palzzi</div>
          <div className="logo-text">
            {isEditingName ? (
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <input 
                  type="text" 
                  value={projectName} 
                  onChange={(e) => setProjectName(e.target.value)}
                  onBlur={() => setIsEditingName(false)}
                  onKeyDown={(e) => { if (e.key === 'Enter') setIsEditingName(false); }}
                  className="text-input"
                  style={{ fontSize: '1.2rem', padding: '0.2rem 0.5rem', width: '200px' }}
                  autoFocus
                />
                <button className="circle-btn" onClick={() => setIsEditingName(false)} style={{ width: '1.8rem', height: '1.8rem' }}>
                  <Check size={12} />
                </button>
              </div>
            ) : (
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' }} onClick={() => setIsEditingName(true)}>
                <span>{projectName}</span>
                <Edit3 size={14} className="text-muted" />
              </div>
            )}
            <span className="logo-badge">MVP</span>
          </div>
        </div>

        <div className="global-actions">
          <button className="btn" onClick={saveToLocalStorage} title="로컬 저장소 저장">
            <Save size={16} /> 저장
          </button>
          <button className="btn btn-secondary" onClick={generateShareLink} title="공유 링크 복사">
            <Share2 size={16} /> 링크 공유
          </button>
        </div>
      </header>

      <nav className="tabs-bar">
        <button className={`tab-btn ${activeTab === 'kumihimo' ? 'active' : ''}`} onClick={() => setActiveTab('kumihimo')}>
          💿 쿠미히모 (원형 땋기)
        </button>
        <button className="tab-btn" disabled style={{ opacity: 0.4, cursor: 'not-allowed' }}>
          🧵 실팔찌 (미산가) <span style={{ fontSize: '0.65rem', color: '#6b7280' }}>준비중</span>
        </button>
        <button className="tab-btn" disabled style={{ opacity: 0.4, cursor: 'not-allowed' }}>
          🪢 마크라메 (매듭공예) <span style={{ fontSize: '0.65rem', color: '#6b7280' }}>준비중</span>
        </button>
      </nav>

      <main style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
        {activeTab === 'misanga' && <MisangaSimulator onShowToast={showToast} />}
        {activeTab === 'kumihimo' && <KumihimoSimulator onShowToast={showToast} />}
        {activeTab === 'macrame' && <MacrameSimulator onShowToast={showToast} />}
      </main>

      {toastMessage && (
        <div className="toast-msg">
          <Check size={16} className="text-green" style={{ strokeWidth: 3 }} />
          <span style={{ fontSize: '0.9rem', fontWeight: 500 }}>{toastMessage}</span>
        </div>
      )}
    </div>
  );
}
