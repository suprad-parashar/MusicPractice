import { SONGS } from '@/data/songs';
import SongRedirect from './SongRedirect';

export function generateStaticParams() {
  return SONGS.map((song) => ({ slug: song.slug }));
}

export default function SongPage() {
  return <SongRedirect />;
}
