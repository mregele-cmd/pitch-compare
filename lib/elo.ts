/**
 * Standard Elo rating calculation.
 * K = 32 (same as FIDE rapid chess — good fit for small-to-medium class sizes).
 * Expected score formula: E = 1 / (1 + 10^((opponent - self) / 400))
 */
export function calcNewElos(
  winnerElo: number,
  loserElo: number,
  K = 32
): { newWinnerElo: number; newLoserElo: number } {
  const expectedWinner = 1 / (1 + Math.pow(10, (loserElo - winnerElo) / 400));
  const expectedLoser  = 1 / (1 + Math.pow(10, (winnerElo - loserElo) / 400));
  return {
    newWinnerElo: Math.round(winnerElo + K * (1 - expectedWinner)),
    newLoserElo:  Math.round(loserElo  + K * (0 - expectedLoser)),
  };
}
