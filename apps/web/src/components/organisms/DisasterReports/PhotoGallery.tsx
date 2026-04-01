import { API_ENDPOINTS } from '../../../config';
import React, { useState, useEffect, useCallback } from 'react';
import { Button, Typography, Empty, message, Spin } from 'antd';
import { ArrowLeftOutlined, EyeOutlined, PictureOutlined } from '@ant-design/icons';
import type { DisasterReport } from '../../../types';
import apiClient from '../../../lib/axios';
import FullscreenPhotoViewer from './FullscreenPhotoViewer';
import './PhotoGallery.css';

const { Text } = Typography;

// Raw API response shape
interface ApiPhoto {
  id: string;
  image_url: string;
  caption: string | null;
  file_size: number;
  mime_type: string;
  report_id: string;
  uploaded_by: string;
  report_address: string | null;
  created_at: string;
}

// Internal shape expected by FullscreenPhotoViewer (kept compatible)
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

const formatTimeAgo = (dateStr: string): string => {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins  = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days  = Math.floor(diff / 86400000);
  if (mins < 60)   return `${mins} min${mins !== 1 ? 's' : ''} ago`;
  if (hours < 24)  return `${hours} hour${hours !== 1 ? 's' : ''} ago`;
  return `${days} day${days !== 1 ? 's' : ''} ago`;
};

const formatUploadTime = (dateStr: string): string =>
  new Date(dateStr).toLocaleTimeString('en-IE', { hour: '2-digit', minute: '2-digit' });

const formatFileSize = (bytes: number): string => {
  if (bytes < 1024)       return `${bytes} B`;
  if (bytes < 1048576)    return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1048576).toFixed(1)} MB`;
};

const mapApiPhoto = (p: ApiPhoto, index: number, userNames: Record<string, string>): Photo => ({
  id:           index,
  url:          p.image_url,
  thumbnail:    p.image_url,
  filename:     p.caption || p.id,
  uploader:     userNames[p.uploaded_by] ?? p.uploaded_by,
  uploaderUnit: '',
  uploadTime:   formatUploadTime(p.created_at),
  timeAgo:      formatTimeAgo(p.created_at),
  fileSize:     formatFileSize(p.file_size),
  dimensions:   '—',
  format:       p.mime_type.split('/')[1]?.toUpperCase() ?? 'JPEG',
  location:     p.report_address ?? '—',
  coordinates:  '—',
  tags:         [],
});

interface PhotoGalleryProps {
  report: DisasterReport;
  onBack: () => void;
}

const PhotoGallery: React.FC<PhotoGalleryProps> = ({ report, onBack }) => {
  const [photos, setPhotos]               = useState<Photo[]>([]);
  const [loading, setLoading]             = useState(true);
  const [fullscreenPhoto, setFullscreenPhoto] = useState<Photo | null>(null);
  const [hoveredId, setHoveredId]         = useState<number | null>(null);

  const fetchPhotos = useCallback(async () => {
    setLoading(true);
    try {
      const res = await apiClient.get<{ photos: ApiPhoto[]; count: number }>(
        API_ENDPOINTS.ADMIN.DISASTER_PHOTOS(report.id)
      );
      const apiPhotos = res.data?.photos ?? [];

      // Fetch names for all unique uploader UUIDs in parallel
      const uniqueUploaders = Array.from(new Set(apiPhotos.map((p) => p.uploaded_by)));
      const userNames: Record<string, string> = {};
      await Promise.allSettled(
        uniqueUploaders.map(async (uid) => {
          try {
            const userRes = await apiClient.get<{ full_name: string }>(API_ENDPOINTS.USERS.BY_ID(uid));
            if (userRes.data?.full_name) userNames[uid] = userRes.data.full_name;
          } catch {
            // leave UUID as fallback
          }
        })
      );

      setPhotos(apiPhotos.map((p, i) => mapApiPhoto(p, i, userNames)));
    } catch {
      message.error('Failed to load photos');
    } finally {
      setLoading(false);
    }
  }, [report.id]);

  useEffect(() => { fetchPhotos(); }, [fetchPhotos]);

  const handleDownload = async (p: Photo) => {
    try {
      const res = await fetch(p.url);
      if (!res.ok) throw new Error('Failed to fetch');
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = p.filename || 'photo.jpg';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch {
      // Fallback: open in new tab if blob download fails (e.g. CORS)
      window.open(p.url, '_blank');
    }
  };

  return (
    <div className="gallery-container">
      {/* Header */}
      <div className="gallery-header">
        <div className="gallery-title-row">
          <div className="gallery-title-left">
            <Button
              icon={<ArrowLeftOutlined />}
              type="text"
              onClick={onBack}
              className="gallery-back-btn"
            />
            <div>
              <h1 className="gallery-title">Incident Photos</h1>
              <Text type="secondary" style={{ fontSize: 13 }}>
                Evidence and on-site imagery for {report.reportId}
              </Text>
            </div>
          </div>
          <Text type="secondary" style={{ fontSize: 13, marginLeft: 'auto' }}>
            {!loading && `${photos.length} photo${photos.length !== 1 ? 's' : ''}`}
          </Text>
        </div>
      </div>

      {/* Content */}
      {loading ? (
        <div style={{ display: 'flex', justifyContent: 'center', padding: '80px 0' }}>
          <Spin size="large" />
        </div>
      ) : photos.length === 0 ? (
        <Empty
          image={<PictureOutlined style={{ fontSize: 48, color: '#d1d5db' }} />}
          description={
            <span style={{ color: '#6b7280', fontSize: 14 }}>
              No photos uploaded for this incident yet
            </span>
          }
          style={{ padding: '60px 0' }}
        />
      ) : (
        <>
          <div className="gallery-grid">
          {photos.map((photo) => (
            <div
              key={photo.id}
              className="gallery-photo-card"
              onMouseEnter={() => setHoveredId(photo.id)}
              onMouseLeave={() => setHoveredId(null)}
              onClick={() => setFullscreenPhoto(photo)}
            >
              <img
                src={photo.url}
                alt={photo.filename}
                className="gallery-photo-img"
                onError={(e) => {
                  const target = e.currentTarget;
                  target.style.display = 'none';
                  const placeholder = target.nextElementSibling as HTMLElement;
                  if (placeholder) placeholder.style.display = 'flex';
                }}
              />
              {/* Shown when image fails to load (e.g. expired SAS URL) */}
              <div style={{
                display: 'none', position: 'absolute', inset: 0,
                background: '#f3f4f6', flexDirection: 'column',
                alignItems: 'center', justifyContent: 'center', gap: 8,
              }}>
                <span style={{ fontSize: 32 }}>🖼️</span>
                <span style={{ fontSize: 11, color: '#9ca3af', textAlign: 'center', padding: '0 12px' }}>
                  {photo.filename}
                  <br />
                  <span style={{ fontSize: 10, color: '#d1d5db' }}>Preview unavailable</span>
                </span>
              </div>

              <div className="gallery-photo-gradient" />
              <div className="gallery-photo-info">
                <Text className="gallery-photo-caption">
                  {photo.filename} · {photo.timeAgo} · {photo.uploadTime}
                </Text>
              </div>

              {hoveredId === photo.id && (
                <div className="gallery-photo-hover">
                  <button
                    className="gallery-fullscreen-btn"
                    onClick={(e) => { e.stopPropagation(); setFullscreenPhoto(photo); }}
                  >
                    <EyeOutlined style={{ marginRight: 6 }} />
                    View Fullscreen
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
        </>
      )}

      {fullscreenPhoto && (
        <FullscreenPhotoViewer
          photo={fullscreenPhoto}
          photos={photos}
          onClose={() => setFullscreenPhoto(null)}
          onDownload={handleDownload}
        />
      )}
    </div>
  );
};

export default PhotoGallery;