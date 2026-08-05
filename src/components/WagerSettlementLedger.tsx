'use client';

import React from 'react';
import { Participant, ContestConfig, WagerSettlementSummary } from '@/types/contest';
import { ESPNCompetitor } from '@/types/espn';
import { calculateWagerSettlement } from '@/lib/scoring';
import { DollarSign, Lock, CheckCircle2, AlertCircle, Award, ShieldCheck, Wallet } from 'lucide-react';

interface WagerSettlementLedgerProps {
  participants?: Participant[];
  competitors?: ESPNCompetitor[];
  contestConfig?: ContestConfig | null;
  eventStatus?: any;
  wagerLedger?: WagerSettlementSummary;
}

export function WagerSettlementLedger({
  participants = [],
  competitors = [],
  contestConfig,
  eventStatus,
  wagerLedger,
}: WagerSettlementLedgerProps) {
  const summary = wagerLedger || calculateWagerSettlement(participants, competitors, contestConfig, eventStatus);
  const isFinal = summary.isFinalized;

  return (
    <section className="bg-surface-container-low border border-outline-variant rounded-2xl p-6 space-y-6 shadow-xs">
      {/* Header Banner */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-outline-variant/60 pb-4">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-tertiary/10 text-tertiary flex items-center justify-center border border-tertiary/30 shrink-0">
            <DollarSign className="w-6 h-6 text-tertiary" />
          </div>
          <div>
            <h2 className="text-lg font-black tracking-tight text-on-surface flex items-center gap-2">
              Wager Settlement & Payout Ledger
            </h2>
            <p className="text-xs text-on-surface-variant">
              Final tournament payout allocations, day money earnings, and net balance settlements.
            </p>
          </div>
        </div>

        {/* Lock / Final Badge */}
        <div>
          {isFinal ? (
            <span className="inline-flex items-center gap-1 text-xs font-extrabold px-3 py-1 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30">
              <CheckCircle2 className="w-3.5 h-3.5" /> Official Final Settlement
            </span>
          ) : (
            <span className="inline-flex items-center gap-1 text-xs font-bold px-3 py-1 rounded-full bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/30">
              <Lock className="w-3.5 h-3.5" /> Locked Until Final (Live Projection)
            </span>
          )}
        </div>
      </div>

      {/* Financial Overview Metrics Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="p-4 rounded-xl bg-surface-container-lowest border border-outline-variant/60 space-y-1">
          <span className="text-[10px] font-extrabold uppercase tracking-wider text-on-surface-variant block">
            Entry Fee / Person
          </span>
          <p className="text-lg font-black text-on-surface">${contestConfig?.entryFee ?? 50}</p>
        </div>

        <div className="p-4 rounded-xl bg-surface-container-lowest border border-outline-variant/60 space-y-1">
          <span className="text-[10px] font-extrabold uppercase tracking-wider text-on-surface-variant block">
            Total Fees Collected
          </span>
          <p className="text-lg font-black text-emerald-600 dark:text-emerald-400">
            ${summary.totalEntryFeesCollected}
          </p>
        </div>

        <div className="p-4 rounded-xl bg-surface-container-lowest border border-outline-variant/60 space-y-1">
          <span className="text-[10px] font-extrabold uppercase tracking-wider text-on-surface-variant block">
            Total Main Payouts
          </span>
          <p className="text-lg font-black text-tertiary">
            ${summary.totalMainPayoutsDistributed}
          </p>
        </div>

        <div className="p-4 rounded-xl bg-surface-container-lowest border border-outline-variant/60 space-y-1">
          <span className="text-[10px] font-extrabold uppercase tracking-wider text-on-surface-variant block">
            Total Day Money
          </span>
          <p className="text-lg font-black text-amber-600 dark:text-amber-400">
            ${summary.totalDayMoneyDistributed}
          </p>
        </div>
      </div>

      {/* Locked Notice Banner */}
      {!isFinal && (
        <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-start gap-3 text-xs text-amber-800 dark:text-amber-300">
          <AlertCircle className="w-5 h-5 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
          <div>
            <span className="font-extrabold block mb-0.5">Final Winnings Calculation Locked</span>
            Per contest rules, final net payouts and winnings distribution are calculated upon completion of Round 4 final scoring. Below is the live projected payout ledger based on current leaderboard positions.
          </div>
        </div>
      )}

      {/* Participant Settlement Table */}
      <div className="overflow-x-auto border border-outline-variant/60 rounded-xl">
        <table className="w-full border-collapse text-left text-xs">
          <thead>
            <tr className="bg-surface-container text-[10px] font-extrabold uppercase tracking-wider border-b border-outline-variant/60 text-on-surface-variant">
              <th className="py-3 px-4">Participant</th>
              <th className="py-3 px-4 text-center">Entry Payment</th>
              <th className="py-3 px-4 text-right">Main Prize</th>
              <th className="py-3 px-4 text-right">Day Money</th>
              <th className="py-3 px-4 text-right">Total Earnings</th>
              <th className="py-3 px-4 text-right font-black">Net Profit / Loss</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-outline-variant/40">
            {summary.settlements.map((s) => {
              const isProfit = s.netBalance > 0;
              const isBreakEven = s.netBalance === 0;

              return (
                <tr key={s.participantId} className="hover:bg-surface-container-high transition-colors">
                  <td className="py-3.5 px-4 font-bold text-on-surface">
                    {s.participantName}
                  </td>

                  <td className="py-3.5 px-4 text-center">
                    <span
                      className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-extrabold border ${
                        s.hasPaid
                          ? 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-500/30'
                          : 'bg-amber-500/10 text-amber-700 dark:text-amber-300 border-amber-500/30'
                      }`}
                    >
                      {s.hasPaid ? 'Paid ✅' : 'Unpaid ⏳'}
                    </span>
                  </td>

                  <td className="py-3.5 px-4 text-right font-mono text-on-surface-variant">
                    {s.mainPayout > 0 ? `$${s.mainPayout}` : '-'}
                  </td>

                  <td className="py-3.5 px-4 text-right font-mono text-on-surface-variant">
                    {s.dayMoneyPayout > 0 ? `$${s.dayMoneyPayout}` : '-'}
                  </td>

                  <td className="py-3.5 px-4 text-right font-mono font-bold text-on-surface">
                    ${s.totalWinnings}
                  </td>

                  <td className="py-3.5 px-4 text-right font-mono font-black text-sm">
                    {isProfit ? (
                      <span className="text-emerald-600 dark:text-emerald-400">
                        +${s.netBalance}
                      </span>
                    ) : isBreakEven ? (
                      <span className="text-on-surface-variant">$0</span>
                    ) : (
                      <span className="text-red-600 dark:text-red-400">
                        -${Math.abs(s.netBalance)}
                      </span>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </section>
  );
}
