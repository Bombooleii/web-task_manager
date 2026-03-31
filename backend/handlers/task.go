package handlers

import (
	"strconv"
	"time"

	"task-manager-backend/config"
	"task-manager-backend/models"

	"github.com/gofiber/fiber/v2"
)

type CreateTaskInput struct {
	Title       string `json:"title" validate:"required,min=1"`
	Description string `json:"description"`
	BoardID     uint   `json:"board_id" validate:"required"`
	AssigneeID  *uint  `json:"assignee_id"`
	DueDate     string `json:"due_date"`
}

type UpdateTaskInput struct {
	Title       string `json:"title"`
	Description string `json:"description"`
	Status      string `json:"status"`
	AssigneeID  *uint  `json:"assignee_id"`
	DueDate     string `json:"due_date"`
	Position    *int   `json:"position"`
}

func CreateTask(c *fiber.Ctx) error {
	var input CreateTaskInput
	if err := c.BodyParser(&input); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Invalid input"})
	}
	if err := validate.Struct(input); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": err.Error()})
	}

	var board models.Board
	if err := config.DB.First(&board, input.BoardID).Error; err != nil {
		return c.Status(fiber.StatusNotFound).JSON(fiber.Map{"error": "Board not found"})
	}

	task := models.Task{
		Title:       input.Title,
		Description: input.Description,
		Status:      "todo",
		BoardID:     input.BoardID,
		AssigneeID:  input.AssigneeID,
	}

	if input.DueDate != "" {
		t, err := time.Parse("2006-01-02", input.DueDate)
		if err == nil {
			task.DueDate = &t
		}
	}

	// Set position to end of list
	var maxPos int
	config.DB.Model(&models.Task{}).Where("board_id = ? AND status = ?", input.BoardID, "todo").
		Select("COALESCE(MAX(position), -1)").Scan(&maxPos)
	task.Position = maxPos + 1

	if err := config.DB.Create(&task).Error; err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "Failed to create task"})
	}

	config.DB.Preload("Assignee").First(&task, task.ID)

	return c.Status(fiber.StatusCreated).JSON(task)
}

func GetTasks(c *fiber.Ctx) error {
	boardID := c.Query("board_id")
	if boardID == "" {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "board_id is required"})
	}

	page, _ := strconv.Atoi(c.Query("page", "1"))
	limit, _ := strconv.Atoi(c.Query("limit", "50"))
	offset := (page - 1) * limit

	var tasks []models.Task
	config.DB.Preload("Assignee").
		Where("board_id = ?", boardID).
		Order("position ASC").
		Offset(offset).Limit(limit).
		Find(&tasks)

	return c.JSON(tasks)
}

func UpdateTask(c *fiber.Ctx) error {
	id := c.Params("id")

	var task models.Task
	if err := config.DB.First(&task, id).Error; err != nil {
		return c.Status(fiber.StatusNotFound).JSON(fiber.Map{"error": "Task not found"})
	}

	var input UpdateTaskInput
	if err := c.BodyParser(&input); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Invalid input"})
	}

	updates := map[string]interface{}{}

	if input.Title != "" {
		updates["title"] = input.Title
	}
	if input.Description != "" {
		updates["description"] = input.Description
	}
	if input.Status != "" {
		if input.Status != "todo" && input.Status != "doing" && input.Status != "done" {
			return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Invalid status. Must be: todo, doing, done"})
		}
		updates["status"] = input.Status
	}
	if input.AssigneeID != nil {
		updates["assignee_id"] = input.AssigneeID
	}
	if input.Position != nil {
		updates["position"] = *input.Position
	}
	if input.DueDate != "" {
		t, err := time.Parse("2006-01-02", input.DueDate)
		if err == nil {
			updates["due_date"] = t
		}
	}

	config.DB.Model(&task).Updates(updates)
	config.DB.Preload("Assignee").First(&task, task.ID)

	return c.JSON(task)
}

func DeleteTask(c *fiber.Ctx) error {
	id := c.Params("id")

	var task models.Task
	if err := config.DB.First(&task, id).Error; err != nil {
		return c.Status(fiber.StatusNotFound).JSON(fiber.Map{"error": "Task not found"})
	}

	config.DB.Delete(&task)

	return c.JSON(fiber.Map{"message": "Task deleted"})
}
