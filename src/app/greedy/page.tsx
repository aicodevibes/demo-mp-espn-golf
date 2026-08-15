'use client';

import React, { useMemo } from 'react';
import Link from 'next/link';
import { useEventContext } from '@/context/EventContext';
import { GolferHeadshot } from '@/components/GolferHeadshot';
import {
  ArrowLeft,
  Award,
  Trophy,
  Flame,
  DollarSign,
  Settings,
  RefreshCw,
  Users,
} from 'lucide-react';

const GREEDY_ENTRY_FEE = 50;

export default function GreedyPage() {
  const {
    contestEvaluation,
    contestConfig,
    loading: isLoading,
  } = useEventContext();

  const greedyStandings = contestEvaluation.greedyStandings;
  const isEventFinalized = contestEvaluation.wagerLedger.isFinalized || contestConfig?.isFinalized || false;
  const totalPool = greedyStandings.length * GREEDY_ENTRY_FEE;

  // Winner take all allocation with tie split (only awarded at event end)
  const standingsWithPayout = useMemo(() => {
    if (greedyStandings.length === 0) return [];

    const topRank = greedyStandings[0]?.rank || 1;
    const winners = greedyStandings.filter((s) => s.rank === topRank);
    const splitPayout =
      isEventFinalized && winners.length > 0
        ? Math.round((totalPool / winners.length) * 100) / 100
        : 0;

    return greedyStandings.map((s) => ({
      ...s,
      payout: s.rank === topRank ? splitPayout : 0,
    }));
  }, [greedyStandings, totalPool, isEventFinalized]);

  return (
    <div className="min-h-screen bg-surface text-on-surface flex flex-col font-sans">
      {/* Top Header Navigation */}
      <header className="bg-surface-container-low border-b border-outline-variant py-4 px-6 flex justify-between items-center shadow-xs">
        <div className="flex items-center gap-3">
          <Link
            href="/"
            className="flex items-center gap-1.5 text-sm font-semibold text-secondary hover:text-primary transition"
          >
            <ArrowLeft className="w-4 h-4" /> Back to Main Dashboard
          </Link>
          <span className="text-outline-variant">|</span>
          <h1 className="text-base font-extrabold uppercase tracking-widest text-on-surface flex items-center gap-2">
            <Award className="w-5 h-5 text-tertiary" /> Greedy Side Bet
          </h1>
        </div>

        <Link
          href="/admin"
          className="flex items-center gap-1.5 text-xs font-bold bg-surface-container-high hover:bg-surface-container-highest px-3 py-1.5 rounded-lg border border-outline-variant transition text-on-surface"
        >
          <Settings className="w-3.5 h-3.5 text-tertiary" /> Manage Assignments
        </Link>
      </header>

      {/* Main Content Area */}
      <main className="max-w-6xl w-full mx-auto px-4 py-8 space-y-8 flex-1">
        {/* Banner Card */}
        <section className="relative overflow-hidden bg-surface-container-low border border-outline-variant rounded-2xl p-6 sm:p-8 shadow-xs">
          <div className="relative z-10 max-w-2xl space-y-3">
            <div className="inline-flex items-center gap-1.5 text-[10px] font-black uppercase tracking-widest bg-tertiary/15 border border-tertiary/30 px-3 py-1 rounded-full text-tertiary">
              <Flame className="w-3.5 h-3.5 fill-tertiary" /> Winner-Take-All Side Pool
            </div>
            <h2 className="text-2xl sm:text-3xl font-black text-on-surface tracking-tight">
              The Greedy Side Bet
            </h2>
            <p className="text-xs sm:text-sm text-on-surface-variant leading-relaxed">
              Each participating player puts up <span className="font-bold text-tertiary">${GREEDY_ENTRY_FEE}</span> and designates a single drafted golfer. The participant whose Greedy Golfer posts the lowest cumulative 4-round score wins the entire pot!
            </p>
          </div>
          <div className="absolute right-6 bottom-4 opacity-10 pointer-events-none hidden sm:block">
            <Trophy className="w-48 h-48 text-tertiary" />
          </div>
        </section>

        {/* Hero Summary Cards */}
        <section className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="bg-surface-container-low border border-outline-variant rounded-xl p-5 space-y-1 shadow-xs">
            <span className="text-[10px] font-extrabold uppercase tracking-widest text-on-surface-variant flex items-center gap-1">
              <DollarSign className="w-3.5 h-3.5 text-tertiary" /> Total Greedy Purse
            </span>
            <p className="text-2xl font-black text-tertiary">${totalPool.toFixed(2)}</p>
            <p className="text-[11px] text-on-surface-variant">
              {greedyStandings.length} Participants @ ${GREEDY_ENTRY_FEE} Each
            </p>
          </div>

          <div className="bg-surface-container-low border border-outline-variant rounded-xl p-5 space-y-1 shadow-xs">
            <span className="text-[10px] font-extrabold uppercase tracking-widest text-on-surface-variant flex items-center gap-1">
              <Trophy className="w-3.5 h-3.5 text-tertiary" /> Current Leader
            </span>
            <p className="text-lg font-extrabold text-on-surface truncate">
              {standingsWithPayout[0]?.participant.name || 'N/A'}
            </p>
            <p className="text-[11px] text-tertiary font-bold truncate">
              {standingsWithPayout[0]?.greedyGolfer?.name || 'No selections yet'}
            </p>
          </div>

          <div className="bg-surface-container-low border border-outline-variant rounded-xl p-5 space-y-1 shadow-xs">
            <span className="text-[10px] font-extrabold uppercase tracking-widest text-on-surface-variant flex items-center gap-1">
              <Users className="w-3.5 h-3.5 text-secondary" /> Field Size
            </span>
            <p className="text-2xl font-black text-on-surface">{greedyStandings.length}</p>
            <p className="text-[11px] text-on-surface-variant">Active Side-Bet Contenders</p>
          </div>
        </section>

        {/* Main Standings Table */}
        <section className="bg-surface-container-low border border-outline-variant rounded-xl p-5 space-y-4 shadow-xs">
          <div className="flex items-center justify-between border-b border-outline-variant/60 pb-3">
            <h3 className="text-sm font-extrabold uppercase tracking-widest text-on-surface flex items-center gap-2">
              <Award className="w-4 h-4 text-tertiary" /> Greedy Side-Bet Standings
            </h3>
            {isLoading && (
              <span className="flex items-center gap-1 text-xs text-on-surface-variant animate-pulse">
                <RefreshCw className="w-3.5 h-3.5 animate-spin" /> Updating scores...
              </span>
            )}
          </div>

          {isLoading ? (
            <div className="py-12 text-center space-y-3">
              <div className="w-8 h-8 border-4 border-outline-variant border-t-tertiary rounded-full animate-spin mx-auto" />
              <p className="text-xs text-on-surface-variant font-medium">Calculating Greedy Standings...</p>
            </div>
          ) : standingsWithPayout.length === 0 ? (
            <div className="py-12 text-center space-y-3 bg-surface-container-lowest rounded-lg border border-outline-variant/60">
              <Award className="w-10 h-10 text-outline mx-auto opacity-50" />
              <div className="space-y-1">
                <h4 className="text-sm font-bold text-on-surface">No Greedy Participants Flagged</h4>
                <p className="text-xs text-on-surface-variant max-w-sm mx-auto">
                  Flag participants as Greedy Side-Game players and assign their designated golfer in the Admin panel to populate this leaderboard.
                </p>
              </div>
              <Link
                href="/admin"
                className="inline-flex items-center gap-1.5 bg-tertiary text-on-tertiary hover:bg-tertiary/90 text-xs font-bold px-4 py-2 rounded-lg transition"
              >
                <Settings className="w-3.5 h-3.5 text-white" /> Open Admin Panel
              </Link>
            </div>
          ) : (
            <div className="overflow-x-auto rounded-lg border border-outline-variant/60 bg-surface-container-lowest">
              <table className="w-full min-w-[650px] border-collapse text-left">
                <thead>
                  <tr className="bg-surface-container-high text-[10px] font-extrabold tracking-widest uppercase text-on-surface-variant border-b border-outline-variant">
                    <th className="py-3 pl-4 pr-2 text-center w-12">POS</th>
                    <th className="py-3 px-3 w-40">PARTICIPANT</th>
                    <th className="py-3 px-3">GREEDY GOLFER</th>
                    <th className="py-3 px-2 text-center w-12">R1</th>
                    <th className="py-3 px-2 text-center w-12">R2</th>
                    <th className="py-3 px-2 text-center w-12">R3</th>
                    <th className="py-3 px-2 text-center w-12">R4</th>
                    <th className="py-3 px-3 text-center w-16 text-tertiary">TOTAL</th>
                    <th className="py-3 pr-4 pl-2 text-right w-28">POT PAYOUT</th>
                  </tr>
                </thead>
                <tbody>
                  {standingsWithPayout.map((s) => {
                    const isWinner = s.rank === 1;
                    const golfer = s.greedyGolfer;

                    return (
                      <tr
                        key={s.participant.id}
                        className={`border-b border-outline-variant/40 transition-colors hover:bg-surface-container ${
                          isWinner ? 'bg-tertiary/5' : ''
                        }`}
                      >
                        {/* POS */}
                        <td className="py-3 pl-4 pr-2 text-center align-middle w-12">
                          <span
                            className={`inline-flex items-center justify-center w-7 h-7 rounded-full font-black text-xs shadow-xs ${
                              isWinner
                                ? 'bg-tertiary text-on-tertiary font-black'
                                : 'bg-surface-container-high text-on-surface-variant'
                            }`}
                          >
                            {s.rank}
                          </span>
                        </td>

                        {/* PARTICIPANT */}
                        <td className="py-3 px-3 align-middle font-bold text-sm text-on-surface">
                          {s.participant.name}
                        </td>

                        {/* GREEDY GOLFER */}
                        <td className="py-3 px-3 align-middle">
                          {golfer ? (
                            <div className="flex items-center gap-2.5">
                              <GolferHeadshot
                                name={golfer.name}
                                playerId={golfer.id}
                                size={32}
                              />
                              <div className="flex flex-col min-w-0">
                                <div className="flex items-center gap-1.5">
                                  <span className="font-semibold text-xs text-on-surface truncate">
                                    {golfer.name}
                                  </span>
                                  {golfer.isCut && (
                                    <span className="text-[9px] font-black uppercase text-red-500 bg-red-500/10 px-1 py-px rounded shrink-0">
                                      CUT
                                    </span>
                                  )}
                                  {golfer.isWD && (
                                    <span className="text-[9px] font-black uppercase text-orange-500 bg-orange-500/10 px-1 py-px rounded shrink-0">
                                      WD
                                    </span>
                                  )}
                                </div>
                                <span className="text-[10px] text-on-surface-variant font-mono">
                                  Score: {golfer.scoreToPar}
                                </span>
                              </div>
                            </div>
                          ) : (
                            <span className="text-xs italic text-on-surface-variant/60">
                              Unassigned
                            </span>
                          )}
                        </td>

                        {/* R1 - R4 */}
                        {[1, 2, 3, 4].map((rd) => {
                          const val = golfer?.roundScoresToPar[rd];
                          let display = '-';
                          if (val !== null && val !== undefined) {
                            display = val === 0 ? 'E' : val > 0 ? `+${val}` : `${val}`;
                          }
                          return (
                            <td
                              key={rd}
                              className="py-3 px-2 text-center align-middle text-xs font-mono tabular-nums text-on-surface-variant"
                            >
                              {display}
                            </td>
                          );
                        })}

                        {/* TOTAL */}
                        <td className="py-3 px-3 text-center align-middle font-black text-sm">
                          <span
                            className={
                              s.numericScoreToPar < 0
                                ? 'text-tertiary'
                                : s.numericScoreToPar > 0
                                ? 'text-error'
                                : 'text-on-surface'
                            }
                          >
                            {s.numericScoreToPar === 0
                              ? 'E'
                              : s.numericScoreToPar > 0
                              ? `+${s.numericScoreToPar}`
                              : `${s.numericScoreToPar}`}
                          </span>
                        </td>

                        {/* POT PAYOUT */}
                        <td className="py-3 pr-4 pl-2 text-right align-middle font-black text-xs">
                          {isEventFinalized && s.payout > 0 ? (
                            <span className="inline-flex items-center gap-1 bg-tertiary/15 text-tertiary border border-tertiary/30 px-2.5 py-1 rounded-md">
                              <Trophy className="w-3 h-3 fill-tertiary" /> ${s.payout.toFixed(2)}
                            </span>
                          ) : (
                            <span className="text-on-surface-variant/40 font-mono">—</span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </main>
    </div>
  );
}
