/**
 * 绘图相关类型定义
 */

export type DrawingType = 'trend_line' | 'horizontal_line' | 'vertical_line' | 'rectangle';

export interface Point {
  x: number;
  y: number;
}

export interface TrendLineCoordinates {
  start: Point;
  end: Point;
}

export interface HorizontalLineCoordinates {
  y: number;
}

export interface VerticalLineCoordinates {
  x: number;
}

export interface RectangleCoordinates {
  topLeft: Point;
  bottomRight: Point;
}

export type Coordinates =
  | TrendLineCoordinates
  | HorizontalLineCoordinates
  | VerticalLineCoordinates
  | RectangleCoordinates;

export interface Drawing {
  id: string;
  stockCode: string;
  period: 'daily' | 'weekly';
  drawingType: DrawingType;
  coordinates: Coordinates;
  createdAt: string;
}

export interface CreateDrawingRequest {
  stockCode: string;
  period: 'daily' | 'weekly';
  drawingType: DrawingType;
  coordinates: Coordinates;
}

export interface DrawingStyle {
  color: string;
  lineWidth: number;
  fillOpacity?: number;
}

export const DEFAULT_DRAWING_STYLE: DrawingStyle = {
  color: '#1890ff',
  lineWidth: 2,
  fillOpacity: 0.1,
};
