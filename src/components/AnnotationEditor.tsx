import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { normalizedToPixelBox, pixelBoxToNormalized, type AnnotationBox } from '../annotation';

interface AnnotationEditorProps {
  imageSrc: string;
  classOptions: string[];
  defaultClass: string;
  initialBoxes?: AnnotationBox[];
  initialWidth?: number;
  initialHeight?: number;
  onSave: (boxes: AnnotationBox[], imageWidth: number, imageHeight: number) => void;
  onCancel: () => void;
}

interface DragState {
  startX: number;
  startY: number;
  currentX: number;
  currentY: number;
}

const BOX_COLORS = ['#4CAF50', '#2196F3', '#FF9800', '#E91E63', '#9C27B0', '#00BCD4'];

export default function AnnotationEditor({
  imageSrc,
  classOptions,
  defaultClass,
  initialBoxes = [],
  initialWidth,
  initialHeight,
  onSave,
  onCancel,
}: AnnotationEditorProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const imgRef = useRef<HTMLImageElement>(null);
  const [naturalSize, setNaturalSize] = useState({ width: initialWidth ?? 0, height: initialHeight ?? 0 });
  const [displaySize, setDisplaySize] = useState({ width: 0, height: 0 });
  const [boxes, setBoxes] = useState<AnnotationBox[]>(initialBoxes);
  const [activeClass, setActiveClass] = useState(defaultClass || classOptions[0] || '目标');
  const [drag, setDrag] = useState<DragState | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const scale = useMemo(() => {
    if (!naturalSize.width || !displaySize.width) {
      return 1;
    }
    return displaySize.width / naturalSize.width;
  }, [naturalSize.width, displaySize.width]);

  const updateDisplaySize = useCallback(() => {
    const img = imgRef.current;
    if (!img) {
      return;
    }
    setDisplaySize({ width: img.clientWidth, height: img.clientHeight });
  }, []);

  useEffect(() => {
    const img = imgRef.current;
    if (!img) {
      return;
    }
    const onLoad = () => {
      setNaturalSize({ width: img.naturalWidth, height: img.naturalHeight });
      updateDisplaySize();
    };
    if (img.complete) {
      onLoad();
    }
    img.addEventListener('load', onLoad);
    window.addEventListener('resize', updateDisplaySize);
    return () => {
      img.removeEventListener('load', onLoad);
      window.removeEventListener('resize', updateDisplaySize);
    };
  }, [imageSrc, updateDisplaySize]);

  const toImageCoords = (clientX: number, clientY: number) => {
    const rect = imgRef.current?.getBoundingClientRect();
    if (!rect || !naturalSize.width) {
      return { x: 0, y: 0 };
    }
    const x = Math.min(Math.max(clientX - rect.left, 0), rect.width);
    const y = Math.min(Math.max(clientY - rect.top, 0), rect.height);
    return {
      x: (x / rect.width) * naturalSize.width,
      y: (y / rect.height) * naturalSize.height,
    };
  };

  const handlePointerDown = (event: React.PointerEvent) => {
    if (!naturalSize.width) {
      return;
    }
    const { x, y } = toImageCoords(event.clientX, event.clientY);
    setSelectedId(null);
    setDrag({ startX: x, startY: y, currentX: x, currentY: y });
    (event.target as HTMLElement).setPointerCapture?.(event.pointerId);
  };

  const handlePointerMove = (event: React.PointerEvent) => {
    if (!drag) {
      return;
    }
    const { x, y } = toImageCoords(event.clientX, event.clientY);
    setDrag({ ...drag, currentX: x, currentY: y });
  };

  const handlePointerUp = () => {
    if (!drag || !naturalSize.width) {
      setDrag(null);
      return;
    }
    const xmin = Math.min(drag.startX, drag.currentX);
    const ymin = Math.min(drag.startY, drag.currentY);
    const xmax = Math.max(drag.startX, drag.currentX);
    const ymax = Math.max(drag.startY, drag.currentY);
    if (xmax - xmin > 8 && ymax - ymin > 8) {
      const norm = pixelBoxToNormalized(xmin, ymin, xmax, ymax, naturalSize.width, naturalSize.height);
      const next: AnnotationBox = {
        id: uuidv4(),
        className: activeClass,
        ...norm,
      };
      setBoxes((prev) => [...prev, next]);
      setSelectedId(next.id);
    }
    setDrag(null);
  };

  const removeBox = (id: string) => {
    setBoxes((prev) => prev.filter((b) => b.id !== id));
    if (selectedId === id) {
      setSelectedId(null);
    }
  };

  const renderBox = (box: AnnotationBox, index: number, isDraft = false) => {
    const { xmin, ymin, xmax, ymax } = normalizedToPixelBox(box, naturalSize.width, naturalSize.height);
    const color = BOX_COLORS[index % BOX_COLORS.length];
    const left = xmin * scale;
    const top = ymin * scale;
    const width = (xmax - xmin) * scale;
    const height = (ymax - ymin) * scale;
    return (
      <div
        key={box.id}
        className={`anno-box ${selectedId === box.id ? 'selected' : ''} ${isDraft ? 'draft' : ''}`}
        style={{ left, top, width, height, borderColor: color }}
        onClick={(e) => {
          e.stopPropagation();
          if (!isDraft) {
            setSelectedId(box.id);
          }
        }}
      >
        {!isDraft && (
          <span className="anno-label" style={{ background: color }}>
            {box.className}
          </span>
        )}
      </div>
    );
  };

  const draftBox = useMemo(() => {
    if (!drag || !naturalSize.width) {
      return null;
    }
    const xmin = Math.min(drag.startX, drag.currentX);
    const ymin = Math.min(drag.startY, drag.currentY);
    const xmax = Math.max(drag.startX, drag.currentX);
    const ymax = Math.max(drag.startY, drag.currentY);
    const norm = pixelBoxToNormalized(xmin, ymin, xmax, ymax, naturalSize.width, naturalSize.height);
    return { id: 'draft', className: activeClass, ...norm };
  }, [drag, naturalSize.width, naturalSize.height, activeClass]);

  return (
    <div className="anno-editor" ref={containerRef}>
      <div className="anno-toolbar">
        <h3 className="anno-title">框选标注（YOLO / LabelImg）</h3>
        <p className="record-meta">在图片上拖拽绘制矩形框，选择类别后保存</p>
        <div className="form-group">
          <label htmlFor="anno-class">当前类别</label>
          <select id="anno-class" value={activeClass} onChange={(e) => setActiveClass(e.target.value)}>
            {classOptions.map((name) => (
              <option key={name} value={name}>
                {name}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div
        className="anno-stage"
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
      >
        <img ref={imgRef} src={imageSrc} alt="标注" className="anno-image" draggable={false} />
        <div className="anno-overlay">
          {boxes.map((box, index) => renderBox(box, index))}
          {draftBox && renderBox(draftBox, boxes.length, true)}
        </div>
      </div>

      <div className="anno-list">
        <div className="anno-list-header">
          <span>已标注 {boxes.length} 个目标</span>
          {boxes.length > 0 && (
            <button type="button" className="btn btn-secondary btn-sm" onClick={() => setBoxes([])}>
              清空
            </button>
          )}
        </div>
        {boxes.length === 0 ? (
          <p className="record-meta">暂无标注框，可在图上拖拽添加</p>
        ) : (
          boxes.map((box, index) => (
            <div key={box.id} className={`anno-list-item ${selectedId === box.id ? 'selected' : ''}`}>
              <span className="anno-dot" style={{ background: BOX_COLORS[index % BOX_COLORS.length] }} />
              <span className="anno-list-name">{box.className}</span>
              <span className="anno-list-coord">
                {(box.w * 100).toFixed(1)}% × {(box.h * 100).toFixed(1)}%
              </span>
              <button type="button" className="anno-delete" onClick={() => removeBox(box.id)}>
                删除
              </button>
            </div>
          ))
        )}
      </div>

      <div className="action-row">
        <button type="button" className="btn btn-secondary" onClick={onCancel}>
          取消
        </button>
        <button
          type="button"
          className="btn btn-primary btn-block"
          onClick={() => onSave(boxes, naturalSize.width, naturalSize.height)}
          disabled={!naturalSize.width}
        >
          保存标注
        </button>
      </div>
    </div>
  );
}
