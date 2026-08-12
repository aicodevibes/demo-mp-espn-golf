'use client';

import React, { useState, useEffect } from 'react';
import { Participant, ContestConfig, WagerSettlementSummary } from '@/types/contest';
import { ESPNCompetitor } from '@/types/espn';
import { calculateWagerSettlement } from '@/lib/scoring';
import { ChevronDown, ChevronUp, Lock } from 'lucide-react';

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
  const [isCollapsed, setIsCollapsed] = useState<boolean>(!isFinal);

  useEffect(() => {
    setIsCollapsed(!isFinal);
  }, [isFinal]);

  return (
    <section className="bg-surface-container-low border border-outline-variant rounded-2xl p-6 space-y-6 shadow-xs">
      {/* Header Banner */}
      <div
        onClick={() => setIsCollapsed(!isCollapsed)}
        className="flex flex-wrap items-center justify-between gap-4 cursor-pointer select-none border-b border-outline-variant/60 pb-4 hover:opacity-90 transition"
      >
        <div className="flex items-center gap-2">
          <h2 className="text-base font-black uppercase tracking-wider text-on-surface">
            Wager Settlement & Payout Ledger
          </h2>
        </div>

        {/* Lock / Final Badge & Collapser Button */}
        <div className="flex items-center gap-3">
          {isFinal ? (
            <span className="inline-flex items-center gap-1 text-xs font-extrabold px-3 py-1 rounded-full bg-emerald-500/10 text-emerald-500 border border-emerald-500/30">
              Official Final Settlement
            </span>
          ) : (
            <span className="inline-flex items-center gap-1 text-xs font-bold px-3 py-1 rounded-full bg-surface-container-high text-on-surface-variant border border-outline-variant/60">
              <Lock className="w-3 h-3" />
              Suppressed Until Finalization
            </span>
          )}

          <button
            type="button"
            className="p-1 rounded-lg hover:bg-surface-container-high text-on-surface-variant transition"
            aria-label={isCollapsed ? 'Expand ledger' : 'Collapse ledger'}
          >
            {isCollapsed ? <ChevronDown className="w-5 h-5" /> : <ChevronUp className="w-5 h-5" />}
          </button>
        </div>
      </div>

      {!isCollapsed && (
        <>
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
              <p className="text-lg font-black text-emerald-800 dark:text-emerald-400">
                ${summary.totalEntryFeesCollected}
              </p>
            </div>

            <div className="p-4 rounded-xl bg-surface-container-lowest border border-outline-variant/60 space-y-1">
              <span className="text-[10px] font-extrabold uppercase tracking-wider text-on-surface-variant block">
                Total Main Payouts
              </span>
              <p className="text-lg font-black text-tertiary">
                {isFinal ? `$${summary.totalMainPayoutsDistributed}` : '-'}
              </p>
            </div>

            <div className="p-4 rounded-xl bg-surface-container-lowest border border-outline-variant/60 space-y-1">
              <span className="text-[10px] font-extrabold uppercase tracking-wider text-on-surface-variant block">
                Total Day Money
              </span>
              <p className="text-lg font-black text-tertiary">
                {isFinal ? `$${summary.totalDayMoneyDistributed}` : '-'}
              </p>
            </div>
          </div>

          {/* Participant Settlement Table */}
          <div className="overflow-x-auto border border-outline-variant/60 rounded-xl">
            <table className="w-full border-collapse text-left text-xs">
              <thead>
                <tr className="bg-surface-container text-[10px] font-extrabold uppercase tracking-wider border-b border-outline-variant/60 text-on-surface-variant">
                  <th className="py-3 px-4">Participant</th>
                  <th className="py-3 px-4 text-right">Entry Fee</th>
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

                      <td className="py-3.5 px-4 text-right font-mono text-on-surface-variant">
                        ${s.entryFee}
                      </td>

                      <td className="py-3.5 px-4 text-right font-mono text-on-surface-variant">
                        {isFinal && s.mainPayout > 0 ? `$${s.mainPayout}` : '-'}
                      </td>

                      <td className="py-3.5 px-4 text-right font-mono text-on-surface-variant">
                        {isFinal && s.dayMoneyPayout > 0 ? `$${s.dayMoneyPayout}` : '-'}
                      </td>

                      <td className="py-3.5 px-4 text-right font-mono font-bold text-on-surface">
                        {isFinal ? `$${s.totalWinnings}` : '-'}
                      </td>

                      <td className="py-3.5 px-4 text-right font-mono font-black text-sm">
                        {isFinal ? (
                          isProfit ? (
                            <span className="text-emerald-800 dark:text-emerald-400">
                              +${s.netBalance}
                            </span>
                          ) : isBreakEven ? (
                            <span className="text-on-surface-variant">$0</span>
                          ) : (
                            <span className="text-red-700 dark:text-red-400">
                              -${Math.abs(s.netBalance)}
                            </span>
                          )
                        ) : (
                          <span className="text-on-surface-variant">-</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Unfinalized Notice Banner */}
          {!isFinal && (
            <div className="p-4 rounded-xl bg-surface-container-lowest border border-outline-variant/60 flex items-start gap-3 text-xs text-on-surface-variant">
              <div>
                <span className="font-extrabold text-on-surface block mb-0.5">Payout Ledger Suppressed</span>
                Wager settlement and net payout distribution will be generated upon event completion and finalization.
              </div>
            </div>
          )}
        </>
      )}
    </section>
  );
}
