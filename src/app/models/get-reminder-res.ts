export interface GetReminderRes {
  readonly month: string;

  readonly greeting: string;

  readonly beneficiary?: string;

  readonly debtors?: string;

  readonly link?: string;

  readonly paymentDetails?: string;
}
