import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import {
  LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend,
} from 'recharts';
import api from '../lib/api';

const DEVICE_COLORS = { Desktop: '#3b82f6', Mobile: '#10b981', Tablet: '#f59e0b' };

export default function AnalyticsPage() {
  const { id } = useParams();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    async function fetchAnalytics() {
      try {
        const { data: res } = await api.get(`/analytics/${id}`);
        setData(res);
      } catch (err) {
        setError(err.response?.data?.message || 'Failed to load analytics.');
      } finally {
        setLoading(false);
      }
    }
    fetchAnalytics();
  }, [id]);

  if (loading) return <div className="max-w-7xl mx-auto px-6 py-12 text-center text-gray-500">Loading analytics…</div>;
  if (error) return <div className="max-w-7xl mx-auto px-6 py-12 text-center text-red-500">{error}</div>;

  const devicePieData = Object.entries(data.deviceBreakdown || {}).map(([name, value]) => ({ name, value }));

  return (
    <div className="max-w-7xl mx-auto px-6 py-10">
      <div className="flex items-center gap-4 mb-8">
        <Link to="/dashboard" className="text-gray-400 hover:text-gray-600">← Dashboard</Link>
        <h1 className="text-3xl font-bold text-gray-900">Analytics</h1>
      </div>

      <div className="card mb-4">
        <p className="text-sm text-gray-500">Short URL</p>
        <p className="font-semibold text-blue-600">{data.shortCode}</p>
        <p className="text-gray-500 text-sm truncate mt-1">{data.longUrl}</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
        <div className="card text-center">
          <p className="text-4xl font-bold text-blue-600">{data.totalClicks.toLocaleString()}</p>
          <p className="text-gray-500 mt-1">Total Clicks</p>
        </div>
        <div className="card text-center">
          <p className="text-4xl font-bold text-green-600">{data.uniqueVisitors.toLocaleString()}</p>
          <p className="text-gray-500 mt-1">Unique Visitors</p>
        </div>
      </div>

      {/* Daily Trends */}
      <div className="card mb-8">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Daily Click Trends (Last 30 Days)</h2>
        {data.dailyTrends.length === 0 ? (
          <p className="text-gray-400 text-sm text-center py-8">No data yet</p>
        ) : (
          <ResponsiveContainer width="100%" height={250}>
            <LineChart data={data.dailyTrends}>
              <XAxis dataKey="date" tick={{ fontSize: 12 }} />
              <YAxis tick={{ fontSize: 12 }} />
              <Tooltip />
              <Line type="monotone" dataKey="clicks" stroke="#3b82f6" strokeWidth={2} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Device Breakdown */}
        <div className="card">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Device Breakdown</h2>
          {devicePieData.length === 0 ? (
            <p className="text-gray-400 text-sm text-center py-8">No data yet</p>
          ) : (
            <ResponsiveContainer width="100%" height={220}>
              <PieChart>
                <Pie data={devicePieData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80}>
                  {devicePieData.map((entry) => (
                    <Cell key={entry.name} fill={DEVICE_COLORS[entry.name] || '#6b7280'} />
                  ))}
                </Pie>
                <Legend />
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* Top Referrers */}
        <div className="card">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Top Referrers</h2>
          {data.topReferrers.length === 0 ? (
            <p className="text-gray-400 text-sm text-center py-8">No referrer data yet</p>
          ) : (
            <div className="space-y-3">
              {data.topReferrers.map((r) => (
                <div key={r.referrer} className="flex items-center justify-between">
                  <span className="text-sm text-gray-600 truncate max-w-xs">{r.referrer || 'Direct'}</span>
                  <span className="text-sm font-semibold text-gray-900 ml-2">{r.count}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
