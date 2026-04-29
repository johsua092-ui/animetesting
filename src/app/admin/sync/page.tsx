'use client';

import { useState } from 'react';
import { Loader2, RefreshCw, CheckCircle, XCircle } from 'lucide-react';
import Link from 'next/link';

export default function AdminSyncPage() {
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [message, setMessage] = useState('');

  const handleSeed = async () => {
    setStatus('loading');
    setMessage('Seeding 10 anime dengan episodes... Harap tunggu.');

    try {
      const res = await fetch('/api/admin/seed', { method: 'POST' });
      const data = await res.json();

      if (data.error) {
        setStatus('error');
        setMessage(data.error);
      } else {
        setStatus('success');
        setMessage(`Done! ${data.animeSynced} anime, ${data.episodeSynced} episodes synced.`);
      }
    } catch (err: any) {
      setStatus('error');
      setMessage(`Error: ${err.message}`);
    }
  };

  return (
    <div className="min-h-screen bg-background pt-20">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <h1 className="text-2xl font-bold mb-4">Admin - Setup</h1>

        <div className="bg-surface rounded-xl p-6 mb-6">
          <h2 className="text-lg font-semibold mb-2">Quick Setup</h2>
          <p className="text-muted text-sm mb-4">
            Otomatis isi 10 anime trending + episodes dari Gogoanime.
            Proses ini butuh sekitar 30-60 detik.
          </p>

          <button
            onClick={handleSeed}
            disabled={status === 'loading'}
            className="flex items-center gap-2 px-6 py-3 bg-primary hover:bg-primary-hover text-white font-semibold rounded-lg transition-colors disabled:opacity-50"
          >
            {status === 'loading' ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
            Quick Seed (10 Anime)
          </button>

          {status === 'success' && (
            <div className="mt-4 flex items-center gap-2 p-3 bg-green-500/10 border border-green-500/20 rounded-lg text-green-400">
              <CheckCircle className="w-4 h-4" />
              <span className="text-sm">{message}</span>
            </div>
          )}

          {status === 'error' && (
            <div className="mt-4 flex items-center gap-2 p-3 bg-red-500/10 border border-red-500/20 rounded-lg text-red-400">
              <XCircle className="w-4 h-4" />
              <span className="text-sm">{message}</span>
            </div>
          )}
        </div>

        <Link href="/" className="text-primary hover:underline text-sm">
          ← Back to Home
        </Link>
      </div>
    </div>
  );
}
