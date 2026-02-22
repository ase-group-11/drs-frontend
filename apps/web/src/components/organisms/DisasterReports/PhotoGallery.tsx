import React, { useState } from 'react';
import {
  Button,
  Typography,
  Empty,
  message,
  Dropdown,
} from 'antd';
import {
  ArrowLeftOutlined,
  EyeOutlined,
  MoreOutlined,
  DeleteOutlined,
} from '@ant-design/icons';
import type { DisasterReport } from '../../../types';
import FullscreenPhotoViewer from './FullscreenPhotoViewer';
import './PhotoGallery.css';

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

const DUMMY_PHOTOS: Photo[] = [
  {
    id: 1,
    url: 'https://images.unsplash.com/photo-1563482054276-6c7db99c0e32?w=800&h=600&fit=crop',
    thumbnail: 'https://images.unsplash.com/photo-1563482054276-6c7db99c0e32?w=300&h=200&fit=crop',
    filename: 'evidence_001.jpg',
    uploader: 'Officer Sarah Connor',
    uploaderUnit: 'Fire Unit F-12',
    uploadTime: '14:35',
    timeAgo: '10 mins ago',
    fileSize: '2.4 MB',
    dimensions: '1920×1080',
    format: 'JPEG',
    location: 'Grafton Street, Dublin 2',
    coordinates: '53.3456, −6.2608',
    tags: [
      { label: 'Evidence', color: '#ede9fe', textColor: '#7c3aed' },
      { label: 'Structural Damage', color: '#fff7ed', textColor: '#c2410c' },
      { label: 'Fire', color: '#fef2f2', textColor: '#dc2626' },
    ],
  },
  {
    id: 2,
    url: 'https://images.unsplash.com/photo-1509130298739-651801c76e96?w=800&h=600&fit=crop',
    thumbnail: 'https://images.unsplash.com/photo-1509130298739-651801c76e96?w=300&h=200&fit=crop',
    filename: 'evidence_002.jpg',
    uploader: 'Officer John Smith',
    uploaderUnit: 'Response Unit R-4',
    uploadTime: '14:28',
    timeAgo: '17 mins ago',
    fileSize: '3.1 MB',
    dimensions: '1920×1080',
    format: 'JPEG',
    location: 'Grafton Street, Dublin 2',
    coordinates: '53.3456, −6.2608',
    tags: [
      { label: 'Evidence', color: '#ede9fe', textColor: '#7c3aed' },
      { label: 'Fire', color: '#fef2f2', textColor: '#dc2626' },
    ],
  },
  {
    id: 3,
    url: 'https://images.unsplash.com/photo-1494386346843-e12284507169?w=800&h=600&fit=crop',
    thumbnail: 'https://images.unsplash.com/photo-1494386346843-e12284507169?w=300&h=200&fit=crop',
    filename: 'evidence_003.jpg',
    uploader: 'Officer Sarah Connor',
    uploaderUnit: 'Fire Unit F-12',
    uploadTime: '14:22',
    timeAgo: '23 mins ago',
    fileSize: '1.8 MB',
    dimensions: '1920×1080',
    format: 'JPEG',
    location: 'Grafton Street, Dublin 2',
    coordinates: '53.3456, −6.2608',
    tags: [
      { label: 'Evidence', color: '#ede9fe', textColor: '#7c3aed' },
    ],
  },
  {
    id: 4,
    url: 'https://images.unsplash.com/photo-1577962917302-cd874c4e31d2?w=800&h=600&fit=crop',
    thumbnail: 'https://images.unsplash.com/photo-1577962917302-cd874c4e31d2?w=300&h=200&fit=crop',
    filename: 'evidence_004.jpg',
    uploader: 'Officer Mike Ryan',
    uploaderUnit: 'Fire Unit F-12',
    uploadTime: '14:15',
    timeAgo: '30 mins ago',
    fileSize: '2.9 MB',
    dimensions: '1920×1080',
    format: 'JPEG',
    location: 'Grafton Street, Dublin 2',
    coordinates: '53.3456, −6.2608',
    tags: [
      { label: 'Structural Damage', color: '#fff7ed', textColor: '#c2410c' },
      { label: 'Fire', color: '#fef2f2', textColor: '#dc2626' },
    ],
  },
];

interface PhotoGalleryProps {
  report: DisasterReport;
  onBack: () => void;
}

const PhotoGallery: React.FC<PhotoGalleryProps> = ({ report, onBack }) => {
  const [photos, setPhotos] = useState<Photo[]>(DUMMY_PHOTOS);
  const [fullscreenPhoto, setFullscreenPhoto] = useState<Photo | null>(null);
  const [hoveredId, setHoveredId] = useState<number | null>(null);

  const handleDelete = (e: React.MouseEvent, photoId: number) => {
    e.stopPropagation();
    setPhotos((prev) => prev.filter((p) => p.id !== photoId));
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
        </div>
      </div>

      {/* Gallery Grid */}
      {photos.length === 0 ? (
        <Empty description="No photos uploaded yet" style={{ padding: '60px 0' }} />
      ) : (
        <div className="gallery-grid">
          {photos.map((photo) => (
            <div
              key={photo.id}
              className="gallery-photo-card"
              onMouseEnter={() => setHoveredId(photo.id)}
              onMouseLeave={() => setHoveredId(null)}
              onClick={() => setFullscreenPhoto(photo)}
            >
              <img src={photo.thumbnail} alt={photo.filename} className="gallery-photo-img" />

              <div className="gallery-photo-gradient" />
              <div className="gallery-photo-info">
                <Text className="gallery-photo-caption">
                  Uploaded by {photo.uploader} · {photo.timeAgo} · {photo.uploadTime}
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
                  <Dropdown
                    trigger={['click']}
                    menu={{
                      items: [
                        {
                          key: 'delete',
                          label: 'Delete Photo',
                          icon: <DeleteOutlined />,
                          danger: true,
                          onClick: ({ domEvent }) => handleDelete(domEvent as React.MouseEvent, photo.id),
                        },
                      ],
                    }}
                  >
                    <button className="gallery-more-btn" onClick={(e) => e.stopPropagation()}>
                      <MoreOutlined />
                    </button>
                  </Dropdown>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {fullscreenPhoto && (
        <FullscreenPhotoViewer
          photo={fullscreenPhoto}
          photos={photos}
          onClose={() => setFullscreenPhoto(null)}
          onDownload={(p) => message.info(`Downloading ${p.filename}...`)}
        />
      )}
    </div>
  );
};

export default PhotoGallery;