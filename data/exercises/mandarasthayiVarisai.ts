// Mandarasthayi Varisai - Exercises in the lower octave
// These exercises focus on the lower octave range

import { Varisai, parseVarisaiNote, convertVarisaiNote } from './saraliVarisai';

export const MANDARASTHAYI_VARISAI: Varisai[] = [
  {
    number: 1,
    name: 'Mandarasthayi Varisai 1',
    // prettier-ignore
    notes: [
      '>S', 'N', 'D', 'P', 'M', 'G', 'R', 'S',
      'S', ';', ';', ';', 'S', ';', ';', ';',
      'G', 'R', 'S', '<N', 'S', 'R', 'G', 'M',
      'S', 'R', 'G', 'M', 'P', 'D', 'N', '>S',
    ],
  },
  {
    number: 2,
    name: 'Mandarasthayi Varisai 2',
    // prettier-ignore
    notes: [
      '>S', 'N', 'D', 'P', 'M', 'G', 'R', 'S',
      'S', ';', ';', ';', 'S', ';', ';', ';',
      'G', 'R', 'S', '<N', 'S', 'S', '<N', 'S',
      'S', '<N', 'S', 'R', 'G', 'M', 'P', 'M',
      'G', 'R', 'S', '<N', 'S', 'R', 'G', 'M',
      'S', 'R', 'G', 'M', 'P', 'D', 'N', '>S',
    ],
  },
  {
    number: 3,
    name: 'Mandarasthayi Varisai 3',
    // prettier-ignore
    notes: [
      '>S', 'N', 'D', 'P', 'M', 'G', 'R', 'S',
      'S', ';', ';', ';', 'S', ';', ';', ';',
      'G', 'R', 'S', '<N', '<D', '<N', 'S', '<N',
      'S', '<N', 'S', 'R', 'G', 'M', 'P', 'M',
      'G', 'R', 'S', '<N', 'S', 'S', '<N', 'S',
      'S', '<N', 'S', 'R', 'G', 'M', 'P', 'M',
      'G', 'R', 'S', '<N', 'S', 'R', 'G', 'M',
      'S', 'R', 'G', 'M', 'P', 'D', 'N', '>S',
    ],
  },
  {
    number: 4,
    name: 'Mandarasthayi Varisai 4',
    // prettier-ignore
    notes: [
      '>S', 'N', 'D', 'P', 'M', 'G', 'R', 'S',
      'S', ';', ';', ';', 'S', ';', ';', ';',
      'G', 'R', 'S', '<N', '<D', '<P', '<D', '<N',
      'S', '<N', 'S', 'R', 'G', 'M', 'P', 'M',
      'G', 'R', 'S', '<N', '<D', '<N', 'S', '<N',
      'S', '<N', 'S', 'R', 'G', 'M', 'P', 'M',
      'G', 'R', 'S', '<N', 'S', 'S', '<N', 'S',
      'S', '<N', 'S', 'R', 'G', 'M', 'P', 'M',
      'G', 'R', 'S', '<N', 'S', 'R', 'G', 'M',
      'S', 'R', 'G', 'M', 'P', 'D', 'N', '>S',
    ],
  },
  {
    number: 5,
    name: 'Mandarasthayi Varisai 5',
    // prettier-ignore
    notes: [
      '>S', 'N', 'D', 'P', 'M', 'G', 'R', 'S',
      'S', ';', ';', ';', 'S', ';', ';', ';',
      'G', 'R', 'S', '<N', '<D', '<P', '<M', '<P',
      '<D', '<N', 'S', 'R', 'G', 'M', 'P', 'M',
      'G', 'R', 'S', '<N', '<D', '<P', '<D', '<N',
      'S', '<N', 'S', 'R', 'G', 'M', 'P', 'M',
      'G', 'R', 'S', '<N', '<D', '<N', 'S', '<N',
      'S', '<N', 'S', 'R', 'G', 'M', 'P', 'M',
      'G', 'R', 'S', '<N', 'S', 'S', '<N', 'S',
      'S', '<N', 'S', 'R', 'G', 'M', 'P', 'M',
      'G', 'R', 'S', '<N', 'S', 'R', 'G', 'M',
      'S', 'R', 'G', 'M', 'P', 'D', 'N', '>S',
    ],
  },
];

// Re-export helper functions
export { parseVarisaiNote, convertVarisaiNote };
