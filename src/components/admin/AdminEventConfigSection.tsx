'use client';

import React from 'react';
import { Star, Save, Trash2, Copy } from 'lucide-react';
import { ESPNEvent } from '@/types/espn';

export interface AdminEventConfigSectionProps {
  events: ESPNEvent[];
  loadingEvents: boolean;
  selectedEventId: string;
  activeEventId: string;
  isEventFinalized: boolean;
  savingConfig: boolean;
  formDataName: string;
  formDataCoursePar: number | '';
  formDataEntryFee: number | '';
  formDataDayMoneyPool: number | '';
  formDataMainPayoutsStr: string;
  formDataIsFinalized: boolean;
  onSelectEvent: (eventId: string) => void;
  onChangeName: (name: string) => void;
  onChangeCoursePar: (par: number | '') => void;
  onChangeEntryFee: (fee: number | '') => void;
  onChangeDayMoneyPool: (pool: number | '') => void;
  onChangeMainPayoutsStr: (payouts: string) => void;
  onChangeIsFinalized: (isFinalized: boolean) => void;
  onSaveConfig: (e: React.FormEvent) => void;
  onSetActive: () => void;
  onDeleteEvent: () => void;
  onOpenCopyModal: () => void;
}

export function AdminEventConfigSection({
  events,
  loadingEvents,
  selectedEventId,
  activeEventId,
  isEventFinalized,
  savingConfig,
  formDataName,
  formDataCoursePar,
  formDataEntryFee,
  formDataDayMoneyPool,
  formDataMainPayoutsStr,
  formDataIsFinalized,
  onSelectEvent,
  onChangeName,
  onChangeCoursePar,
  onChangeEntryFee,
  onChangeDayMoneyPool,
  onChangeMainPayoutsStr,
  onChangeIsFinalized,
  onSaveConfig,
  onSetActive,
  onDeleteEvent,
  onOpenCopyModal,
}: AdminEventConfigSectionProps) {
  return (
    <section className="bg-surface-container-low border border-outline-variant rounded-xl p-6 space-y-6 shadow-xs">
      <div className="flex justify-between items-center border-b border-outline-variant/60 pb-3">
        <h2 className="text-sm font-black uppercase tracking-widest text-on-surface flex items-center gap-2">
          Event Selection & Config
        </h2>
        <div className="flex items-center gap-2">
          {selectedEventId === activeEventId && (
            <span className="flex items-center gap-1 text-[10px] font-black uppercase bg-tertiary/10 border border-tertiary/30 px-2 py-0.5 rounded text-tertiary">
              <Star className="w-3 h-3 fill-tertiary" /> Active Event
            </span>
          )}
          <button
            type="button"
            onClick={onOpenCopyModal}
            className="inline-flex items-center gap-1 text-xs font-bold text-on-surface-variant hover:text-on-surface bg-surface-container-high px-2.5 py-1 rounded-lg border border-outline-variant"
          >
            <Copy className="w-3.5 h-3.5" /> Copy Roster
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="space-y-1.5 md:col-span-2">
          <label className="text-xs font-bold text-on-surface-variant">Select Calendar Event</label>
          <select
            value={selectedEventId}
            onChange={(e) => onSelectEvent(e.target.value)}
            className="w-full bg-surface-container border border-outline-variant rounded-lg px-3 py-2 text-sm font-medium text-on-surface outline-none focus:border-outline"
          >
            {loadingEvents ? (
              <option>Loading PGA Calendar...</option>
            ) : (
              events.map((e) => (
                <option key={e.id} value={e.id}>
                  {e.name} ({e.date ? new Date(e.date).toLocaleDateString() : 'N/A'})
                </option>
              ))
            )}
          </select>
        </div>

        <form onSubmit={onSaveConfig} className="space-y-4 col-span-1 md:col-span-2">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-on-surface-variant">Event Name Override</label>
              <input
                type="text"
                value={formDataName}
                onChange={(e) => onChangeName(e.target.value)}
                className="w-full bg-surface-container border border-outline-variant rounded-lg px-3 py-2 text-sm text-on-surface outline-none focus:border-outline"
                required
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-on-surface-variant">Course Par (Optional)</label>
              <input
                type="number"
                placeholder="e.g. 70, 71, 72"
                value={formDataCoursePar}
                onChange={(e) =>
                  onChangeCoursePar(e.target.value === '' ? '' : Number(e.target.value))
                }
                className="w-full bg-surface-container border border-outline-variant rounded-lg px-3 py-2 text-sm text-on-surface outline-none focus:border-outline"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-on-surface-variant">Entry Fee per Participant ($)</label>
              <input
                type="number"
                placeholder="e.g. 50, 100"
                value={formDataEntryFee}
                onChange={(e) =>
                  onChangeEntryFee(e.target.value === '' ? '' : Number(e.target.value))
                }
                className="w-full bg-surface-container border border-outline-variant rounded-lg px-3 py-2 text-sm text-on-surface outline-none focus:border-outline"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-on-surface-variant">Day Money Pool per Round ($)</label>
              <input
                type="number"
                placeholder="e.g. 75, 100"
                value={formDataDayMoneyPool}
                onChange={(e) =>
                  onChangeDayMoneyPool(e.target.value === '' ? '' : Number(e.target.value))
                }
                className="w-full bg-surface-container border border-outline-variant rounded-lg px-3 py-2 text-sm text-on-surface outline-none focus:border-outline"
              />
            </div>
            <div className="space-y-1.5 md:col-span-2">
              <label className="text-xs font-bold text-on-surface-variant">
                Main Payout Breakdown (Comma-Delimited for 1st, 2nd, 3rd...)
              </label>
              <input
                type="text"
                placeholder="e.g. 600, 320, 180, 100"
                value={formDataMainPayoutsStr}
                onChange={(e) => onChangeMainPayoutsStr(e.target.value)}
                className="w-full bg-surface-container border border-outline-variant rounded-lg px-3 py-2 text-sm font-mono text-on-surface outline-none focus:border-outline"
              />
            </div>

            {/* Finalize Checkbox */}
            <div className="flex items-center gap-2 md:col-span-2 pt-2">
              <input
                type="checkbox"
                id="isFinalizedCheckbox"
                checked={formDataIsFinalized}
                onChange={(e) => onChangeIsFinalized(e.target.checked)}
                className="rounded border-outline-variant bg-surface text-primary focus:ring-primary w-4 h-4"
              />
              <label
                htmlFor="isFinalizedCheckbox"
                className="text-xs font-bold text-on-surface cursor-pointer select-none"
              >
                Finalize Standings & Payouts (Hides overall payouts on dashboard until checked)
              </label>
            </div>
          </div>

          <div className="flex items-center gap-3 pt-2">
            <button
              type="submit"
              disabled={savingConfig}
              className="inline-flex items-center gap-1.5 bg-primary text-on-primary hover:bg-primary/95 text-xs font-bold px-4 py-2 rounded-lg transition disabled:opacity-50"
            >
              <Save className="w-4 h-4" /> Save Configuration
            </button>

            <button
              type="button"
              onClick={onSetActive}
              disabled={savingConfig || selectedEventId === activeEventId}
              className="inline-flex items-center gap-1.5 bg-tertiary text-on-tertiary hover:bg-tertiary/95 text-xs font-bold px-4 py-2 rounded-lg transition disabled:opacity-50"
            >
              <Star className="w-4 h-4" /> Set as Active Event
            </button>

            <button
              type="button"
              onClick={onDeleteEvent}
              disabled={savingConfig}
              className="inline-flex items-center gap-1.5 bg-red-600/10 text-red-600 hover:bg-red-600/15 border border-red-500/20 text-xs font-bold px-4 py-2 rounded-lg transition disabled:opacity-50 ml-auto"
            >
              <Trash2 className="w-4 h-4" /> Delete Event
            </button>
          </div>
        </form>
      </div>
    </section>
  );
}
