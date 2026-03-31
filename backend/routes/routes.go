package routes

import (
	"task-manager-backend/handlers"
	"task-manager-backend/middleware"

	"github.com/gofiber/fiber/v2"
)

func Setup(app *fiber.App) {
	api := app.Group("/api")

	// Auth routes (public)
	auth := api.Group("/auth")
	auth.Post("/register", handlers.Register)
	auth.Post("/login", handlers.Login)
	auth.Post("/reset-password", handlers.ResetPassword)

	// Protected routes
	protected := api.Group("", middleware.AuthRequired())

	// User
	protected.Get("/me", handlers.GetMe)

	// Workspaces
	protected.Post("/workspaces", handlers.CreateWorkspace)
	protected.Get("/workspaces", handlers.GetWorkspaces)
	protected.Delete("/workspaces/:id", handlers.DeleteWorkspace)
	protected.Post("/workspaces/:id/invite", handlers.InviteToWorkspace)
	protected.Get("/workspaces/:id/members", handlers.GetWorkspaceMembers)

	// Boards
	protected.Post("/boards", handlers.CreateBoard)
	protected.Get("/boards", handlers.GetBoards)
	protected.Delete("/boards/:id", handlers.DeleteBoard)

	// Tasks
	protected.Post("/tasks", handlers.CreateTask)
	protected.Get("/tasks", handlers.GetTasks)
	protected.Put("/tasks/:id", handlers.UpdateTask)
	protected.Delete("/tasks/:id", handlers.DeleteTask)

	// Comments
	protected.Post("/tasks/:id/comments", handlers.CreateComment)
	protected.Get("/tasks/:id/comments", handlers.GetComments)
}
