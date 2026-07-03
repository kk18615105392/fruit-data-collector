import { useState } from 'react';
import { exportDataset } from '../export';
import type { FruitRecord } from '../types';

interface ExportPageProps {
  records: FruitRecord[];
}

export default function ExportPage({ records }: ExportPageProps) {
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleExport = async () => {
    setLoading(true);
    setMessage(null);
    setError(null);
    try {
      await exportDataset(records);
      setMessage('数据集导出成功');
    } catch (err) {
      setError(err instanceof Error ? err.message : '导出失败');
    } finally {
      setLoading(false);
    }
  };

  return (
    <section>
      <h1 className="page-title">导出数据集</h1>
      <p className="page-subtitle">将采集的数据导出为 JSON / CSV 格式，可用于模型训练</p>

      {message && <div className="alert alert-success">{message}</div>}
      {error && <div className="alert alert-error">{error}</div>}

      <div className="card">
        <h3 style={{ marginTop: 0 }}>导出内容</h3>
        <div className="detail-grid">
          <div className="detail-row">
            <span className="detail-label">样本总数</span>
            <span className="detail-value">{records.length}</span>
          </div>
          <div className="detail-row">
            <span className="detail-label">JSON 元数据</span>
            <span className="detail-value">包含标签、属性、图片路径</span>
          </div>
          <div className="detail-row">
            <span className="detail-label">CSV 表格</span>
            <span className="detail-value">便于 Excel / Pandas 分析</span>
          </div>
          <div className="detail-row">
            <span className="detail-label">图片文件</span>
            <span className="detail-value">Android 端按文件夹导出</span>
          </div>
        </div>

        <button
          type="button"
          className="btn btn-accent btn-block"
          style={{ marginTop: 16 }}
          disabled={loading || records.length === 0}
          onClick={handleExport}
        >
          {loading ? '导出中...' : '导出数据集'}
        </button>

        {records.length === 0 && (
          <p className="record-meta" style={{ marginTop: 12 }}>
            请先采集至少 1 条样本后再导出。
          </p>
        )}
      </div>

      <div className="card" style={{ marginTop: 12 }}>
        <h3 style={{ marginTop: 0 }}>数据集格式说明</h3>
        <p className="record-meta">
          每条记录包含：水果名称、种类标签、图片、重量、颜色、成熟度、GPS 坐标、备注和时间戳。
          导出的 JSON 可直接用于 YOLO、TensorFlow 等框架的数据预处理脚本。
        </p>
      </div>
    </section>
  );
}
