'use client';

import { useEffect, useState } from 'react';
import { createMetronome } from '@/lib/audio/metronome';

/** The player owns its metronome; leaving the screen releases only its own resources. */
export function useMetronome() {
  const [metronome] = useState(createMetronome);
  useEffect(() => () => metronome.dispose(), [metronome]);
  return metronome;
}
