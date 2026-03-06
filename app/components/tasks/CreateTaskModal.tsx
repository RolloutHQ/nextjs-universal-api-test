"use client";
import { useState } from "react";
import CreateModal from "../CreateModal";
import { CreateTaskInput, Person } from "@/types/resources";

interface CreateTaskModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: CreateTaskInput) => Promise<void>;
  people?: Person[];
  credential?: any;
}

export default function CreateTaskModal({
  isOpen,
  onClose,
  onSubmit,
  people = [],
  credential,
}: CreateTaskModalProps) {
  const [formData, setFormData] = useState<CreateTaskInput>({
    title: "",
    description: "",
    status: "todo",
    priority: "medium",
    dueDate: "",
    participants: [],
    assigner: credential?.credentialKey || "",
    preview: "",
  });

  const handleAddParticipant = (personId: string) => {
    const person = people.find((p) => p.id === personId);
    const email = person?.emails?.[0]?.value;
    if (email && !formData.participants?.includes(email)) {
      setFormData({
        ...formData,
        participants: [...(formData.participants || []), email],
      });
    }
  };

  const handleRemoveParticipant = (email: string) => {
    setFormData({
      ...formData,
      participants: formData.participants?.filter((p) => p !== email) || [],
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await onSubmit(formData);
    setFormData({
      title: "",
      description: "",
      status: "todo",
      priority: "medium",
      dueDate: "",
      participants: [],
      assigner: credential?.credentialKey || "",
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
          <select
            className="w-full p-2 border rounded"
            value={formData.priority}
            onChange={(e) => setFormData({ ...formData, priority: e.target.value })}
          >
            <option value="low">Low Priority</option>
            <option value="medium">Medium Priority</option>
            <option value="high">High Priority</option>
          </select>
          <div className="space-y-2">
            <label className="block text-sm font-medium text-gray-700">
              Due Date
            </label>
            <input
              type="date"
              id="dueDate"
              placeholder="Due Date"
              className="w-full p-2 border rounded"
              value={formData.dueDate}
              onChange={(e) => setFormData({ ...formData, dueDate: e.target.value })}
            />
          </div>

          <input
            type="email"
            placeholder="Assigner Email"
            disabled
            className="w-full p-2 border rounded"
            value={formData.assigner}
            onChange={(e) => setFormData({ ...formData, assigner: e.target.value })}
          />
          <input
            type="text"
            placeholder="Preview Text"
            className="w-full p-2 border rounded"
            value={formData.preview}
            onChange={(e) => setFormData({ ...formData, preview: e.target.value })}
          />

          {/* Participants Section */}
          <div className="space-y-2">
            <label className="block text-sm font-medium text-gray-700">
              Participants
            </label>
            <select
              className="w-full p-2 border rounded"
              value=""
              onChange={(e) => {
                if (e.target.value) handleAddParticipant(e.target.value);
              }}
            >
              <option value="">Add participant...</option>
              {people
                .filter((p) => {
                  const email = p.emails?.[0]?.value;
                  return email && !formData.participants?.includes(email);
                })
                .map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.firstName} {p.lastName}
                  </option>
                ))}
            </select>

            {/* Display added participants */}
            {formData.participants && formData.participants.length > 0 && (
              <div className="flex flex-wrap gap-2 mt-2">
                {formData.participants.map((email, index) => (
                  <div
                    key={index}
                    className="flex items-center gap-1 bg-blue-100 text-blue-800 px-3 py-1 rounded-full text-sm"
                  >
                    <span>{people.find((p) => p.emails?.[0]?.value === email)?.firstName} {people.find((p) => p.emails?.[0]?.value === email)?.lastName}</span>
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
            className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
          >
            Create Task
          </button>
        </div>
      </form>
    </CreateModal>
  );
}
