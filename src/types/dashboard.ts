export type Tenant = { id: string; name: string };
export type BankAccount = { id: string; nickname: string };
export type Card = { id: string; nickname: string };
export type Transaction = {
  id: string;
  amount: number;
  type: "INCOME" | "EXPENSE";
  category: string;
  isFixed?: boolean;
  createdAt: string;
  bankAccountId?: string | null;
  cardId?: string | null;
  referenceMonth?: string | null;
};
