// Dhatu Varisai - Exercises with note patterns
// These exercises focus on different note combinations

import { Varisai, parseVarisaiNote, convertVarisaiNote } from './saraliVarisai';

export const DHATU_VARISAI: Varisai[] = [
  {
    number: 1,
    name: "Dhatu Varisai 1",
    notes: ["S", "R", "G", "R", "G", "M", "G", "M", "P", "M", "P", "D", "P", "D", "N", "D", "N", ">S", "N", ">S", "N", "D", "N", "D", "P", "D", "P", "M", "P", "M", "G", "M", "G", "R", "G", "R", "S"]
  },
  {
    number: 2,
    name: "Dhatu Varisai 2",
    notes: ["S", "R", "G", "R", "G", "M", "G", "M", "P", "M", "P", "D", "P", "D", "N", "D", "N", ">S", "N", ">S", "N", "D", "N", "D", "P", "D", "P", "M", "P", "M", "G", "M", "G", "R", "G", "R", "S"]
  },
  {
    number: 3,
    name: "Dhatu Varisai 3",
    notes: ["S", "R", "G", "R", "G", "M", "G", "M", "P", "M", "P", "D", "P", "D", "N", "D", "N", ">S", "N", ">S", "N", "D", "N", "D", "P", "D", "P", "M", "P", "M", "G", "M", "G", "R", "G", "R", "S"]
  },
  {
    number: 4,
    name: "Dhatu Varisai 4",
    notes: ["S", "R", "G", "R", "G", "M", "G", "M", "P", "M", "P", "D", "P", "D", "N", "D", "N", ">S", "N", ">S", "N", "D", "N", "D", "P", "D", "P", "M", "P", "M", "G", "M", "G", "R", "G", "R", "S"]
  },
  {
    number: 5,
    name: "Dhatu Varisai 5",
    notes: ["S", "R", "G", "R", "G", "M", "G", "M", "P", "M", "P", "D", "P", "D", "N", "D", "N", ">S", "N", ">S", "N", "D", "N", "D", "P", "D", "P", "M", "P", "M", "G", "M", "G", "R", "G", "R", "S"]
  },
  {
    number: 6,
    name: "Dhatu Varisai 6",
    notes: ["S", "R", "G", "R", "G", "M", "G", "M", "P", "M", "P", "D", "P", "D", "N", "D", "N", ">S", "N", ">S", "N", "D", "N", "D", "P", "D", "P", "M", "P", "M", "G", "M", "G", "R", "G", "R", "S"]
  },
  {
    number: 7,
    name: "Dhatu Varisai 7",
    notes: ["S", "R", "G", "R", "G", "M", "G", "M", "P", "M", "P", "D", "P", "D", "N", "D", "N", ">S", "N", ">S", "N", "D", "N", "D", "P", "D", "P", "M", "P", "M", "G", "M", "G", "R", "G", "R", "S"]
  },
  {
    number: 8,
    name: "Dhatu Varisai 8",
    notes: ["S", "R", "G", "R", "G", "M", "G", "M", "P", "M", "P", "D", "P", "D", "N", "D", "N", ">S", "N", ">S", "N", "D", "N", "D", "P", "D", "P", "M", "P", "M", "G", "M", "G", "R", "G", "R", "S"]
  },
  {
    number: 9,
    name: "Dhatu Varisai 9",
    notes: ["S", "R", "G", "R", "G", "M", "G", "M", "P", "M", "P", "D", "P", "D", "N", "D", "N", ">S", "N", ">S", "N", "D", "N", "D", "P", "D", "P", "M", "P", "M", "G", "M", "G", "R", "G", "R", "S"]
  },
  {
    number: 10,
    name: "Dhatu Varisai 10",
    notes: ["S", "R", "G", "R", "G", "M", "G", "M", "P", "M", "P", "D", "P", "D", "N", "D", "N", ">S", "N", ">S", "N", "D", "N", "D", "P", "D", "P", "M", "P", "M", "G", "M", "G", "R", "G", "R", "S"]
  },
  {
    number: 11,
    name: "Dhatu Varisai 11",
    notes: ["S", "R", "G", "R", "G", "M", "G", "M", "P", "M", "P", "D", "P", "D", "N", "D", "N", ">S", "N", ">S", "N", "D", "N", "D", "P", "D", "P", "M", "P", "M", "G", "M", "G", "R", "G", "R", "S"]
  },
  {
    number: 12,
    name: "Dhatu Varisai 12",
    notes: ["S", "R", "G", "R", "G", "M", "G", "M", "P", "M", "P", "D", "P", "D", "N", "D", "N", ">S", "N", ">S", "N", "D", "N", "D", "P", "D", "P", "M", "P", "M", "G", "M", "G", "R", "G", "R", "S"]
  },
  {
    number: 13,
    name: "Dhatu Varisai 13",
    notes: ["S", "R", "G", "R", "G", "M", "G", "M", "P", "M", "P", "D", "P", "D", "N", "D", "N", ">S", "N", ">S", "N", "D", "N", "D", "P", "D", "P", "M", "P", "M", "G", "M", "G", "R", "G", "R", "S"]
  },
  {
    number: 14,
    name: "Dhatu Varisai 14",
    notes: ["S", "R", "G", "R", "G", "M", "G", "M", "P", "M", "P", "D", "P", "D", "N", "D", "N", ">S", "N", ">S", "N", "D", "N", "D", "P", "D", "P", "M", "P", "M", "G", "M", "G", "R", "G", "R", "S"]
  }
];

// Re-export helper functions
export { parseVarisaiNote, convertVarisaiNote };
