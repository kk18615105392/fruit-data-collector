import { TROPICAL_FRUITS } from '../constants';
import { getStats } from '../storage';
import type { FruitRecord } from '../types';

interface HomePageProps {
  records: FruitRecord[];
  onNavigate: (tab: 'collect' | 'detect' | 'list' | 'export') => void;
}

export default function HomePage({ records, onNavigate }: HomePageProps) {
  const stats = getStats(records);

  return (
    <section>
      <div className="hero-banner">
        <h2>热带水果采集APP</h2>
        <p>连续拍照 · 属性命名 · 一键保存到手机相册目录</p>
      </div>

      <div className="stat-grid">
        <div className="stat-card">
          <div className="stat-value">{stats.total}</div>
          <div className="stat-label">已采集样本</div>
        </div>
        <div className="stat-card">
          <div className="stat-value">{stats.categories}</div>
          <div className="stat-label">水果种类</div>
        </div>
        <div className="stat-card">
          <div className="stat-value">{stats.withPhoto}</div>
          <div className="stat-label">含图片样本</div>
        </div>
        <div className="stat-card">
          <div className="stat-value">{stats.withLocation}</div>
          <div className="stat-label">含定位样本</div>
        </div>
      </div>

      <div className="card" style={{ marginTop: 16 }}>
        <h3 style={{ marginTop: 0 }}>支持采集的热带水果</h3>
        <div className="chip-row">
          {TROPICAL_FRUITS.slice(0, 10).map((fruit) => (
            <span key={fruit} className="chip">
              {fruit}
            </span>
          ))}
          <span className="chip">+ 更多</span>
        </div>
        <div className="quick-actions">
          <button type="button" className="btn btn-primary btn-block" onClick={() => onNavigate('collect')}>
            开始采集新样本
          </button>
          <button type="button" className="btn btn-accent btn-block" onClick={() => onNavigate('detect')}>
            番茄病虫害检测
          </button>
          <button type="button" className="btn btn-secondary btn-block" onClick={() => onNavigate('list')}>
            查看已采集数据
          </button>
          <button type="button" className="btn btn-secondary btn-block" onClick={() => onNavigate('export')}>
            导出数据集
          </button>
        </div>
      </div>
    </section>
  );
}
