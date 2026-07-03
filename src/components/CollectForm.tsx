import { useState } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { COLOR_OPTIONS, RIPENESS_OPTIONS, TROPICAL_FRUITS } from '../constants';
import { getCurrentLocation, takePhoto } from '../export';
import type { FruitFormData, FruitRecord } from '../types';
import { EMPTY_FORM } from '../types';

interface CollectFormProps {
  editingRecord?: FruitRecord;
  onSave: (record: FruitRecord) => void;
  onCancel?: () => void;
}

export default function CollectForm({ editingRecord, onSave, onCancel }: CollectFormProps) {
  const [form, setForm] = useState<FruitFormData>(() =>
    editingRecord
      ? {
          fruitName: editingRecord.fruitName,
          category: editingRecord.category,
          photoDataUrl: editingRecord.photoDataUrl,
          weight: editingRecord.weight?.toString() ?? '',
          color: editingRecord.color ?? '',
          ripeness: editingRecord.ripeness ?? '',
          notes: editingRecord.notes ?? '',
          latitude: editingRecord.latitude,
          longitude: editingRecord.longitude,
        }
      : { ...EMPTY_FORM },
  );
  const [loadingPhoto, setLoadingPhoto] = useState(false);
  const [loadingLocation, setLoadingLocation] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const updateField = <K extends keyof FruitFormData>(key: K, value: FruitFormData[K]) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const handleTakePhoto = async () => {
    setLoadingPhoto(true);
    setError(null);
    try {
      const dataUrl = await takePhoto();
      updateField('photoDataUrl', dataUrl);
      setMessage('照片已添加');
    } catch (err) {
      setError(err instanceof Error ? err.message : '拍照失败');
    } finally {
      setLoadingPhoto(false);
    }
  };

  const handleGetLocation = async () => {
    setLoadingLocation(true);
    setError(null);
    try {
      const location = await getCurrentLocation();
      if (!location) {
        setError('无法获取定位，请检查权限设置');
        return;
      }
      updateField('latitude', location.latitude);
      updateField('longitude', location.longitude);
      setMessage('定位已获取');
    } catch (err) {
      setError(err instanceof Error ? err.message : '定位失败');
    } finally {
      setLoadingLocation(false);
    }
  };

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    setError(null);
    setMessage(null);

    if (!form.category) {
      setError('请选择水果种类');
      return;
    }
    if (!form.photoDataUrl) {
      setError('请先拍摄或选择一张照片');
      return;
    }

    const now = new Date().toISOString();
    const record: FruitRecord = {
      id: editingRecord?.id ?? uuidv4(),
      fruitName: form.fruitName.trim() || form.category,
      category: form.category,
      photoDataUrl: form.photoDataUrl,
      weight: form.weight ? Number(form.weight) : undefined,
      color: form.color || undefined,
      ripeness: form.ripeness || undefined,
      notes: form.notes.trim() || undefined,
      latitude: form.latitude,
      longitude: form.longitude,
      createdAt: editingRecord?.createdAt ?? now,
      updatedAt: now,
    };

    onSave(record);
    if (!editingRecord) {
      setForm({ ...EMPTY_FORM });
    }
    setMessage(editingRecord ? '记录已更新' : '样本采集成功');
  };

  return (
    <section>
      <h1 className="page-title">{editingRecord ? '编辑样本' : '采集样本'}</h1>
      <p className="page-subtitle">拍摄水果照片并填写标注信息，用于构建机器学习数据集</p>

      {message && <div className="alert alert-success">{message}</div>}
      {error && <div className="alert alert-error">{error}</div>}

      <form className="card" onSubmit={handleSubmit}>
        <div className="photo-box" onClick={handleTakePhoto}>
          {form.photoDataUrl ? (
            <img src={form.photoDataUrl} alt="水果样本" />
          ) : (
            <div className="photo-placeholder">
              <div style={{ fontSize: '2rem', marginBottom: 8 }}>📷</div>
              点击拍照或从相册选择
            </div>
          )}
        </div>

        <div className="action-row">
          <button type="button" className="btn btn-secondary" onClick={handleTakePhoto} disabled={loadingPhoto}>
            {loadingPhoto ? '处理中...' : '拍照/选图'}
          </button>
          <button
            type="button"
            className="btn btn-secondary"
            onClick={handleGetLocation}
            disabled={loadingLocation}
          >
            {loadingLocation ? '定位中...' : '获取定位'}
          </button>
        </div>

        {form.latitude != null && form.longitude != null && (
          <p className="record-meta" style={{ marginTop: 12 }}>
            当前坐标：{form.latitude.toFixed(5)}, {form.longitude.toFixed(5)}
          </p>
        )}

        <div className="form-group">
          <label htmlFor="category">水果种类 *</label>
          <select
            id="category"
            value={form.category}
            onChange={(e) => updateField('category', e.target.value)}
            required
          >
            <option value="">请选择</option>
            {TROPICAL_FRUITS.map((fruit) => (
              <option key={fruit} value={fruit}>
                {fruit}
              </option>
            ))}
          </select>
        </div>

        <div className="form-group">
          <label htmlFor="fruitName">样本名称</label>
          <input
            id="fruitName"
            value={form.fruitName}
            onChange={(e) => updateField('fruitName', e.target.value)}
            placeholder="例如：台农芒果-1号"
          />
        </div>

        <div className="form-group">
          <label htmlFor="weight">重量 (克)</label>
          <input
            id="weight"
            type="number"
            min="0"
            step="0.1"
            value={form.weight}
            onChange={(e) => updateField('weight', e.target.value)}
            placeholder="可选"
          />
        </div>

        <div className="form-group">
          <label htmlFor="color">颜色</label>
          <select id="color" value={form.color} onChange={(e) => updateField('color', e.target.value)}>
            <option value="">请选择</option>
            {COLOR_OPTIONS.map((color) => (
              <option key={color} value={color}>
                {color}
              </option>
            ))}
          </select>
        </div>

        <div className="form-group">
          <label htmlFor="ripeness">成熟度</label>
          <select
            id="ripeness"
            value={form.ripeness}
            onChange={(e) => updateField('ripeness', e.target.value as FruitFormData['ripeness'])}
          >
            <option value="">请选择</option>
            {RIPENESS_OPTIONS.map((item) => (
              <option key={item} value={item}>
                {item}
              </option>
            ))}
          </select>
        </div>

        <div className="form-group">
          <label htmlFor="notes">备注</label>
          <textarea
            id="notes"
            value={form.notes}
            onChange={(e) => updateField('notes', e.target.value)}
            placeholder="外观特征、拍摄环境、品种说明等"
          />
        </div>

        <div className="action-row">
          {onCancel && (
            <button type="button" className="btn btn-secondary" onClick={onCancel}>
              取消
            </button>
          )}
          <button type="submit" className="btn btn-primary btn-block">
            {editingRecord ? '保存修改' : '保存样本'}
          </button>
        </div>
      </form>
    </section>
  );
}
