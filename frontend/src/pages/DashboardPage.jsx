import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../lib/api';

export default function DashboardPage() {
  const [urls, setUrls] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [copied, setCopied] = useState(null);

  useEffect(() => {
    fetchUrls();
  }, []);

  async function fetchUrls() {
    try {
      const { data } = await api.get('/urls');
      setUrls(data);
    } catch (err) {
      setError('Failed to load URLs.');
    } finally {
      setLoading(false);
    }
  }

  async function handleDelete(id, shortCode) {
    if (!confirm(`Delete short URL "${shortCode}"?`)) return;
    try {
      await api.delete(`/urls/${id}`);
      setUrls((prev) => prev.filter((u) => u.id !== id));
    } catch {
      alert('Failed to delete URL.');
    }
  }

  function copyToClipboard(shortUrl, id) {
    navigator.clipboard.writeText(shortUrl);
    setCopied(id);
    setTimeout(() => setCopied(null), 2000);
  }

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto px-6 py-12 text-center text-gray-500">
        Loading your URLs…
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-6 py-10">
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-3xl font-bold text-gray-900">My URLs</h1>
        <Link to="/create" className="btn-primary">
          + Shorten URL
        </Link>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg px-4 py-3 mb-6">
          {error}
        </div>
      )}

      {urls.length === 0 ? (
        <div className="card text-center py-16">
          <p className="text-gray-400 text-lg mb-4">You haven't created any short URLs yet.</p>
          <Link to="/create" className="btn-primary">
            Create your first URL
          </Link>
        </div>
      ) : (
        <div className="space-y-4">
          {urls.map((url) => (
            <div key={url.id} className="card flex flex-col md:flex-row md:items-center gap-4">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <a
                    href={url.shortUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-600 font-semibold hover:underline"
                  >
                    {url.shortUrl}
                  </a>
                  <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full">
                    {url.clickCount} clicks
                  </span>
                </div>
                <p className="text-gray-500 text-sm truncate">{url.longUrl}</p>
                <p className="text-gray-400 text-xs mt-1">
                  Created {new Date(url.createdAt).toLocaleDateString()} · Shard: {url.shardKey}
                </p>
              </div>
              <div className="flex items-center gap-2 flex-shrink-0">
                <button
                  onClick={() => copyToClipboard(url.shortUrl, url.id)}
                  className="btn-secondary text-sm"
                >
                  {copied === url.id ? '✓ Copied!' : 'Copy'}
                </button>
                <Link to={`/analytics/${url.id}`} className="btn-secondary text-sm">
                  Analytics
                </Link>
                <button
                  onClick={() => handleDelete(url.id, url.shortCode)}
                  className="btn-danger text-sm"
                >
                  Delete
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
