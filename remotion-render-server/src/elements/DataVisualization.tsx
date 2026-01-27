import React from 'react';
import { interpolate, spring, useCurrentFrame, useVideoConfig, Easing } from 'remotion';
import type { PlannedElement, VideoPlan } from '../types/video';

interface DataVisualizationProps {
  element: PlannedElement;
  style: React.CSSProperties;
  globalStyle?: VideoPlan['style'];
  colors: string[];
  sceneFrame: number;
}

export const DataVisualization: React.FC<DataVisualizationProps> = ({
  element,
  style,
  colors,
  sceneFrame,
}) => {
  const { fps } = useVideoConfig();

  // Chart type: 'bar', 'line', 'pie', 'donut'
  const chartType = (element.style as any)?.chartType || 'bar';
  
  // Data points
  const dataPoints = (element.style as any)?.data || [
    { label: 'Q1', value: 25 },
    { label: 'Q2', value: 45 },
    { label: 'Q3', value: 65 },
    { label: 'Q4', value: 85 },
  ];

  switch (chartType) {
    case 'bar':
      return (
        <BarChart
          dataPoints={dataPoints}
          style={style}
          colors={colors}
          sceneFrame={sceneFrame}
          fps={fps}
        />
      );
    case 'line':
      return (
        <LineChart
          dataPoints={dataPoints}
          style={style}
          colors={colors}
          sceneFrame={sceneFrame}
          fps={fps}
        />
      );
    case 'pie':
    case 'donut':
      return (
        <PieChart
          dataPoints={dataPoints}
          style={style}
          colors={colors}
          sceneFrame={sceneFrame}
          fps={fps}
          isDonut={chartType === 'donut'}
        />
      );
    default:
      return null;
  }
};

const BarChart: React.FC<{
  dataPoints: Array<{ label: string; value: number }>;
  style: React.CSSProperties;
  colors: string[];
  sceneFrame: number;
  fps: number;
}> = ({ dataPoints, style, colors, sceneFrame, fps }) => {
  const maxValue = Math.max(...dataPoints.map((d) => d.value));
  const chartHeight = 300;
  const barWidth = 60;
  const gap = 40;

  return (
    <div style={{ ...style, display: 'flex', flexDirection: 'column', gap: 20 }}>
      <div
        style={{
          display: 'flex',
          alignItems: 'flex-end',
          justifyContent: 'center',
          gap,
          height: chartHeight,
        }}
      >
        {dataPoints.map((point, i) => {
          const delay = i * 8;
          const progress = spring({
            fps,
            frame: Math.max(0, sceneFrame - delay),
            config: { damping: 25, stiffness: 80 },
          });

          const barHeight = interpolate(
            progress,
            [0, 1],
            [0, (point.value / maxValue) * chartHeight]
          );

          const colorIndex = i % colors.length;
          const barColor = colors[colorIndex] || '#3b82f6';

          return (
            <div
              key={i}
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: 12,
              }}
            >
              {/* Value label */}
              <div
                style={{
                  fontSize: 24,
                  fontWeight: 700,
                  color: 'white',
                  fontFamily: 'Inter, system-ui, sans-serif',
                  opacity: progress,
                }}
              >
                {Math.round(point.value * progress)}
              </div>

              {/* Bar */}
              <div
                style={{
                  width: barWidth,
                  height: barHeight,
                  background: `linear-gradient(180deg, ${barColor} 0%, ${barColor}dd 100%)`,
                  borderRadius: '8px 8px 0 0',
                  boxShadow: `0 0 20px ${barColor}80`,
                }}
              />

              {/* Label */}
              <div
                style={{
                  fontSize: 16,
                  color: 'rgba(255,255,255,0.7)',
                  fontFamily: 'Inter, system-ui, sans-serif',
                }}
              >
                {point.label}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

const LineChart: React.FC<{
  dataPoints: Array<{ label: string; value: number }>;
  style: React.CSSProperties;
  colors: string[];
  sceneFrame: number;
  fps: number;
}> = ({ dataPoints, style, colors, sceneFrame, fps }) => {
  const maxValue = Math.max(...dataPoints.map((d) => d.value));
  const chartHeight = 300;
  const chartWidth = 600;
  const pointRadius = 6;

  const progress = spring({
    fps,
    frame: sceneFrame,
    config: { damping: 30, stiffness: 60 },
  });

  const visiblePoints = interpolate(
    progress,
    [0, 1],
    [0, dataPoints.length],
    { easing: Easing.inOut(Easing.ease) }
  );

  // Calculate points
  const points = dataPoints.map((point, i) => {
    const x = (i / (dataPoints.length - 1)) * chartWidth;
    const y = chartHeight - (point.value / maxValue) * chartHeight;
    return { x, y, ...point };
  });

  // Generate path
  const pathData = points
    .slice(0, Math.ceil(visiblePoints))
    .map((point, i) => {
      if (i === 0) return `M ${point.x} ${point.y}`;
      return `L ${point.x} ${point.y}`;
    })
    .join(' ');

  const lineColor = colors[0] || '#3b82f6';

  return (
    <div style={{ ...style, display: 'flex', justifyContent: 'center' }}>
      <svg width={chartWidth} height={chartHeight + 40}>
        {/* Line */}
        <path
          d={pathData}
          stroke={lineColor}
          strokeWidth={3}
          fill="none"
          strokeLinecap="round"
          strokeLinejoin="round"
        />

        {/* Points and labels */}
        {points.slice(0, Math.ceil(visiblePoints)).map((point, i) => {
          const pointProgress = interpolate(
            visiblePoints,
            [i, i + 1],
            [0, 1],
            { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }
          );

          return (
            <g key={i} opacity={pointProgress}>
              {/* Point */}
              <circle
                cx={point.x}
                cy={point.y}
                r={pointRadius}
                fill={lineColor}
                stroke="white"
                strokeWidth={2}
              />
              {/* Value */}
              <text
                x={point.x}
                y={point.y - 15}
                textAnchor="middle"
                fill="white"
                fontSize="16"
                fontWeight="700"
                fontFamily="Inter, system-ui, sans-serif"
              >
                {point.value}
              </text>
              {/* Label */}
              <text
                x={point.x}
                y={chartHeight + 25}
                textAnchor="middle"
                fill="rgba(255,255,255,0.7)"
                fontSize="14"
                fontFamily="Inter, system-ui, sans-serif"
              >
                {point.label}
              </text>
            </g>
          );
        })}
      </svg>
    </div>
  );
};

const PieChart: React.FC<{
  dataPoints: Array<{ label: string; value: number }>;
  style: React.CSSProperties;
  colors: string[];
  sceneFrame: number;
  fps: number;
  isDonut: boolean;
}> = ({ dataPoints, style, colors, sceneFrame, fps, isDonut }) => {
  const progress = spring({
    fps,
    frame: sceneFrame,
    config: { damping: 30, stiffness: 60 },
  });

  const radius = 120;
  const centerX = 150;
  const centerY = 150;
  const innerRadius = isDonut ? radius * 0.6 : 0;

  const total = dataPoints.reduce((sum, point) => sum + point.value, 0);

  let cumulativeAngle = -90; // Start from top

  return (
    <div style={{ ...style, display: 'flex', justifyContent: 'center', gap: 40 }}>
      <svg width={300} height={300}>
        {dataPoints.map((point, i) => {
          const angle = (point.value / total) * 360;
          const visibleAngle = interpolate(progress, [0, 1], [0, angle]);

          const startAngle = cumulativeAngle;
          const endAngle = cumulativeAngle + visibleAngle;
          cumulativeAngle += angle;

          const startRad = (startAngle * Math.PI) / 180;
          const endRad = (endAngle * Math.PI) / 180;

          const x1 = centerX + radius * Math.cos(startRad);
          const y1 = centerY + radius * Math.sin(startRad);
          const x2 = centerX + radius * Math.cos(endRad);
          const y2 = centerY + radius * Math.sin(endRad);

          const largeArc = visibleAngle > 180 ? 1 : 0;

          let path: string;
          if (isDonut) {
            const ix1 = centerX + innerRadius * Math.cos(startRad);
            const iy1 = centerY + innerRadius * Math.sin(startRad);
            const ix2 = centerX + innerRadius * Math.cos(endRad);
            const iy2 = centerY + innerRadius * Math.sin(endRad);

            path = `
              M ${x1} ${y1}
              A ${radius} ${radius} 0 ${largeArc} 1 ${x2} ${y2}
              L ${ix2} ${iy2}
              A ${innerRadius} ${innerRadius} 0 ${largeArc} 0 ${ix1} ${iy1}
              Z
            `;
          } else {
            path = `
              M ${centerX} ${centerY}
              L ${x1} ${y1}
              A ${radius} ${radius} 0 ${largeArc} 1 ${x2} ${y2}
              Z
            `;
          }

          const fillColor = colors[i % colors.length] || '#3b82f6';

          return <path key={i} d={path} fill={fillColor} />;
        })}

        {/* Center text for donut */}
        {isDonut && (
          <text
            x={centerX}
            y={centerY}
            textAnchor="middle"
            dominantBaseline="middle"
            fill="white"
            fontSize="32"
            fontWeight="900"
            fontFamily="Inter, system-ui, sans-serif"
          >
            {total}
          </text>
        )}
      </svg>

      {/* Legend */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12, justifyContent: 'center' }}>
        {dataPoints.map((point, i) => {
          const itemProgress = interpolate(
            progress,
            [i / dataPoints.length, (i + 1) / dataPoints.length],
            [0, 1],
            { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }
          );

          const fillColor = colors[i % colors.length] || '#3b82f6';

          return (
            <div
              key={i}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 12,
                opacity: itemProgress,
              }}
            >
              <div
                style={{
                  width: 20,
                  height: 20,
                  borderRadius: 4,
                  background: fillColor,
                }}
              />
              <div
                style={{
                  fontSize: 16,
                  color: 'white',
                  fontFamily: 'Inter, system-ui, sans-serif',
                }}
              >
                {point.label}: {point.value}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
