'use client';

import { useState } from 'react';
import TanpuraSidebar from '@/components/TanpuraSidebar';
import InstrumentSettings from '@/components/InstrumentSettings';
import RagaPlayer from '@/components/RagaPlayer';
import VarisaiPlayer from '@/components/VarisaiPlayer';
import AuditoryPractice from '@/components/AuditoryPractice';
import type { InstrumentId } from '@/lib/instrumentLoader';

type Tab = 'raga' | 'varisai' | 'auditory';

export default function Home() {
  const [baseFreq, setBaseFreq] = useState(261.63); // Default C
  const [activeTab, setActiveTab] = useState<Tab>('raga');
  const [instrumentId, setInstrumentId] = useState<InstrumentId>('piano');

  return (
    <main className="min-h-screen bg-slate-950">
      <div className="flex h-screen">
        {/* Sidebar - Tanpura & Voice */}
        <aside className="w-80 bg-slate-900 border-r border-slate-800 p-6 overflow-y-auto">
          <TanpuraSidebar onKeyChange={setBaseFreq} />
          <InstrumentSettings instrumentId={instrumentId} onInstrumentChange={setInstrumentId} />
        </aside>

        {/* Main Content */}
        <div className="flex-1 flex flex-col overflow-hidden">
          {/* Tab Navigation */}
          <div className="bg-slate-900 border-b border-slate-800 px-6 pt-4">
            <div className="flex gap-2">
              <button
                onClick={() => setActiveTab('raga')}
                className={`
                  px-6 py-3 rounded-t-lg
                  transition-all duration-200
                  text-sm font-medium
                  ${
                    activeTab === 'raga'
                      ? 'bg-slate-800 text-amber-400 border-b-2 border-amber-400'
                      : 'bg-slate-900 text-slate-400 hover:text-slate-300 hover:bg-slate-800/50'
                  }
                `}
              >
                Raga Practice
              </button>
              <button
                onClick={() => setActiveTab('varisai')}
                className={`
                  px-6 py-3 rounded-t-lg
                  transition-all duration-200
                  text-sm font-medium
                  ${
                    activeTab === 'varisai'
                      ? 'bg-slate-800 text-amber-400 border-b-2 border-amber-400'
                      : 'bg-slate-900 text-slate-400 hover:text-slate-300 hover:bg-slate-800/50'
                  }
                `}
              >
                Varasai Practise
              </button>
              <button
                onClick={() => setActiveTab('auditory')}
                className={`
                  px-6 py-3 rounded-t-lg
                  transition-all duration-200
                  text-sm font-medium
                  ${
                    activeTab === 'auditory'
                      ? 'bg-slate-800 text-amber-400 border-b-2 border-amber-400'
                      : 'bg-slate-900 text-slate-400 hover:text-slate-300 hover:bg-slate-800/50'
                  }
                `}
              >
                Auditory Practice
              </button>
            </div>
          </div>

          {/* Tab Content */}
          <div className="flex-1 flex items-start justify-center p-6 overflow-y-auto">
            {activeTab === 'raga' ? (
              <RagaPlayer baseFreq={baseFreq} instrumentId={instrumentId} />
            ) : activeTab === 'varisai' ? (
              <VarisaiPlayer baseFreq={baseFreq} instrumentId={instrumentId} />
            ) : (
              <AuditoryPractice baseFreq={baseFreq} instrumentId={instrumentId} />
            )}
          </div>
        </div>
      </div>
    </main>
  );
}
