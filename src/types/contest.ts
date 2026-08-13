export interface Participant {
  id: string;
  name: string;
  draftedPlayerIds: string[];
  isGreedyParticipant?: boolean;
  greedyPlayerId?: string | null;
  hasPaidEntry?: boolean;
  hasPaidGreedy?: boolean;
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
  dailyScore: number | string;
  payout: number;
  thru?: string;
  isCompleted?: boolean;
}

export interface DayMoneyRoundResult {
  round: number;
  lowScore: number | string | null;
  winners: DayMoneyWinner[];
  totalPool: number;
  isCompleted?: boolean;
}

export interface ContestConfig {
  espnEventId: string;
  eventName: string;
  season: number;
  entryFee?: number;
  greedyEntryFee?: number;
  mainPayouts: number[];
  dayMoneyPool: number;
  coursePar: number | null;
  isFinalized?: boolean;
  createdAt?: any;
  updatedAt?: any;
  updatedBy?: string;
}

export interface GreedyStanding {
  rank: number;
  participant: Participant;
  greedyGolfer: {
    id: string;
    name: string;
    scoreToPar: string;
    numericScoreToPar: number;
    roundStrokes: { [round: number]: number | null };
    roundScoresToPar: { [round: number]: number | null };
    isCut: boolean;
    isWD: boolean;
  } | null;
  numericScoreToPar: number;
}

export interface ParticipantSettlement {
  participantId: string;
  participantName: string;
  entryFee: number;
  hasPaid: boolean;
  mainPayout: number;
  dayMoneyPayout: number;
  greedyPayout: number;
  totalWinnings: number;
  netBalance: number;
}

export interface WagerSettlementSummary {
  totalEntryFeesCollected: number;
  totalMainPayoutsDistributed: number;
  totalDayMoneyDistributed: number;
  totalGreedyDistributed: number;
  totalPayoutsDistributed: number;
  netPoolBalance: number;
  isFinalized: boolean;
  settlements: ParticipantSettlement[];
}


