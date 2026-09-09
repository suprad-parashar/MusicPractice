import type { IconName } from '@/components/ui/Icon';
import type { Tab } from '@/lib/settings';

export const NAVIGATION: {
  id: Tab;
  label: string;
  icon: IconName;
  group: 'Practice' | 'Discover';
  description: string;
}[] = [
  {
    id: 'raga',
    label: 'Raga explorer',
    icon: 'ragas',
    group: 'Practice',
    description: 'Get to know a raga, one swara at a time.',
  },
  {
    id: 'varisai',
    label: 'Exercises',
    icon: 'practice',
    group: 'Practice',
    description: 'Small steps. Strong foundations. A little better every day.',
  },
  {
    id: 'auditory',
    label: 'Ear training',
    icon: 'headphones',
    group: 'Practice',
    description: 'Listen closely. Build a deeper connection with every note.',
  },
  {
    id: 'rhythm',
    label: 'Rhythm',
    icon: 'rhythm',
    group: 'Practice',
    description: 'Feel the pulse and make every beat count.',
  },
  {
    id: 'compositions',
    label: 'Compositions',
    icon: 'library',
    group: 'Discover',
    description: 'Bring your practice to life through music you love.',
  },
  {
    id: 'learn',
    label: 'Learn',
    icon: 'book',
    group: 'Discover',
    description: 'A thoughtful introduction to the language of music.',
  },
];
