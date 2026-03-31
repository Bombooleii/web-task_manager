package main

import (
	"log"
	"os"
	"time"

	"task-manager-backend/config"
	"task-manager-backend/models"
	"task-manager-backend/routes"

	"github.com/gofiber/fiber/v2"
	"github.com/gofiber/fiber/v2/middleware/cors"
	"github.com/gofiber/fiber/v2/middleware/limiter"
	"github.com/joho/godotenv"
)

func main() {
	godotenv.Load()

	config.ConnectDB()

	// Auto migrate
	config.DB.AutoMigrate(
		&models.User{},
		&models.Workspace{},
		&models.Board{},
		&models.Task{},
		&models.Comment{},
	)

	app := fiber.New(fiber.Config{
		ErrorHandler: func(c *fiber.Ctx, err error) error {
			return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
				"error": err.Error(),
			})
		},
	})

	// CORS
	allowOrigins := os.Getenv("CORS_ORIGINS")
	if allowOrigins == "" {
		allowOrigins = "http://localhost:3000"
	}
	app.Use(cors.New(cors.Config{
		AllowOrigins: allowOrigins,
		AllowHeaders: "Origin, Content-Type, Accept, Authorization",
		AllowMethods: "GET, POST, PUT, DELETE, OPTIONS",
	}))

	// Rate limiter
	app.Use(limiter.New(limiter.Config{
		Max:               100,
		Expiration:        1 * time.Minute,
		LimiterMiddleware: limiter.SlidingWindow{},
	}))

	// Routes
	routes.Setup(app)

	// Root
	app.Get("/", func(c *fiber.Ctx) error {
		return c.JSON(fiber.Map{
			"name":    "TaskBoard API",
			"version": "1.0.0",
			"status":  "running",
			"docs": fiber.Map{
				"auth":       "POST /api/auth/login, /api/auth/register",
				"workspaces": "GET/POST /api/workspaces",
				"boards":     "GET/POST /api/boards",
				"tasks":      "GET/POST/PUT/DELETE /api/tasks",
				"comments":   "GET/POST /api/tasks/:id/comments",
			},
		})
	})

	// Health check
	app.Get("/health", func(c *fiber.Ctx) error {
		return c.JSON(fiber.Map{"status": "ok"})
	})

	port := os.Getenv("PORT")
	if port == "" {
		port = "8080"
	}

	log.Printf("Server running on port %s", port)
	log.Fatal(app.Listen(":" + port))
}
