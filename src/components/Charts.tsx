'use client';

import { useMemo } from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
} from 'recharts';
import { CategoryData, MonthlyData } from '@/types/expense';
import { formatCurrency } from '@/lib/format';

interface MonthlyChartProps {
  data: MonthlyData[];
}

export function MonthlyChart({ data }: MonthlyChartProps) {
  const hasData = data.some((d) => d.total > 0);

  if (!hasData) {
    return (
      <div className="flex items-center justify-center h-64 text-gray-400">
        <p>No spending data to display yet</p>
      </div>
    );
  }

  return (
    <ResponsiveContainer width="100%" height={280}>
      <BarChart data={data} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
        <XAxis
          dataKey="month"
          tick={{ fontSize: 12, fill: '#94a3b8' }}
          axisLine={{ stroke: '#e2e8f0' }}
          tickLine={false}
        />
        <YAxis
          tick={{ fontSize: 12, fill: '#94a3b8' }}
          axisLine={false}
          tickLine={false}
          tickFormatter={(v) => `$${v}`}
        />
        <Tooltip
          formatter={(value) => [formatCurrency(Number(value)), 'Spending']}
          contentStyle={{
            borderRadius: '12px',
            border: '1px solid #e2e8f0',
            boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
          }}
        />
        <Bar dataKey="total" fill="#6366f1" radius={[6, 6, 0, 0]} maxBarSize={48} />
      </BarChart>
    </ResponsiveContainer>
  );
}

interface CategoryChartProps {
  data: CategoryData[];
}

export function CategoryChart({ data }: CategoryChartProps) {
  const total = useMemo(() => data.reduce((s, d) => s + d.total, 0), [data]);

  if (data.length === 0) {
    return (
      <div className="flex items-center justify-center h-64 text-gray-400">
        <p>No category data to display yet</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col lg:flex-row items-center gap-4">
      <div className="w-full lg:w-1/2">
        <ResponsiveContainer width="100%" height={250}>
          <PieChart>
            <Pie
              data={data}
              cx="50%"
              cy="50%"
              innerRadius={55}
              outerRadius={90}
              paddingAngle={3}
              dataKey="total"
              nameKey="category"
            >
              {data.map((entry) => (
                <Cell key={entry.category} fill={entry.color} />
              ))}
            </Pie>
            <Tooltip
              formatter={(value) => [formatCurrency(Number(value)), 'Spent']}
              contentStyle={{
                borderRadius: '12px',
                border: '1px solid #e2e8f0',
                boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
              }}
            />
            <Legend
              verticalAlign="bottom"
              height={36}
              formatter={(value) => (
                <span className="text-xs text-gray-600">{value}</span>
              )}
            />
          </PieChart>
        </ResponsiveContainer>
      </div>
      <div className="w-full lg:w-1/2 space-y-3">
        {data.map((item) => {
          const pct = total > 0 ? (item.total / total) * 100 : 0;
          return (
            <div key={item.category} className="space-y-1">
              <div className="flex items-center justify-between text-sm">
                <div className="flex items-center gap-2">
                  <div
                    className="w-3 h-3 rounded-full"
                    style={{ backgroundColor: item.color }}
                  />
                  <span className="text-gray-700 font-medium">{item.category}</span>
                </div>
                <span className="text-gray-900 font-semibold">
                  {formatCurrency(item.total)}
                </span>
              </div>
              <div className="w-full bg-gray-100 rounded-full h-2">
                <div
                  className="h-2 rounded-full transition-all duration-500"
                  style={{
                    width: `${pct}%`,
                    backgroundColor: item.color,
                  }}
                />
              </div>
              <p className="text-xs text-gray-400">
                {item.count} expense{item.count !== 1 ? 's' : ''} &middot;{' '}
                {pct.toFixed(1)}%
              </p>
            </div>
          );
        })}
      </div>
    </div>
  );
}
