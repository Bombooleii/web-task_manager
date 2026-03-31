"use client";

import { useState, useEffect, useCallback } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import api from "@/lib/api";
import { Task, User, Comment } from "@/lib/types";
import {
  DndContext,
  DragEndEvent,
  DragOverEvent,
  DragStartEvent,
  DragOverlay,
  closestCorners,
  PointerSensor,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import {
  SortableContext,
  verticalListSortingStrategy,
  useSortable,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

const COLUMNS = [
  { id: "todo", label: "Todo", color: "bg-gray-100", accent: "border-gray-300" },
  { id: "doing", label: "Doing", color: "bg-blue-50", accent: "border-blue-400" },
  { id: "done", label: "Done", color: "bg-green-50", accent: "border-green-400" },
];

function TaskCard({
  task,
  onClick,
}: {
  task: Task;
  onClick: () => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: task.id, data: { task } });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      onClick={onClick}
      className="bg-white rounded-lg border border-gray-200 p-3 cursor-grab active:cursor-grabbing hover:shadow-sm transition-shadow"
    >
      <h4 className="text-sm font-medium text-gray-900">{task.title}</h4>
      {task.description && (
        <p className="text-xs text-gray-500 mt-1 line-clamp-2">{task.description}</p>
      )}
      <div className="flex items-center gap-2 mt-2">
        {task.assignee && (
          <span className="inline-flex items-center gap-1 text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full">
            <span className="w-4 h-4 rounded-full bg-blue-500 text-white flex items-center justify-center text-[10px] font-medium">
              {task.assignee.name[0]}
            </span>
            {task.assignee.name}
          </span>
        )}
        {task.due_date && (
          <span className="text-xs text-gray-400">
            {new Date(task.due_date).toLocaleDateString()}
          </span>
        )}
      </div>
    </div>
  );
}

function TaskOverlay({ task }: { task: Task }) {
  return (
    <div className="bg-white rounded-lg border border-blue-300 shadow-lg p-3 w-72">
      <h4 className="text-sm font-medium text-gray-900">{task.title}</h4>
      {task.description && (
        <p className="text-xs text-gray-500 mt-1 line-clamp-2">{task.description}</p>
      )}
    </div>
  );
}

export default function BoardPage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const boardId = params.id;
  const workspaceId = searchParams.get("workspace_id");

  const [tasks, setTasks] = useState<Task[]>([]);
  const [members, setMembers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTask, setActiveTask] = useState<Task | null>(null);

  // Task modal
  const [showTaskModal, setShowTaskModal] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [taskForm, setTaskForm] = useState({
    title: "",
    description: "",
    assignee_id: "" as string,
    due_date: "",
  });

  // Comments
  const [comments, setComments] = useState<Comment[]>([]);
  const [newComment, setNewComment] = useState("");

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } })
  );

  const fetchTasks = useCallback(async () => {
    try {
      const res = await api.get(`/tasks?board_id=${boardId}`);
      setTasks(res.data || []);
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }, [boardId]);

  const fetchMembers = useCallback(async () => {
    if (!workspaceId) return;
    try {
      const res = await api.get(`/workspaces/${workspaceId}/members`);
      setMembers(res.data || []);
    } catch {
      // ignore
    }
  }, [workspaceId]);

  const fetchComments = async (taskId: number) => {
    try {
      const res = await api.get(`/tasks/${taskId}/comments`);
      setComments(res.data || []);
    } catch {
      // ignore
    }
  };

  useEffect(() => {
    if (!authLoading && !user) {
      router.replace("/login");
    }
  }, [user, authLoading, router]);

  useEffect(() => {
    if (user) {
      fetchTasks();
      fetchMembers();
    }
  }, [user, fetchTasks, fetchMembers]);

  const getColumnTasks = (status: string) =>
    tasks.filter((t) => t.status === status).sort((a, b) => a.position - b.position);

  const handleDragStart = (event: DragStartEvent) => {
    const task = tasks.find((t) => t.id === event.active.id);
    if (task) setActiveTask(task);
  };

  const handleDragOver = (event: DragOverEvent) => {
    const { active, over } = event;
    if (!over) return;

    const activeTask = tasks.find((t) => t.id === active.id);
    if (!activeTask) return;

    // Check if dropping over a column
    const overColumn = COLUMNS.find((c) => c.id === over.id);
    if (overColumn && activeTask.status !== overColumn.id) {
      setTasks((prev) =>
        prev.map((t) =>
          t.id === active.id ? { ...t, status: overColumn.id as Task["status"] } : t
        )
      );
      return;
    }

    // Dropping over another task
    const overTask = tasks.find((t) => t.id === over.id);
    if (overTask && activeTask.status !== overTask.status) {
      setTasks((prev) =>
        prev.map((t) =>
          t.id === active.id ? { ...t, status: overTask.status } : t
        )
      );
    }
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    setActiveTask(null);
    const { active } = event;
    const task = tasks.find((t) => t.id === active.id);
    if (!task) return;

    try {
      await api.put(`/tasks/${task.id}`, { status: task.status });
    } catch {
      fetchTasks();
    }
  };

  const openCreateTask = () => {
    setEditingTask(null);
    setTaskForm({ title: "", description: "", assignee_id: "", due_date: "" });
    setComments([]);
    setShowTaskModal(true);
  };

  const openEditTask = (task: Task) => {
    setEditingTask(task);
    setTaskForm({
      title: task.title,
      description: task.description || "",
      assignee_id: task.assignee_id?.toString() || "",
      due_date: task.due_date ? task.due_date.split("T")[0] : "",
    });
    setShowTaskModal(true);
    fetchComments(task.id);
  };

  const saveTask = async (e: React.FormEvent) => {
    e.preventDefault();
    const data: Record<string, unknown> = {
      title: taskForm.title,
      description: taskForm.description,
      due_date: taskForm.due_date || undefined,
    };
    if (taskForm.assignee_id) {
      data.assignee_id = parseInt(taskForm.assignee_id);
    }

    try {
      if (editingTask) {
        await api.put(`/tasks/${editingTask.id}`, data);
      } else {
        data.board_id = parseInt(boardId as string);
        await api.post("/tasks", data);
      }
      fetchTasks();
      setShowTaskModal(false);
    } catch {
      // ignore
    }
  };

  const deleteTask = async () => {
    if (!editingTask) return;
    try {
      await api.delete(`/tasks/${editingTask.id}`);
      fetchTasks();
      setShowTaskModal(false);
    } catch {
      // ignore
    }
  };

  const addComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingTask || !newComment.trim()) return;
    try {
      await api.post(`/tasks/${editingTask.id}/comments`, { content: newComment });
      setNewComment("");
      fetchComments(editingTask.id);
    } catch {
      // ignore
    }
  };

  if (authLoading || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* Header */}
      <header className="bg-white border-b border-gray-200">
        <div className="max-w-full mx-auto px-4 sm:px-6 lg:px-8 h-14 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button
              onClick={() => router.push("/dashboard")}
              className="text-gray-500 hover:text-gray-700"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </button>
            <h1 className="text-lg font-semibold text-gray-900">Board</h1>
          </div>
          <button
            onClick={openCreateTask}
            className="px-3 py-1.5 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            + New Task
          </button>
        </div>
      </header>

      {/* Kanban Board */}
      <div className="flex-1 p-4 sm:p-6 overflow-x-auto">
        <DndContext
          sensors={sensors}
          collisionDetection={closestCorners}
          onDragStart={handleDragStart}
          onDragOver={handleDragOver}
          onDragEnd={handleDragEnd}
        >
          <div className="flex gap-4 min-h-[calc(100vh-8rem)]">
            {COLUMNS.map((col) => {
              const columnTasks = getColumnTasks(col.id);
              return (
                <div
                  key={col.id}
                  className={`w-80 shrink-0 ${col.color} rounded-xl p-3 border-t-2 ${col.accent}`}
                >
                  <div className="flex items-center justify-between mb-3 px-1">
                    <h3 className="text-sm font-semibold text-gray-700">
                      {col.label}
                    </h3>
                    <span className="text-xs text-gray-400 bg-white px-2 py-0.5 rounded-full">
                      {columnTasks.length}
                    </span>
                  </div>
                  <SortableContext
                    id={col.id}
                    items={columnTasks.map((t) => t.id)}
                    strategy={verticalListSortingStrategy}
                  >
                    <div className="space-y-2 min-h-[100px]">
                      {columnTasks.map((task) => (
                        <TaskCard
                          key={task.id}
                          task={task}
                          onClick={() => openEditTask(task)}
                        />
                      ))}
                    </div>
                  </SortableContext>
                </div>
              );
            })}
          </div>
          <DragOverlay>
            {activeTask ? <TaskOverlay task={activeTask} /> : null}
          </DragOverlay>
        </DndContext>
      </div>

      {/* Task Modal */}
      {showTaskModal && (
        <div className="fixed inset-0 bg-black/50 flex items-start justify-center z-50 pt-20 px-4 overflow-y-auto">
          <div className="bg-white rounded-xl w-full max-w-lg mb-20">
            <div className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold">
                  {editingTask ? "Edit Task" : "New Task"}
                </h3>
                <button
                  onClick={() => setShowTaskModal(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              <form onSubmit={saveTask} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Title
                  </label>
                  <input
                    type="text"
                    value={taskForm.title}
                    onChange={(e) =>
                      setTaskForm({ ...taskForm, title: e.target.value })
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    required
                    autoFocus
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Description
                  </label>
                  <textarea
                    value={taskForm.description}
                    onChange={(e) =>
                      setTaskForm({ ...taskForm, description: e.target.value })
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                    rows={3}
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Assignee
                    </label>
                    <select
                      value={taskForm.assignee_id}
                      onChange={(e) =>
                        setTaskForm({ ...taskForm, assignee_id: e.target.value })
                      }
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="">Unassigned</option>
                      {members.map((m) => (
                        <option key={m.id} value={m.id}>
                          {m.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Due Date
                    </label>
                    <input
                      type="date"
                      value={taskForm.due_date}
                      onChange={(e) =>
                        setTaskForm({ ...taskForm, due_date: e.target.value })
                      }
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </div>

                {editingTask && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Status
                    </label>
                    <select
                      value={editingTask.status}
                      onChange={async (e) => {
                        const newStatus = e.target.value as Task["status"];
                        await api.put(`/tasks/${editingTask.id}`, { status: newStatus });
                        setEditingTask({ ...editingTask, status: newStatus });
                        fetchTasks();
                      }}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="todo">Todo</option>
                      <option value="doing">Doing</option>
                      <option value="done">Done</option>
                    </select>
                  </div>
                )}

                <div className="flex gap-2 justify-end pt-2">
                  {editingTask && (
                    <button
                      type="button"
                      onClick={deleteTask}
                      className="px-4 py-2 text-sm text-red-600 hover:bg-red-50 rounded-lg mr-auto"
                    >
                      Delete
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => setShowTaskModal(false)}
                    className="px-4 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-lg"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                  >
                    {editingTask ? "Save" : "Create"}
                  </button>
                </div>
              </form>
            </div>

            {/* Comments Section */}
            {editingTask && (
              <div className="border-t border-gray-200 p-6">
                <h4 className="text-sm font-semibold text-gray-700 mb-3">
                  Comments
                </h4>

                <div className="space-y-3 max-h-48 overflow-y-auto mb-4">
                  {comments.map((comment) => (
                    <div key={comment.id} className="flex gap-2">
                      <div className="w-7 h-7 rounded-full bg-blue-500 text-white flex items-center justify-center text-xs font-medium shrink-0">
                        {comment.user?.name?.[0] || "?"}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-baseline gap-2">
                          <span className="text-sm font-medium text-gray-900">
                            {comment.user?.name}
                          </span>
                          <span className="text-xs text-gray-400">
                            {new Date(comment.created_at).toLocaleString()}
                          </span>
                        </div>
                        <p className="text-sm text-gray-600">{comment.content}</p>
                      </div>
                    </div>
                  ))}
                  {comments.length === 0 && (
                    <p className="text-sm text-gray-400">No comments yet</p>
                  )}
                </div>

                <form onSubmit={addComment} className="flex gap-2">
                  <input
                    type="text"
                    value={newComment}
                    onChange={(e) => setNewComment(e.target.value)}
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Add a comment..."
                  />
                  <button
                    type="submit"
                    className="px-3 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                  >
                    Send
                  </button>
                </form>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
