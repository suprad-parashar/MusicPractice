import { Suspense } from 'react';
import PracticeApp from '@/components/studio/PracticeApp';
import { LoadingState } from '@/components/ui/LoadingState';

export default function Home() {
  return (
    <Suspense fallback={<LoadingState />}>
      <PracticeApp />
    </Suspense>
  );
}
