import { Button, Tooltip } from 'antd';
import { StarOutlined, StarFilled, LoadingOutlined } from '@ant-design/icons';
import type { CSSProperties } from 'react';

interface FavoriteButtonProps {
  stockCode: string;
  isFavorited: boolean;
  onToggle: () => void;
  loading?: boolean;
}

export function FavoriteButton({ stockCode, isFavorited, onToggle, loading = false }: FavoriteButtonProps) {
  const handleClick = () => {
    if (!loading) {
      onToggle();
    }
  };

  const buttonStyle: CSSProperties = {
    border: isFavorited ? '1px solid #faad14' : '1px solid rgba(255, 255, 255, 0.15)',
    background: isFavorited 
      ? 'linear-gradient(135deg, rgba(250, 173, 20, 0.15) 0%, rgba(250, 140, 22, 0.15) 100%)'
      : 'rgba(255, 255, 255, 0.05)',
    color: isFavorited ? '#faad14' : 'rgba(255, 255, 255, 0.65)',
    height: '36px',
    padding: '0 16px',
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
    fontWeight: 500,
    backdropFilter: 'blur(8px)',
  };

  const iconStyle: CSSProperties = {
    fontSize: '16px',
    transition: 'transform 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
  };

  return (
    <Tooltip title={isFavorited ? '取消收藏' : '添加到收藏'}>
      <Button
        onClick={handleClick}
        disabled={loading}
        style={buttonStyle}
        className="favorite-button"
        aria-label={isFavorited ? '取消收藏' : '添加到收藏'}
        icon={
          loading ? (
            <LoadingOutlined />
          ) : isFavorited ? (
            <StarFilled style={{ ...iconStyle, color: '#faad14' }} />
          ) : (
            <StarOutlined style={iconStyle} />
          )
        }
      >
        {isFavorited ? '已收藏' : '收藏'}
      </Button>
    </Tooltip>
  );
}
