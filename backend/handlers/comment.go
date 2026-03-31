package handlers

import (
	"task-manager-backend/config"
	"task-manager-backend/models"

	"github.com/gofiber/fiber/v2"
)

type CreateCommentInput struct {
	Content string `json:"content" validate:"required,min=1"`
}

func CreateComment(c *fiber.Ctx) error {
	taskID := c.Params("id")

	var task models.Task
	if err := config.DB.First(&task, taskID).Error; err != nil {
		return c.Status(fiber.StatusNotFound).JSON(fiber.Map{"error": "Task not found"})
	}

	var input CreateCommentInput
	if err := c.BodyParser(&input); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Invalid input"})
	}
	if err := validate.Struct(input); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": err.Error()})
	}

	userID := c.Locals("userID").(uint)

	comment := models.Comment{
		TaskID:  task.ID,
		UserID:  userID,
		Content: input.Content,
	}

	if err := config.DB.Create(&comment).Error; err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "Failed to create comment"})
	}

	config.DB.Preload("User").First(&comment, comment.ID)

	return c.Status(fiber.StatusCreated).JSON(comment)
}

func GetComments(c *fiber.Ctx) error {
	taskID := c.Params("id")

	var comments []models.Comment
	config.DB.Preload("User").Where("task_id = ?", taskID).Order("created_at ASC").Find(&comments)

	return c.JSON(comments)
}
