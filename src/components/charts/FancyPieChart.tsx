import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Sector } from "recharts";
import { useState } from "react";
import { formatMinutes } from "@/lib/habits";

export interface PieDatum {
  name: string;
  value: number; // minutes
  color: string; // hsl string e.g. "hsl(260 55% 58%)"
}

interface FancyPieChartProps {
  data: PieDatum[];
  /** centerLabel rendered in the donut hole, e.g. total */
  centerLabel?: string;
  centerSubLabel?: string;
  height?: number;
  /** Smaller, side-by-side variant for daily/compact contexts */
  compact?: boolean;
}

const renderActiveShape = (props: any) => {
  const { cx, cy, innerRadius, outerRadius, startAngle, endAngle, fill } = props;
  return (
    <g>
      <Sector
        cx={cx}
        cy={cy}
        innerRadius={innerRadius}
        outerRadius={outerRadius + 6}
        startAngle={startAngle}
        endAngle={endAngle}
        fill={fill}
        style={{ filter: `drop-shadow(0 6px 10px ${fill})`, opacity: 0.95 }}
      />
    </g>
  );
};

export default function FancyPieChart({
  data,
  centerLabel,
  centerSubLabel,
  height = 240,
  compact = false,
}: FancyPieChartProps) {
  const [activeIndex, setActiveIndex] = useState<number | undefined>(undefined);
  const total = data.reduce((s, d) => s + d.value, 0);

  if (total === 0) {
    return (
      <div
        className="flex items-center justify-center text-sm text-muted-foreground"
        style={{ height }}
      >
        No data yet
      </div>
    );
  }

  const innerR = compact ? 38 : 55;
  const outerR = compact ? 62 : 88;

  const gradientId = `pie-gradient-${Math.random().toString(36).slice(2, 8)}`;

  return (
    <div className="flex flex-col sm:flex-row items-center gap-4 w-full">
      <div style={{ width: compact ? 160 : 200, height }}>
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <defs>
              {data.map((d, i) => (
                <radialGradient
                  key={i}
                  id={`${gradientId}-${i}`}
                  cx="50%"
                  cy="50%"
                  r="65%"
                  fx="35%"
                  fy="35%"
                >
                  <stop offset="0%" stopColor={d.color} stopOpacity={1} />
                  <stop offset="100%" stopColor={d.color} stopOpacity={0.75} />
                </radialGradient>
              ))}
            </defs>
            <Pie
              data={data}
              dataKey="value"
              nameKey="name"
              cx="50%"
              cy="50%"
              innerRadius={innerR}
              outerRadius={outerR}
              paddingAngle={2}
              cornerRadius={4}
              stroke="hsl(var(--card))"
              strokeWidth={2}
              activeIndex={activeIndex}
              activeShape={renderActiveShape}
              onMouseEnter={(_, i) => setActiveIndex(i)}
              onMouseLeave={() => setActiveIndex(undefined)}
              isAnimationActive
            >
              {data.map((_, i) => (
                <Cell key={i} fill={`url(#${gradientId}-${i})`} />
              ))}
            </Pie>
            <Tooltip
              contentStyle={{
                background: "hsl(var(--popover))",
                border: "1px solid hsl(var(--border))",
                borderRadius: 10,
                color: "hsl(var(--popover-foreground))",
                fontSize: 12,
                boxShadow: "0 6px 20px hsl(0 0% 0% / 0.15)",
              }}
              formatter={(value: number, name: string) => [
                `${formatMinutes(value)} (${Math.round((value / total) * 100)}%)`,
                name,
              ]}
            />
          </PieChart>
        </ResponsiveContainer>
        {(centerLabel || centerSubLabel) && (
          <div
            className="pointer-events-none -mt-[calc(50%+12px)] flex flex-col items-center justify-center"
            style={{ height: 0 }}
          >
            <div className="text-center">
              {centerLabel && (
                <div className={`font-bold text-foreground ${compact ? "text-base" : "text-lg"}`}>
                  {centerLabel}
                </div>
              )}
              {centerSubLabel && (
                <div className="text-[10px] uppercase tracking-wider text-muted-foreground">
                  {centerSubLabel}
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Legend */}
      <div className="flex-1 w-full space-y-1.5 min-w-0">
        {data.map((d, i) => {
          const pct = Math.round((d.value / total) * 100);
          return (
            <div
              key={i}
              className="flex items-center justify-between gap-2 py-1 px-2 rounded-md hover:bg-secondary/40 transition-colors cursor-default"
              onMouseEnter={() => setActiveIndex(i)}
              onMouseLeave={() => setActiveIndex(undefined)}
            >
              <div className="flex items-center gap-2 min-w-0">
                <span
                  className="w-2.5 h-2.5 rounded-full shrink-0"
                  style={{
                    background: d.color,
                    boxShadow: `0 0 6px ${d.color}`,
                  }}
                />
                <span className="text-xs text-foreground truncate">{d.name}</span>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <span className="text-xs font-medium text-foreground tabular-nums">
                  {formatMinutes(d.value)}
                </span>
                <span className="text-[10px] text-muted-foreground tabular-nums w-8 text-right">
                  {pct}%
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
