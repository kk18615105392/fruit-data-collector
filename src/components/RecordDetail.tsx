import { deleteRecord } from '../storage';
import type { FruitRecord } from '../types';

interface RecordDetailProps {
  record: FruitRecord;
  onEdit: () => void;
  onDelete: () => void;
  onBack: () => void;
}

export default function RecordDetail({ record, onEdit, onDelete, onBack }: RecordDetailProps) {
  const handleDelete = () => {
    if (window.confirm('确定删除这条样本吗？此操作不可恢复。')) {
      deleteRecord(record.id);
      onDelete();
    }
  };

  return (
    <section>
      <button type="button" className="btn btn-secondary" onClick={onBack} style={{ marginBottom: 12 }}>
        ← 返回列表
      </button>

      <h1 className="page-title">{record.fruitName}</h1>
      <p className="page-subtitle">{record.category}</p>

      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        <img src={record.photoDataUrl} alt={record.fruitName} style={{ width: '100%', display: 'block' }} />
      </div>

      <div className="card" style={{ marginTop: 12 }}>
        <div className="detail-grid">
          <div className="detail-row">
            <span className="detail-label">样本 ID</span>
            <span className="detail-value">{record.id.slice(0, 8)}...</span>
          </div>
          <div className="detail-row">
            <span className="detail-label">重量</span>
            <span className="detail-value">{record.weight ? `${record.weight} g` : '未填写'}</span>
          </div>
          <div className="detail-row">
            <span className="detail-label">颜色</span>
            <span className="detail-value">{record.color ?? '未填写'}</span>
          </div>
          <div className="detail-row">
            <span className="detail-label">成熟度</span>
            <span className="detail-value">{record.ripeness ?? '未填写'}</span>
          </div>
          <div className="detail-row">
            <span className="detail-label">定位</span>
            <span className="detail-value">
              {record.latitude != null && record.longitude != null
                ? `${record.latitude.toFixed(5)}, ${record.longitude.toFixed(5)}`
                : '未获取'}
            </span>
          </div>
          <div className="detail-row">
            <span className="detail-label">采集时间</span>
            <span className="detail-value">{new Date(record.createdAt).toLocaleString('zh-CN')}</span>
          </div>
          <div className="detail-row">
            <span className="detail-label">备注</span>
            <span className="detail-value">{record.notes ?? '无'}</span>
          </div>
        </div>
      </div>

      <div className="action-row" style={{ marginTop: 16 }}>
        <button type="button" className="btn btn-primary" onClick={onEdit}>
          编辑
        </button>
        <button type="button" className="btn btn-danger" onClick={handleDelete}>
          删除
        </button>
      </div>
    </section>
  );
}
