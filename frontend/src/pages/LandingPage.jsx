import React from 'react';
import { Link } from 'react-router-dom';

export default function LandingPage() {
  const features = [
    { icon: '⚡', title: 'Lightning Fast', desc: 'Redis-cached redirects served in under 10ms.' },
    { icon: '📊', title: 'Analytics', desc: 'Track clicks, devices, referrers and daily trends.' },
    { icon: '🔗', title: 'Custom Aliases', desc: 'Brand your links with memorable custom slugs.' },
    { icon: '🔒', title: 'Secure', desc: 'JWT authentication and bcrypt password hashing.' },
    { icon: '🚀', title: 'Scalable', desc: 'Sharding simulation and background job queues.' },
    { icon: '🐳', title: 'Dockerized', desc: 'One command to spin up the entire stack.' },
  ];

  return (
    <div className="max-w-7xl mx-auto px-6 py-16">
      {/* Hero */}
      <div className="text-center mb-20">
        <h1 className="text-5xl font-extrabold text-gray-900 mb-6 leading-tight">
          Shorten. Share. <span className="text-blue-600">Track.</span>
        </h1>
        <p className="text-xl text-gray-500 mb-10 max-w-2xl mx-auto">
          A production-grade URL shortener with analytics, custom aliases, Redis caching and distributed architecture.
        </p>
        <div className="flex justify-center gap-4">
          <Link to="/register" className="btn-primary text-base px-8 py-3">
            Get Started Free
          </Link>
          <Link to="/login" className="btn-secondary text-base px-8 py-3">
            Sign In
          </Link>
        </div>
      </div>

      {/* Features */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {features.map((f) => (
          <div key={f.title} className="card hover:shadow-md transition-shadow">
            <div className="text-3xl mb-3">{f.icon}</div>
            <h3 className="text-lg font-semibold text-gray-900 mb-1">{f.title}</h3>
            <p className="text-gray-500 text-sm">{f.desc}</p>
          </div>
        ))}
      </div>

      {/* CTA */}
      <div className="mt-20 text-center bg-blue-600 rounded-2xl py-14 px-8 text-white">
        <h2 className="text-3xl font-bold mb-4">Ready to shorten your first link?</h2>
        <p className="text-blue-100 mb-8 text-lg">
          Create a free account and start tracking your URLs in minutes.
        </p>
        <Link to="/register" className="bg-white text-blue-600 font-semibold px-8 py-3 rounded-lg hover:bg-blue-50 transition-colors">
          Create Free Account
        </Link>
      </div>
    </div>
  );
}
