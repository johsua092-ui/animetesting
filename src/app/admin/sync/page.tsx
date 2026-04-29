'use client';

import { useState } from 'react';
import { Loader2, RefreshCw, CheckCircle, XCircle } from 'lucide-react';
import Link from 'next/link';

export default function AdminSyncPage() {
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [message, setMessage] = useState('');
  const [logs, setLogs] = useState<string[]>([]);

  const handleSync = async () => {
    setStatus('loading');
    setMessage('Syncing anime and episodes... This may take a few minutes.');
    setLogs([]);

    try {
      const res = await fetch('/api/admin/sync', { method: 'POST' });
      const data = await res.json();

      if (data.error) {
        setStatus('error');
        setMessage(data.error);
        setLogs(prev => [...prev, `ERROR: ${data.error}`]);
      } else {
        setStatus('success');
        const animeSynced = data.synced || data.anime?.synced || 0;
        const epSynced = data.episodes?.synced || 0;
        const animeErrors = data.errors || data.anime?.errors || 0;
        const epErrors = data.episodes?.errors || 0;
        setMessage(`Synced ${animeSynced} anime, ${epSynced} episodes (errors: ${animeErrors} anime, ${epErrors} episodes)`);
        setLogs(prev => [...prev, `SUCCESS: Synced ${animeSynced} anime, ${epSynced} episodes`]);
      }
    } catch (err: any) {
      setStatus('error');
      setMessage(`Sync failed: ${err.message}`);
      setLogs(prev => [...prev, `ERROR: ${err.message}`]);
    }
  };

  const handleSyncAnimeOnly = async () => {
    setStatus('loading');
    setMessage('Syncing anime list only...');
    setLogs([]);

    try {
      const res = await fetch('/api/admin/sync', { method: 'POST' });
      const data = await res.json();

      if (data.error) {
        setStatus('error');
        setMessage(data.error);
      } else {
        setStatus('success');
        setMessage(`Synced ${data.synced} anime (errors: ${data.errors})`);
        setLogs(prev => [...prev, `SUCCESS: Synced ${data.synced} anime`]);
      }
    } catch (err: any) {
      setStatus('error');
      setMessage(`Sync failed: ${err.message}`);
    }
  };

  return (
    <div className="min-h-screen bg-background pt-20">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex items-center gap-3 mb-8">
          <RefreshCw className="w-6 h-6 text-primary" />
          <h1 className="text-2xl font-bold">Admin - Sync Anime</h1>
        </div>

        <div className="bg-surface rounded-xl p-6 mb-6">
          <h2 className="text-lg font-semibold mb-4">Sync Data Anime</h2>
          <p className="text-muted text-sm mb-4">
            Sync anime dari MyAnimeList (Jikan API) + episodes dari Gogoanime (Consumet API).
            Proses ini membutuhkan waktu beberapa menit.
          </p>

          <div className="flex flex-wrap gap-3 mb-4">
            <button
              onClick={handleSync}
              disabled={status === 'loading'}
              className="flex items-center gap-2 px-6 py-3 bg-primary hover:bg-primary-hover text-white font-semibold rounded-lg transition-colors disabled:opacity-50"
            >
              {status === 'loading' ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <RefreshCw className="w-4 h-4" />
              )}
              Sync Anime + Episodes
            </button>
            <button
              onClick={handleSyncAnimeOnly}
              disabled={status === 'loading'}
              className="flex items-center gap-2 px-4 py-3 bg-surface-light hover:bg-surface text-foreground font-medium rounded-lg transition-colors disabled:opacity-50"
            >
              <RefreshCw className="w-4 h-4" />
              Sync Anime Only
            </button>
          </div>

          {status === 'success' && (
            <div className="flex items-center gap-2 p-3 bg-green-500/10 border border-green-500/20 rounded-lg text-green-400">
              <CheckCircle className="w-4 h-4" />
              <span className="text-sm">{message}</span>
            </div>
          )}

          {status === 'error' && (
            <div className="flex items-center gap-2 p-3 bg-red-500/10 border border-red-500/20 rounded-lg text-red-400">
              <XCircle className="w-4 h-4" />
              <span className="text-sm">{message}</span>
            </div>
          )}

          {logs.length > 0 && (
            <div className="mt-4 p-3 bg-black/30 rounded-lg font-mono text-xs text-muted max-h-48 overflow-y-auto">
              {logs.map((log, i) => (
                <div key={i}>{log}</div>
              ))}
            </div>
          )}
        </div>

        <div className="bg-surface rounded-xl p-6">
          <h2 className="text-lg font-semibold mb-4">Cara Penggunaan</h2>
          <ol className="list-decimal list-inside space-y-2 text-sm text-muted">
            <li>Klik <strong>"Sync Anime + Episodes"</strong> untuk mengambil data anime dari MyAnimeList dan episode dari Gogoanime</li>
            <li>Tunggu proses selesai (bisa 5-10 menit untuk 50 anime)</li>
            <li>Buka halaman <Link href="/" className="text-primary hover:underline">Home</Link> untuk melihat anime</li>
            <li>Klik anime → pilih episode → nonton!</li>
          </ol>
        </div>

        <div className="mt-6">
          <Link href="/" className="text-primary hover:underline text-sm">
            ← Back to Home
          </Link>
        </div>
      </div>
    </div>
  );
}
