import { ResponsiveContainer, AreaChart, Area } from 'recharts';

interface SparklineChartProps {
  data: number[];
  color?: string;
  height?: number;
}

export function SparklineChart({ data, color = '#2D9CDB', height = 40 }: SparklineChartProps) {
  const chartData = data.map((value, index) => ({ index, value }));
  const isPositive = data.length >= 2 && data[data.length - 1]! >= data[0]!;
  const lineColor = color === 'auto' ? (isPositive ? '#27AE60' : '#EB5757') : color;

  return (
    <ResponsiveContainer width="100%" height={height}>
      <AreaChart data={chartData} margin={{ top: 2, right: 2, bottom: 2, left: 2 }}>
        <defs>
          <linearGradient id={`sparkGrad-${lineColor}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={lineColor} stopOpacity={0.3} />
            <stop offset="100%" stopColor={lineColor} stopOpacity={0} />
          </linearGradient>
        </defs>
        <Area
          type="monotone"
          dataKey="value"
          stroke={lineColor}
          fill={`url(#sparkGrad-${lineColor})`}
          strokeWidth={1.5}
          dot={false}
        />
      </AreaChart>
    </ResponsiveContainer>
  );
}
