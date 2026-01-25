// Sarali Varisai - 14 exercises
// These are the basic exercises in Carnatic music

export interface Varisai {
  number: number;
  name: string;
  notes: string[]; // Array of swaras
}

export const SARALI_VARISAI: Varisai[] = [
  {
    number: 1,
    name: "Sarali Varisai 1",
    notes: ["S", "R", "G", "M", "P", "D", "N", ">S", ">S", "N", "D", "P", "M", "G", "R", "S"]
  },
  {
    number: 2,
    name: "Sarali Varisai 2",
    notes: ["S", "R", "S", "R", "S", "R","G", "M", "S", "R","G", "M", "P", "D", "N", ">S", ">S", "N", ">S", "N", ">S", "N", "D", "P", ">S", "N", "D", "P", "M", "G", "R", "S"]
  },
  {
    number: 3,
    name: "Sarali Varisai 3",
    notes: ["S", "R", "G", "S", "R", "G", "S", "R", "S", "R", "G", "M", "P", "D", "N", ">S", ">S", "N", "D", ">S", "N", "D", ">S", "N", ">S", "N", "D", "P", "M", "G", "R", "S"]
  },
  {
    number: 4,
    name: "Sarali Varisai 4",
    notes: ["S", "R", "G", "M", "S", "R", "G", "M", "S", "R", "G", "M", "P", "D", "N", ">S", ">S", "N", "D", "P", ">S", "N", "D", "P", ">S", "N", "D", "P", "M", "G", "R", "S"]
  },
  {
    number: 5,
    name: "Sarali Varisai 5",
    notes: ["S", "R", "G", "M", "P", ";", "S", "R", "S", "R", "G", "M", "P", "D", "N", ">S", ">S", "N", "D", "P", "M", ";", ">S", "N", ">S", "N", "D", "P", "M", "G", "R", "S"]
  },
  {
    number: 6,
    name: "Sarali Varisai 6",
    notes: ["S", "R", "G", "M", "P", "D", "S", "R", "S", "R", "G", "M", "P", "D", "N", ">S", ">S", "N", "D", "P", "M", "G", ">S", "N", ">S", "N", "D", "P", "M", "G", "R", "S"]
  },
  {
    number: 7,
    name: "Sarali Varisai 7",
    notes: ["S", "R", "G", "M", "P", "D", "N", ";", "S", "R", "G", "M", "P", "D", "N", ">S", ">S", "N", "D", "P", "M", "G", "R", ";", ">S", "N", "D", "P", "M", "G", "R", "S"]
  },
  {
    number: 8,
    name: "Sarali Varisai 8",
    notes: ["S", "R", "G", "M", "P", "M", "G", "R", "S", "R", "G", "M", "P", "D", "N", ">S", ">S", "N", "D", "P", "M", "P", "D", "N", ">S", "N", "D", "P", "M", "G", "R", "S"]
  },
  {
    number: 9,
    name: "Sarali Varisai 9",
    notes: ["S", "R", "G", "M", "P", "M", "D", "P", "S", "R", "G", "M", "P", "D", "N", ">S", ">S", "N", "D", "P", "M", "P", "G", "M", ">S", "N", "D", "P", "M", "G", "R", "S"]
  },
  {
    number: 10,
    name: "Sarali Varisai 10",
    notes: ["S", "R", "G", "M", "P", ";", "G", "M", "P", ";", ";", ";", "P", ";", ";", ";", "G", "M", "P", "D", "N", "D", "P", "M", "G", "M", "P", "G", "M", "G", "R", "S"]
  },
  {
    number: 11,
    name: "Sarali Varisai 11",
    notes: [">S", ";", "N", "D", "N", ";", "D", "P", "D", ";", "P", "M", "P", ";", "P", ";", "G", "M", "P", "D", "N", "D", "P", "M", "G", "M", "P", "G", "M", "G", "R", "S"]
  },
  {
    number: 12,
    name: "Sarali Varisai 12",
    notes: [">S", ">S", "N", "D", "N", "N", "D", "P", "D", "D", "P", "M", "P", ";", "P", ";", "G", "M", "P", "D", "N", "D", "P", "M", "G", "M", "P", "G", "M", "G", "R", "S"]
  },
  {
    number: 13,
    name: "Sarali Varisai 13",
    notes: ["S", "R", "G", "R", "G", ";", "G", "M", "P", "M", "P", ";", "D", "P", "D", ";", "M", "P", "D", "P", "D", "N", "D", "P", "M", "P", "D", "P", "M", "G", "R", "S"]
  },
  {
    number: 14,
    name: "Sarali Varisai 14",
    notes: ["S", "R", "G", "M", "P", ";", "P", ";", "D", "D", "P", ";", "M", "M", "P", ";", "D", "N", ">S", ";", ">S", "N", "D", "P", ">S", "N", "D", "P", "M", "G", "R", "S"]
  }
];

// Helper function to parse note with octave indicators
// ">" prefix = higher octave (2x frequency)
// "<" prefix = lower octave (0.5x frequency)
// Returns: { swara: string, octave: 'higher' | 'lower' | 'normal' }
export function parseVarisaiNote(note: string): { swara: string; octave: 'higher' | 'lower' | 'normal' } {
  if (note.startsWith('>')) {
    return { swara: note.substring(1), octave: 'higher' };
  } else if (note.startsWith('<')) {
    return { swara: note.substring(1), octave: 'lower' };
  }
  return { swara: note, octave: 'normal' };
}

// Helper function to convert simple swara notation to full notation
// In Sarali Varisai, R = R2, G = G3, M = M1, P = P, D = D2, N = N3 (Mayamalavagowla scale)
// Preserves octave indicators (">" and "<")
export function convertVarisaiNote(note: string): string {
  const parsed = parseVarisaiNote(note);
  const noteMap: { [key: string]: string } = {
    "S": "S",
    "R": "R2",  // Chatushruti Rishabha
    "G": "G3",  // Antara Gandhara
    "M": "M1",  // Shuddha Madhyama
    "P": "P",   // Panchama
    "D": "D2",  // Chatushruti Dhaivata
    "N": "N3",  // Kakali Nishada
  };
  
  const baseSwara = noteMap[parsed.swara] || parsed.swara;
  
  // Preserve octave indicator
  if (parsed.octave === 'higher') {
    return `>${baseSwara}`;
  } else if (parsed.octave === 'lower') {
    return `<${baseSwara}`;
  }
  return baseSwara;
}
