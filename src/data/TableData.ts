export interface TableData {
    id: number;
    name?: string;
    code?: string;
    size_name?: string;
    description?: string;
    style_name?: string;
    operation_name?: string;
    machine_type?: string;
    defect_name?: string;
    updated_at: string;
    created_at: string;
  }
  
  export const colorData: TableData[] = [
    { id: 1, name: "Red", code: "#FF0000", updated_at: "2025-03-01", created_at: "2025-02-25" },
    { id: 2, name: "Green", code: "#00FF00", updated_at: "2025-03-02", created_at: "2025-02-26" },
    { id: 3, name: "Blue", code: "#0000FF", updated_at: "2025-03-03", created_at: "2025-02-27" }
  ];
  
