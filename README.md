# TaskBoard - Task & Team Management System (Trello Clone)

A full-stack Kanban-style task management application with workspaces, boards, drag & drop, and team collaboration.

## Tech Stack

| Layer     | Technology                    |
|-----------|-------------------------------|
| Frontend  | Next.js 14, TypeScript, Tailwind CSS |
| Backend   | Go, Fiber, GORM              |
| Database  | PostgreSQL                    |
| Auth      | JWT (RBAC: admin/member)     |
| Drag & Drop | @dnd-kit                   |

## Features

- **Authentication** - Register, Login, Password Reset with JWT
- **RBAC** - Admin manages all workspaces, members only their own
- **Workspaces** - Create, switch, invite members by email
- **Boards** - Create boards per workspace, delete boards
- **Kanban Board** - Todo / Doing / Done columns with drag & drop
- **Tasks** - Create, edit, delete, assign members, set due dates
- **Comments** - Add comments on tasks
- **API** - Rate limiting, pagination, input validation

## Project Structure

```
task-manager/
├── backend/            # Go + Fiber API
│   ├── config/         # Database config
│   ├── handlers/       # Route handlers
│   ├── middleware/      # JWT auth, RBAC
│   ├── models/         # GORM models
│   ├── routes/         # Route definitions
│   ├── utils/          # JWT token generation
│   └── main.go
├── frontend/           # Next.js App
│   └── src/
│       ├── app/        # Pages (login, register, dashboard, board)
│       ├── contexts/   # Auth context
│       └── lib/        # API client, types
└── README.md
```

## Prerequisites

- Go 1.21+
- Node.js 18+
- PostgreSQL

## Setup

### 1. Database

```bash
psql -c "CREATE DATABASE task_manager;"
```

### 2. Backend

```bash
cd backend

# Configure .env (update DB_USER if needed)
cat .env

# Run
go run main.go
```

The API server starts at `http://localhost:8080`.

### 3. Frontend

```bash
cd frontend
npm install
npm run dev
```

The app opens at `http://localhost:3000`.

## API Endpoints

### Auth
| Method | Endpoint              | Description     |
|--------|-----------------------|-----------------|
| POST   | /api/auth/register    | Register user   |
| POST   | /api/auth/login       | Login           |
| POST   | /api/auth/reset-password | Reset password |

### Workspaces
| Method | Endpoint                          | Description      |
|--------|-----------------------------------|------------------|
| POST   | /api/workspaces                   | Create workspace |
| GET    | /api/workspaces                   | List workspaces  |
| DELETE | /api/workspaces/:id               | Delete workspace |
| POST   | /api/workspaces/:id/invite        | Invite member    |
| GET    | /api/workspaces/:id/members       | List members     |

### Boards
| Method | Endpoint                | Description    |
|--------|-------------------------|----------------|
| POST   | /api/boards             | Create board   |
| GET    | /api/boards?workspace_id= | List boards  |
| DELETE | /api/boards/:id         | Delete board   |

### Tasks
| Method | Endpoint                | Description    |
|--------|-------------------------|----------------|
| POST   | /api/tasks              | Create task    |
| GET    | /api/tasks?board_id=    | List tasks     |
| PUT    | /api/tasks/:id          | Update task    |
| DELETE | /api/tasks/:id          | Delete task    |

### Comments
| Method | Endpoint                    | Description    |
|--------|-----------------------------|----------------|
| POST   | /api/tasks/:id/comments     | Add comment    |
| GET    | /api/tasks/:id/comments     | List comments  |

## Models

- **User** - id, name, email, password, role (admin/member)
- **Workspace** - id, name, owner_id, members (many-to-many)
- **Board** - id, name, workspace_id
- **Task** - id, title, description, status (todo/doing/done), assignee_id, board_id, due_date, position
- **Comment** - id, task_id, user_id, content
