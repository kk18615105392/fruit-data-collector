import { useEffect, useMemo, useState } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { COLOR_OPTIONS, PREVIOUS_DISEASE_VALUE, RIPENESS_OPTIONS, TROPICAL_FRUITS, UNKNOWN_DISEASE } from '../constants';
import { formatPreviousDiseaseLabel, getDiseasesForFruit, resolveDisease, resolveFormForNaming } from '../disease';
import { getPhoneSaveHint, saveRecordsToPhone } from '../fileStorage';
import { getCurrentLocation, takePhoto } from '../export';
import { buildPhotoFileName, NAMING_FIELD_LABELS, previewFileName } from '../naming';
import { loadNamingSettings, saveNamingSettings } from '../namingSettings';
import { loadLastDisease } from '../storage';
import type { FruitFormData, FruitRecord, NamingField, NamingSettings, SessionPhoto } from '../types';
import { EMPTY_FORM } from '../types';

interface CollectFormProps {
  editingRecord?: FruitRecord;
  onSave: (record: FruitRecord) => void;
  onSaveBatch: (records: FruitRecord[]) => void;
  onCancel?: () => void;
}

function formFromRecord(record: FruitRecord): FruitFormData {
  return {
    fruitName: record.fruitName,
    category: record.category,
    photoDataUrl: record.photoDataUrl,
    customFileName: record.fileName?.replace(/\.[^.]+$/, '') ?? '',
    weight: record.weight?.toString() ?? '',
    color: record.color ?? '',
    ripeness: record.ripeness ?? '',
    disease: record.disease ?? '',
    notes: record.notes ?? '',
    latitude: record.latitude,
    longitude: record.longitude,
  };
}

function buildRecordFromPhoto(
  photo: SessionPhoto,
  form: FruitFormData,
  batchId: string,
  lastDisease: string | null,
): FruitRecord {
  const now = new Date().toISOString();
  const disease = resolveDisease(form.disease, lastDisease);
  return {
    id: photo.id,
    fruitName: form.fruitName.trim() || form.category,
    category: form.category,
    photoDataUrl: photo.dataUrl,
    fileName: photo.fileName,
    weight: form.weight ? Number(form.weight) : undefined,
    color: form.color || undefined,
    ripeness: form.ripeness || undefined,
    disease,
    notes: form.notes.trim() || undefined,
    latitude: form.latitude,
    longitude: form.longitude,
    batchId,
    createdAt: now,
    updatedAt: now,
  };
}

export default function CollectForm({ editingRecord, onSave, onSaveBatch, onCancel }: CollectFormProps) {
  const isEdit = Boolean(editingRecord);
  const [form, setForm] = useState<FruitFormData>(() => {
    if (editingRecord) {
      return formFromRecord(editingRecord);
    }
    const last = loadLastDisease();
    return { ...EMPTY_FORM, disease: last ? PREVIOUS_DISEASE_VALUE : '' };
  });
  const [namingSettings, setNamingSettings] = useState<NamingSettings>(() => loadNamingSettings());
  const [sessionPhotos, setSessionPhotos] = useState<SessionPhoto[]>([]);
  const [loadingPhoto, setLoadingPhoto] = useState(false);
  const [loadingLocation, setLoadingLocation] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showNaming, setShowNaming] = useState(false);
  const [lastDisease, setLastDisease] = useState<string | null>(() => loadLastDisease());

  const namingForm = useMemo(
    () => resolveFormForNaming(form, lastDisease),
    [form, lastDisease],
  );

  const nextIndex = sessionPhotos.length + 1;
  const namePreview = useMemo(
    () => previewFileName(namingForm, namingSettings, nextIndex),
    [namingForm, namingSettings, nextIndex],
  );

  useEffect(() => {
    saveNamingSettings(namingSettings);
  }, [namingSettings]);

  useEffect(() => {
    if (editingRecord) {
      setForm(formFromRecord(editingRecord));
      setMessage(null);
      setError(null);
    }
  }, [editingRecord]);

  const updateField = <K extends keyof FruitFormData>(key: K, value: FruitFormData[K]) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const toggleNamingField = (field: NamingField) => {
    setNamingSettings((prev) => {
      const exists = prev.fields.includes(field);
      const fields = exists ? prev.fields.filter((f) => f !== field) : [...prev.fields, field];
      return { ...prev, fields: fields.length > 0 ? fields : prev.fields };
    });
  };

  const refreshSessionNames = (photos: SessionPhoto[], currentForm: FruitFormData, settings: NamingSettings) => {
    const resolved = resolveFormForNaming(currentForm, lastDisease);
    return photos.map((photo, idx) => ({
      ...photo,
      index: idx + 1,
      fileName: buildPhotoFileName(resolved, idx + 1, settings),
    }));
  };

  const handleBurstCapture = async () => {
    if (!form.category) {
      setError('请先选择水果种类，再开始连续拍照');
      return;
    }

    setLoadingPhoto(true);
    setError(null);
    try {
      const dataUrl = await takePhoto('camera');
      const index = sessionPhotos.length + 1;
      const fileName = buildPhotoFileName(namingForm, index, namingSettings);
      const photo: SessionPhoto = { id: uuidv4(), dataUrl, fileName, index };
      setSessionPhotos((prev) => [...prev, photo]);
      setMessage(`已拍摄第 ${index} 张：${fileName}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : '拍照失败');
    } finally {
      setLoadingPhoto(false);
    }
  };

  const handlePickPhoto = async () => {
    if (!form.category) {
      setError('请先选择水果种类');
      return;
    }

    setLoadingPhoto(true);
    setError(null);
    try {
      const dataUrl = await takePhoto('prompt');
      const index = sessionPhotos.length + 1;
      const fileName = buildPhotoFileName(namingForm, index, namingSettings);
      setSessionPhotos((prev) => [...prev, { id: uuidv4(), dataUrl, fileName, index }]);
      setMessage(`已添加第 ${index} 张`);
    } catch (err) {
      setError(err instanceof Error ? err.message : '选图失败');
    } finally {
      setLoadingPhoto(false);
    }
  };

  const handleRemovePhoto = (id: string) => {
    setSessionPhotos((prev) => refreshSessionNames(prev.filter((p) => p.id !== id), form, namingSettings));
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

  const handleSaveBatch = async () => {
    if (!form.category) {
      setError('请选择水果种类');
      return;
    }
    if (sessionPhotos.length === 0) {
      setError('请先连续拍摄至少 1 张照片');
      return;
    }

    setSaving(true);
    setError(null);
    setMessage(null);

    try {
      const batchId = uuidv4();
      const records = sessionPhotos.map((photo) => buildRecordFromPhoto(photo, form, batchId, lastDisease));
      const result = await saveRecordsToPhone(records);
      onSaveBatch(records);
      const savedDisease = records.find((r) => r.disease)?.disease;
      if (savedDisease) {
        setLastDisease(savedDisease);
      }
      setSessionPhotos([]);
      setForm({
        ...EMPTY_FORM,
        disease: savedDisease ? PREVIOUS_DISEASE_VALUE : '',
      });
      setMessage(`已保存 ${result.savedCount} 张到相册「${result.folder}」，并同步到应用列表`);
    } catch (err) {
      setError(err instanceof Error ? err.message : '保存失败');
    } finally {
      setSaving(false);
    }
  };

  const handleEditSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!form.category || !form.photoDataUrl) {
      setError('请完善种类和照片');
      return;
    }

    const now = new Date().toISOString();
    const disease = resolveDisease(form.disease, lastDisease);
    const resolvedForm = resolveFormForNaming(form, lastDisease);
    const fileName =
      form.customFileName.trim() !== ''
        ? buildPhotoFileName(resolvedForm, 1, namingSettings)
        : editingRecord?.fileName;

    const record: FruitRecord = {
      id: editingRecord!.id,
      fruitName: form.fruitName.trim() || form.category,
      category: form.category,
      photoDataUrl: form.photoDataUrl,
      fileName,
      weight: form.weight ? Number(form.weight) : undefined,
      color: form.color || undefined,
      ripeness: form.ripeness || undefined,
      disease,
      notes: form.notes.trim() || undefined,
      latitude: form.latitude,
      longitude: form.longitude,
      createdAt: editingRecord!.createdAt,
      updatedAt: now,
      savedPath: editingRecord?.savedPath,
      batchId: editingRecord?.batchId,
    };

    if (form.photoDataUrl !== editingRecord?.photoDataUrl || fileName !== editingRecord?.fileName) {
      await saveRecordsToPhone([record]);
    }
    onSave(record);
    setMessage('记录已更新并保存到手机');
  };

  useEffect(() => {
    if (!isEdit && sessionPhotos.length > 0) {
      setSessionPhotos((prev) => refreshSessionNames(prev, form, namingSettings));
    }
  }, [form.category, form.fruitName, form.disease, form.color, form.ripeness, form.weight, form.customFileName, namingSettings, lastDisease, isEdit]);

  if (isEdit) {
    return (
      <section>
        <h1 className="page-title">编辑样本</h1>
        <p className="page-subtitle">修改标注信息，保存后同步更新手机文件</p>
        {message && <div className="alert alert-success">{message}</div>}
        {error && <div className="alert alert-error">{error}</div>}
        <form className="card" onSubmit={handleEditSubmit}>
          <div className="photo-box" onClick={() => takePhoto('prompt').then((url) => updateField('photoDataUrl', url))}>
            <img src={form.photoDataUrl} alt="样本" />
          </div>
          <AttributeFields form={form} lastDisease={lastDisease} updateField={updateField} />
          <div className="form-group">
            <label htmlFor="customFileName">自定义文件名</label>
            <input
              id="customFileName"
              value={form.customFileName}
              onChange={(e) => updateField('customFileName', e.target.value)}
              placeholder="留空则按命名规则自动生成"
            />
          </div>
          <div className="action-row">
            {onCancel && (
              <button type="button" className="btn btn-secondary" onClick={onCancel}>
                取消
              </button>
            )}
            <button type="submit" className="btn btn-primary btn-block">
              保存修改
            </button>
          </div>
        </form>
      </section>
    );
  }

  return (
    <section>
      <h1 className="page-title">连续采集</h1>
      <p className="page-subtitle">先选属性 → 连续拍照 → 按规则命名并保存到手机</p>

      {message && <div className="alert alert-success">{message}</div>}
      {error && <div className="alert alert-error">{error}</div>}

      <div className="card">
        <h3 className="section-heading">1. 样本属性（应用于本批次全部照片）</h3>
        <AttributeFields form={form} lastDisease={lastDisease} updateField={updateField} />
        <button type="button" className="btn btn-secondary btn-block" onClick={handleGetLocation} disabled={loadingLocation}>
          {loadingLocation ? '定位中...' : '获取 GPS 定位'}
        </button>
        {form.latitude != null && form.longitude != null && (
          <p className="record-meta" style={{ marginTop: 8 }}>
            坐标：{form.latitude.toFixed(5)}, {form.longitude.toFixed(5)}
          </p>
        )}
      </div>

      <div className="card" style={{ marginTop: 12 }}>
        <button type="button" className="section-toggle" onClick={() => setShowNaming((v) => !v)}>
          <h3 className="section-heading">2. 文件命名规则 {showNaming ? '▾' : '▸'}</h3>
        </button>
        {showNaming && (
          <>
            <p className="record-meta">勾选要参与命名的属性，或使用自定义文件名覆盖</p>
            <div className="chip-row">
              {(Object.keys(NAMING_FIELD_LABELS) as NamingField[]).map((field) => (
                <button
                  key={field}
                  type="button"
                  className={`chip ${namingSettings.fields.includes(field) ? 'active' : ''}`}
                  onClick={() => toggleNamingField(field)}
                >
                  {NAMING_FIELD_LABELS[field]}
                </button>
              ))}
            </div>
            <div className="form-group">
              <label htmlFor="customPrefix">名称前缀</label>
              <input
                id="customPrefix"
                value={namingSettings.customPrefix}
                onChange={(e) => setNamingSettings((s) => ({ ...s, customPrefix: e.target.value }))}
                placeholder="例如：dataset01"
              />
            </div>
            <div className="form-group">
              <label htmlFor="customSuffix">名称后缀</label>
              <input
                id="customSuffix"
                value={namingSettings.customSuffix}
                onChange={(e) => setNamingSettings((s) => ({ ...s, customSuffix: e.target.value }))}
                placeholder="例如：field_A"
              />
            </div>
            <div className="form-group">
              <label htmlFor="customFileName">自定义文件名（覆盖规则）</label>
              <input
                id="customFileName"
                value={form.customFileName}
                onChange={(e) => updateField('customFileName', e.target.value)}
                placeholder="填写后所有照片使用同一名称前缀"
              />
            </div>
            <div className="name-preview">
              <span className="detail-label">下一张预览</span>
              <span className="detail-value">{namePreview}</span>
            </div>
          </>
        )}
        {!showNaming && (
          <div className="name-preview compact">
            <span className="detail-label">命名预览</span>
            <span className="detail-value">{namePreview}</span>
          </div>
        )}
      </div>

      <div className="card" style={{ marginTop: 12 }}>
        <h3 className="section-heading">3. 连续拍照（已拍 {sessionPhotos.length} 张）</h3>
        <p className="record-meta">{getPhoneSaveHint()}</p>

        <div className="burst-actions">
          <button type="button" className="btn btn-accent btn-block burst-btn" onClick={handleBurstCapture} disabled={loadingPhoto}>
            {loadingPhoto ? '拍摄中...' : '📷 继续拍照'}
          </button>
          <button type="button" className="btn btn-secondary btn-block" onClick={handlePickPhoto} disabled={loadingPhoto}>
            从相册添加
          </button>
        </div>

        {sessionPhotos.length > 0 ? (
          <div className="photo-grid">
            {sessionPhotos.map((photo) => (
              <div key={photo.id} className="photo-grid-item">
                <img src={photo.dataUrl} alt={photo.fileName} />
                <div className="photo-grid-meta">
                  <span className="photo-index">#{photo.index}</span>
                  <span className="photo-name" title={photo.fileName}>
                    {photo.fileName}
                  </span>
                </div>
                <button type="button" className="photo-remove" onClick={() => handleRemovePhoto(photo.id)}>
                  删除
                </button>
              </div>
            ))}
          </div>
        ) : (
          <div className="empty-state">设置属性后，点击「继续拍照」开始连续采集</div>
        )}

        <button
          type="button"
          className="btn btn-primary btn-block"
          style={{ marginTop: 16 }}
          disabled={saving || sessionPhotos.length === 0}
          onClick={handleSaveBatch}
        >
          {saving ? '保存中...' : `保存 ${sessionPhotos.length} 张到手机`}
        </button>
      </div>
    </section>
  );
}

interface AttributeFieldsProps {
  form: FruitFormData;
  lastDisease: string | null;
  updateField: <K extends keyof FruitFormData>(key: K, value: FruitFormData[K]) => void;
}

function AttributeFields({ form, lastDisease, updateField }: AttributeFieldsProps) {
  const diseaseOptions = form.category ? getDiseasesForFruit(form.category) : [];

  const handleCategoryChange = (category: string) => {
    updateField('category', category);
    updateField('disease', lastDisease ? PREVIOUS_DISEASE_VALUE : '');
  };

  return (
    <>
      <div className="form-group">
        <label htmlFor="category">水果种类 *</label>
        <select
          id="category"
          value={form.category}
          onChange={(e) => handleCategoryChange(e.target.value)}
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

      {form.category && (
        <div className="form-group">
          <label htmlFor="disease">病害类型</label>
          <select
            id="disease"
            value={form.disease}
            onChange={(e) => updateField('disease', e.target.value)}
          >
            <option value="">请选择</option>
            <option value={UNKNOWN_DISEASE}>未知（不清楚具体病害）</option>
            <option value={PREVIOUS_DISEASE_VALUE}>{formatPreviousDiseaseLabel(lastDisease)}</option>
            {diseaseOptions.map((disease) => (
              <option key={disease} value={disease}>
                {disease}
              </option>
            ))}
          </select>
          <p className="record-meta" style={{ marginTop: 6 }}>
            不清楚病害可选「未知」；若与上一张相同，可选「上一个病害」快速沿用
          </p>
        </div>
      )}
      <div className="form-group">
        <label htmlFor="fruitName">样本名称</label>
        <input
          id="fruitName"
          value={form.fruitName}
          onChange={(e) => updateField('fruitName', e.target.value)}
          placeholder="例如：台农芒果"
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
          placeholder="批次说明、拍摄环境等"
        />
      </div>
    </>
  );
}
