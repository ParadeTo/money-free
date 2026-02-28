import { List, Typography, Space, Button, Empty, Skeleton, Tooltip } from 'antd';
import { DeleteOutlined, LineChartOutlined, DragOutlined } from '@ant-design/icons';
import { DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors, DragEndEvent } from '@dnd-kit/core';
import { arrayMove, SortableContext, sortableKeyboardCoordinates, useSortable, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import type { FavoriteWithDetails } from '../../services/favorite.service';
import type { CSSProperties } from 'react';

const { Text, Title } = Typography;

interface FavoriteListProps {
  favorites: FavoriteWithDetails[];
  loading?: boolean;
  onRemove: (id: number) => void;
  onReorder: (favorites: FavoriteWithDetails[]) => void;
  onItemClick: (stockCode: string) => void;
}

interface SortableItemProps {
  favorite: FavoriteWithDetails;
  onRemove: (id: number) => void;
  onItemClick: (stockCode: string) => void;
}

function SortableItem({ favorite, onRemove, onItemClick }: SortableItemProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: favorite.id });

  const style: CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  const latestPrice = favorite.stock?.latestPrice;
  const priceChange = favorite.stock?.priceChange ?? 0;
  const priceChangePercent = favorite.stock?.priceChangePercent ?? 0;
  const isPositive = priceChange > 0;
  const isNegative = priceChange < 0;

  const cardStyle: CSSProperties = {
    background: 'linear-gradient(135deg, rgba(255, 255, 255, 0.03) 0%, rgba(255, 255, 255, 0.01) 100%)',
    border: '1px solid rgba(255, 255, 255, 0.08)',
    borderRadius: '12px',
    padding: '16px 20px',
    cursor: 'pointer',
    transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
    backdropFilter: 'blur(10px)',
    position: 'relative',
    overflow: 'hidden',
  };

  const hoverStyle = {
    borderColor: 'rgba(102, 126, 234, 0.4)',
    background: 'linear-gradient(135deg, rgba(102, 126, 234, 0.08) 0%, rgba(118, 75, 162, 0.08) 100%)',
    transform: 'translateY(-2px)',
    boxShadow: '0 8px 24px rgba(0, 0, 0, 0.4)',
  };

  return (
    <div ref={setNodeRef} style={style} {...attributes}>
      <div
        style={cardStyle}
        onMouseEnter={(e) => {
          Object.assign(e.currentTarget.style, hoverStyle);
        }}
        onMouseLeave={(e) => {
          Object.assign(e.currentTarget.style, cardStyle);
        }}
      >
        <Space
          style={{ width: '100%', justifyContent: 'space-between' }}
          onClick={() => onItemClick(favorite.stockCode)}
        >
          <Space size="large" style={{ flex: 1 }}>
            <div {...listeners} style={{ cursor: 'grab', padding: '4px' }}>
              <DragOutlined style={{ fontSize: '16px', color: 'rgba(255, 255, 255, 0.25)' }} />
            </div>

            <div style={{ minWidth: '80px' }}>
              <Text style={{ fontSize: '16px', fontWeight: 600, color: 'rgba(255, 255, 255, 0.85)' }}>
                {favorite.stockCode}
              </Text>
            </div>

            <div style={{ flex: 1, minWidth: '120px' }}>
              <Text style={{ fontSize: '14px', color: 'rgba(255, 255, 255, 0.65)' }}>
                {favorite.stock?.stockName || '--'}
              </Text>
            </div>

            <div style={{ minWidth: '100px', textAlign: 'right' }}>
              {latestPrice !== null && latestPrice !== undefined ? (
                <Text style={{ fontSize: '18px', fontWeight: 600, color: 'rgba(255, 255, 255, 0.85)' }}>
                  {latestPrice.toFixed(2)}
                </Text>
              ) : (
                <Text style={{ fontSize: '14px', color: 'rgba(255, 255, 255, 0.35)' }}>--</Text>
              )}
            </div>

            <div style={{ minWidth: '100px', textAlign: 'right' }}>
              {priceChangePercent !== null && priceChangePercent !== undefined && priceChangePercent !== 0 ? (
                <Text
                  style={{
                    fontSize: '14px',
                    fontWeight: 600,
                    color: isPositive ? '#ff4d4f' : isNegative ? '#52c41a' : 'rgba(255, 255, 255, 0.45)',
                  }}
                >
                  {priceChangePercent > 0 ? '+' : ''}{priceChangePercent.toFixed(2)}%
                </Text>
              ) : (
                <Text style={{ fontSize: '14px', color: 'rgba(255, 255, 255, 0.35)' }}>--</Text>
              )}
            </div>
          </Space>

          <Space size="small">
            <Tooltip title="查看图表">
              <Button
                type="text"
                icon={<LineChartOutlined />}
                onClick={(e) => {
                  e.stopPropagation();
                  onItemClick(favorite.stockCode);
                }}
                style={{ color: 'rgba(255, 255, 255, 0.45)' }}
              />
            </Tooltip>

            <Tooltip title="删除收藏">
              <Button
                type="text"
                danger
                icon={<DeleteOutlined />}
                aria-label={`删除收藏 ${favorite.stockCode}`}
                data-testid={`delete-favorite-${favorite.id}`}
                onClick={(e) => {
                  e.stopPropagation();
                  onRemove(favorite.id);
                }}
                style={{ color: 'rgba(255, 77, 79, 0.65)' }}
              />
            </Tooltip>
          </Space>
        </Space>
      </div>
    </div>
  );
}

export function FavoriteList({
  favorites,
  loading = false,
  onRemove,
  onReorder,
  onItemClick,
}: FavoriteListProps) {
  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;

    if (over && active.id !== over.id) {
      const oldIndex = favorites.findIndex((item) => item.id === active.id);
      const newIndex = favorites.findIndex((item) => item.id === over.id);

      if (oldIndex !== -1 && newIndex !== -1) {
        const newFavorites = arrayMove(favorites, oldIndex, newIndex).map((fav, idx) => ({
          ...fav,
          sort_order: idx,
        }));
        onReorder(newFavorites);
      }
    }
  };

  if (loading) {
    return (
      <div style={{ padding: '24px' }}>
        <Skeleton active paragraph={{ rows: 4 }} />
        <Skeleton active paragraph={{ rows: 4 }} style={{ marginTop: '16px' }} />
        <Skeleton active paragraph={{ rows: 4 }} style={{ marginTop: '16px' }} />
      </div>
    );
  }

  if (favorites.length === 0) {
    return (
      <div style={{ 
        padding: '80px 24px',
        textAlign: 'center',
      }}>
        <Empty
          image={Empty.PRESENTED_IMAGE_SIMPLE}
          description={
            <Space direction="vertical" size="small">
              <Text style={{ fontSize: '16px', color: 'rgba(255, 255, 255, 0.45)' }}>
                暂无收藏股票
              </Text>
              <Text style={{ fontSize: '14px', color: 'rgba(255, 255, 255, 0.25)' }}>
                去图表页添加收藏吧
              </Text>
            </Space>
          }
        />
      </div>
    );
  }

  return (
    <div style={{ padding: '24px' }}>
      <div style={{ marginBottom: '24px' }}>
        <Space style={{ width: '100%', justifyContent: 'space-between', paddingLeft: '60px', paddingRight: '100px' }}>
          <Text style={{ fontSize: '12px', color: 'rgba(255, 255, 255, 0.35)', fontWeight: 500 }}>
            股票代码
          </Text>
          <Text style={{ fontSize: '12px', color: 'rgba(255, 255, 255, 0.35)', fontWeight: 500 }}>
            股票名称
          </Text>
          <Text style={{ fontSize: '12px', color: 'rgba(255, 255, 255, 0.35)', fontWeight: 500 }}>
            最新价
          </Text>
          <Text style={{ fontSize: '12px', color: 'rgba(255, 255, 255, 0.35)', fontWeight: 500 }}>
            涨跌幅
          </Text>
        </Space>
      </div>

      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragEnd={handleDragEnd}
      >
        <SortableContext
          items={favorites.map(f => f.id)}
          strategy={verticalListSortingStrategy}
        >
          <List
            dataSource={favorites}
            renderItem={(favorite) => (
              <List.Item style={{ border: 'none', padding: '0 0 12px 0' }}>
                <SortableItem
                  favorite={favorite}
                  onRemove={onRemove}
                  onItemClick={onItemClick}
                />
              </List.Item>
            )}
          />
        </SortableContext>
      </DndContext>
    </div>
  );
}
