import React, { useEffect, useState } from 'react';
import { WorkTimeRecord } from '../types';
import { generateFunnyTitle, generateTitleImage, TitleResult } from '../services/api';

interface TitleCardProps {
  records: WorkTimeRecord[];
}

const TitleCard: React.FC<TitleCardProps> = ({ records }) => {
  const [titleResult, setTitleResult] = useState<TitleResult | null>(null);
  const [imageUrl, setImageUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (records.length === 0) return;

    const generateTitle = async () => {
      setLoading(true);
      setError('');
      try {
        // 生成搞笑称号和鼓励/赞美语
        const result = await generateFunnyTitle(records);
        setTitleResult(result);

        // 生成图片
        const image = await generateTitleImage(result.title);
        setImageUrl(image);
      } catch (err: any) {
        console.error('生成称号/图片失败:', err);
        setError('生成失败，请重试');
      } finally {
        setLoading(false);
      }
    };

    generateTitle();
  }, [records]);

  if (records.length === 0) return null;

  return (
    <div className="card mb-4">
      <div className="card-header bg-warning text-dark">
        🏆 你的专属称号
      </div>
      <div className="card-body text-center">
        {loading ? (
          <div>
            <div className="spinner-border text-warning mb-3" role="status">
              <span className="visually-hidden">生成中...</span>
            </div>
            <p className="mb-0">正在生成你的专属称号和图片...</p>
          </div>
        ) : error ? (
          <div className="text-danger">
            <p>{error}</p>
            <button
              className="btn btn-outline-warning btn-sm"
              onClick={() => window.location.reload()}
            >
              重试
            </button>
          </div>
        ) : titleResult ? (
          <div>
            {imageUrl && (
              <img
                src={imageUrl}
                alt={titleResult.title}
                className="img-fluid rounded mb-3"
                style={{ maxWidth: '300px', maxHeight: '300px' }}
              />
            )}
            <h3 className="text-warning mb-2">{titleResult.title}</h3>
            {titleResult.message && (
              <p className="text-muted mb-0" style={{ fontSize: '0.95rem' }}>
                {titleResult.message}
              </p>
            )}
          </div>
        ) : null}
      </div>
    </div>
  );
};

export default TitleCard;
