export interface Participant {
  id: string;
  name: string;
  draftedPlayerIds: string[];
  isGreedyParticipant?: boolean;
  greedyPlayerId?: string;
}

export interface DraftedGolferStatus {
  id: string;
  name: string;
  isCut: boolean;
  isWD: boolean;
  totalScoreToPar: string;
  roundStrokes: { [round: number]: number | null };
  /** Per-round score-to-par values (null = not played, 999 = CUT penalty) */
  roundScoresToPar: { [round: number]: number | null };
  /** Display string like "+5/-2/C/C" shown in the drafted players column */
  roundScoreDisplayStr: string;
}

export interface ParticipantStanding {
  rank: number;
  participant: Participant;
  dailyScores: { [round: number]: number | null };
  totalScore: number;
  isCut: boolean;
  projectedPayout: number;
  draftedGolferDetails: DraftedGolferStatus[];
}

export interface DayMoneyWinner {
  participantId: string;
  participantName: string;
  golferId: string;
  golferName: string;
  dailyScore: number;
  payout: number;
}

export interface DayMoneyRoundResult {
  round: number;
  lowScore: number | null;
  winners: DayMoneyWinner[];
  totalPool: number;
}
