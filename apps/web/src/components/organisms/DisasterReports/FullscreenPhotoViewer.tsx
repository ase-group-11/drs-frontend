// NEW FILE
import React, { useState } from 'react';
import { Button, Typography, Space } from 'antd';
import {
  CloseOutlined,
  LeftOutlined,
  RightOutlined,
  DownloadOutlined,
  InfoCircleOutlined,
} from '@ant-design/icons';

const { Text } = Typography;

interface Photo {
  id: number;
  url: string;
  thumbnail: string;
  filename: string;
  uploader: string;
  uploadTime: string;
  timeAgo: string;
  fileSize: string;
  dimensions: string;
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
  const [showInfo, setShowInfo] = useState(true);
  const current = photos[currentIndex];

  const goNext = () => setCurrentIndex((i) => (i + 1) % photos.length);
  const goPrev = () => setCurrentIndex((i) => (i - 1 + photos.length) % photos.length);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowRight') goNext();
    if (e.key === 'ArrowLeft') goPrev();
    if (e.key === 'Escape') onClose();
  };

  return (
    <div
      className="fsv-overlay"
      onKeyDown={handleKeyDown}
      tabIndex={0}
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(0,0,0,0.92)',
        zIndex: 1100,
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      {/* Top bar */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '14px 20px',
          borderBottom: '1px solid rgba(255,255,255,0.1)',
          flexShrink: 0,
        }}
      >
        <Text style={{ color: '#fff', fontWeight: 600, fontSize: 14 }}>
          {current.filename}
        </Text>
        <Space>
          <Text style={{ color: '#9ca3af', fontSize: 12 }}>
            {currentIndex + 1} / {photos.length}
          </Text>
          <Button
            type="text"
            icon={<InfoCircleOutlined />}
            style={{ color: showInfo ? '#a78bfa' : '#9ca3af' }}
            onClick={() => setShowInfo((v) => !v)}
          />
          <Button
            type="text"
            icon={<DownloadOutlined />}
            style={{ color: '#9ca3af' }}
            onClick={() => onDownload(current)}
          />
          <Button
            type="text"
            icon={<CloseOutlined />}
            style={{ color: '#9ca3af' }}
            onClick={onClose}
          />
        </Space>
      </div>

      {/* Main area */}
      <div
        style={{
          flex: 1,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          position: 'relative',
          overflow: 'hidden',
          minHeight: 0,
        }}
      >
        {/* Prev button */}
        {photos.length > 1 && (
          <Button
            type="text"
            icon={<LeftOutlined />}
            onClick={goPrev}
            style={{
              position: 'absolute',
              left: 16,
              color: '#fff',
              background: 'rgba(255,255,255,0.1)',
              border: 'none',
              borderRadius: '50%',
              width: 44,
              height: 44,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              zIndex: 1,
            }}
          />
        )}

        <img
          src={current.url}
          alt={current.filename}
          style={{
            maxWidth: showInfo ? 'calc(100% - 280px)' : '100%',
            maxHeight: '100%',
            objectFit: 'contain',
            transition: 'max-width 0.2s ease',
          }}
        />

        {/* Next button */}
        {photos.length > 1 && (
          <Button
            type="text"
            icon={<RightOutlined />}
            onClick={goNext}
            style={{
              position: 'absolute',
              right: showInfo ? 296 : 16,
              color: '#fff',
              background: 'rgba(255,255,255,0.1)',
              border: 'none',
              borderRadius: '50%',
              width: 44,
              height: 44,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              zIndex: 1,
              transition: 'right 0.2s ease',
            }}
          />
        )}

        {/* Info sidebar */}
        {showInfo && (
          <div
            style={{
              position: 'absolute',
              right: 0,
              top: 0,
              bottom: 0,
              width: 280,
              background: 'rgba(17,24,39,0.95)',
              borderLeft: '1px solid rgba(255,255,255,0.1)',
              padding: '20px',
              display: 'flex',
              flexDirection: 'column',
              gap: 16,
              overflowY: 'auto',
            }}
          >
            <Text style={{ color: '#fff', fontWeight: 700, fontSize: 14 }}>Photo Details</Text>
            {[
              { label: 'Filename', value: current.filename },
              { label: 'Uploaded by', value: current.uploader },
              { label: 'Upload time', value: `${current.uploadTime} (${current.timeAgo})` },
              { label: 'File size', value: current.fileSize },
              { label: 'Dimensions', value: current.dimensions },
            ].map(({ label, value }) => (
              <div key={label}>
                <Text style={{ color: '#6b7280', fontSize: 11, display: 'block', marginBottom: 2 }}>
                  {label}
                </Text>
                <Text style={{ color: '#d1d5db', fontSize: 13 }}>{value}</Text>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Filmstrip */}
      {photos.length > 1 && (
        <div
          style={{
            display: 'flex',
            gap: 6,
            padding: '12px 20px',
            overflowX: 'auto',
            borderTop: '1px solid rgba(255,255,255,0.1)',
            flexShrink: 0,
          }}
        >
          {photos.map((p, idx) => (
            <div
              key={p.id}
              onClick={() => setCurrentIndex(idx)}
              style={{
                width: 60,
                height: 40,
                borderRadius: 4,
                overflow: 'hidden',
                cursor: 'pointer',
                flexShrink: 0,
                border: idx === currentIndex ? '2px solid #a78bfa' : '2px solid transparent',
                opacity: idx === currentIndex ? 1 : 0.5,
                transition: 'opacity 0.15s, border-color 0.15s',
              }}
            >
              <img
                src={p.thumbnail}
                alt={p.filename}
                style={{ width: '100%', height: '100%', objectFit: 'cover' }}
              />
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default FullscreenPhotoViewer;
