"use client";
import { useState, useEffect } from "react";
import { RolloutLinkProvider, CredentialsManager } from "@rollout/link-react";
import "@rollout/link-react/style.css";

// Components
import ResourceTabs, { ResourceType } from "./components/ResourceTabs";
import PeopleTable from "./components/people/PeopleTable";
import CreatePersonModal from "./components/people/CreatePersonModal";
import TasksTable from "./components/tasks/TasksTable";
import CreateTaskModal from "./components/tasks/CreateTaskModal";
import EmailsTable from "./components/emails/EmailsTable";

// Types
import type {
  Person,
  CreatePersonInput,
  Task,
  CreateTaskInput,
  ClozeMessage,
  PaginationMetadata,
} from "@/types/resources";
import { getValidAccessToken } from "./api/credentials/cloze";

export default function Home() {
  // Core state
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [credentialId, setCredentialId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<ResourceType>("people");

  // People state
  const [people, setPeople] = useState<Person[]>([]);
  const [peopleLoading, setPeopleLoading] = useState(false);
  const [peopleError, setPeopleError] = useState<string | null>(null);
  const [isPeopleModalOpen, setIsPeopleModalOpen] = useState(false);
  const [peoplePagination, setPeoplePagination] = useState<PaginationMetadata | null>(null);
  const [peopleCursorHistory, setPeopleCursorHistory] = useState<string[]>([]);

  // Tasks state
  const [tasks, setTasks] = useState<Task[]>(JSON.parse(localStorage.getItem("tasks") || "[]"));
  const [tasksLoading, setTasksLoading] = useState(false);
  const [tasksError, setTasksError] = useState<string | null>(null);
  const [isTasksModalOpen, setIsTasksModalOpen] = useState(false);

  // Emails state
  const [emails, setEmails] = useState<ClozeMessage[]>([]);
  const [emailsLoading, setEmailsLoading] = useState(false);
  const [emailsError, setEmailsError] = useState<string | null>(null);

  const [credentials, setCredentials] = useState<any[]>([]);

  // Initialize user on mount
  useEffect(() => {
    const storedUserId = localStorage.getItem('userId');
    if (storedUserId) {
      setUserId(storedUserId);
    } else {
      const newUserId = crypto.randomUUID();
      localStorage.setItem('userId', newUserId);
      setUserId(newUserId);
    }

  }, []);

  // Get token when user changes
  useEffect(() => {
    if (userId) {
      getToken();
    }
  }, [userId]);

  // Fetch credentials when token is ready
  useEffect(() => {
    if (userId && token) {
      fetchCredentials();
    }
  }, [token, userId]);

  // Fetch active tab data when credentialId and tab changes
  useEffect(() => {
    if (credentialId && token) {
      fetchActiveTabData();
    }
  }, [credentialId, token, activeTab]);

  async function getToken() {
    if (!userId) return;

    try {
      const response = await fetch(`/api/rollout-token?userId=${userId}`);
      const data = await response.json();
      setToken(data.token || data);
      setLoading(false);
    } catch (err) {
      setError("Failed to fetch rollout token");
      setLoading(false);
    }
  }

  async function fetchCredentials() {
    if (!token) return;

    try {
      const response = await fetch("https://universal.rollout.com/api/credentials?includeData=true", {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      const data = await response.json();
      setCredentials(data || []);

      if (data && data.length > 0) {
        const lastCredential = data[0];
        if (lastCredential && lastCredential.id) {
          setCredentialId(lastCredential.id);
        }
      }
    } catch (error) {
      console.error("Error fetching credentials:", error);
    }
  }

  function fetchActiveTabData() {
    switch (activeTab) {
      case "people":
        fetchPeople();
        break;
      case "tasks":
        fetchTasks();
        break;
      case "timeline":
        fetchEmails();
        break;
    }
  }

  // People handlers
  async function fetchPeople(cursor?: string, retryCount = 0, maxRetries = 3) {
    setPeopleLoading(true);
    setPeopleError(null);

    try {
      const url = cursor ? `/api/people?next=${encodeURIComponent(cursor)}` : "/api/people";
      const response = await fetch(url, {
        headers: {
          "Content-Type": "application/json",
          "X-Rollout-Token": token!,
          "X-Credential-Id": credentialId!,
        },
      });

      if (response.status === 409 && retryCount < maxRetries) {
        setPeopleError("Data not ready. Retrying...");
        await new Promise(resolve => setTimeout(resolve, 30000));
        return fetchPeople(cursor, retryCount + 1, maxRetries);
      }

      if (!response.ok) {
        throw new Error("Failed to fetch people data");
      }

      const data = await response.json();
      setPeople(data.people || []);
      setPeoplePagination(data._metadata || null);
    } catch (err: any) {
      setPeopleError(err.message);
    } finally {
      if (retryCount === 0) {
        setPeopleLoading(false);
      }
    }
  }

  function goToNextPeoplePage() {
    if (peoplePagination?.next) {
      // Save next cursor to history for "back" navigation
      setPeopleCursorHistory([...peopleCursorHistory, peoplePagination.next]);
      fetchPeople(peoplePagination.next);
    }
  }

  function goToPreviousPeoplePage() {
    if (peopleCursorHistory.length > 1) {
      // Remove current cursor, go back to previous
      const newHistory = [...peopleCursorHistory];
      newHistory.pop(); // Remove current
      const previousCursor = newHistory[newHistory.length - 1];
      setPeopleCursorHistory(newHistory);
      fetchPeople(previousCursor || undefined);
    } else if (peopleCursorHistory.length === 1) {
      // Go back to first page
      setPeopleCursorHistory([]);
      fetchPeople();
    }
  }

  async function createPerson(data: CreatePersonInput) {
    try {
      const response = await fetch("/api/people", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Rollout-Token": token!,
          "X-Credential-Id": credentialId!,
        },
        body: JSON.stringify(data),
      });

      if (response.ok) {
        fetchPeople();
      }
    } catch (error) {
      console.error("Error creating person:", error);
    }
  }

  // Tasks handlers
  async function fetchTasks(retryCount = 0, maxRetries = 3) {
    const clozeCredential = credentials.find(c => c.appKey === "cloze");
    if(clozeCredential) return;
    setTasksLoading(true);
    setTasksError(null);

    try {
      const response = await fetch("/api/tasks", {
        headers: {
          "Content-Type": "application/json",
          "X-Rollout-Token": token!,
          "X-Credential-Id": credentialId!,
        },
      });

      if (response.status === 409 && retryCount < maxRetries) {
        setTasksError("Data not ready. Retrying...");
        await new Promise((resolve) => setTimeout(resolve, 30000));
        return fetchTasks(retryCount + 1, maxRetries);
      }

      if (!response.ok) {
        throw new Error("Failed to fetch tasks data");
      }

      const data = await response.json();
      setTasks(data.tasks || []);
    } catch (err: any) {
      setTasksError(err.message);
    } finally {
      if (retryCount === 0) {
        setTasksLoading(false);
      }
    }
  }

  async function createTask(data: CreateTaskInput) {
    try {
      const response = await fetch("/api/tasks", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Rollout-Token": token!,
          "X-Credential-Id": credentialId!,
        },
        body: JSON.stringify(data),
      });
      // save task to localstorage for optimistic UI update
      const existingTasks = JSON.parse(localStorage.getItem("tasks") || "[]");
      const newTask = { ...data, id: `temp-${Date.now()}` } as Task;
      localStorage.setItem("tasks", JSON.stringify([newTask, ...existingTasks]));
      setTasks((prev) => [newTask, ...prev]);

      if (response.ok) {
        fetchTasks();
      }
    } catch (error) {
      console.error("Error creating task:", error);
    }
  }

  // Emails handlers
  async function fetchEmails() {
    const credential = credentials.find(c => c.appKey === "cloze");

    setEmailsLoading(true);
    setEmailsError(null);

    try {
      const response = await fetch("/api/emails", {
        headers: {
          "Content-Type": "application/json",
          "X-Rollout-Token": token!,
          "X-Credential-Id": credential?.id,
        },
      });

      if (!response.ok) {
        throw new Error("Failed to fetch emails");
      }

      const data = await response.json();
      // Extract messages array from the response
      const messages = data.messages || [];
      // Map messages to add id field for the table
      const messagesWithId = messages.map((msg: any) => ({
        ...msg,
        id: msg.message, // Use message field as id
      }));
      setEmails(messagesWithId);
    } catch (err: any) {
      setEmailsError(err.message);
    } finally {
      setEmailsLoading(false);
    }
  }

  const handleCredentialAdded = async ({ id, appKey }: any) => {
    setCredentialId(id);
  };

  if (loading) {
    return (
      <main className="flex min-h-screen flex-col items-center justify-center p-4">
        <p className="text-gray-500">Loading token...</p>
      </main>
    );
  }

  if (error) {
    return (
      <main className="flex min-h-screen flex-col items-center justify-center p-4">
        <p className="text-red-500">{error}</p>
      </main>
    );
  }

  if (!token) {
    return (
      <main className="flex min-h-screen flex-col items-center justify-center p-4">
        <p className="text-red-500">No token available</p>
      </main>
    );
  }

  return (
    <main className="flex min-h-screen flex-col items-center p-4">
      <div className="max-w-6xl w-full">
        {/* Header */}
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-2xl font-bold">Rollout Universal API Demo</h1>
        </div>

        {/* Rollout Link Provider */}
        <RolloutLinkProvider token={token}>
          <CredentialsManager
            apiCategories={{ crm: true }}
            onCredentialAdded={handleCredentialAdded}
            shouldRenderConnector={(connector) => !["kw-command", "cloze-api-key"].includes(connector.appKey)}
          />
        </RolloutLinkProvider>

        {credentialId && (
          <>
            {/* Resource Tabs */}
            <div className="mt-8">
              <ResourceTabs activeTab={activeTab} onTabChange={setActiveTab} />
            </div>

            {/* Tab Content */}
            <div className="mt-8">
              {activeTab === "people" && (
                <>
                  <PeopleTable
                    people={people}
                    loading={peopleLoading}
                    error={peopleError}
                    onCreateClick={() => setIsPeopleModalOpen(true)}
                    pagination={peoplePagination}
                    onNextPage={goToNextPeoplePage}
                    onPreviousPage={goToPreviousPeoplePage}
                    canGoBack={peopleCursorHistory.length > 0}
                  />
                  <CreatePersonModal
                    isOpen={isPeopleModalOpen}
                    onClose={() => setIsPeopleModalOpen(false)}
                    onSubmit={createPerson}
                  />
                </>
              )}

              {activeTab === "tasks" && (
                <>
                  <TasksTable
                    tasks={tasks}
                    loading={tasksLoading}
                    error={tasksError}
                    onCreateClick={() => setIsTasksModalOpen(true)}
                  />
                  <CreateTaskModal
                    isOpen={isTasksModalOpen}
                    onClose={() => setIsTasksModalOpen(false)}
                    onSubmit={createTask}
                  />
                </>
              )}

              {activeTab === "timeline" && (
                <>
                  <EmailsTable
                    emails={emails}
                    loading={emailsLoading}
                    error={emailsError}
                  />
                  <TasksTable
                    tasks={tasks}
                    loading={tasksLoading}
                    error={tasksError}
                    onCreateClick={() => setIsTasksModalOpen(true)}
                  />
                  <CreateTaskModal
                    isOpen={isTasksModalOpen}
                    onClose={() => setIsTasksModalOpen(false)}
                    onSubmit={createTask}
                  />
                </>
              )}
            </div>
          </>
        )}
      </div>
    </main>
  );
}
