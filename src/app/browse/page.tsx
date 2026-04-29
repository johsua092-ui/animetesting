import { Suspense } from 'react';
import { Loader2 } from 'lucide-react';
import { BrowseClient } from './browse-client';

export default function BrowsePage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-background flex items-center justify-center"><Loader2 className="w-8 h-8 text-primary animate-spin" /></div>}>
      <BrowseClient />
    </Suspense>
  );
}
