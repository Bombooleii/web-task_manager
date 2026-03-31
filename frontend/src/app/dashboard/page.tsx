"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import api from "@/lib/api";
import { Workspace, Board } from "@/lib/types";

export default function DashboardPage() {
  const { user, logout, loading: authLoading } = useAuth();
  const router = useRouter();
  const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
  const [selectedWorkspace, setSelectedWorkspace] = useState<Workspace | null>(null);
  const [boards, setBoards] = useState<Board[]>([]);
  const [loading, setLoading] = useState(true);

  // Modals
  const [showNewWorkspace, setShowNewWorkspace] = useState(false);
  const [showNewBoard, setShowNewBoard] = useState(false);
  const [showInvite, setShowInvite] = useState(false);
  const [newWorkspaceName, setNewWorkspaceName] = useState("");
  const [newBoardName, setNewBoardName] = useState("");
  const [inviteEmail, setInviteEmail] = useState("");

  const fetchWorkspaces = useCallback(async () => {
    try {
      const res = await api.get("/workspaces");
      setWorkspaces(res.data || []);
      if (res.data?.length > 0 && !selectedWorkspace) {
        setSelectedWorkspace(res.data[0]);
      }
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }, [selectedWorkspace]);

  const fetchBoards = useCallback(async () => {
    if (!selectedWorkspace) return;
    try {
      const res = await api.get(`/boards?workspace_id=${selectedWorkspace.id}`);
      setBoards(res.data || []);
    } catch {
      // ignore
    }
  }, [selectedWorkspace]);

  useEffect(() => {
    if (!authLoading && !user) {
      router.replace("/login");
    }
  }, [user, authLoading, router]);

  useEffect(() => {
    if (user) fetchWorkspaces();
  }, [user, fetchWorkspaces]);

  useEffect(() => {
    fetchBoards();
  }, [selectedWorkspace, fetchBoards]);

  const createWorkspace = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await api.post("/workspaces", { name: newWorkspaceName });
      setWorkspaces([...workspaces, res.data]);
      setSelectedWorkspace(res.data);
      setNewWorkspaceName("");
      setShowNewWorkspace(false);
    } catch {
      // ignore
    }
  };

  const createBoard = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedWorkspace) return;
    try {
      const res = await api.post("/boards", {
        name: newBoardName,
        workspace_id: selectedWorkspace.id,
      });
      setBoards([...boards, res.data]);
      setNewBoardName("");
      setShowNewBoard(false);
    } catch {
      // ignore
    }
  };

  const deleteBoard = async (id: number) => {
    try {
      await api.delete(`/boards/${id}`);
      setBoards(boards.filter((b) => b.id !== id));
    } catch {
      // ignore
    }
  };

  const inviteUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedWorkspace) return;
    try {
      await api.post(`/workspaces/${selectedWorkspace.id}/invite`, {
        email: inviteEmail,
      });
      setInviteEmail("");
      setShowInvite(false);
      fetchWorkspaces();
    } catch {
      alert("User not found or already invited");
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
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <h1 className="text-xl font-bold text-gray-900">TaskBoard</h1>
          <div className="flex items-center gap-4">
            <span className="text-sm text-gray-600">
              {user?.name}{" "}
              <span className="text-xs bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full">
                {user?.role}
              </span>
            </span>
            <button
              onClick={logout}
              className="text-sm text-red-600 hover:underline"
            >
              Logout
            </button>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex flex-col lg:flex-row gap-8">
          {/* Sidebar - Workspaces */}
          <div className="w-full lg:w-64 shrink-0">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-sm font-semibold text-gray-900 uppercase tracking-wide">
                Workspaces
              </h2>
              <button
                onClick={() => setShowNewWorkspace(true)}
                className="text-blue-600 hover:text-blue-700 text-sm font-medium"
              >
                + New
              </button>
            </div>

            <div className="space-y-1">
              {workspaces.map((ws) => (
                <button
                  key={ws.id}
                  onClick={() => setSelectedWorkspace(ws)}
                  className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-colors ${
                    selectedWorkspace?.id === ws.id
                      ? "bg-blue-50 text-blue-700 font-medium"
                      : "text-gray-700 hover:bg-gray-100"
                  }`}
                >
                  {ws.name}
                </button>
              ))}
              {workspaces.length === 0 && (
                <p className="text-sm text-gray-400 px-3">No workspaces yet</p>
              )}
            </div>

            {/* Workspace Modal */}
            {showNewWorkspace && (
              <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
                <div className="bg-white rounded-xl p-6 w-full max-w-sm mx-4">
                  <h3 className="text-lg font-semibold mb-4">New Workspace</h3>
                  <form onSubmit={createWorkspace}>
                    <input
                      type="text"
                      value={newWorkspaceName}
                      onChange={(e) => setNewWorkspaceName(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg mb-4 focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="Workspace name"
                      required
                      autoFocus
                    />
                    <div className="flex gap-2 justify-end">
                      <button
                        type="button"
                        onClick={() => setShowNewWorkspace(false)}
                        className="px-4 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-lg"
                      >
                        Cancel
                      </button>
                      <button
                        type="submit"
                        className="px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                      >
                        Create
                      </button>
                    </div>
                  </form>
                </div>
              </div>
            )}
          </div>

          {/* Main content - Boards */}
          <div className="flex-1">
            {selectedWorkspace ? (
              <>
                <div className="flex items-center justify-between mb-6">
                  <div>
                    <h2 className="text-2xl font-bold text-gray-900">
                      {selectedWorkspace.name}
                    </h2>
                    <p className="text-sm text-gray-500">
                      {selectedWorkspace.members?.length || 0} members
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => setShowInvite(true)}
                      className="px-3 py-1.5 text-sm border border-gray-300 rounded-lg hover:bg-gray-50"
                    >
                      Invite
                    </button>
                    <button
                      onClick={() => setShowNewBoard(true)}
                      className="px-3 py-1.5 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                    >
                      + New Board
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {boards.map((board) => (
                    <div
                      key={board.id}
                      className="bg-white border border-gray-200 rounded-xl p-5 hover:shadow-md transition-shadow cursor-pointer group"
                      onClick={() => router.push(`/board/${board.id}?workspace_id=${selectedWorkspace.id}`)}
                    >
                      <div className="flex items-start justify-between">
                        <h3 className="font-semibold text-gray-900">{board.name}</h3>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            deleteBoard(board.id);
                          }}
                          className="text-gray-400 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                        </button>
                      </div>
                      <p className="text-xs text-gray-400 mt-2">
                        Created {new Date(board.created_at).toLocaleDateString()}
                      </p>
                    </div>
                  ))}
                  {boards.length === 0 && (
                    <p className="text-gray-400 col-span-3 text-center py-12">
                      No boards yet. Create one to get started!
                    </p>
                  )}
                </div>
              </>
            ) : (
              <div className="text-center py-20 text-gray-400">
                Select or create a workspace to get started
              </div>
            )}

            {/* New Board Modal */}
            {showNewBoard && (
              <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
                <div className="bg-white rounded-xl p-6 w-full max-w-sm mx-4">
                  <h3 className="text-lg font-semibold mb-4">New Board</h3>
                  <form onSubmit={createBoard}>
                    <input
                      type="text"
                      value={newBoardName}
                      onChange={(e) => setNewBoardName(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg mb-4 focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="Board name"
                      required
                      autoFocus
                    />
                    <div className="flex gap-2 justify-end">
                      <button
                        type="button"
                        onClick={() => setShowNewBoard(false)}
                        className="px-4 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-lg"
                      >
                        Cancel
                      </button>
                      <button
                        type="submit"
                        className="px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                      >
                        Create
                      </button>
                    </div>
                  </form>
                </div>
              </div>
            )}

            {/* Invite Modal */}
            {showInvite && (
              <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
                <div className="bg-white rounded-xl p-6 w-full max-w-sm mx-4">
                  <h3 className="text-lg font-semibold mb-4">Invite Member</h3>
                  <form onSubmit={inviteUser}>
                    <input
                      type="email"
                      value={inviteEmail}
                      onChange={(e) => setInviteEmail(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg mb-4 focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="user@example.com"
                      required
                      autoFocus
                    />
                    <div className="flex gap-2 justify-end">
                      <button
                        type="button"
                        onClick={() => setShowInvite(false)}
                        className="px-4 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-lg"
                      >
                        Cancel
                      </button>
                      <button
                        type="submit"
                        className="px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                      >
                        Invite
                      </button>
                    </div>
                  </form>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
