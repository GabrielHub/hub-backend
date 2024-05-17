export interface Audit {
  playerId?: string;
  gameId?: string;
  admin: string;
  description: string;
  reason?: string;
  createdAt?: number;
}
