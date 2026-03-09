import { Person } from "@/types/resources";

const STORAGE_KEY = "local_people";

export function getLocalPeople(): Person[] {
  if (typeof window === "undefined") return [];
  const stored = localStorage.getItem(STORAGE_KEY);
  if (!stored) return [];
  return JSON.parse(stored) as Person[];
}

export function addLocalPerson(person: Person): void {
  if (typeof window === "undefined") return;
  const existing = getLocalPeople();
  if (!existing.find((p) => p.id === person.id)) {
    existing.push(person);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(existing));
  }
}

export function mergePeopleWithLocal(apiPeople: Person[]): Person[] {
  const localPeople = getLocalPeople();
  const apiIds = new Set(apiPeople.map((p) => p.id));
  const localOnly = localPeople.filter((p) => !apiIds.has(p.id));
  return [...apiPeople, ...localOnly];
}
