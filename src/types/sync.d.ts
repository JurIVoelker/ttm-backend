export type TTApiMatchesReturnType = {
  matches: {
    isDuplicate?: boolean;
    id: string;
    datetime: string;
    location: {
      id: string;
      name: string;
      address: {
        street: string;
        zip: string;
        city: string;
      };
      link: string;
    };
    league: {
      name: string;
      nickname: string;
      teamType: string;
    };
    teams: {
      home: {
        name: string;
        index: string;
        club: string;
      };
      away: {
        name: string;
        index: string;
        club: string;
      };
    };
    result: {
      homeScore: number;
      awayScore: number;
      winner: "home" | "away" | "draw";
    } | null;
    isHomeGame: boolean;
  }[];
  meta: {
    expiresAt: string;
  };
};

export type TTApiMatch = TTApiMatchesReturnType["matches"][number];