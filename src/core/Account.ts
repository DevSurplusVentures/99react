// ICRC Account type for ICRC-7/37 standards
export interface Account {
  owner: string; // Principal as string
  subaccount?: Uint8Array; // optional subaccount as 32 bytes
}