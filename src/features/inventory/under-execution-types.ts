export type UnderExecutionRecord = {
  id: string;
  supplier: string;
  supplierName: string;
  itemCode: string;
  itemName: string;
  quantity: number;
  date: string;
  createdAt: string;
};

export type CreateUnderExecutionInput = {
  supplier: string;
  supplierName: string;
  itemCode: string;
  itemName: string;
  quantity: number;
  date: string;
};

export type UpdateUnderExecutionInput = CreateUnderExecutionInput;
