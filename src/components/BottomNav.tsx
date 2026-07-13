import type { TabId } from '../types';

interface BottomNavProps {
  activeTab: TabId;
  onChange: (tab: TabId) => void;
}

const tabs: { id: TabId; label: string; icon: string }[] = [
  { id: 'home', label: '首页', icon: '🏠' },
  { id: 'collect', label: '采集', icon: '📷' },
  { id: 'detect', label: '检测', icon: '🔬' },
  { id: 'list', label: '数据', icon: '📋' },
  { id: 'export', label: '导出', icon: '📤' },
];

export default function BottomNav({ activeTab, onChange }: BottomNavProps) {
  return (
    <nav className="bottom-nav">
      {tabs.map((tab) => (
        <button
          key={tab.id}
          type="button"
          className={`nav-btn ${activeTab === tab.id ? 'active' : ''}`}
          onClick={() => onChange(tab.id)}
        >
          <div>{tab.icon}</div>
          <div>{tab.label}</div>
        </button>
      ))}
    </nav>
  );
}
