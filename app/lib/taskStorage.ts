import { Task, UserProfile } from "@/types/resources";

export interface UserStorage {
  users: UserProfile[];
  activeUserId: string | null;
}

const STORAGE_KEY = 'tasks';

export function getAllTasks(): Task[] {
  if (typeof window === 'undefined') return [];

  const stored = localStorage.getItem(STORAGE_KEY);
  if (!stored) return [];
  const data: Task[] = JSON.parse(stored);
  return data || [];
}

export function addTask(newTask: Task): Task {
  if (typeof window === 'undefined') {
    throw new Error('Cannot create task on server');
  }

  const stored = localStorage.getItem(STORAGE_KEY);
  const data: Task[] = stored
    ? JSON.parse(stored)
    : [];

  data.push(newTask);

  localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  return newTask;
}