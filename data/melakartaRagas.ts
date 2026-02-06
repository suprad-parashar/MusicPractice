// Melakarta Ragas - All 72 ragas with their swaras
// Format: { number, name, arohana (ascending), avarohana (descending) }
// Swaras: S, R1, R2, R3, G1, G2, G3, M1, M2, P, D1, D2, D3, N1, N2, N3

export interface Raga {
  number: number;
  name: string;
  arohana: string[];
  avarohana: string[];
  isMelakarta?: boolean; // Optional flag to distinguish if needed
  parentMelakarta?: number; // Optional reference to parent
}

export type MelakartaRaga = Raga;

export const MELAKARTA_RAGAS: MelakartaRaga[] = [
  { number: 1, name: "Kanakangi", arohana: ["S", "R1", "G1", "M1", "P", "D1", "N1", ">S"], avarohana: [">S", "N1", "D1", "P", "M1", "G1", "R1", "S"] },
  { number: 2, name: "Rathnangi", arohana: ["S", "R1", "G1", "M1", "P", "D1", "N2", ">S"], avarohana: [">S", "N2", "D1", "P", "M1", "G1", "R1", "S"] },
  { number: 3, name: "Ganamurti", arohana: ["S", "R1", "G1", "M1", "P", "D1", "N3", ">S"], avarohana: [">S", "N3", "D1", "P", "M1", "G1", "R1", "S"] },
  { number: 4, name: "Vanaspati", arohana: ["S", "R1", "G1", "M1", "P", "D2", "N2", ">S"], avarohana: [">S", "N2", "D2", "P", "M1", "G1", "R1", "S"] },
  { number: 5, name: "Manavati", arohana: ["S", "R1", "G1", "M1", "P", "D2", "N3", ">S"], avarohana: [">S", "N3", "D2", "P", "M1", "G1", "R1", "S"] },
  { number: 6, name: "Tanarupi", arohana: ["S", "R1", "G1", "M1", "P", "D3", "N3", ">S"], avarohana: [">S", "N3", "D3", "P", "M1", "G1", "R1", "S"] },
  { number: 7, name: "Senavati", arohana: ["S", "R1", "G2", "M1", "P", "D1", "N1", ">S"], avarohana: [">S", "N1", "D1", "P", "M1", "G2", "R1", "S"] },
  { number: 8, name: "Hanumatodi", arohana: ["S", "R1", "G2", "M1", "P", "D1", "N2", ">S"], avarohana: [">S", "N2", "D1", "P", "M1", "G2", "R1", "S"] },
  { number: 9, name: "Dhenuka", arohana: ["S", "R1", "G2", "M1", "P", "D1", "N3", ">S"], avarohana: [">S", "N3", "D1", "P", "M1", "G2", "R1", "S"] },
  { number: 10, name: "Natakapriya", arohana: ["S", "R1", "G2", "M1", "P", "D2", "N2", ">S"], avarohana: [">S", "N2", "D2", "P", "M1", "G2", "R1", "S"] },
  { number: 11, name: "Kokilapriya", arohana: ["S", "R1", "G2", "M1", "P", "D2", "N3", ">S"], avarohana: [">S", "N3", "D2", "P", "M1", "G2", "R1", "S"] },
  { number: 12, name: "Rupavati", arohana: ["S", "R1", "G2", "M1", "P", "D3", "N3", ">S"], avarohana: [">S", "N3", "D3", "P", "M1", "G2", "R1", "S"] },
  { number: 13, name: "Gayakapriya", arohana: ["S", "R1", "G3", "M1", "P", "D1", "N1", ">S"], avarohana: [">S", "N1", "D1", "P", "M1", "G3", "R1", "S"] },
  { number: 14, name: "Vakulabharanam", arohana: ["S", "R1", "G3", "M1", "P", "D1", "N2", ">S"], avarohana: [">S", "N2", "D1", "P", "M1", "G3", "R1", "S"] },
  { number: 15, name: "Mayamalavagowla", arohana: ["S", "R1", "G3", "M1", "P", "D1", "N3", ">S"], avarohana: [">S", "N3", "D1", "P", "M1", "G3", "R1", "S"] },
  { number: 16, name: "Chakravakam", arohana: ["S", "R1", "G3", "M1", "P", "D2", "N2", ">S"], avarohana: [">S", "N2", "D2", "P", "M1", "G3", "R1", "S"] },
  { number: 17, name: "Suryakantam", arohana: ["S", "R1", "G3", "M1", "P", "D2", "N3", ">S"], avarohana: [">S", "N3", "D2", "P", "M1", "G3", "R1", "S"] },
  { number: 18, name: "Hatakambari", arohana: ["S", "R1", "G3", "M1", "P", "D3", "N3", ">S"], avarohana: [">S", "N3", "D3", "P", "M1", "G3", "R1", "S"] },
  { number: 19, name: "Jhankaradhvani", arohana: ["S", "R2", "G2", "M1", "P", "D1", "N1", ">S"], avarohana: [">S", "N1", "D1", "P", "M1", "G2", "R2", "S"] },
  { number: 20, name: "Natabhairavi", arohana: ["S", "R2", "G2", "M1", "P", "D1", "N2", ">S"], avarohana: [">S", "N2", "D1", "P", "M1", "G2", "R2", "S"] },
  { number: 21, name: "Kiravani", arohana: ["S", "R2", "G2", "M1", "P", "D1", "N3", ">S"], avarohana: [">S", "N3", "D1", "P", "M1", "G2", "R2", "S"] },
  { number: 22, name: "Kharaharapriya", arohana: ["S", "R2", "G2", "M1", "P", "D2", "N2", ">S"], avarohana: [">S", "N2", "D2", "P", "M1", "G2", "R2", "S"] },
  { number: 23, name: "Gaurimanohari", arohana: ["S", "R2", "G2", "M1", "P", "D2", "N3", ">S"], avarohana: [">S", "N3", "D2", "P", "M1", "G2", "R2", "S"] },
  { number: 24, name: "Varunapriya", arohana: ["S", "R2", "G2", "M1", "P", "D3", "N3", ">S"], avarohana: [">S", "N3", "D3", "P", "M1", "G2", "R2", "S"] },
  { number: 25, name: "Mararanjani", arohana: ["S", "R2", "G3", "M1", "P", "D1", "N1", ">S"], avarohana: [">S", "N1", "D1", "P", "M1", "G3", "R2", "S"] },
  { number: 26, name: "Charukesi", arohana: ["S", "R2", "G3", "M1", "P", "D1", "N2", ">S"], avarohana: [">S", "N2", "D1", "P", "M1", "G3", "R2", "S"] },
  { number: 27, name: "Sarasangi", arohana: ["S", "R2", "G3", "M1", "P", "D1", "N3", ">S"], avarohana: [">S", "N3", "D1", "P", "M1", "G3", "R2", "S"] },
  { number: 28, name: "Harikambhoji", arohana: ["S", "R2", "G3", "M1", "P", "D2", "N2", ">S"], avarohana: [">S", "N2", "D2", "P", "M1", "G3", "R2", "S"] },
  { number: 29, name: "Dheera Shankarabharanam", arohana: ["S", "R2", "G3", "M1", "P", "D2", "N3", ">S"], avarohana: [">S", "N3", "D2", "P", "M1", "G3", "R2", "S"] },
  { number: 30, name: "Naganandini", arohana: ["S", "R2", "G3", "M1", "P", "D3", "N3", ">S"], avarohana: [">S", "N3", "D3", "P", "M1", "G3", "R2", "S"] },
  { number: 31, name: "Yagapriya", arohana: ["S", "R3", "G3", "M1", "P", "D1", "N1", ">S"], avarohana: [">S", "N1", "D1", "P", "M1", "G3", "R3", "S"] },
  { number: 32, name: "Ragavardhini", arohana: ["S", "R3", "G3", "M1", "P", "D1", "N2", ">S"], avarohana: [">S", "N2", "D1", "P", "M1", "G3", "R3", "S"] },
  { number: 33, name: "Gangeyabhusani", arohana: ["S", "R3", "G3", "M1", "P", "D1", "N3", ">S"], avarohana: [">S", "N3", "D1", "P", "M1", "G3", "R3", "S"] },
  { number: 34, name: "Vagadhisvari", arohana: ["S", "R3", "G3", "M1", "P", "D2", "N2", ">S"], avarohana: [">S", "N2", "D2", "P", "M1", "G3", "R3", "S"] },
  { number: 35, name: "Sulini", arohana: ["S", "R3", "G3", "M1", "P", "D2", "N3", ">S"], avarohana: [">S", "N3", "D2", "P", "M1", "G3", "R3", "S"] },
  { number: 36, name: "Chalanata", arohana: ["S", "R3", "G3", "M1", "P", "D3", "N3", ">S"], avarohana: [">S", "N3", "D3", "P", "M1", "G3", "R3", "S"] },
  { number: 37, name: "Salagam", arohana: ["S", "R1", "G1", "M2", "P", "D1", "N1", ">S"], avarohana: [">S", "N1", "D1", "P", "M2", "G1", "R1", "S"] },
  { number: 38, name: "Jalarnavam", arohana: ["S", "R1", "G1", "M2", "P", "D1", "N2", ">S"], avarohana: [">S", "N2", "D1", "P", "M2", "G1", "R1", "S"] },
  { number: 39, name: "Jhalavarali", arohana: ["S", "R1", "G1", "M2", "P", "D1", "N3", ">S"], avarohana: [">S", "N3", "D1", "P", "M2", "G1", "R1", "S"] },
  { number: 40, name: "Navaneetam", arohana: ["S", "R1", "G1", "M2", "P", "D2", "N2", ">S"], avarohana: [">S", "N2", "D2", "P", "M2", "G1", "R1", "S"] },
  { number: 41, name: "Pavani", arohana: ["S", "R1", "G1", "M2", "P", "D2", "N3", ">S"], avarohana: [">S", "N3", "D2", "P", "M2", "G1", "R1", "S"] },
  { number: 42, name: "Raghupriya", arohana: ["S", "R1", "G1", "M2", "P", "D3", "N3", ">S"], avarohana: [">S", "N3", "D3", "P", "M2", "G1", "R1", "S"] },
  { number: 43, name: "Gavambhodi", arohana: ["S", "R1", "G2", "M2", "P", "D1", "N1", ">S"], avarohana: [">S", "N1", "D1", "P", "M2", "G2", "R1", "S"] },
  { number: 44, name: "Bhavapriya", arohana: ["S", "R1", "G2", "M2", "P", "D1", "N2", ">S"], avarohana: [">S", "N2", "D1", "P", "M2", "G2", "R1", "S"] },
  { number: 45, name: "Shubhapantuvarali", arohana: ["S", "R1", "G2", "M2", "P", "D1", "N3", ">S"], avarohana: [">S", "N3", "D1", "P", "M2", "G2", "R1", "S"] },
  { number: 46, name: "Shadvidamargini", arohana: ["S", "R1", "G2", "M2", "P", "D2", "N2", ">S"], avarohana: [">S", "N2", "D2", "P", "M2", "G2", "R1", "S"] },
  { number: 47, name: "Suvarnangi", arohana: ["S", "R1", "G2", "M2", "P", "D2", "N3", ">S"], avarohana: [">S", "N3", "D2", "P", "M2", "G2", "R1", "S"] },
  { number: 48, name: "Divyamani", arohana: ["S", "R1", "G2", "M2", "P", "D3", "N3", ">S"], avarohana: [">S", "N3", "D3", "P", "M2", "G2", "R1", "S"] },
  { number: 49, name: "Dhavalambari", arohana: ["S", "R1", "G3", "M2", "P", "D1", "N1", ">S"], avarohana: [">S", "N1", "D1", "P", "M2", "G3", "R1", "S"] },
  { number: 50, name: "Namanarayani", arohana: ["S", "R1", "G3", "M2", "P", "D1", "N2", ">S"], avarohana: [">S", "N2", "D1", "P", "M2", "G3", "R1", "S"] },
  { number: 51, name: "Kamavardhini", arohana: ["S", "R1", "G3", "M2", "P", "D1", "N3", ">S"], avarohana: [">S", "N3", "D1", "P", "M2", "G3", "R1", "S"] },
  { number: 52, name: "Ramapriya", arohana: ["S", "R1", "G3", "M2", "P", "D2", "N2", ">S"], avarohana: [">S", "N2", "D2", "P", "M2", "G3", "R1", "S"] },
  { number: 53, name: "Gamanashrama", arohana: ["S", "R1", "G3", "M2", "P", "D2", "N3", ">S"], avarohana: [">S", "N3", "D2", "P", "M2", "G3", "R1", "S"] },
  { number: 54, name: "Vishwambari", arohana: ["S", "R1", "G3", "M2", "P", "D3", "N3", ">S"], avarohana: [">S", "N3", "D3", "P", "M2", "G3", "R1", "S"] },
  { number: 55, name: "Shyamalangi", arohana: ["S", "R2", "G2", "M2", "P", "D1", "N1", ">S"], avarohana: [">S", "N1", "D1", "P", "M2", "G2", "R2", "S"] },
  { number: 56, name: "Shanmukhapriya", arohana: ["S", "R2", "G2", "M2", "P", "D1", "N2", ">S"], avarohana: [">S", "N2", "D1", "P", "M2", "G2", "R2", "S"] },
  { number: 57, name: "Simhendramadhyamam", arohana: ["S", "R2", "G2", "M2", "P", "D1", "N3", ">S"], avarohana: [">S", "N3", "D1", "P", "M2", "G2", "R2", "S"] },
  { number: 58, name: "Hemavati", arohana: ["S", "R2", "G2", "M2", "P", "D2", "N2", ">S"], avarohana: [">S", "N2", "D2", "P", "M2", "G2", "R2", "S"] },
  { number: 59, name: "Dharmavati", arohana: ["S", "R2", "G2", "M2", "P", "D2", "N3", ">S"], avarohana: [">S", "N3", "D2", "P", "M2", "G2", "R2", "S"] },
  { number: 60, name: "Neetimati", arohana: ["S", "R2", "G2", "M2", "P", "D3", "N3", ">S"], avarohana: [">S", "N3", "D3", "P", "M2", "G2", "R2", "S"] },
  { number: 61, name: "Kantamani", arohana: ["S", "R2", "G3", "M2", "P", "D1", "N1", ">S"], avarohana: [">S", "N1", "D1", "P", "M2", "G3", "R2", "S"] },
  { number: 62, name: "Rishabhapriya", arohana: ["S", "R2", "G3", "M2", "P", "D1", "N2", ">S"], avarohana: [">S", "N2", "D1", "P", "M2", "G3", "R2", "S"] },
  { number: 63, name: "Latangi", arohana: ["S", "R2", "G3", "M2", "P", "D1", "N3", ">S"], avarohana: [">S", "N3", "D1", "P", "M2", "G3", "R2", "S"] },
  { number: 64, name: "Vachaspati", arohana: ["S", "R2", "G3", "M2", "P", "D2", "N2", ">S"], avarohana: [">S", "N2", "D2", "P", "M2", "G3", "R2", "S"] },
  { number: 65, name: "Mechakalyani", arohana: ["S", "R2", "G3", "M2", "P", "D2", "N3", ">S"], avarohana: [">S", "N3", "D2", "P", "M2", "G3", "R2", "S"] },
  { number: 66, name: "Chitrambari", arohana: ["S", "R2", "G3", "M2", "P", "D3", "N3", ">S"], avarohana: [">S", "N3", "D3", "P", "M2", "G3", "R2", "S"] },
  { number: 67, name: "Sucharitra", arohana: ["S", "R3", "G3", "M2", "P", "D1", "N1", ">S"], avarohana: [">S", "N1", "D1", "P", "M2", "G3", "R3", "S"] },
  { number: 68, name: "Jyotiswarupini", arohana: ["S", "R3", "G3", "M2", "P", "D1", "N2", ">S"], avarohana: [">S", "N2", "D1", "P", "M2", "G3", "R3", "S"] },
  { number: 69, name: "Dhatuvardhini", arohana: ["S", "R3", "G3", "M2", "P", "D1", "N3", ">S"], avarohana: [">S", "N3", "D1", "P", "M2", "G3", "R3", "S"] },
  { number: 70, name: "Nasikabhusani", arohana: ["S", "R3", "G3", "M2", "P", "D2", "N2", ">S"], avarohana: [">S", "N2", "D2", "P", "M2", "G3", "R3", "S"] },
  { number: 71, name: "Kosalam", arohana: ["S", "R3", "G3", "M2", "P", "D2", "N3", ">S"], avarohana: [">S", "N3", "D2", "P", "M2", "G3", "R3", "S"] },
  { number: 72, name: "Rasikapriya", arohana: ["S", "R3", "G3", "M2", "P", "D3", "N3", ">S"], avarohana: [">S", "N3", "D3", "P", "M2", "G3", "R3", "S"] },
];

// Helper function to get frequency for a swara using Equal Temperament
// Each semitone = 2^(1/12), mapping Carnatic swaras to 12-tone equal temperament
// Note: This function expects the base swara without octave indicators (">" or "<")
// Octave adjustments should be handled by the caller
export function getSwarafrequency(baseFreq: number, swara: string): number {
  // Remove octave indicators if present (shouldn't be, but just in case)
  const cleanSwara = swara.replace(/^[><]/, '');

  // Map swaras to semitones from Sa (0 semitones)
  const swaraSemitones: { [key: string]: number } = {
    "S": 0,    // Sa - 0 semitones
    "R1": 1,   // Shuddha Rishabha - 1 semitone (C#)
    "R2": 2,   // Chatushruti Rishabha - 2 semitones (D)
    "R3": 3,   // Shatshruti Rishabha - 3 semitones (D#)
    "G1": 2,   // Shuddha Gandhara - 2 semitones (D) - same as R2
    "G2": 3,   // Sadharana Gandhara - 3 semitones (D#) - same as R3
    "G3": 4,   // Antara Gandhara - 4 semitones (E)
    "M1": 5,   // Shuddha Madhyama - 5 semitones (F)
    "M2": 6,   // Prati Madhyama - 6 semitones (F#)
    "P": 7,    // Panchama - 7 semitones (G)
    "D1": 8,   // Shuddha Dhaivata - 8 semitones (G#)
    "D2": 9,   // Chatushruti Dhaivata - 9 semitones (A)
    "D3": 10,   // Shatshruti Dhaivata - 10 semitones (A#)
    "N1": 9,  // Shuddha Nishada - 9 semitones (A) - same as D2
    "N2": 10,  // Kaisiki Nishada - 10 semitones (A#) - same as D3
    "N3": 11,  // Kakali Nishada - 11 semitones (B)
  };

  const semitones = swaraSemitones[cleanSwara] || 0;
  // Equal temperament: frequency = baseFreq * 2^(semitones/12)
  const ratio = Math.pow(2, semitones / 12);
  return baseFreq * ratio;
}
