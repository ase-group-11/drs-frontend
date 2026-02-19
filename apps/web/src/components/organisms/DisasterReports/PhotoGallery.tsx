// NEW FILE
import React, { useState } from 'react';
import {
  Button,
  Card,
  Tag,
  Space,
  Typography,
  Tooltip,
  Empty,
  message,
  Upload,
} from 'antd';
import {
  ArrowLeftOutlined,
  EnvironmentOutlined,
  CalendarOutlined,
  CameraOutlined,
  AppstoreOutlined,
  UnorderedListOutlined,
  UploadOutlined,
  ExpandOutlined,
  DownloadOutlined,
  MoreOutlined,
  EyeOutlined,
} from '@ant-design/icons';
import type { DisasterReport } from '../../../types';
import FullscreenPhotoViewer from './FullscreenPhotoViewer';
import './PhotoGallery.css';

const { Text } = Typography;

// FALLBACK DUMMY DATA — remove or replace when API is live
const DUMMY_PHOTOS = [
  {
    id: 1,
    url: 'https://images.unsplash.com/photo-1563482054276-6c7db99c0e32?w=600&h=400&fit=crop',
    thumbnail: 'https://images.unsplash.com/photo-1563482054276-6c7db99c0e32?w=300&h=200&fit=crop',
    filename: 'evidence_001.jpg',
    uploader: 'Officer Sarah Connor',
    uploadTime: '14:35',
    timeAgo: '10 mins ago',
    fileSize: '2.4 MB',
    dimensions: '1920×1080',
  },
  {
    id: 2,
    url: 'https://images.unsplash.com/photo-1509130298739-651801c76e96?w=600&h=400&fit=crop',
    thumbnail: 'https://images.unsplash.com/photo-1509130298739-651801c76e96?w=300&h=200&fit=crop',
    filename: 'evidence_002.jpg',
    uploader: 'Officer John Smith',
    uploadTime: '14:28',
    timeAgo: '17 mins ago',
    fileSize: '3.1 MB',
    dimensions: '1920×1080',
  },
  {
    id: 3,
    url: 'https://images.unsplash.com/photo-1494386346843-e12284507169?w=600&h=400&fit=crop',
    thumbnail: 'https://images.unsplash.com/photo-1494386346843-e12284507169?w=300&h=200&fit=crop',
    filename: 'evidence_003.jpg',
    uploader: 'Officer Sarah Connor',
    uploadTime: '14:22',
    timeAgo: '23 mins ago',
    fileSize: '1.8 MB',
    dimensions: '1920×1080',
  },
  {
    id: 4,
    url: 'https://images.unsplash.com/photo-1577962917302-cd874c4e31d2?w=600&h=400&fit=crop',
    thumbnail: 'https://images.unsplash.com/photo-1577962917302-cd874c4e31d2?w=300&h=200&fit=crop',
    filename: 'evidence_004.jpg',
    uploader: 'Fire Unit F-12',
    uploadTime: '14:15',
    timeAgo: '30 mins ago',
    fileSize: '2.9 MB',
    dimensions: '1920×1080',
  },
];

const TYPE_COLORS: Record<string, { bg: string; text: string }> = {
  fire: { bg: '#fef2f2', text: '#dc2626' },
  flood: { bg: '#eff6ff', text: '#2563eb' },
  accident: { bg: '#fff7ed', text: '#ea580c' },
  storm: { bg: '#f9fafb', text: '#6b7280' },
};

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

interface PhotoGalleryProps {
  report: DisasterReport;
  onBack: () => void;
}

const PhotoGallery: React.FC<PhotoGalleryProps> = ({ report, onBack }) => {
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [photos] = useState<Photo[]>(DUMMY_PHOTOS);
  const [fullscreenPhoto, setFullscreenPhoto] = useState<Photo | null>(null);

  const typeColor = TYPE_COLORS[report.type] || TYPE_COLORS.storm;

  const handleDownload = (photo: Photo) => {
    message.info(`Downloading ${photo.filename}...`);
    // Wire to download API endpoint when ready
  };

  const handleUpload = () => {
    message.info('Upload functionality — wire to API when ready');
  };

  return (
    <div className="gallery-container">
      {/* Header */}
      <div className="gallery-header">
        <Button
          icon={<ArrowLeftOutlined />}
          type="text"
          onClick={onBack}
          className="gallery-back-btn"
        >
          Back to Reports
        </Button>

        <div className="gallery-title-row">
          <div className="gallery-title-left">
            <Tag
              style={{
                color: typeColor.text,
                background: typeColor.bg,
                border: `1px solid ${typeColor.text}30`,
                fontWeight: 600,
                fontSize: 12,
                textTransform: 'capitalize',
              }}
            >
              <CameraOutlined style={{ marginRight: 4 }} />
              {report.type}
            </Tag>
            <h1 className="gallery-title">Photo Evidence</h1>
            <Text type="secondary" style={{ fontSize: 13 }}>
              {report.reportId}
            </Text>
          </div>

          <Space>
            <Button.Group>
              <Button
                type={viewMode === 'grid' ? 'primary' : 'default'}
                icon={<AppstoreOutlined />}
                onClick={() => setViewMode('grid')}
                style={viewMode === 'grid' ? { background: '#7c3aed', borderColor: '#7c3aed' } : {}}
              />
              <Button
                type={viewMode === 'list' ? 'primary' : 'default'}
                icon={<UnorderedListOutlined />}
                onClick={() => setViewMode('list')}
                style={viewMode === 'list' ? { background: '#7c3aed', borderColor: '#7c3aed' } : {}}
              />
            </Button.Group>
            <Button icon={<UploadOutlined />} onClick={handleUpload}>
              Upload Photo
            </Button>
          </Space>
        </div>

        <div className="gallery-meta">
          <Space size={16}>
            <span className="gallery-meta-item">
              <EnvironmentOutlined style={{ color: '#6b7280', marginRight: 4 }} />
              <Text type="secondary">{report.location}</Text>
            </span>
            <span className="gallery-meta-item">
              <CalendarOutlined style={{ color: '#6b7280', marginRight: 4 }} />
              <Text type="secondary">{report.time}</Text>
            </span>
            <span className="gallery-meta-item">
              <CameraOutlined style={{ color: '#6b7280', marginRight: 4 }} />
              <Text type="secondary">{photos.length} photos</Text>
            </span>
          </Space>
        </div>
      </div>

      {/* Gallery Content */}
      {photos.length === 0 ? (
        <Empty description="No photos uploaded yet" style={{ padding: '60px 0' }} />
      ) : viewMode === 'grid' ? (
        <div className="gallery-grid">
          {photos.map((photo) => (
            <Card
              key={photo.id}
              className="gallery-photo-card"
              cover={
                <div className="gallery-photo-wrapper">
                  <img
                    src={photo.thumbnail}
                    alt={photo.filename}
                    className="gallery-photo-img"
                  />
                  <div className="gallery-photo-overlay">
                    <Space>
                      <Tooltip title="View fullscreen">
                        <Button
                          type="text"
                          icon={<ExpandOutlined />}
                          className="gallery-overlay-btn"
                          onClick={() => setFullscreenPhoto(photo)}
                        />
                      </Tooltip>
                      <Tooltip title="Download">
                        <Button
                          type="text"
                          icon={<DownloadOutlined />}
                          className="gallery-overlay-btn"
                          onClick={() => handleDownload(photo)}
                        />
                      </Tooltip>
                    </Space>
                  </div>
                </div>
              }
              size="small"
              bodyStyle={{ padding: '10px 12px' }}
            >
              <div className="gallery-card-body">
                <Text
                  strong
                  style={{ fontSize: 12, display: 'block', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}
                >
                  {photo.filename}
                </Text>
                <Text type="secondary" style={{ fontSize: 11 }}>
                  {photo.uploader}
                </Text>
                <div className="gallery-card-meta">
                  <Text type="secondary" style={{ fontSize: 11 }}>{photo.timeAgo}</Text>
                  <Text type="secondary" style={{ fontSize: 11 }}>{photo.fileSize}</Text>
                </div>
              </div>
            </Card>
          ))}
        </div>
      ) : (
        <Card className="gallery-list-card">
          {photos.map((photo, idx) => (
            <React.Fragment key={photo.id}>
              <div className="gallery-list-row">
                <div className="gallery-list-thumb" onClick={() => setFullscreenPhoto(photo)}>
                  <img src={photo.thumbnail} alt={photo.filename} className="gallery-list-img" />
                  <div className="gallery-list-thumb-overlay">
                    <EyeOutlined style={{ color: '#fff' }} />
                  </div>
                </div>
                <div className="gallery-list-info">
                  <Text strong style={{ fontSize: 13 }}>{photo.filename}</Text>
                  <div className="gallery-list-meta">
                    <Text type="secondary" style={{ fontSize: 12 }}>{photo.uploader}</Text>
                    <span className="gallery-list-dot">·</span>
                    <Text type="secondary" style={{ fontSize: 12 }}>{photo.uploadTime}</Text>
                    <span className="gallery-list-dot">·</span>
                    <Text type="secondary" style={{ fontSize: 12 }}>{photo.fileSize}</Text>
                    <span className="gallery-list-dot">·</span>
                    <Text type="secondary" style={{ fontSize: 12 }}>{photo.dimensions}</Text>
                  </div>
                </div>
                <Space size={4}>
                  <Tooltip title="View fullscreen">
                    <Button
                      type="text"
                      size="small"
                      icon={<ExpandOutlined />}
                      onClick={() => setFullscreenPhoto(photo)}
                    />
                  </Tooltip>
                  <Tooltip title="Download">
                    <Button
                      type="text"
                      size="small"
                      icon={<DownloadOutlined />}
                      onClick={() => handleDownload(photo)}
                    />
                  </Tooltip>
                </Space>
              </div>
              {idx < photos.length - 1 && <div className="gallery-list-divider" />}
            </React.Fragment>
          ))}
        </Card>
      )}

      {/* Fullscreen Viewer */}
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
