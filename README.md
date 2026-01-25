# 🎵 Carnatic Practice

A comprehensive web application for practicing Carnatic music with digital tanpura, raga practice, varisai exercises, and auditory training.

![Carnatic Practice](https://img.shields.io/badge/Carnatic-Music-orange)
![Next.js](https://img.shields.io/badge/Next.js-16.1-black)
![TypeScript](https://img.shields.io/badge/TypeScript-5.9-blue)
![Tailwind CSS](https://img.shields.io/badge/Tailwind-3.4-38bdf8)

## ✨ Features

### 🎹 Digital Tanpura
- **Realistic Tanpura Sound**: Synthesized tanpura with proper harmonics and jawari effect
- **12-Key Support**: Play in any key from C to B (including sharps)
- **Volume Control**: Logarithmic volume control for natural sound adjustment
- **Continuous Playback**: Play/pause functionality with smooth transitions

### 🎼 Raga Practice
- **72 Melakarta Ragas**: Complete collection of all 72 melakarta ragas
- **Arohana & Avarohana**: Practice both ascending and descending scales
- **Flexible Tempo**: Adjustable BPM (30-120) and notes per beat (1-5)
- **Visual Note Display**: See notes highlighted as they play
- **Loop Mode**: Continuous playback for extended practice
- **Volume Control**: Independent volume control with logarithmic scaling

### 📚 Varisai Practice
- **Multiple Varisai Types**:
  - Sarali Varisai
  - Janta Varisai
  - Melasthayi Varisai
  - Mandarasthayi Varisai
- **Raga-Specific Practice**: Convert exercises to any melakarta raga
- **Practice Mode**: Play all exercises twice (with sound, then silent) for self-practice
- **Speed Control**: Adjustable BPM and notes per beat
- **Visual Feedback**: See current note highlighted during playback
- **Volume Control**: Logarithmic volume control

### 🎯 Auditory Practice
- **Ear Training**: Test your ability to identify notes by ear
- **Two Practice Modes**:
  - **Untimed**: Practice with a stopwatch
  - **Timed**: Set a timer (1-30 minutes)
- **Multiple Difficulty Levels**: Practice with 1, 2, or 3 note sequences
- **Flexible Input Formats**: Accepts various notation styles:
  - `S`, `SR`, `SRG` (no spaces)
  - `S R G` (with spaces)
  - `Sa Re Ga` (full names)
  - `S -> R -> G` (with arrows)
  - `R1`, `G2`, `M1` (with numbers)
- **Smart Recognition**: Base swara matching (e.g., "G" matches "G3")
- **Real-time Feedback**: Visual feedback for correct/incorrect answers
- **Performance Tracking**: Score, accuracy, and performance messages
- **Auto-advance**: Automatically moves to next round after each answer

## 🚀 Getting Started

### Prerequisites

- Node.js 18+ and npm (or yarn/pnpm)

### Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd CarnaticPractice
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Run the development server**
   ```bash
   npm run dev
   ```

4. **Open your browser**
   Navigate to [http://localhost:3000](http://localhost:3000)

### Build for Production

```bash
npm run build
npm start
```

## 📖 Usage Guide

### Tanpura
1. Select your desired key from the sidebar
2. Click the play button to start the tanpura
3. Adjust volume using the slider
4. The tanpura will play continuously until you stop it

### Raga Practice
1. Select a raga from the dropdown (sort by number or alphabetically)
2. Adjust tempo (BPM) and notes per beat as needed
3. Click the play button to hear the arohana and avarohana
4. Enable loop mode for continuous practice
5. Adjust volume to your preference

### Varisai Practice
1. Choose a varisai type (Sarali, Janta, Melasthayi, or Mandarasthayi)
2. Select a raga to practice in
3. Choose an exercise number
4. Enable Practice Mode for structured practice (plays all exercises twice)
5. Adjust speed and volume
6. Click play to start

### Auditory Practice
1. Select a raga
2. Choose practice mode (Untimed or Timed)
3. If Timed, set the timer duration
4. Select number of notes (1, 2, or 3)
5. Click "Start Game"
6. Listen to the notes and enter your answer
7. Use "Root Note" to hear the base note (Sa)
8. Use "Play Note(s)" to replay the sequence
9. Enter answers in any format (e.g., "SRG", "Sa Re Ga", "S -> R -> G")
10. The game automatically advances after each answer

## 🏗️ Project Structure

```
CarnaticPractice/
├── app/
│   ├── layout.tsx          # Root layout
│   ├── page.tsx            # Main page with tab navigation
│   └── globals.css         # Global styles
├── components/
│   ├── TanpuraSidebar.tsx  # Tanpura controls sidebar
│   ├── RagaPlayer.tsx      # Raga practice component
│   ├── VarisaiPlayer.tsx   # Varisai practice component
│   └── AuditoryPractice.tsx # Auditory training component
├── data/
│   ├── melakartaRagas.ts   # All 72 melakarta ragas
│   ├── saraliVarisai.ts    # Sarali varisai exercises
│   ├── jantaVarisai.ts     # Janta varisai exercises
│   ├── melasthayiVarisai.ts
│   └── mandarasthayiVarisai.ts
└── package.json
```

## 🛠️ Technology Stack

- **Framework**: Next.js 16.1 (React 19)
- **Language**: TypeScript
- **Styling**: Tailwind CSS
- **Audio**: Web Audio API
- **State Management**: React Hooks

## 🎨 Key Features

### Audio Engine
- **Web Audio API**: Real-time audio synthesis
- **Logarithmic Volume Control**: Natural-sounding volume adjustment
- **Harmonic Synthesis**: Realistic tanpura sound with proper harmonics
- **Note Envelopes**: Smooth attack, sustain, and release for each note

### User Experience
- **Responsive Design**: Works on desktop and tablet devices
- **Dark Theme**: Easy on the eyes for extended practice
- **Smooth Animations**: Polished UI with transitions
- **Real-time Feedback**: Visual indicators for playback and answers

### Music Theory
- **Accurate Frequencies**: Proper swara frequencies based on Carnatic music theory
- **Raga Conversion**: Convert exercises to any melakarta raga
- **Octave Support**: Higher and lower octave indicators (>, <)
- **Flexible Notation**: Support for various input formats

## 📝 Notes

- All audio is generated client-side using Web Audio API
- No external audio files required
- Works best in modern browsers (Chrome, Firefox, Safari, Edge)
- Volume controls use logarithmic scaling for natural perception

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## 📄 License

This project is private and for personal/educational use.

## 🙏 Acknowledgments

- Based on traditional Carnatic music practice methods
- All 72 melakarta ragas included
- Traditional varisai exercises from Carnatic music pedagogy

---

**Happy Practicing! 🎵**
