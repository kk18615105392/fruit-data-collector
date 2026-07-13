import { useEffect, useMemo, useState } from 'react';
import { exportDataset } from '../export';
import {
  defaultExportName,
  groupRecordsIntoDatasets,
  pickRecordsFromDatasets,
} from '../exportGroups';
import type { FruitRecord } from '../types';

interface ExportPageProps {
  records: FruitRecord[];
}

export default function ExportPage({ records }: ExportPageProps) {
  const datasets = useMemo(() => groupRecordsIntoDatasets(records), [records]);
  const [exportName, setExportName] = useState(defaultExportName);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(() => new Set());
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setSelectedIds(new Set(datasets.map((item) => item.id)));
  }, [datasets]);

  const selectedRecords = useMemo(
    () => pickRecordsFromDatasets(datasets, selectedIds),
    [datasets, selectedIds],
  );

  const allSelected = datasets.length > 0 && selectedIds.size === datasets.length;

  const toggleDataset = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const toggleAll = () => {
    if (allSelected) {
      setSelectedIds(new Set());
      return;
    }
    setSelectedIds(new Set(datasets.map((item) => item.id)));
  };

  const handleExport = async () => {
    setLoading(true);
    setMessage(null);
    setError(null);
    try {
      await exportDataset({
        datasetName: exportName,
        records: selectedRecords,
      });
      setMessage(`「${exportName.trim()}」导出成功，共 ${selectedRecords.length} 条样本`);
    } catch (err) {
      setError(err instanceof Error ? err.message : '导出失败');
    } finally {
      setLoading(false);
    }
  };

  return (
    <section>
      <h1 className="page-title">导出数据集</h1>
      <p className="page-subtitle">自定义名称并选择要导出的采集批次</p>

      {message && <div className="alert alert-success">{message}</div>}
      {error && <div className="alert alert-error">{error}</div>}

      <div className="card">
        <h3 style={{ marginTop: 0 }}>1. 导出名称</h3>
        <div className="form-group" style={{ marginBottom: 0 }}>
          <label htmlFor="exportName">数据集名称</label>
          <input
            id="exportName"
            value={exportName}
            onChange={(e) => setExportName(e.target.value)}
            placeholder="例如：芒果病害数据集_20260703"
          />
        </div>
        <p className="record-meta" style={{ marginTop: 8 }}>
          将作为导出文件夹 / JSON 文件名，建议使用英文、数字或下划线。
        </p>
      </div>

      <div className="card" style={{ marginTop: 12 }}>
        <div className="export-dataset-header">
          <h3 style={{ margin: 0 }}>2. 选择数据集</h3>
          {datasets.length > 0 && (
            <button type="button" className="btn btn-secondary btn-sm" onClick={toggleAll}>
              {allSelected ? '取消全选' : '全选'}
            </button>
          )}
        </div>

        {datasets.length === 0 ? (
          <div className="empty-state" style={{ marginTop: 12 }}>
            暂无采集数据，请先在采集页保存样本。
          </div>
        ) : (
          <div className="export-dataset-list">
            {datasets.map((item) => {
              const checked = selectedIds.has(item.id);
              const thumb = item.records[0]?.photoDataUrl;
              return (
                <label key={item.id} className={`export-dataset-item ${checked ? 'selected' : ''}`}>
                  <input
                    type="checkbox"
                    checked={checked}
                    onChange={() => toggleDataset(item.id)}
                  />
                  {thumb ? (
                    <img className="export-dataset-thumb" src={thumb} alt={item.label} />
                  ) : (
                    <div className="export-dataset-thumb" />
                  )}
                  <div className="export-dataset-meta">
                    <span className="export-dataset-title">{item.label}</span>
                    <span className="record-meta">{item.subtitle}</span>
                  </div>
                </label>
              );
            })}
          </div>
        )}
      </div>

      <div className="card" style={{ marginTop: 12 }}>
        <h3 style={{ marginTop: 0 }}>3. 导出内容</h3>
        <div className="detail-grid">
          <div className="detail-row">
            <span className="detail-label">已选批次</span>
            <span className="detail-value">{selectedIds.size} / {datasets.length}</span>
          </div>
          <div className="detail-row">
            <span className="detail-label">样本总数</span>
            <span className="detail-value">{selectedRecords.length}</span>
          </div>
          <div className="detail-row">
            <span className="detail-label">JSON 元数据</span>
            <span className="detail-value">含标签、病害、属性、图片路径</span>
          </div>
          <div className="detail-row">
            <span className="detail-label">CSV 表格</span>
            <span className="detail-value">便于 Excel / Pandas 分析</span>
          </div>
          <div className="detail-row">
            <span className="detail-label">YOLO 标注</span>
            <span className="detail-value">labels/*.txt + classes.txt + data.yaml</span>
          </div>
          <div className="detail-row">
            <span className="detail-label">LabelImg</span>
            <span className="detail-value">annotations/*.xml（Pascal VOC）</span>
          </div>
          <div className="detail-row">
            <span className="detail-label">COCO JSON</span>
            <span className="detail-value">coco/annotations.json（检测框）</span>
          </div>
          <div className="detail-row">
            <span className="detail-label">图像分类</span>
            <span className="detail-value">classification/类别名/图片（ImageFolder）</span>
          </div>
          <div className="detail-row">
            <span className="detail-label">图片文件</span>
            <span className="detail-value">Android / Web 打包为 ZIP</span>
          </div>
        </div>

        <button
          type="button"
          className="btn btn-accent btn-block"
          style={{ marginTop: 16 }}
          disabled={loading || selectedRecords.length === 0 || !exportName.trim()}
          onClick={handleExport}
        >
          {loading ? '导出中...' : `导出 ${selectedRecords.length} 条样本`}
        </button>
      </div>

      <div className="card" style={{ marginTop: 12 }}>
        <h3 style={{ marginTop: 0 }}>数据集格式说明</h3>
        <p className="record-meta">
          导出 ZIP 包含：JSON/CSV 元数据、原图、YOLO 标签、LabelImg XML、COCO JSON（有框选时）、
          以及按类别分文件夹的图像分类目录（classification/类别名/图片.jpg）。
        </p>
      </div>
    </section>
  );
}
