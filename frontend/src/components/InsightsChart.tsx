import React from "react";
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis, Cell } from "recharts";

type Insight = {
  category: string;
  total: number;
};

type InsightsChartProps = {
  insights: Insight[];
};

// Beautiful gradient colors matching our theme
const CHART_COLORS = [
  "#FF9500", // Tangerine
  "#FFD700", // Gold
  "#FF7F50", // Coral
  "#38BDF8", // Sky blue
  "#FFCC00", // Sunshine
  "#0EA5E9", // Deep sky
  "#FFA500", // Orange
  "#7DD3FC", // Light sky
];

// Custom tooltip component
const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    return (
      <div style={{
        background: 'linear-gradient(135deg, rgba(255,255,255,0.98) 0%, rgba(255,255,255,0.95) 100%)',
        backdropFilter: 'blur(20px)',
        padding: '14px 18px',
        borderRadius: '12px',
        border: '1px solid rgba(255, 255, 255, 0.6)',
        boxShadow: '0 8px 24px rgba(14, 165, 233, 0.15)',
      }}>
        <p style={{
          margin: '0 0 6px',
          fontWeight: 600,
          color: '#1a365d',
          fontSize: '0.95rem',
        }}>
          {label}
        </p>
        <p style={{
          margin: 0,
          fontWeight: 700,
          fontSize: '1.2rem',
          background: 'linear-gradient(135deg, #FFD700 0%, #FF9500 50%, #FF7F50 100%)',
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent',
          backgroundClip: 'text',
        }}>
          ${payload[0].value.toFixed(2)}
        </p>
      </div>
    );
  }
  return null;
};

export default function InsightsChart({ insights }: InsightsChartProps) {
  if (!insights.length) {
    return (
      <div style={{
        padding: '40px 20px',
        textAlign: 'center',
        color: '#7096c4',
        background: 'rgba(14, 165, 233, 0.05)',
        borderRadius: '16px',
        border: '1px dashed rgba(14, 165, 233, 0.2)',
      }}>
        <svg 
          width="48" 
          height="48" 
          viewBox="0 0 24 24" 
          fill="none" 
          stroke="currentColor" 
          strokeWidth="1.5"
          style={{ marginBottom: '12px', opacity: 0.6 }}
        >
          <path d="M3 3v18h18" strokeLinecap="round" strokeLinejoin="round"/>
          <path d="M18 17V9" strokeLinecap="round" strokeLinejoin="round"/>
          <path d="M13 17V5" strokeLinecap="round" strokeLinejoin="round"/>
          <path d="M8 17v-3" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
        <p style={{ margin: 0 }}>No insights yet. Add transactions to see charts.</p>
      </div>
    );
  }

  return (
    <div className="chart">
      <ResponsiveContainer width="100%" height={280}>
        <BarChart 
          data={insights} 
          margin={{ top: 20, right: 24, left: 0, bottom: 12 }}
        >
          <defs>
            {/* Gradient definitions for bars */}
            {insights.map((_, index) => (
              <linearGradient 
                key={`gradient-${index}`} 
                id={`barGradient-${index}`} 
                x1="0" 
                y1="0" 
                x2="0" 
                y2="1"
              >
                <stop 
                  offset="0%" 
                  stopColor={CHART_COLORS[index % CHART_COLORS.length]} 
                  stopOpacity={1}
                />
                <stop 
                  offset="100%" 
                  stopColor={CHART_COLORS[index % CHART_COLORS.length]} 
                  stopOpacity={0.7}
                />
              </linearGradient>
            ))}
          </defs>
          <CartesianGrid 
            strokeDasharray="3 3" 
            stroke="rgba(14, 165, 233, 0.1)"
            vertical={false}
          />
          <XAxis 
            dataKey="category" 
            stroke="#7096c4"
            fontSize={12}
            fontWeight={500}
            tickLine={false}
            axisLine={{ stroke: 'rgba(14, 165, 233, 0.2)' }}
          />
          <YAxis 
            stroke="#7096c4"
            fontSize={12}
            fontWeight={500}
            tickLine={false}
            axisLine={false}
            tickFormatter={(value) => `$${value}`}
          />
          <Tooltip 
            content={<CustomTooltip />}
            cursor={{ 
              fill: 'rgba(14, 165, 233, 0.08)',
              radius: 8,
            }}
          />
          <Bar 
            dataKey="total" 
            radius={[8, 8, 0, 0]}
            maxBarSize={60}
          >
            {insights.map((_, index) => (
              <Cell 
                key={`cell-${index}`} 
                fill={`url(#barGradient-${index})`}
                style={{
                  filter: 'drop-shadow(0 4px 6px rgba(255, 127, 80, 0.2))',
                }}
              />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
