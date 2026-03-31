export interface User {
  id: number;
  name: string;
  email: string;
  role: "admin" | "member";
  created_at: string;
}

export interface Workspace {
  id: number;
  name: string;
  owner_id: number;
  owner: User;
  members: User[];
  created_at: string;
}

export interface Board {
  id: number;
  name: string;
  workspace_id: number;
  created_at: string;
}

export interface Task {
  id: number;
  title: string;
  description: string;
  status: "todo" | "doing" | "done";
  assignee_id: number | null;
  assignee: User | null;
  board_id: number;
  due_date: string | null;
  position: number;
  created_at: string;
}

export interface Comment {
  id: number;
  task_id: number;
  user_id: number;
  user: User;
  content: string;
  created_at: string;
}
