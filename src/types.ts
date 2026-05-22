export interface Product {
  id: string;
  name: string;
  quantity: number;
  price: number;
  created_at: string;
}

export interface TaskStatus {
  id: number;
  title: string;
  description: string;
  marks: number;
  completed: boolean;
  codeSnippet?: string;
}

export interface PresetRequest {
  name: string;
  method: "GET" | "POST" | "PUT" | "DELETE";
  path: string;
  bodyBefore?: string;
  description: string;
  taskRelation: string;
}

export interface ServerLog {
  timestamp: string;
  method: string;
  url: string;
  status: number;
  bodyBefore?: any;
  responseBody?: any;
  ip: string;
}
