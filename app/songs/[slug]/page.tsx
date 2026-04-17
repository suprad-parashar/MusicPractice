import { COMPOSITIONS } from '@/data/compositions';
import SongRedirect from './SongRedirect';

export function generateStaticParams() {
  return COMPOSITIONS.map((c) => ({ slug: c.slug }));
}

export default function SongPage() {
  return <SongRedirect />;
}
