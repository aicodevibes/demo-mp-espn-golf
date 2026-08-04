'use client';

import React from 'react';

export default function AdminLoading() {
  return (
    <div className="min-h-screen bg-surface text-on-surface flex items-center justify-center p-6">
      <div className="flex flex-col items-center gap-4">
        <div className="w-10 h-10 rounded-full border-4 border-outline-variant border-t-tertiary animate-spin" />
        <h2 className="text-xs font-black uppercase tracking-widest text-on-surface-variant">
          Loading Admin Control Panel...
        </h2>
      </div>
    </div>
  );
}
