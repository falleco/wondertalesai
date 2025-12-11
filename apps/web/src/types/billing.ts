export type Billing = {
  id: string;
  package: string;
  amount: string;
  invoicePdfLink: string | null | undefined;
  purchasedDate: Date;
};
