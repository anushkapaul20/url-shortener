import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../lib/api';

export default function CreateUrlPage() {
  const [form, setForm] = useState({ longUrl: '', customAlias: '' });
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setResult(null);
    setLoading(true);
    try {
      const payload = { longUrl: form.longUrl };
      if (form.customAlias.trim()) payload.customAlias = form.customAlias.trim();
      const { data } = await api.post('/urls', payload);
      setResult(data);
      setForm({ longUrl: '', customAlias: '' });
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to shorten URL.');
    } finally {
      setLoading(false);
    }
  }

  function copyToClipboard() {
    navigator.clipboard.writeText(result.shortUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div className="max-w-2xl mx-auto px-6 py-12">
      <h1 className="text-3xl font-bold text-gray-900 mb-2">Shorten a URL</h1>
      <p className="text-gray-500 mb-8">Paste your long URL below to create a short link.</p>

      <div className="card mb-6">
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg px-4 py-3 mb-6 text-sm">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Long URL <span className="text-red-500">*</span>
            </label>
            <input
              type="url"
              className="input-field"
              placeholder="https://example.com/very/long/url/here"
              value={form.longUrl}
              onChange={(e) => setForm({ ...form, longUrl: e.target.value })}
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Custom Alias <span className="text-gray-400 font-normal">(optional)</span>
            </label>
            <div className="flex items-center">
              <span className="text-gray-500 text-sm bg-gray-100 border border-gray-300 border-r-0 rounded-l-lg px-3 py-2 whitespace-nowrap">
                shortly.com/
              </span>
              <input
                type="text"
                className="input-field rounded-l-none"
                placeholder="my-custom-link"
                value={form.customAlias}
                onChange={(e) => setForm({ ...form, customAlias: e.target.value })}
              />
            </div>
          </div>
          <button type="submit" className="btn-primary w-full py-3" disabled={loading}>
            {loading ? 'Creating…' : 'Shorten URL'}
          </button>
        </form>
      </div>

      {result && (
        <div className="card border-green-200 bg-green-50">
          <h2 className="text-lg font-semibold text-green-800 mb-3">✓ Short URL created!</h2>
          <div className="flex items-center gap-3">
            <a
              href={result.shortUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-600 font-semibold hover:underline flex-1 truncate"
            >
              {result.shortUrl}
            </a>
            <button onClick={copyToClipboard} className="btn-primary text-sm flex-shrink-0">
              {copied ? '✓ Copied!' : 'Copy'}
            </button>
          </div>
          <p className="text-green-700 text-sm mt-3 truncate">→ {result.longUrl}</p>
          <div className="mt-4 flex gap-3">
            <Link to="/dashboard" className="btn-secondary text-sm">
              View Dashboard
            </Link>
            <Link to={`/analytics/${result.id}`} className="btn-secondary text-sm">
              View Analytics
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
