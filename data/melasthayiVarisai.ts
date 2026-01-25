// Melasthayi Varisai - Exercises in the middle octave
// These exercises focus on the middle octave range

import { Varisai, parseVarisaiNote, convertVarisaiNote } from './saraliVarisai';

export const MELASTHAYI_VARISAI: Varisai[] = [
  {
    number: 1,
    name: "Melasthayi Varisai 1",
    notes: [
      "S", "R", "G", "M", "P", "D", "N", ">S", 
      ">S", ";", ";", ";", ">S", ";", ";", ";",
      "D", "N", ">S", ">R", ">S", "N", "D", "P",
      ">S", "N", "D", "P", "M", "G", "R", "S",
    ]
  },
  {
    number: 2,
    name: "Melasthayi Varisai 2",
    notes: [
      "S", "R", "G", "M", "P", "D", "N", ">S", 
      ">S", ";", ";", ";", ">S", ";", ";", ";",
      "D", "N", ">S", ">R", ">S", ">S", ">R", ">S",
      ">S", ">R", ">S", "N", "D", "P", "M", "P",
      "D", "N", ">S", ">R", ">S", "N", "D", "P",
      ">S", "N", "D", "P", "M", "G", "R", "S",
    ]
  },
  {
    number: 3,
    name: "Melasthayi Varisai 3",
    notes: [
      "S", "R", "G", "M", "P", "D", "N", ">S", 
      ">S", ";", ";", ";", ">S", ";", ";", ";",
      "D", "N", ">S", ">R", ">G", ">R", ">S", ">R",
      ">S", ">R", ">S", "N", "D", "P", "M", "P",
      "D", "N", ">S", ">R", ">S", ">S", ">R", ">S",
      ">S", ">R", ">S", "N", "D", "P", "M", "P",
      "D", "N", ">S", ">R", ">S", "N", "D", "P",
      ">S", "N", "D", "P", "M", "G", "R", "S",
    ]
  },
  {
    number: 4,
    name: "Melasthayi Varisai 4",
    notes: [
      "S", "R", "G", "M", "P", "D", "N", ">S", 
      ">S", ";", ";", ";", ">S", ";", ";", ";",
      "D", "N", ">S", ">R", ">G", ">M", ">G", ">R",
      ">S", ">R", ">S", "N", "D", "P", "M", "P",
      "D", "N", ">S", ">R", ">G", ">R", ">S", ">R",
      ">S", ">R", ">S", "N", "D", "P", "M", "P",
      "D", "N", ">S", ">R", ">S", ">S", ">R", ">S",
      ">S", ">R", ">S", "N", "D", "P", "M", "P",
      "D", "N", ">S", ">R", ">S", "N", "D", "P",
      ">S", "N", "D", "P", "M", "G", "R", "S",
    ]
  },
  {
    number: 5,
    name: "Melasthayi Varisai 5",
    notes: [
      "S", "R", "G", "M", "P", "D", "N", ">S", 
      ">S", ";", ";", ";", ">S", ";", ";", ";",
      "D", "N", ">S", ">R", ">G", ">M", ">P", ">M",
      ">G", ">R", ">S", "N", "D", "P", "M", "P",
      "D", "N", ">S", ">R", ">G", ">M", ">G", ">R",
      ">S", ">R", ">S", "N", "D", "P", "M", "P",
      "D", "N", ">S", ">R", ">G", ">R", ">S", ">R",
      ">S", ">R", ">S", "N", "D", "P", "M", "P",
      "D", "N", ">S", ">R", ">S", ">S", ">R", ">S",
      ">S", ">R", ">S", "N", "D", "P", "M", "P",
      "D", "N", ">S", ">R", ">S", "N", "D", "P",
      ">S", "N", "D", "P", "M", "G", "R", "S",
    ]
  }
];

// Re-export helper functions
export { parseVarisaiNote, convertVarisaiNote };
