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
  useDroppable,
} from "@dnd-kit/core";
import {
  SortableContext,
  verticalListSortingStrategy,
  useSortable,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

const COLUMNS = [
  { id: "todo", label: "Todo", dot: "bg-zinc-400", border: "border-zinc-600" },
  { id: "doing", label: "In Progress", dot: "bg-blue-400", border: "border-blue-500/40" },
  { id: "done", label: "Done", dot: "bg-emerald-400", border: "border-emerald-500/40" },
];

function Column({
  id,
  children,
}: {
  id: string;
  children: React.ReactNode;
}) {
  const { setNodeRef, isOver } = useDroppable({ id });
  return (
    <div
      ref={setNodeRef}
      className={`space-y-2.5 min-h-[120px] rounded-lg p-1 transition-colors ${
        isOver ? "bg-white/5" : ""
      }`}
    >
      {children}
    </div>
  );
}

function TaskCard({
  task,
  onClick,
}: {
  task: Task;
  onClick: () => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: task.id, data: { task, status: task.status } });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.4 : 1,
  };

  const isOverdue =
    task.due_date && new Date(task.due_date) < new Date() && task.status !== "done";

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      onClick={onClick}
      className="bg-[#1a1a23] rounded-lg border border-zinc-800 p-3.5 cursor-grab active:cursor-grabbing hover:border-zinc-600 transition-all group"
    >
      <h4 className="text-sm font-medium text-zinc-100">{task.title}</h4>
      {task.description && (
        <p className="text-xs text-zinc-500 mt-1.5 line-clamp-2">{task.description}</p>
      )}
      <div className="flex items-center gap-2 mt-2.5">
        {task.assignee && (
          <span className="inline-flex items-center gap-1.5 text-xs bg-zinc-800 text-zinc-400 px-2 py-0.5 rounded-full">
            <span className="w-4 h-4 rounded-full bg-blue-500/80 text-white flex items-center justify-center text-[10px] font-medium">
              {task.assignee.name[0]}
            </span>
            {task.assignee.name}
          </span>
        )}
        {task.due_date && (
          <span
            className={`text-xs px-1.5 py-0.5 rounded ${
              isOverdue
                ? "text-red-400 bg-red-500/10"
                : "text-zinc-500"
            }`}
          >
            {new Date(task.due_date).toLocaleDateString()}
          </span>
        )}
      </div>
    </div>
  );
}

function TaskOverlay({ task }: { task: Task }) {
  return (
    <div className="bg-[#1a1a23] rounded-lg border border-blue-500/50 shadow-2xl shadow-blue-500/10 p-3.5 w-72">
      <h4 className="text-sm font-medium text-zinc-100">{task.title}</h4>
      {task.description && (
        <p className="text-xs text-zinc-500 mt-1.5 line-clamp-2">{task.description}</p>
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

  const [showTaskModal, setShowTaskModal] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [taskForm, setTaskForm] = useState({
    title: "",
    description: "",
    assignee_id: "" as string,
    due_date: "",
  });

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

    const activeTaskData = tasks.find((t) => t.id === active.id);
    if (!activeTaskData) return;

    // Dropping over a column directly
    const overColumn = COLUMNS.find((c) => c.id === over.id);
    if (overColumn && activeTaskData.status !== overColumn.id) {
      setTasks((prev) =>
        prev.map((t) =>
          t.id === active.id ? { ...t, status: overColumn.id as Task["status"] } : t
        )
      );
      return;
    }

    // Dropping over another task — move to that task's column
    const overTask = tasks.find((t) => t.id === over.id);
    if (overTask && activeTaskData.status !== overTask.status) {
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
      <div className="min-h-screen flex items-center justify-center bg-[#0f0f13]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0f0f13] flex flex-col">
      {/* Header */}
      <header className="bg-[#16161d] border-b border-zinc-800/80">
        <div className="max-w-full mx-auto px-4 sm:px-6 lg:px-8 h-14 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button
              onClick={() => router.push("/dashboard")}
              className="text-zinc-500 hover:text-zinc-300 transition-colors"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </button>
            <h1 className="text-base font-semibold text-zinc-100">Board</h1>
          </div>
          <button
            onClick={openCreateTask}
            className="px-3.5 py-1.5 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-500 transition-colors font-medium"
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
          <div className="flex gap-5 min-h-[calc(100vh-8rem)]">
            {COLUMNS.map((col) => {
              const columnTasks = getColumnTasks(col.id);
              return (
                <div
                  key={col.id}
                  className={`w-80 shrink-0 bg-[#16161d] rounded-xl p-3.5 border ${col.border}`}
                >
                  <div className="flex items-center justify-between mb-3.5 px-1">
                    <div className="flex items-center gap-2">
                      <span className={`w-2 h-2 rounded-full ${col.dot}`}></span>
                      <h3 className="text-sm font-semibold text-zinc-300">
                        {col.label}
                      </h3>
                    </div>
                    <span className="text-xs text-zinc-600 bg-zinc-800 px-2 py-0.5 rounded-full font-medium">
                      {columnTasks.length}
                    </span>
                  </div>
                  <SortableContext
                    id={col.id}
                    items={columnTasks.map((t) => t.id)}
                    strategy={verticalListSortingStrategy}
                  >
                    <Column id={col.id}>
                      {columnTasks.map((task) => (
                        <TaskCard
                          key={task.id}
                          task={task}
                          onClick={() => openEditTask(task)}
                        />
                      ))}
                    </Column>
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
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-start justify-center z-50 pt-20 px-4 overflow-y-auto">
          <div className="bg-[#1e1e28] rounded-xl w-full max-w-lg mb-20 border border-zinc-800">
            <div className="p-6">
              <div className="flex items-center justify-between mb-5">
                <h3 className="text-lg font-semibold text-zinc-100">
                  {editingTask ? "Edit Task" : "New Task"}
                </h3>
                <button
                  onClick={() => setShowTaskModal(false)}
                  className="text-zinc-500 hover:text-zinc-300 transition-colors"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              <form onSubmit={saveTask} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-zinc-400 mb-1.5">
                    Title
                  </label>
                  <input
                    type="text"
                    value={taskForm.title}
                    onChange={(e) =>
                      setTaskForm({ ...taskForm, title: e.target.value })
                    }
                    className="w-full px-3 py-2 bg-[#0f0f13] border border-zinc-700 rounded-lg text-zinc-100 placeholder-zinc-600 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50"
                    required
                    autoFocus
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-zinc-400 mb-1.5">
                    Description
                  </label>
                  <textarea
                    value={taskForm.description}
                    onChange={(e) =>
                      setTaskForm({ ...taskForm, description: e.target.value })
                    }
                    className="w-full px-3 py-2 bg-[#0f0f13] border border-zinc-700 rounded-lg text-zinc-100 placeholder-zinc-600 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50 resize-none"
                    rows={3}
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-zinc-400 mb-1.5">
                      Assignee
                    </label>
                    <select
                      value={taskForm.assignee_id}
                      onChange={(e) =>
                        setTaskForm({ ...taskForm, assignee_id: e.target.value })
                      }
                      className="w-full px-3 py-2 bg-[#0f0f13] border border-zinc-700 rounded-lg text-zinc-100 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50"
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
                    <label className="block text-sm font-medium text-zinc-400 mb-1.5">
                      Due Date
                    </label>
                    <input
                      type="date"
                      value={taskForm.due_date}
                      onChange={(e) =>
                        setTaskForm({ ...taskForm, due_date: e.target.value })
                      }
                      className="w-full px-3 py-2 bg-[#0f0f13] border border-zinc-700 rounded-lg text-zinc-100 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50"
                    />
                  </div>
                </div>

                {editingTask && (
                  <div>
                    <label className="block text-sm font-medium text-zinc-400 mb-1.5">
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
                      className="w-full px-3 py-2 bg-[#0f0f13] border border-zinc-700 rounded-lg text-zinc-100 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50"
                    >
                      <option value="todo">Todo</option>
                      <option value="doing">In Progress</option>
                      <option value="done">Done</option>
                    </select>
                  </div>
                )}

                <div className="flex gap-2 justify-end pt-2">
                  {editingTask && (
                    <button
                      type="button"
                      onClick={deleteTask}
                      className="px-4 py-2 text-sm text-red-400 hover:bg-red-500/10 rounded-lg mr-auto transition-colors"
                    >
                      Delete
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => setShowTaskModal(false)}
                    className="px-4 py-2 text-sm text-zinc-400 hover:bg-zinc-800 rounded-lg transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-500 transition-colors font-medium"
                  >
                    {editingTask ? "Save" : "Create"}
                  </button>
                </div>
              </form>
            </div>

            {/* Comments */}
            {editingTask && (
              <div className="border-t border-zinc-800 p-6">
                <h4 className="text-sm font-semibold text-zinc-300 mb-3">
                  Comments
                </h4>

                <div className="space-y-3 max-h-48 overflow-y-auto mb-4">
                  {comments.map((comment) => (
                    <div key={comment.id} className="flex gap-2.5">
                      <div className="w-7 h-7 rounded-full bg-blue-500/80 text-white flex items-center justify-center text-xs font-medium shrink-0">
                        {comment.user?.name?.[0] || "?"}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-baseline gap-2">
                          <span className="text-sm font-medium text-zinc-200">
                            {comment.user?.name}
                          </span>
                          <span className="text-xs text-zinc-600">
                            {new Date(comment.created_at).toLocaleString()}
                          </span>
                        </div>
                        <p className="text-sm text-zinc-400">{comment.content}</p>
                      </div>
                    </div>
                  ))}
                  {comments.length === 0 && (
                    <p className="text-sm text-zinc-600">No comments yet</p>
                  )}
                </div>

                <form onSubmit={addComment} className="flex gap-2">
                  <input
                    type="text"
                    value={newComment}
                    onChange={(e) => setNewComment(e.target.value)}
                    className="flex-1 px-3 py-2 bg-[#0f0f13] border border-zinc-700 rounded-lg text-sm text-zinc-100 placeholder-zinc-600 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50"
                    placeholder="Add a comment..."
                  />
                  <button
                    type="submit"
                    className="px-3 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-500 transition-colors"
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
