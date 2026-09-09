// DhatuJanta Varisai - Combination of Dhatu and Janta patterns
// These exercises combine note patterns with repeated notes

import { Varisai, parseVarisaiNote, convertVarisaiNote } from './saraliVarisai';

export const DHATU_JANTA_VARISAI: Varisai[] = [
  {
    number: 1,
    name: 'DhatuJanta Varisai 1',
    // prettier-ignore
    notes: [
      'S', 'S', 'R', 'G', 'R', 'R', 'G', 'M',
      'G', 'G', 'M', 'P', 'M', 'M', 'P', 'D',
      'P', 'P', 'D', 'N', 'D', 'D', 'N', '>S',
      'N', 'N', '>S', 'N', 'D', 'D', 'N', 'D',
      'P', 'D', 'D', 'P', 'M', 'P', 'P', 'M',
      'G', 'M', 'M', 'G', 'R', 'G', 'G', 'R',
      'S', 'S',
    ],
  },
  {
    number: 2,
    name: 'DhatuJanta Varisai 2',
    // prettier-ignore
    notes: [
      'S', 'S', 'R', 'G', 'R', 'R', 'G', 'M',
      'G', 'G', 'M', 'P', 'M', 'M', 'P', 'D',
      'P', 'P', 'D', 'N', 'D', 'D', 'N', '>S',
      'N', 'N', '>S', 'N', 'D', 'D', 'N', 'D',
      'P', 'D', 'D', 'P', 'M', 'P', 'P', 'M',
      'G', 'M', 'M', 'G', 'R', 'G', 'G', 'R',
      'S', 'S',
    ],
  },
  {
    number: 3,
    name: 'DhatuJanta Varisai 3',
    // prettier-ignore
    notes: [
      'S', 'S', 'R', 'G', 'R', 'R', 'G', 'M',
      'G', 'G', 'M', 'P', 'M', 'M', 'P', 'D',
      'P', 'P', 'D', 'N', 'D', 'D', 'N', '>S',
      'N', 'N', '>S', 'N', 'D', 'D', 'N', 'D',
      'P', 'D', 'D', 'P', 'M', 'P', 'P', 'M',
      'G', 'M', 'M', 'G', 'R', 'G', 'G', 'R',
      'S', 'S',
    ],
  },
  {
    number: 4,
    name: 'DhatuJanta Varisai 4',
    // prettier-ignore
    notes: [
      'S', 'S', 'R', 'G', 'R', 'R', 'G', 'M',
      'G', 'G', 'M', 'P', 'M', 'M', 'P', 'D',
      'P', 'P', 'D', 'N', 'D', 'D', 'N', '>S',
      'N', 'N', '>S', 'N', 'D', 'D', 'N', 'D',
      'P', 'D', 'D', 'P', 'M', 'P', 'P', 'M',
      'G', 'M', 'M', 'G', 'R', 'G', 'G', 'R',
      'S', 'S',
    ],
  },
  {
    number: 5,
    name: 'DhatuJanta Varisai 5',
    // prettier-ignore
    notes: [
      'S', 'S', 'R', 'G', 'R', 'R', 'G', 'M',
      'G', 'G', 'M', 'P', 'M', 'M', 'P', 'D',
      'P', 'P', 'D', 'N', 'D', 'D', 'N', '>S',
      'N', 'N', '>S', 'N', 'D', 'D', 'N', 'D',
      'P', 'D', 'D', 'P', 'M', 'P', 'P', 'M',
      'G', 'M', 'M', 'G', 'R', 'G', 'G', 'R',
      'S', 'S',
    ],
  },
  {
    number: 6,
    name: 'DhatuJanta Varisai 6',
    // prettier-ignore
    notes: [
      'S', 'S', 'R', 'G', 'R', 'R', 'G', 'M',
      'G', 'G', 'M', 'P', 'M', 'M', 'P', 'D',
      'P', 'P', 'D', 'N', 'D', 'D', 'N', '>S',
      'N', 'N', '>S', 'N', 'D', 'D', 'N', 'D',
      'P', 'D', 'D', 'P', 'M', 'P', 'P', 'M',
      'G', 'M', 'M', 'G', 'R', 'G', 'G', 'R',
      'S', 'S',
    ],
  },
  {
    number: 7,
    name: 'DhatuJanta Varisai 7',
    // prettier-ignore
    notes: [
      'S', 'S', 'R', 'G', 'R', 'R', 'G', 'M',
      'G', 'G', 'M', 'P', 'M', 'M', 'P', 'D',
      'P', 'P', 'D', 'N', 'D', 'D', 'N', '>S',
      'N', 'N', '>S', 'N', 'D', 'D', 'N', 'D',
      'P', 'D', 'D', 'P', 'M', 'P', 'P', 'M',
      'G', 'M', 'M', 'G', 'R', 'G', 'G', 'R',
      'S', 'S',
    ],
  },
  {
    number: 8,
    name: 'DhatuJanta Varisai 8',
    // prettier-ignore
    notes: [
      'S', 'S', 'R', 'G', 'R', 'R', 'G', 'M',
      'G', 'G', 'M', 'P', 'M', 'M', 'P', 'D',
      'P', 'P', 'D', 'N', 'D', 'D', 'N', '>S',
      'N', 'N', '>S', 'N', 'D', 'D', 'N', 'D',
      'P', 'D', 'D', 'P', 'M', 'P', 'P', 'M',
      'G', 'M', 'M', 'G', 'R', 'G', 'G', 'R',
      'S', 'S',
    ],
  },
  {
    number: 9,
    name: 'DhatuJanta Varisai 9',
    // prettier-ignore
    notes: [
      'S', 'S', 'R', 'G', 'R', 'R', 'G', 'M',
      'G', 'G', 'M', 'P', 'M', 'M', 'P', 'D',
      'P', 'P', 'D', 'N', 'D', 'D', 'N', '>S',
      'N', 'N', '>S', 'N', 'D', 'D', 'N', 'D',
      'P', 'D', 'D', 'P', 'M', 'P', 'P', 'M',
      'G', 'M', 'M', 'G', 'R', 'G', 'G', 'R',
      'S', 'S',
    ],
  },
  {
    number: 10,
    name: 'DhatuJanta Varisai 10',
    // prettier-ignore
    notes: [
      'S', 'S', 'R', 'G', 'R', 'R', 'G', 'M',
      'G', 'G', 'M', 'P', 'M', 'M', 'P', 'D',
      'P', 'P', 'D', 'N', 'D', 'D', 'N', '>S',
      'N', 'N', '>S', 'N', 'D', 'D', 'N', 'D',
      'P', 'D', 'D', 'P', 'M', 'P', 'P', 'M',
      'G', 'M', 'M', 'G', 'R', 'G', 'G', 'R',
      'S', 'S',
    ],
  },
  {
    number: 11,
    name: 'DhatuJanta Varisai 11',
    // prettier-ignore
    notes: [
      'S', 'S', 'R', 'G', 'R', 'R', 'G', 'M',
      'G', 'G', 'M', 'P', 'M', 'M', 'P', 'D',
      'P', 'P', 'D', 'N', 'D', 'D', 'N', '>S',
      'N', 'N', '>S', 'N', 'D', 'D', 'N', 'D',
      'P', 'D', 'D', 'P', 'M', 'P', 'P', 'M',
      'G', 'M', 'M', 'G', 'R', 'G', 'G', 'R',
      'S', 'S',
    ],
  },
  {
    number: 12,
    name: 'DhatuJanta Varisai 12',
    // prettier-ignore
    notes: [
      'S', 'S', 'R', 'G', 'R', 'R', 'G', 'M',
      'G', 'G', 'M', 'P', 'M', 'M', 'P', 'D',
      'P', 'P', 'D', 'N', 'D', 'D', 'N', '>S',
      'N', 'N', '>S', 'N', 'D', 'D', 'N', 'D',
      'P', 'D', 'D', 'P', 'M', 'P', 'P', 'M',
      'G', 'M', 'M', 'G', 'R', 'G', 'G', 'R',
      'S', 'S',
    ],
  },
  {
    number: 13,
    name: 'DhatuJanta Varisai 13',
    // prettier-ignore
    notes: [
      'S', 'S', 'R', 'G', 'R', 'R', 'G', 'M',
      'G', 'G', 'M', 'P', 'M', 'M', 'P', 'D',
      'P', 'P', 'D', 'N', 'D', 'D', 'N', '>S',
      'N', 'N', '>S', 'N', 'D', 'D', 'N', 'D',
      'P', 'D', 'D', 'P', 'M', 'P', 'P', 'M',
      'G', 'M', 'M', 'G', 'R', 'G', 'G', 'R',
      'S', 'S',
    ],
  },
  {
    number: 14,
    name: 'DhatuJanta Varisai 14',
    // prettier-ignore
    notes: [
      'S', 'S', 'R', 'G', 'R', 'R', 'G', 'M',
      'G', 'G', 'M', 'P', 'M', 'M', 'P', 'D',
      'P', 'P', 'D', 'N', 'D', 'D', 'N', '>S',
      'N', 'N', '>S', 'N', 'D', 'D', 'N', 'D',
      'P', 'D', 'D', 'P', 'M', 'P', 'P', 'M',
      'G', 'M', 'M', 'G', 'R', 'G', 'G', 'R',
      'S', 'S',
    ],
  },
];

// Re-export helper functions
export { parseVarisaiNote, convertVarisaiNote };
