"use client";
import { useState, useEffect, useCallback, useRef } from "react";
import CreateModal from "../CreateModal";
import { CreateTaskInput, Person } from "@/types/resources";

const PAGE_SIZE = 20;

interface CreateTaskModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: CreateTaskInput) => Promise<void>;
  people?: Person[];
  assignerEmail?: string;
  token?: string;
  credentialId?: string;
}

export default function CreateTaskModal({
  isOpen,
  onClose,
  onSubmit,
  assignerEmail = "",
  token,
  credentialId,
}: CreateTaskModalProps) {
  const [formData, setFormData] = useState<CreateTaskInput>({
    title: "",
    description: "",
    status: "todo",
    priority: "medium",
    dueDate: "",
    participants: [],
    assigner: assignerEmail,
    preview: "",
  });

  const [search, setSearch] = useState("");
  const [showDropdown, setShowDropdown] = useState(false);
  const [dropdownPeople, setDropdownPeople] = useState<Person[]>([]);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [loading, setLoading] = useState(false);
  const searchRef = useRef("");
  const listRef = useRef<HTMLUListElement>(null);
  const [saving, setSaving] = useState(false);

  const fetchPeople = useCallback(async (pageNum: number, query: string, append: boolean) => {
    if (!token || !credentialId || loading) return;
    setLoading(true);
    const params = new URLSearchParams({ pagenumber: String(pageNum), pagesize: String(PAGE_SIZE) });
    if (query) params.set("search", query);
    const res = await fetch(`/api/people?${params}`, {
      headers: { "X-Rollout-Token": token, "X-Credential-Id": credentialId },
    });
    if (res.ok) {
      const data = await res.json();
      const fetched: Person[] = data.people || [];
      setDropdownPeople(prev => append ? [...prev, ...fetched] : fetched);
      setHasMore(fetched.length === PAGE_SIZE);
    }
    setLoading(false);
  }, [token, credentialId]); // eslint-disable-line react-hooks/exhaustive-deps

  // Reset and re-fetch when search changes (debounced)
  useEffect(() => {
    const timeout = setTimeout(() => {
      searchRef.current = search;
      setPage(1);
      setDropdownPeople([]);
      setHasMore(true);
      fetchPeople(1, search, false);
    }, 300);
    return () => clearTimeout(timeout);
  }, [search]); // eslint-disable-line react-hooks/exhaustive-deps

  // Load first page when dropdown opens
  useEffect(() => {
    if (showDropdown && dropdownPeople.length === 0 && !loading) {
      fetchPeople(1, search, false);
    }
  }, [showDropdown]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleScroll = () => {
    const el = listRef.current;
    if (!el || loading || !hasMore) return;
    if (el.scrollTop + el.clientHeight >= el.scrollHeight - 40) {
      const nextPage = page + 1;
      setPage(nextPage);
      fetchPeople(nextPage, searchRef.current, true);
    }
  };

  const filteredPeople = dropdownPeople.filter((p) => {
    const email = p.emails?.[0]?.value;
    return email && !formData.participants?.includes(email);
  });

  const handleAddParticipant = (person: Person) => {
    const email = person.emails?.[0]?.value;
    if (email && !formData.participants?.includes(email)) {
      setFormData(prev => ({
        ...prev,
        participants: [...(prev.participants || []), email],
      }));
    }
    setSearch("");
    setShowDropdown(false);
  };

  const handleRemoveParticipant = (email: string) => {
    setFormData(prev => ({
      ...prev,
      participants: prev.participants?.filter((p) => p !== email) || [],
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    await onSubmit(formData);
    setSaving(false);
    setFormData({
      title: "",
      description: "",
      status: "todo",
      priority: "medium",
      dueDate: "",
      participants: [],
      assigner: assignerEmail,
      preview: "",
    });
    onClose();
  };

  return (
    <CreateModal isOpen={isOpen} onClose={onClose} title="Create Task">
      <form onSubmit={handleSubmit}>
        <div className="space-y-4">
          <input
            type="text"
            placeholder="Title *"
            className="w-full p-2 border rounded"
            value={formData.title}
            onChange={(e) => setFormData({ ...formData, title: e.target.value })}
            required
          />
          <textarea
            placeholder="Description"
            className="w-full p-2 border rounded"
            value={formData.description}
            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            rows={3}
          />
          <select
            className="w-full p-2 border rounded"
            value={formData.status}
            onChange={(e) => setFormData({ ...formData, status: e.target.value })}
          >
            <option value="todo">To Do</option>
            <option value="in_progress">In Progress</option>
            <option value="completed">Completed</option>
            <option value="cancelled">Cancelled</option>
          </select>
          <div className="space-y-2">
            <label className="block text-sm font-medium text-gray-700">
              Priority
            </label>
            <select
              className="w-full p-2 border rounded"
              value={formData.priority}
              onChange={(e) => setFormData({ ...formData, priority: e.target.value })}
            >
              <option value="low">Low</option>
              <option value="medium">Medium</option>
              <option value="high">High</option>
            </select>
          </div>
          <div className="space-y-2">
            <label className="block text-sm font-medium text-gray-700">
              Due Date
            </label>
            <input
              type="date"
              id="dueDate"
              className="w-full p-2 border rounded"
              value={formData.dueDate}
              onChange={(e) => setFormData({ ...formData, dueDate: e.target.value })}
            />
          </div>
          <div className="space-y-2">
            <label className="block text-sm font-medium text-gray-700">
              Preview
            </label>
            <input
              type="text"
              placeholder="Preview Text"
              className="w-full p-2 border rounded"
              value={formData.preview}
              onChange={(e) => setFormData({ ...formData, preview: e.target.value })}
            />
          </div>

          {/* Participants Section */}
          <div className="space-y-2">
            <label className="block text-sm font-medium text-gray-700">
              People *
            </label>
            <div className="relative">
              <input
                type="text"
                placeholder="Search participants..."
                className="w-full p-2 border rounded"
                value={search}
                onChange={(e) => { setSearch(e.target.value); setShowDropdown(true); }}
                onFocus={() => setShowDropdown(true)}
                onBlur={() => setTimeout(() => setShowDropdown(false), 150)}
              />
              {showDropdown && (
                <ul ref={listRef} onScroll={handleScroll} className="absolute z-10 w-full bg-white border rounded shadow-lg max-h-48 overflow-y-auto mt-1">
                  {filteredPeople.map((p) => (
                    <li
                      key={p.id}
                      onMouseDown={() => handleAddParticipant(p)}
                      className="px-3 py-2 cursor-pointer hover:bg-blue-50 text-sm"
                    >
                      <span className="font-medium">{p.firstName} {p.lastName}</span>
                      {p.emails?.[0]?.value && (
                        <span className="ml-2 text-gray-500">{p.emails[0].value}</span>
                      )}
                    </li>
                  ))}
                  {loading && (
                    <li className="px-3 py-2 text-sm text-gray-400 text-center">{`Loading${hasMore ? ' more' : ''}...`}</li>
                  )}
                  {!loading && filteredPeople.length === 0 && (
                    <li className="px-3 py-2 text-sm text-gray-400 text-center">No results</li>
                  )}
                </ul>
              )}
            </div>

            {/* Display added participants */}
            {formData.participants && formData.participants.length > 0 && (
              <div className="flex flex-wrap gap-2 mt-2">
                {formData.participants.map((email, index) => (
                  <div
                    key={index}
                    className="flex items-center gap-1 bg-blue-100 text-blue-800 px-3 py-1 rounded-full text-sm"
                  >
                    <span>{email}</span>
                    <button
                      type="button"
                      onClick={() => handleRemoveParticipant(email)}
                      className="ml-1 text-blue-600 hover:text-blue-800 font-bold"
                    >
                      ×
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
        <div className="flex justify-end space-x-2 mt-4">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-gray-600 hover:text-gray-800"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={!formData.title.trim() || !formData.participants?.length || saving}
            className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {saving ? 'Creating...' : 'Create Task'}
          </button>
        </div>
      </form>
    </CreateModal>
  );
}
