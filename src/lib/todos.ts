export interface Todo {
  id: string;
  userId: string;
  title: string;
  description?: string;
  dueTime?: string;
  priority?: "low" | "medium" | "high";
  completed: boolean;
  date: string;
  createdAt: string;
  updatedAt: string;
}

const TODOS_KEY = "arbora_todos";

export function getTodos(): Todo[] {
  try {
    const raw = localStorage.getItem(TODOS_KEY);
    if (!raw) return [];
    return JSON.parse(raw);
  } catch (e) {
    console.error("Error parsing todos from local storage", e);
    return [];
  }
}

export function saveTodos(todos: Todo[]) {
  localStorage.setItem(TODOS_KEY, JSON.stringify(todos));
}

export function clearTodos() {
  localStorage.removeItem(TODOS_KEY);
}
