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
  status?: {
    type?: {
      name: string;
      description: string;
      detail: string;
      state: string;
    };
  };
}

export interface ESPNCompetitor {
  id: string;
  uid?: string;
  type?: string;
  order?: number;
  status?: {
    period?: number;
    thru?: number | string;
    position?: {
      id?: string;
      displayName?: string;
    };
    type?: {
      name: string;
      description: string;
      detail: string;
      state: string;
      shortDetail?: string;
    };
  };

  score?: string;
  linescores?: Array<{
    value: number;
    displayValue?: string;
  }>;
  athlete: {
    id: string;
    displayName: string;
    shortName?: string;
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

