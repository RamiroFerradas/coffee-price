export interface CoffeeSpecs {
  tasting_notes: string | null;
  process: string | null;
  roast_level: string | null;
  altitude: string | null;
  score: number | null;
}

export function emptySpecs(): CoffeeSpecs {
  return {
    tasting_notes: null,
    process: null,
    roast_level: null,
    altitude: null,
    score: null,
  };
}
