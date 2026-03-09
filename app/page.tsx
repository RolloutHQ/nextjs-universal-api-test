"use client";
import { useState, useEffect, useCallback } from "react";
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
} from "@/types/resources";
import { getAllTasks, addTask } from "./lib/taskStorage";

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
  const [peoplePage, setPeoplePage] = useState(1);
  const [peopleTotalCount, setPeopleTotalCount] = useState(0);
  const PEOPLE_PAGE_SIZE = 25;

  // Tasks state
  const [tasks, setTasks] = useState<Task[]>(getAllTasks());
  const [tasksLoading, setTasksLoading] = useState(false);
  const [tasksError, setTasksError] = useState<string | null>(null);
  const [isTasksModalOpen, setIsTasksModalOpen] = useState(false);

  // Emails state
  const [emails, setEmails] = useState<ClozeMessage[]>([]);
  const [emailsLoading, setEmailsLoading] = useState(false);
  const [emailsError, setEmailsError] = useState<string | null>(null);

  const [credentials, setCredentials] = useState<any[]>([]);
  const [disabledTabs, setDisabledTabs] = useState<ResourceType[]>([]);
  const [assignerEmail, setAssignerEmail] = useState<string>("");
  const credential = credentials.find((cred: any) => cred.id === credentialId);

  useEffect(() => {
    setDisabledTabs(credential?.appKey !== "cloze" ? ["timeline"] : [])
  }, [credentialId, credential, credentials]);

  useEffect(() => {
    if (!credentialId || !token || credential?.appKey !== "cloze") return;
    fetch("/api/me", {
      headers: {
        "X-Rollout-Token": token,
        "X-Credential-Id": credentialId,
      },
    })
      .then((res) => res.json())
      .then((data) => {
        if (data.profile?.email) setAssignerEmail(data.profile.email);
      })
      .catch((err) => console.error("Error fetching profile:", err));
  }, [credentialId, token, credential?.appKey]);

  const getToken = useCallback(async () => {
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
  }, [userId]);

  const fetchCredentials = useCallback(async () => {
    if (!token) return;

    try {
      const response = await fetch("https://universal.rollout.com/api/credentials?includeData=true", {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      const data = await response.json();
      console.log({data})
      setCredentials(data || []);

      if (data && data.length > 0) {
        const clozeCredential = data.find((cred: any) => cred.appKey === "cloze");
        if (clozeCredential && clozeCredential.id) {
          setCredentialId(clozeCredential.id);
        }
      }
    } catch (error) {
      console.error("Error fetching credentials:", error);
    }
  }, [token]);

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
  }, [userId, getToken]);

  // Fetch credentials when token is ready
  useEffect(() => {
    if (userId && token) {
      fetchCredentials();
    }
  }, [token, userId, fetchCredentials]);

  // Fetch active tab data when credentialId and tab changes
  useEffect(() => {
    if (credentialId && token) {
      fetchActiveTabData();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [credentialId, token, activeTab]);

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
  async function fetchPeople(page = 1) {
    setPeopleLoading(true);
    setPeopleError(null);

    try {
      const url = `/api/people?pagenumber=${page}&pagesize=${PEOPLE_PAGE_SIZE}`;
      const response = await fetch(url, {
        headers: {
          "Content-Type": "application/json",
          "X-Rollout-Token": token!,
          "X-Credential-Id": credentialId!,
        },
      });

      if (!response.ok) {
        throw new Error("Failed to fetch people data");
      }

      const data = await response.json();
      setPeople(data.people || []);
      setPeoplePage(data.page ?? page);
      setPeopleTotalCount(data.totalCount ?? 0);
    } catch (err: any) {
      setPeopleError(err.message);
    } finally {
      setPeopleLoading(false);
    }
  }

  function goToNextPeoplePage() {
    const totalPages = Math.ceil(peopleTotalCount / PEOPLE_PAGE_SIZE);
    if (peoplePage < totalPages) fetchPeople(peoplePage + 1);
  }

  function goToPreviousPeoplePage() {
    if (peoplePage > 1) fetchPeople(peoplePage - 1);
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
      const newTask = { ...data, id: `temp-${Date.now()}` } as Task;
      addTask(newTask);
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
    setEmailsLoading(true);
    setEmailsError(null);

    try {
      const response = await fetch("/api/emails", {
        headers: {
          "Content-Type": "application/json",
          "X-Rollout-Token": token,
          "X-Credential-Id": credentialId,
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
    if(appKey === "cloze") {
      setCredentialId(id);
      setDisabledTabs([]);
    } else {
      setDisabledTabs(["timeline"]);
    }
    await fetchCredentials();
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
  console.log({credentialId})

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
            onCredentialDeleted={({ id }) => id === credentialId ? setCredentialId(null) : null}
            shouldRenderConnector={(connector) => !["kw-command", "cloze-api-key"].includes(connector.appKey)}
          />
        </RolloutLinkProvider>

        {credentialId && (
          <>
            {/* Resource Tabs */}
            <div className="mt-8">
              <ResourceTabs activeTab={activeTab} onTabChange={setActiveTab} disabledTabs={disabledTabs} />
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
                    pagination={{ collection: "people", offset: (peoplePage - 1) * PEOPLE_PAGE_SIZE, limit: PEOPLE_PAGE_SIZE, total: peopleTotalCount, next: peoplePage < Math.ceil(peopleTotalCount / PEOPLE_PAGE_SIZE) ? "true" : undefined }}
                    onNextPage={goToNextPeoplePage}
                    onPreviousPage={goToPreviousPeoplePage}
                    canGoBack={peoplePage > 1}
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
                    assignerEmail={assignerEmail}
                    people={people}
                  />
                </>
              )}

              {activeTab === "timeline" && credential?.appKey === "cloze" && (
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
                    people={people}
                    assignerEmail={assignerEmail}
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
