export interface Audit {
  playerId?: string;
  gameId?: string;
  uploadId?: string;
  admin: string;
  description: string;
  reason?: string;
  createdAt?: string;
}
