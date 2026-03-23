import React, { useState, useEffect, useRef } from 'react';
import {
  ZoomInOutlined,
  ZoomOutOutlined,
  ExpandOutlined,
  DownloadOutlined,
  InfoCircleOutlined,
  CloseOutlined,
  LeftOutlined,
  RightOutlined,
  EnvironmentOutlined,
  UserOutlined,
} from '@ant-design/icons';
import { Typography, Avatar } from 'antd';

const { Text } = Typography;

interface Photo {
  id: number;
  url: string;
  thumbnail: string;
  filename: string;
  uploader: string;
  uploaderUnit: string;
  uploadTime: string;
  timeAgo: string;
  fileSize: string;
  dimensions: string;
  format: string;
  location: string;
  coordinates: string;
  tags: { label: string; color: string; textColor: string }[];
}

interface FullscreenPhotoViewerProps {
  photo: Photo;
  photos: Photo[];
  onClose: () => void;
  onDownload: (photo: Photo) => void;
}

const FullscreenPhotoViewer: React.FC<FullscreenPhotoViewerProps> = ({
  photo,
  photos,
  onClose,
  onDownload,
}) => {
  const [currentIndex, setCurrentIndex] = useState(photos.findIndex((p) => p.id === photo.id));
  const [showInfo, setShowInfo] = useState(false);
  const [zoom, setZoom] = useState(1);
  const [isNativeFullscreen, setIsNativeFullscreen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const current = photos[currentIndex];

  const goNext = () => { setCurrentIndex((i) => (i + 1) % photos.length); setZoom(1); };
  const goPrev = () => { setCurrentIndex((i) => (i - 1 + photos.length) % photos.length); setZoom(1); };
  const zoomIn = () => setZoom((z) => Math.min(z + 0.25, 3));
  const zoomOut = () => setZoom((z) => Math.max(z - 0.25, 0.5));

  const toggleNativeFullscreen = () => {
    if (!document.fullscreenElement) {
      containerRef.current?.requestFullscreen();
    } else {
      document.exitFullscreen();
    }
  };

  useEffect(() => {
    const onFSChange = () => setIsNativeFullscreen(!!document.fullscreenElement);
    document.addEventListener('fullscreenchange', onFSChange);
    return () => document.removeEventListener('fullscreenchange', onFSChange);
  }, []);

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'ArrowRight') goNext();
      if (e.key === 'ArrowLeft') goPrev();
      if (e.key === 'Escape' && !document.fullscreenElement) onClose();
      if (e.key === 'i' || e.key === 'I') setShowInfo((v) => !v);
      if (e.key === 'f' || e.key === 'F') toggleNativeFullscreen();
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  });

  const circleBtn: React.CSSProperties = {
    width: 38,
    height: 38,
    borderRadius: '50%',
    background: 'rgba(60,60,60,0.85)',
    border: 'none',
    color: '#fff',
    fontSize: 16,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    cursor: 'pointer',
    flexShrink: 0,
  };

  const navBtn: React.CSSProperties = {
    width: 44,
    height: 44,
    borderRadius: '50%',
    background: 'rgba(60,60,60,0.75)',
    border: 'none',
    color: '#fff',
    fontSize: 18,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    cursor: 'pointer',
  };

  const INFO_WIDTH = 320;

  return (
    <div
      ref={containerRef}
      style={{ position: 'fixed', inset: 0, background: '#0d0d0d', zIndex: 1100, display: 'flex', flexDirection: 'column' }}
    >
      {/* ── Top bar ── */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 20px', flexShrink: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <Text style={{ color: '#9ca3af', fontSize: 13 }}>{currentIndex + 1} / {photos.length}</Text>
          <span style={{ color: '#4b5563' }}>·</span>
          <Text style={{ color: '#fff', fontSize: 13, fontWeight: 500 }}>{current.filename}</Text>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button style={circleBtn} onClick={() => onDownload(current)} title="Download"><DownloadOutlined /></button>
          <button
            style={{ ...circleBtn, background: showInfo ? 'rgba(124,58,237,0.8)' : 'rgba(60,60,60,0.85)' }}
            onClick={() => setShowInfo((v) => !v)} title="Photo info (I)"
          ><InfoCircleOutlined /></button>
          <button style={circleBtn} onClick={onClose} title="Close (ESC)"><CloseOutlined /></button>
        </div>
      </div>

      {/* ── Main area ── */}
      <div style={{ flex: 1, position: 'relative', display: 'flex', overflow: 'hidden', minHeight: 0 }}>

        {/* Image area */}
        <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative', overflow: 'hidden' }}>
          {photos.length > 1 && (
            <button style={{ ...navBtn, position: 'absolute', left: 20, zIndex: 2 }} onClick={goPrev}><LeftOutlined /></button>
          )}

          <img
            src={current.url}
            alt={current.filename}
            style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain', transform: `scale(${zoom})`, transition: 'transform 0.2s ease', userSelect: 'none' }}
          />

          {photos.length > 1 && (
            <button style={{ ...navBtn, position: 'absolute', right: 20, zIndex: 2 }} onClick={goNext}><RightOutlined /></button>
          )}

          {/* Zoom controls */}
          <div style={{ position: 'absolute', right: 20, bottom: 60, display: 'flex', flexDirection: 'column', gap: 8, zIndex: 2 }}>
            <button style={circleBtn} onClick={zoomIn} title="Zoom in"><ZoomInOutlined /></button>
            <button style={circleBtn} onClick={zoomOut} title="Zoom out"><ZoomOutOutlined /></button>
            <button
              style={{ ...circleBtn, background: isNativeFullscreen ? 'rgba(124,58,237,0.8)' : 'rgba(60,60,60,0.85)' }}
              onClick={toggleNativeFullscreen} title="Toggle fullscreen (F)"
            ><ExpandOutlined /></button>
          </div>

          {/* Keyboard hint */}
          <div style={{ position: 'absolute', bottom: 16, left: 20, pointerEvents: 'none' }}>
            <Text style={{ color: 'rgba(255,255,255,0.25)', fontSize: 11 }}>
              Use ← → to navigate, ESC to close, I for info, F for fullscreen
            </Text>
          </div>
        </div>

        {/* ── Info panel — WHITE, slides in from right ── */}
        {showInfo && (
          <div style={{
            width: INFO_WIDTH,
            flexShrink: 0,
            background: '#ffffff',
            borderLeft: '1px solid #e5e7eb',
            overflowY: 'auto',
            display: 'flex',
            flexDirection: 'column',
          }}>
            {/* File Details */}
            <div style={{ padding: '20px 20px 0' }}>
              <Text style={{ fontWeight: 700, fontSize: 15, color: '#111827', display: 'block', marginBottom: 16 }}>
                File Details
              </Text>
              {[
                { label: 'Filename:', value: current.filename, mono: true },
                { label: 'Size:', value: current.fileSize },
                { label: 'Format:', value: current.format },
                { label: 'Upload time:', value: current.uploadTime },
              ].map(({ label, value, mono }) => (
                <div key={label} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                  <Text style={{ color: '#6b7280', fontSize: 13 }}>{label}</Text>
                  <Text style={{ color: '#111827', fontSize: 13, fontFamily: mono ? 'monospace' : undefined, fontWeight: 500 }}>
                    {value}
                  </Text>
                </div>
              ))}
            </div>

            <div style={{ height: 1, background: '#f3f4f6', margin: '8px 0' }} />

            {/* Uploaded By */}
            <div style={{ padding: '12px 20px' }}>
              <Text style={{ fontWeight: 700, fontSize: 15, color: '#111827', display: 'block', marginBottom: 12 }}>
                Uploaded By
              </Text>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <Avatar size={38} style={{ background: '#ede9fe', color: '#7c3aed', flexShrink: 0 }} icon={<UserOutlined />} />
                <div>
                  <Text style={{ fontWeight: 600, fontSize: 13, color: '#111827', display: 'block' }}>{current.uploader}</Text>
                  <Text style={{ fontSize: 12, color: '#6b7280' }}>{current.uploaderUnit}</Text>
                </div>
              </div>
            </div>

            <div style={{ height: 1, background: '#f3f4f6', margin: '4px 0' }} />

            {/* Address */}
            <div style={{ padding: '12px 20px' }}>
              <Text style={{ fontWeight: 700, fontSize: 15, color: '#111827', display: 'block', marginBottom: 12 }}>
                Address
              </Text>
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8 }}>
                <EnvironmentOutlined style={{ color: '#6b7280', marginTop: 2 }} />
                <Text style={{ fontSize: 13, color: '#111827' }}>{current.location}</Text>
              </div>
            </div>

            <div style={{ height: 1, background: '#f3f4f6', margin: '4px 0' }} />

            {/* Spacer */}
            <div style={{ flex: 1 }} />

            {/* Action buttons */}
            <div style={{ padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: 10, borderTop: '1px solid #f3f4f6' }}>
              <button
                style={{ width: '100%', padding: '11px', background: '#3b82f6', color: '#fff', border: 'none', borderRadius: 10, fontSize: 14, fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}
                onClick={() => onDownload(current)}
              >
                <DownloadOutlined /> Download Original
              </button>
            </div>
          </div>
        )}
      </div>

      {/* ── Filmstrip ── */}
      {photos.length > 1 && (
        <div style={{ display: 'flex', gap: 8, padding: '10px 20px', overflowX: 'auto', borderTop: '1px solid rgba(255,255,255,0.07)', flexShrink: 0, alignItems: 'center', justifyContent: 'center' }}>
          {photos.map((p, idx) => (
            <div
              key={p.id}
              onClick={() => { setCurrentIndex(idx); setZoom(1); }}
              style={{ width: 56, height: 38, borderRadius: 6, overflow: 'hidden', cursor: 'pointer', flexShrink: 0, border: idx === currentIndex ? '2px solid #a78bfa' : '2px solid transparent', opacity: idx === currentIndex ? 1 : 0.45, transition: 'opacity 0.15s, border-color 0.15s' }}
            >
              <img src={p.thumbnail} alt={p.filename} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default FullscreenPhotoViewer;