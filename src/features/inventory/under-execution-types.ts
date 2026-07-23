export type UnderExecutionRecord = {
  id: string;
  supplier: string;
  department: string;
  itemCode: string;
  itemName: string;
  quantity: number;
  date: string;
  createdAt: string;
  /** Soft-hide from live Under Execution History UI only. */
  hiddenFromLive?: boolean;
};

export type CreateUnderExecutionInput = {
  supplier: string;
  department: string;
  itemCode: string;
  itemName: string;
  quantity: number;
  date: string;
};

export type UpdateUnderExecutionInput = CreateUnderExecutionInput;
