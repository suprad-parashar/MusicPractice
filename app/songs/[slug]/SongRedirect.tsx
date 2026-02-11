'use client';

import { useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';

export default function SongRedirect() {
  const params = useParams();
  const router = useRouter();
  const slug = params?.slug as string | undefined;

  useEffect(() => {
    if (slug) {
      router.replace(`/?song=${encodeURIComponent(slug)}`);
    }
  }, [slug, router]);

  return (
    <main className="min-h-screen flex items-center justify-center bg-[var(--page-bg)] text-[var(--text-muted)]">
      <p className="text-sm">Redirecting to song…</p>
    </main>
  );
}
