import { useCallback, useEffect, useState } from 'react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import apiClient, { extractErrorMessage } from '../api/client.js';
import EmptyState from '../components/EmptyState.jsx';
import { useLanguage } from '../context/LanguageContext.jsx';

export default function StatisticsPage() {
  const { t } = useLanguage();
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const loadStats = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const res = await apiClient.get('/stats');
      setStats(res.data);
    } catch (err) {
      setError(extractErrorMessage(err, t.statistics.loadError));
    } finally {
      setLoading(false);
    }
  }, [t.statistics.loadError]);

  useEffect(() => {
    loadStats();
  }, [loadStats]);

  if (loading) {
    return (
      <div className="space-y-5">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <div
              key={i}
              className="h-24 rounded-2xl border border-[var(--border-subtle)] bg-[var(--bg-surface)] animate-pulse"
            />
          ))}
        </div>
        <div className="h-80 rounded-2xl border border-[var(--border-subtle)] bg-[var(--bg-surface)] animate-pulse" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-5 rounded-2xl border border-[var(--danger-border)] bg-[var(--danger-soft)] text-[var(--danger)] text-sm">
        {error}
      </div>
    );
  }

  const counters = stats?.counters || { total: 0, done: 0, in_progress: 0, overdue: 0 };
  const courseProgress = stats?.courseProgress || [];
  const weeklyCompleted = stats?.weeklyCompleted || [];
  const areaDistribution = stats?.areaDistribution || [];

  const tooltipStyle = {
    backgroundColor: 'var(--bg-surface)',
    border: '1px solid var(--border-subtle)',
    borderRadius: '10px',
    color: 'var(--text-primary)',
    fontSize: '12px',
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-extrabold tracking-tight">{t.statistics.heading}</h2>
        <p className="text-sm text-[var(--text-secondary)] mt-0.5">{t.statistics.subtitle}</p>
      </div>

      {/* 4 лічильники */}
      <section className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="relative overflow-hidden p-4 rounded-2xl border border-[var(--border-subtle)] bg-[var(--bg-surface)]">
          <div className="absolute top-0 left-0 right-0 h-[3px] bg-[var(--accent-primary)]" />
          <p className="text-xs text-[var(--text-muted)] font-medium">{t.statistics.totalTasks}</p>
          <p className="text-2xl font-extrabold font-mono-num mt-1 text-[var(--accent-primary)]">
            {counters.total}
          </p>
        </div>

        <div className="relative overflow-hidden p-4 rounded-2xl border border-[var(--border-subtle)] bg-[var(--bg-surface)]">
          <div className="absolute top-0 left-0 right-0 h-[3px] bg-[var(--accent-turquoise)]" />
          <p className="text-xs text-[var(--text-muted)] font-medium">{t.statistics.doneTasks}</p>
          <p className="text-2xl font-extrabold font-mono-num mt-1 text-[var(--accent-turquoise)]">
            {counters.done}
          </p>
        </div>

        <div className="relative overflow-hidden p-4 rounded-2xl border border-[var(--border-subtle)] bg-[var(--bg-surface)]">
          <div className="absolute top-0 left-0 right-0 h-[3px] bg-[var(--accent-violet)]" />
          <p className="text-xs text-[var(--text-muted)] font-medium">
            {t.statistics.inProgressTasks}
          </p>
          <p className="text-2xl font-extrabold font-mono-num mt-1 text-[var(--accent-violet)]">
            {counters.in_progress}
          </p>
        </div>

        <div className="relative overflow-hidden p-4 rounded-2xl border border-[var(--border-subtle)] bg-[var(--bg-surface)]">
          <div className="absolute top-0 left-0 right-0 h-[3px] bg-[var(--danger)]" />
          <p className="text-xs text-[var(--text-muted)] font-medium">
            {t.statistics.overdueTasks}
          </p>
          <p className="text-2xl font-extrabold font-mono-num mt-1 text-[var(--danger)]">
            {counters.overdue}
          </p>
        </div>
      </section>

      {counters.total === 0 && courseProgress.length === 0 ? (
        <EmptyState title={t.statistics.emptyTitle} description={t.statistics.emptyDesc} />
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Стовпчикова діаграма: % виконання по кожному курсу */}
          <section className="p-5 rounded-2xl border border-[var(--border-subtle)] bg-[var(--bg-surface)] lg:col-span-2">
            <h3 className="text-base font-bold mb-1">{t.statistics.courseChartTitle}</h3>
            <p className="text-xs text-[var(--text-secondary)] mb-4">
              {t.statistics.courseChartSub}
            </p>
            <div className="w-full h-72">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={courseProgress}
                  margin={{ top: 8, right: 16, left: 0, bottom: 24 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border-subtle)" />
                  <XAxis
                    dataKey="title"
                    tick={{ fill: 'var(--text-secondary)', fontSize: 11 }}
                    interval={0}
                    angle={-12}
                    textAnchor="end"
                    height={55}
                  />
                  <YAxis
                    domain={[0, 100]}
                    unit="%"
                    tick={{ fill: 'var(--text-secondary)', fontSize: 12 }}
                  />
                  <Tooltip
                    contentStyle={tooltipStyle}
                    formatter={(value) => [`${value}%`, t.statistics.progressTooltip]}
                  />
                  <Bar
                    dataKey="progress"
                    name={t.statistics.progressTooltip}
                    radius={[8, 8, 0, 0]}
                    maxBarSize={52}
                  >
                    {courseProgress.map((entry) => (
                      <Cell key={entry.id} fill={entry.areaColor || '#2563EB'} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </section>

          {/* Лінійна діаграма: виконані завдання за 4 тижні */}
          <section className="p-5 rounded-2xl border border-[var(--border-subtle)] bg-[var(--bg-surface)]">
            <h3 className="text-base font-bold mb-1">{t.statistics.weeklyChartTitle}</h3>
            <p className="text-xs text-[var(--text-secondary)] mb-4">
              {t.statistics.weeklyChartSub}
            </p>
            <div className="w-full h-72">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart
                  data={weeklyCompleted}
                  margin={{ top: 8, right: 16, left: 0, bottom: 8 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border-subtle)" />
                  <XAxis
                    dataKey="weekLabel"
                    tick={{ fill: 'var(--text-secondary)', fontSize: 12 }}
                  />
                  <YAxis
                    allowDecimals={false}
                    tick={{ fill: 'var(--text-secondary)', fontSize: 12 }}
                  />
                  <Tooltip
                    contentStyle={tooltipStyle}
                    formatter={(value) => [value, t.statistics.completedTooltip]}
                  />
                  <Line
                    type="monotone"
                    dataKey="count"
                    name={t.statistics.doneTasks}
                    stroke="#7C3AED"
                    strokeWidth={3}
                    dot={{ r: 5, fill: '#2563EB', strokeWidth: 2, stroke: '#FFFFFF' }}
                    activeDot={{ r: 7, fill: '#D946EF' }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </section>

          {/* Кругова діаграма: розподіл завдань за сферами */}
          <section className="p-5 rounded-2xl border border-[var(--border-subtle)] bg-[var(--bg-surface)]">
            <h3 className="text-base font-bold mb-1">{t.statistics.areaChartTitle}</h3>
            <p className="text-xs text-[var(--text-secondary)] mb-4">
              {t.statistics.areaChartSub}
            </p>
            <div className="w-full h-72">
              {areaDistribution.length === 0 ? (
                <div className="h-full flex items-center justify-center text-sm text-[var(--text-secondary)]">
                  {t.statistics.noTasksArea}
                </div>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={areaDistribution}
                      dataKey="count"
                      nameKey="name"
                      cx="50%"
                      cy="45%"
                      innerRadius={55}
                      outerRadius={92}
                      paddingAngle={3}
                    >
                      {areaDistribution.map((entry) => (
                        <Cell key={entry.id} fill={entry.color || '#7C3AED'} />
                      ))}
                    </Pie>
                    <Tooltip
                      contentStyle={tooltipStyle}
                      formatter={(value, name) => [
                        `${value} ${t.statistics.tasksCountTooltip}`,
                        name,
                      ]}
                    />
                    <Legend
                      verticalAlign="bottom"
                      iconType="circle"
                      wrapperStyle={{ fontSize: '12px' }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              )}
            </div>
          </section>
        </div>
      )}
    </div>
  );
}
