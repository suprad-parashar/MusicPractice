import pkg from '@tonejs/midi';
const { Midi } = pkg;
import { readFileSync, writeFileSync } from 'fs';
import { join, basename } from 'path';

const MIDI_NOTE_TO_SWARA = {
  0: 'S', 1: 'R', 2: 'R', 3: 'G', 4: 'G',
  5: 'M', 6: 'M', 7: 'P', 8: 'D', 9: 'D',
  10: 'N', 11: 'N',
};

const MIDI_NOTE_TO_WESTERN = [
  'C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B',
];

function midiToStaffPosition(midi) {
  const notePositions = { 0: -2, 1: -2, 2: -1, 3: -1, 4: 0, 5: 1, 6: 1, 7: 2, 8: 2, 9: 3, 10: 3, 11: 4 };
  const octave = Math.floor(midi / 12) - 1;
  const semitone = midi % 12;
  const basePosition = notePositions[semitone];
  return basePosition + (octave - 4) * 7;
}

function midiToSwara(midi, baseMidi = 60) {
  const semitone = ((midi - baseMidi) % 12 + 12) % 12;
  const octaveOffset = Math.floor((midi - baseMidi) / 12);
  let swara = MIDI_NOTE_TO_SWARA[semitone];
  if (octaveOffset > 0) swara = '>' + swara;
  else if (octaveOffset < 0) swara = '<' + swara;
  return swara;
}

function midiToWesternLabel(midi) {
  const name = MIDI_NOTE_TO_WESTERN[midi % 12];
  const octave = Math.floor(midi / 12) - 1;
  return `${name}${octave}`;
}

const filePath = process.argv[2];
if (!filePath) {
  console.error('Usage: node parse-midi.mjs <path-to-midi-file>');
  process.exit(1);
}

const data = readFileSync(filePath);
const midi = new Midi(data);

console.log(`Name: ${midi.name}`);
console.log(`Tracks: ${midi.tracks.length}`);
console.log(`Duration: ${midi.duration.toFixed(2)}s`);
console.log(`PPQ: ${midi.header.ppq}`);
console.log(`Tempo: ${midi.header.tempos.map(t => t.bpm.toFixed(1)).join(', ')} BPM`);
console.log(`Time Signatures: ${midi.header.timeSignatures.map(ts => `${ts.timeSignature[0]}/${ts.timeSignature[1]}`).join(', ')}`);
console.log('');

let allNotes = [];

for (let i = 0; i < midi.tracks.length; i++) {
  const track = midi.tracks[i];
  console.log(`Track ${i}: ${track.name} (${track.notes.length} notes)`);

  for (const note of track.notes) {
    allNotes.push({
      midi: note.midi,
      name: note.name,
      time: note.time,
      duration: note.duration,
      velocity: note.velocity,
    });
  }
}

allNotes.sort((a, b) => a.time - b.time);

console.log(`\nTotal notes: ${allNotes.length}`);
console.log('\nFirst 30 notes:');
for (let i = 0; i < Math.min(30, allNotes.length); i++) {
  const n = allNotes[i];
  console.log(`  ${n.name.padEnd(4)} (MIDI ${n.midi}) at ${n.time.toFixed(3)}s dur=${n.duration.toFixed(3)}s → Swara: ${midiToSwara(n.midi)} Western: ${midiToWesternLabel(n.midi)} StaffPos: ${midiToStaffPosition(n.midi)}`);
}

const midiNums = [...new Set(allNotes.map(n => n.midi))].sort((a, b) => a - b);
console.log(`\nUnique MIDI notes: ${midiNums.join(', ')}`);
console.log(`Unique Western notes: ${midiNums.map(m => midiToWesternLabel(m)).join(', ')}`);
console.log(`Range: ${midiToWesternLabel(Math.min(...midiNums))} - ${midiToWesternLabel(Math.max(...midiNums))}`);

const swaraStr = allNotes.map(n => midiToSwara(n.midi)).join('');
console.log(`\nSwara string: ${swaraStr}`);

const nameWithoutExt = basename(filePath, '.mid');
const output = {
  name: nameWithoutExt.replace(/[-_]/g, ' '),
  source: 'Bollywood',
  tempo: Math.round(midi.header.tempos[0]?.bpm ?? 120),
  timeSignature: midi.header.timeSignatures[0]?.timeSignature ?? [4, 4],
  notes: allNotes.map(n => ({
    midi: n.midi,
    swara: midiToSwara(n.midi),
    western: midiToWesternLabel(n.midi),
    staffPosition: midiToStaffPosition(n.midi),
    time: Math.round(n.time * 1000),
    duration: Math.round(n.duration * 1000),
  })),
};

const outPath = filePath.replace(/\.mid$/i, '.json');
writeFileSync(outPath, JSON.stringify(output, null, 2));
console.log(`\nJSON written to: ${outPath}`);
