import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import React from 'react';
import { AdminManagementDrawer } from '../AdminManagementDrawer';

describe('AdminManagementDrawer', () => {
  const mockEvents = [{ id: '401811960', name: 'Rocket Classic' }];
  const mockCompetitors = [
    {
      id: '3470',
      athlete: { id: '3470', displayName: 'Scottie Scheffler' },
    },
    {
      id: '1810',
      athlete: { id: '1810', displayName: 'Rory McIlroy' },
    },
  ];

  it('renders player inventory search list and allows adding golfers to roster', () => {
    const onAddTrackedPlayer = vi.fn();

    render(
      <AdminManagementDrawer
        events={mockEvents as any}
        activeEventId="401811960"
        onSelectEvent={async () => {}}
        trackedPlayers={[]}
        fieldCompetitors={mockCompetitors as any}
        onAddTrackedPlayer={onAddTrackedPlayer}
        onRemoveTrackedPlayer={async () => {}}
      />
    );

    // Open drawer
    const openBtn = screen.getByText(/Admin Controls/i);
    fireEvent.click(openBtn);

    // Should render search input and golfer inventory
    expect(screen.getByPlaceholderText(/Search golfer to add/i)).toBeInTheDocument();
    expect(screen.getByText('Scottie Scheffler')).toBeInTheDocument();
    expect(screen.getByText('Rory McIlroy')).toBeInTheDocument();

    // Click + Add for Scottie Scheffler
    const addBtns = screen.getAllByRole('button', { name: /\+ Add/i });
    fireEvent.click(addBtns[0]);

    expect(onAddTrackedPlayer).toHaveBeenCalledWith(mockCompetitors[0]);
  });
});
