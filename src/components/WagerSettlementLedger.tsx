'use client';

import React from 'react';
import { WagerSettlementSummary, ParticipantSettlement } from '@/types/contest';
import { Lock, Trophy, DollarSign, CheckCircle2, Clock, ShieldCheck, AlertCircle } from 'lucide-react';

interface WagerSettlementLedgerProps {
  summary: WagerSettlementSummary;
}

export const WagerSettlementLedger: React.FC<WagerSettlementLedgerProps> = ({ summary }) => {
  const {
    totalEntryFeesCollected,
    totalMainPayoutsDistributed,
    totalDayMoneyDistributed,
    totalPayoutsDistributed,
    netPoolBalance,
    isFinalized,
    settlements,
  } = summary;

  if (!isFinalized) {
    return (
      <div className="relative overflow-hidden rounded-2xl border border-amber-500/20 bg-gradient-to-br from-amber-950/30 via-slate-900/80 to-slate-950/90 p-6 backdrop-blur-md shadow-xl transition-all duration-300 hover:border-amber-500/30">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-400 shadow-inner">
              <Lock className="h-6 w-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-lg font-bold text-white tracking-wide">Wager Settlement Ledger</h3>
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-500/15 text-amber-300 border border-amber-500/30">
                  <Lock className="h-3 w-3" /> Locked
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-1">
                Final payout audit & individual net balances unlock once tournament is marked <span className="text-amber-300 font-medium">Final</span> by admin.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3 bg-slate-900/90 border border-slate-800 rounded-xl p-3 px-4 shrink-0">
            <div>
              <span className="text-xs text-slate-400 uppercase tracking-wider block">Estimated Total Pot</span>
              <span className="text-lg font-extrabold text-emerald-400">${totalEntryFeesCollected.toLocaleString()}</span>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-emerald-500/20 bg-gradient-to-br from-slate-900/95 via-slate-900/90 to-slate-950/95 p-6 backdrop-blur-xl shadow-2xl space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-5">
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 shadow-inner">
            <Trophy className="h-6 w-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-xl font-extrabold text-white tracking-tight">Official Wager Settlement Ledger</h3>
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-500/15 text-emerald-300 border border-emerald-500/30">
                <ShieldCheck className="h-3.5 w-3.5" /> Finalized
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              Verified final standings, entry fee settlements, and net profit payouts.
            </p>
          </div>
        </div>
      </div>

      {/* Metric Summary Cards Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3.5">
        <div className="rounded-xl bg-slate-900/80 border border-slate-800 p-3.5">
          <span className="text-xs text-slate-400 font-medium block">Entry Fees Collected</span>
          <span className="text-lg font-bold text-white mt-1 block">${totalEntryFeesCollected.toFixed(2)}</span>
        </div>

        <div className="rounded-xl bg-slate-900/80 border border-slate-800 p-3.5">
          <span className="text-xs text-slate-400 font-medium block">Main Payouts</span>
          <span className="text-lg font-bold text-emerald-400 mt-1 block">${totalMainPayoutsDistributed.toFixed(2)}</span>
        </div>

        <div className="rounded-xl bg-slate-900/80 border border-slate-800 p-3.5">
          <span className="text-xs text-slate-400 font-medium block">Day Money Paid</span>
          <span className="text-lg font-bold text-emerald-400 mt-1 block">${totalDayMoneyDistributed.toFixed(2)}</span>
        </div>

        <div className="rounded-xl bg-slate-900/80 border border-slate-800 p-3.5">
          <span className="text-xs text-slate-400 font-medium block">Net Balance Audit</span>
          <span className={`text-lg font-bold mt-1 block ${netPoolBalance === 0 ? 'text-emerald-400' : 'text-amber-400'}`}>
            ${netPoolBalance.toFixed(2)} {netPoolBalance === 0 && '✓'}
          </span>
        </div>
      </div>

      {/* Settlement Table */}
      <div className="overflow-x-auto rounded-xl border border-slate-800 bg-slate-950/60">
        <table className="w-full text-left text-sm text-slate-300">
          <thead className="bg-slate-900/90 text-xs uppercase text-slate-400 font-semibold tracking-wider border-b border-slate-800">
            <tr>
              <th scope="col" className="py-3 px-4">Participant</th>
              <th scope="col" className="py-3 px-4 text-center">Payment</th>
              <th scope="col" className="py-3 px-4 text-right">Entry Fee</th>
              <th scope="col" className="py-3 px-4 text-right">Main Payout</th>
              <th scope="col" className="py-3 px-4 text-right">Day Money</th>
              <th scope="col" className="py-3 px-4 text-right">Total Winnings</th>
              <th scope="col" className="py-3 px-4 text-right">Net Profit / Loss</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800/60">
            {settlements.map((item) => {
              const isProfit = item.netBalance > 0;
              const isLoss = item.netBalance < 0;

              return (
                <tr key={item.participantId} className="hover:bg-slate-900/50 transition-colors">
                  <td className="py-3.5 px-4 font-semibold text-white">
                    {item.participantName}
                  </td>
                  <td className="py-3.5 px-4 text-center">
                    {item.hasPaid ? (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                        <CheckCircle2 className="h-3 w-3" /> Paid
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-amber-500/10 text-amber-400 border border-amber-500/20">
                        <Clock className="h-3 w-3" /> Unpaid
                      </span>
                    )}
                  </td>
                  <td className="py-3.5 px-4 text-right font-mono text-slate-400">
                    ${item.entryFee.toFixed(2)}
                  </td>
                  <td className="py-3.5 px-4 text-right font-mono text-emerald-400/90">
                    {item.mainPayout > 0 ? `$${item.mainPayout.toFixed(2)}` : '—'}
                  </td>
                  <td className="py-3.5 px-4 text-right font-mono text-emerald-400/90">
                    {item.dayMoneyPayout > 0 ? `$${item.dayMoneyPayout.toFixed(2)}` : '—'}
                  </td>
                  <td className="py-3.5 px-4 text-right font-mono font-bold text-white">
                    ${item.totalWinnings.toFixed(2)}
                  </td>
                  <td className="py-3.5 px-4 text-right font-mono font-extrabold">
                    <span
                      className={`inline-block px-2 py-0.5 rounded ${
                        isProfit
                          ? 'text-emerald-300 bg-emerald-500/15 border border-emerald-500/30'
                          : isLoss
                          ? 'text-rose-400 bg-rose-500/15 border border-rose-500/30'
                          : 'text-slate-400'
                      }`}
                    >
                      {isProfit ? `+$${item.netBalance.toFixed(2)}` : isLoss ? `-$${Math.abs(item.netBalance).toFixed(2)}` : '$0.00'}
                    </span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
};
