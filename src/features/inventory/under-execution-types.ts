export type UnderExecutionRecord = {
  id: string;
  supplier: string;
  department: string;
  itemCode: string;
  itemName: string;
  quantity: number;
  date: string;
  createdAt: string;
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
