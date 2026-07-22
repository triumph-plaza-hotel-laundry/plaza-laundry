export type AssetDepartment = {
  id: string;
  name: string;
  nextEmployeeSeq: number;
  createdAt: string;
};

export type AssetItem = {
  id: string;
  name: string;
  createdAt: string;
};

export type AssetEmployee = {
  id: string;
  departmentId: string;
  employeeNumber: number;
  employeeName: string;
  createdAt: string;
};

export type AssetReceiptItem = {
  id: string;
  receiptId: string;
  itemId: string;
  itemName: string;
  quantity: number;
};

export type AssetReceipt = {
  id: string;
  employeeId: string;
  receiptDate: string;
  notes: string | null;
  createdAt: string;
  items: AssetReceiptItem[];
};

export type AssetReceiptItemInput = {
  itemId: string;
  quantity: number;
};

/** Format per-department numbers as #001, #010, #100, … */
export function formatAssetEmployeeNumber(value: number): string {
  const safe = Number.isFinite(value) && value > 0 ? Math.floor(value) : 0;
  return `#${String(safe).padStart(3, '0')}`;
}
