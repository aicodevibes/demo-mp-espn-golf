export type ESPNCompetitorScore =
  | string
  | number
  | { displayValue?: string | number; value?: number | string }
  | null
  | undefined;

export interface ESPNCalendarItem {
  id: string;
  label?: string;
  name?: string;
  startDate?: string;
  endDate?: string;
  date?: string;
  event?: {
    $ref?: string;
  };
  status?: ESPNEventStatus;
}

export interface ESPNEventStatus {
  period?: number;
  type?: {
    id?: string;
    name?: string;
    description?: string;
    detail?: string;
    shortDetail?: string;
    state?: string;
    completed?: boolean;
  };
}

export interface ESPNEvent {
  id: string;
  name: string;
  shortName?: string;
  date?: string;
  endDate?: string;
  season?: {
    year: number;
  };
  courses?: Array<{
    id: string;
    name: string;
    city?: string;
    state?: string;
  }>;
  competitions?: Array<{
    id: string;
    competitors: ESPNCompetitor[];
  }>;
  status?: ESPNEventStatus;
}

export interface ESPNCompetitor {
  id: string;
  uid?: string;
  type?: string;
  order?: number;
  status?: {
    period?: number;
    thru?: number | string;
    displayValue?: string;
    position?: {
      id?: string;
      displayName?: string;
    };

    type?: {
      id?: string;
      name?: string;
      description?: string;
      detail?: string;
      state?: string;
      shortDetail?: string;
      completed?: boolean;
    };
  };

  score?: ESPNCompetitorScore;
  linescores?: Array<{
    period?: number;
    value: number;
    displayValue?: string;
    linescores?: Array<{
      period?: number;
      value: number;
      scoreType?: {
        displayValue?: string | number;
      };
    }>;
  }>;
  rounds?: any[];
  athlete: {
    id: string;
    displayName: string;
    shortName?: string;
    firstName?: string;
    lastName?: string;
    lastNames?: string;
    fullName?: string;
    flag?: {
      href: string;
      alt?: string;
    };
    headshot?: {
      href: string;
      alt?: string;
    };
    country?: {
      abbreviation?: string;
    };
  };
  statistics?: Array<{
    name: string;
    displayValue: string;
  }>;
}

export interface ESPNLeaderboard {
  id: string;
  name: string;
  status?: {
    type?: {
      name: string;
      description: string;
      detail: string;
      state: string;
    };
  };
  competitors: ESPNCompetitor[];
}

export interface ESPNHoleScore {
  hole: number;
  par: number;
  strokes: number;
  scoreType: string; // e.g. "birdie", "bogey", "par", "eagle"
}

export interface ESPNRoundLinescore {
  period: number; // Round number 1, 2, 3, 4
  displayValue?: string; // Total round score e.g. "68"
  holes: ESPNHoleScore[];
}

export interface ESPNPlayerSummary {
  competitor?: ESPNCompetitor;
  player: {
    id: string;
    displayName: string;
    headshotUrl?: string;
  };
  rounds: ESPNRoundLinescore[];
}

