import { useEffect, useState } from 'react';
import { takePhoto } from '../export';
import { toCollectDiseaseLabel } from '../detection/tomatoClasses';
import { detectTomatoDisease, preloadTomatoModel, type DetectResult } from '../detection/yoloDetect';

interface DetectPageProps {
  onApplyDisease?: (disease: string, photoDataUrl: string) => void;
}

export default function DetectPage({ onApplyDisease }: DetectPageProps) {
  const [photo, setPhoto] = useState<string | null>(null);
  const [result, setResult] = useState<DetectResult | null>(null);
  const [loadingModel, setLoadingModel] = useState(true);
  const [detecting, setDetecting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [tomatoOnly, setTomatoOnly] = useState(true);
  const [conf, setConf] = useState(0.25);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        await preloadTomatoModel();
        if (!cancelled) {
          setLoadingModel(false);
        }
      } catch (err) {
        if (!cancelled) {
          setLoadingModel(false);
          setError(err instanceof Error ? err.message : '模型加载失败');
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const runDetect = async (dataUrl: string) => {
    setDetecting(true);
    setError(null);
    setResult(null);
    try {
      const res = await detectTomatoDisease(dataUrl, { conf, tomatoOnly });
      setResult(res);
    } catch (err) {
      setError(err instanceof Error ? err.message : '检测失败');
    } finally {
      setDetecting(false);
    }
  };

  const handleCapture = async (source: 'camera' | 'prompt') => {
    setError(null);
    try {
      const dataUrl = await takePhoto(source);
      setPhoto(dataUrl);
      await runDetect(dataUrl);
    } catch (err) {
      setError(err instanceof Error ? err.message : '获取图片失败');
    }
  };

  const handleApply = () => {
    if (!result?.top || !photo || !onApplyDisease) {
      return;
    }
    const disease = toCollectDiseaseLabel(result.top.className);
    onApplyDisease(disease, result.annotatedDataUrl || photo);
  };

  return (
    <section>
      <h1 className="page-title">病虫害检测</h1>
      <p className="page-subtitle">YOLOv8s 番茄叶片病害模型（best.pt → ONNX）</p>

      {loadingModel && <div className="alert alert-info">正在加载检测模型，首次约需数秒…</div>}
      {error && <div className="alert alert-error">{error}</div>}

      <div className="card">
        <h3 style={{ marginTop: 0 }}>模型说明</h3>
        <p className="record-meta" style={{ margin: 0 }}>
          基于 Ultralytics <strong>YOLOv8s</strong>，权重来自 Hugging Face `peachfawn/yolov8-plant-disease`
          的 best.pt。可识别番茄早疫病、晚疫病、叶霉病、斑枯病、黄化曲叶病毒等；默认识别番茄类别。
        </p>
        <div className="form-group" style={{ marginTop: 12 }}>
          <label>
            <input
              type="checkbox"
              checked={tomatoOnly}
              onChange={(e) => setTomatoOnly(e.target.checked)}
              style={{ marginRight: 8 }}
            />
            仅显示番茄相关结果
          </label>
        </div>
        <div className="form-group">
          <label htmlFor="conf">置信度阈值：{conf.toFixed(2)}</label>
          <input
            id="conf"
            type="range"
            min={0.1}
            max={0.8}
            step={0.05}
            value={conf}
            onChange={(e) => setConf(Number(e.target.value))}
          />
        </div>
      </div>

      <div className="card" style={{ marginTop: 12 }}>
        <div className="burst-actions">
          <button
            type="button"
            className="btn btn-accent btn-block"
            disabled={loadingModel || detecting}
            onClick={() => handleCapture('camera')}
          >
            {detecting ? '检测中…' : '拍照检测'}
          </button>
          <button
            type="button"
            className="btn btn-secondary btn-block"
            disabled={loadingModel || detecting}
            onClick={() => handleCapture('prompt')}
          >
            从相册选图检测
          </button>
        </div>

        {(result?.annotatedDataUrl || photo) && (
          <div className="detect-preview" style={{ marginTop: 12 }}>
            <img src={result?.annotatedDataUrl || photo!} alt="检测结果" />
          </div>
        )}

        {result && (
          <div style={{ marginTop: 12 }}>
            <p className="record-meta">
              推理耗时 {result.inferenceMs.toFixed(0)} ms · 检出 {result.boxes.length} 处
            </p>
            {result.boxes.length === 0 ? (
              <div className="empty-state">未检出目标，可降低置信度或换一张特写叶片图重试。</div>
            ) : (
              <ul className="detect-list">
                {result.boxes.map((box, idx) => (
                  <li key={`${box.classId}-${idx}`}>
                    <strong>{box.label}</strong>
                    <span>{(box.score * 100).toFixed(1)}%</span>
                  </li>
                ))}
              </ul>
            )}

            {result.top && onApplyDisease && (
              <button type="button" className="btn btn-primary btn-block" style={{ marginTop: 12 }} onClick={handleApply}>
                应用到采集（{toCollectDiseaseLabel(result.top.className)}）
              </button>
            )}

            {photo && (
              <button
                type="button"
                className="btn btn-secondary btn-block"
                style={{ marginTop: 8 }}
                disabled={detecting}
                onClick={() => runDetect(photo)}
              >
                用当前参数重新检测
              </button>
            )}
          </div>
        )}
      </div>
    </section>
  );
}
