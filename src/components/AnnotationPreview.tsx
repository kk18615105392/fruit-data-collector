import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { AnnotationBox } from '../types';

const BOX_COLORS = ['#4CAF50', '#2196F3', '#FF9800', '#E91E63', '#9C27B0', '#00BCD4'];

export interface DisplayBox {
  id: string;
  className: string;
  left: string;
  top: string;
  width: string;
  height: string;
  color: string;
}

export function boxesToDisplay(boxes: AnnotationBox[] = []): DisplayBox[] {
  return boxes.map((box, index) => ({
    id: box.id,
    className: box.className,
    left: `${((box.x - box.w / 2) * 100).toFixed(2)}%`,
    top: `${((box.y - box.h / 2) * 100).toFixed(2)}%`,
    width: `${(box.w * 100).toFixed(2)}%`,
    height: `${(box.h * 100).toFixed(2)}%`,
    color: BOX_COLORS[index % BOX_COLORS.length],
  }));
}

interface AnnotationPreviewProps {
  src: string;
  annotations?: AnnotationBox[];
  compact?: boolean;
  fixedHeight?: number | string;
  className?: string;
}

export default function AnnotationPreview({
  src,
  annotations = [],
  compact = false,
  fixedHeight,
  className = '',
}: AnnotationPreviewProps) {
  const stageRef = useRef<HTMLDivElement>(null);
  const [overlayStyle, setOverlayStyle] = useState<React.CSSProperties>({
    left: 0,
    top: 0,
    width: '100%',
    height: '100%',
  });
  const displayBoxes = useMemo(() => boxesToDisplay(annotations), [annotations]);

  const updateOverlay = useCallback((naturalWidth: number, naturalHeight: number) => {
    const stage = stageRef.current;
    if (!stage || !naturalWidth || !naturalHeight) {
      return;
    }
    const rect = stage.getBoundingClientRect();
    if (!fixedHeight) {
      setOverlayStyle({ left: 0, top: 0, width: '100%', height: '100%' });
      return;
    }
    const scale = Math.min(rect.width / naturalWidth, rect.height / naturalHeight);
    const drawW = naturalWidth * scale;
    const drawH = naturalHeight * scale;
    const offsetX = (rect.width - drawW) / 2;
    const offsetY = (rect.height - drawH) / 2;
    setOverlayStyle({
      left: offsetX,
      top: offsetY,
      width: drawW,
      height: drawH,
    });
  }, [fixedHeight]);

  useEffect(() => {
    const onResize = () => {
      const img = stageRef.current?.querySelector('img');
      if (img?.naturalWidth) {
        updateOverlay(img.naturalWidth, img.naturalHeight);
      }
    };
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, [updateOverlay]);

  const heightStyle = fixedHeight
    ? { height: typeof fixedHeight === 'number' ? `${fixedHeight}px` : fixedHeight }
    : undefined;

  return (
    <div className={`anno-preview-wrap ${compact ? 'compact' : ''} ${className}`.trim()} style={heightStyle}>
      <div className="anno-preview-stage" ref={stageRef} style={heightStyle}>
        <img
          src={src}
          alt="标注预览"
          className={`anno-preview-img ${fixedHeight ? 'fit' : 'width-fix'}`}
          style={heightStyle}
          draggable={false}
          onLoad={(e) => updateOverlay(e.currentTarget.naturalWidth, e.currentTarget.naturalHeight)}
        />
        {displayBoxes.length > 0 && (
          <div className="anno-preview-overlay" style={overlayStyle}>
            {displayBoxes.map((box) => (
              <div
                key={box.id}
                className="anno-preview-box"
                style={{
                  left: box.left,
                  top: box.top,
                  width: box.width,
                  height: box.height,
                  borderColor: box.color,
                }}
              >
                <span className="anno-preview-label" style={{ background: box.color }}>
                  {box.className}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
