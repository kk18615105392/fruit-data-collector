import { useMemo, useState } from 'react';
import { TROPICAL_FRUITS } from '../constants';
import type { FruitRecord } from '../types';

interface RecordListProps {
  records: FruitRecord[];
  onSelect: (record: FruitRecord) => void;
}

export default function RecordList({ records, onSelect }: RecordListProps) {
  const [keyword, setKeyword] = useState('');
  const [category, setCategory] = useState('全部');

  const filtered = useMemo(() => {
    return records.filter((record) => {
      const matchCategory = category === '全部' || record.category === category;
      const matchKeyword =
        !keyword ||
        record.fruitName.includes(keyword) ||
        record.category.includes(keyword) ||
        (record.notes ?? '').includes(keyword);
      return matchCategory && matchKeyword;
    });
  }, [records, keyword, category]);

  const categories = ['全部', ...Array.from(new Set(records.map((r) => r.category)))];

  return (
    <section>
      <h1 className="page-title">数据列表</h1>
      <p className="page-subtitle">共 {records.length} 条记录，当前显示 {filtered.length} 条</p>

      <div className="card">
        <div className="form-group">
          <label htmlFor="search">搜索</label>
          <input
            id="search"
            value={keyword}
            onChange={(e) => setKeyword(e.target.value)}
            placeholder="按名称、种类或备注搜索"
          />
        </div>

        <div className="chip-row">
          {categories.map((item) => (
            <button
              key={item}
              type="button"
              className={`chip ${category === item ? 'active' : ''}`}
              onClick={() => setCategory(item)}
            >
              {item}
            </button>
          ))}
        </div>

        {filtered.length === 0 ? (
          <div className="empty-state">暂无匹配的数据，请先去采集页面添加样本。</div>
        ) : (
          <div className="record-list">
            {filtered.map((record) => (
              <button
                key={record.id}
                type="button"
                className="card record-item"
                style={{ width: '100%', textAlign: 'left' }}
                onClick={() => onSelect(record)}
              >
                {record.photoDataUrl ? (
                  <img className="record-thumb" src={record.photoDataUrl} alt={record.fruitName} />
                ) : (
                  <div className="record-thumb" />
                )}
                <div>
                  <p className="record-title">
                    {record.fruitName} · {record.category}
                  </p>
                  <p className="record-meta">
                    {record.fileName ?? new Date(record.createdAt).toLocaleString('zh-CN')}
                    {record.disease ? ` · ${record.disease}` : ''}
                    {record.ripeness ? ` · ${record.ripeness}` : ''}
                  </p>
                </div>
                <span>›</span>
              </button>
            ))}
          </div>
        )}
      </div>

      {records.length === 0 && (
        <div className="card" style={{ marginTop: 12 }}>
          <div className="empty-state">
            还没有采集任何热带水果数据。
            <br />
            建议从 {TROPICAL_FRUITS.slice(0, 3).join('、')} 等常见种类开始。
          </div>
        </div>
      )}
    </section>
  );
}
