export interface JoinPoolReq {
  readonly invitationToken: string;

  readonly fullName: string;

  readonly phone?: string;
}
