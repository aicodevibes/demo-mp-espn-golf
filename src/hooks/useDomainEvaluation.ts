import { useMemo } from 'react';
import { Participant, ContestConfig } from '@/types/contest';
import { ContestEvaluationResult, evaluateContest } from '@/lib/contestEngine';
import { evaluateFieldLeaderboard, FieldLeaderboardEvaluation } from '@/lib/domain';
import { NormalizedTournament } from '@/lib/espn';
import { ESPNCompetitor, ESPNEventStatus } from '@/types/espn';

export interface UseFieldEvaluationOptions {
  tournament: NormalizedTournament;
  competitors: ESPNCompetitor[];
  participants: Participant[];
  eventStatus?: ESPNEventStatus;
  playerDirectoryMap?: Record<string, { id: string; name: string; headshotUrl?: string }>;
  searchQuery?: string;
}

export function useFieldEvaluation({
  tournament,
  competitors,
  participants,
  eventStatus,
  playerDirectoryMap,
  searchQuery,
}: UseFieldEvaluationOptions): FieldLeaderboardEvaluation {
  return useMemo(() => {
    return evaluateFieldLeaderboard({
      tournament,
      competitors,
      participants,
      eventStatus: tournament?.rawEvent?.status || eventStatus,
      playerDirectoryMap,
      searchQuery,
    });
  }, [tournament, competitors, participants, eventStatus, playerDirectoryMap, searchQuery]);
}

export interface UseContestEvaluationOptions {
  participants: Participant[];
  competitors: ESPNCompetitor[];
  contestConfig: ContestConfig | null;
  eventStatus?: ESPNEventStatus;
  playerDirectoryMap?: Record<string, { id: string; name: string; headshotUrl?: string }>;
}

export function useContestEvaluation({
  participants,
  competitors,
  contestConfig,
  eventStatus,
  playerDirectoryMap,
}: UseContestEvaluationOptions): ContestEvaluationResult {
  return useMemo(() => {
    return evaluateContest(
      participants,
      competitors,
      contestConfig,
      eventStatus,
      playerDirectoryMap
    );
  }, [participants, competitors, contestConfig, eventStatus, playerDirectoryMap]);
}
