package handlers

import (
	"task-manager-backend/config"
	"task-manager-backend/models"

	"github.com/gofiber/fiber/v2"
)

type CreateBoardInput struct {
	Name        string `json:"name" validate:"required,min=1"`
	WorkspaceID uint   `json:"workspace_id" validate:"required"`
}

func CreateBoard(c *fiber.Ctx) error {
	var input CreateBoardInput
	if err := c.BodyParser(&input); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Invalid input"})
	}
	if err := validate.Struct(input); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": err.Error()})
	}

	var workspace models.Workspace
	if err := config.DB.First(&workspace, input.WorkspaceID).Error; err != nil {
		return c.Status(fiber.StatusNotFound).JSON(fiber.Map{"error": "Workspace not found"})
	}

	board := models.Board{
		Name:        input.Name,
		WorkspaceID: input.WorkspaceID,
	}

	if err := config.DB.Create(&board).Error; err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "Failed to create board"})
	}

	return c.Status(fiber.StatusCreated).JSON(board)
}

func GetBoards(c *fiber.Ctx) error {
	workspaceID := c.Query("workspace_id")
	if workspaceID == "" {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "workspace_id is required"})
	}

	var boards []models.Board
	config.DB.Where("workspace_id = ?", workspaceID).Find(&boards)

	return c.JSON(boards)
}

func DeleteBoard(c *fiber.Ctx) error {
	id := c.Params("id")
	userID := c.Locals("userID").(uint)
	user := c.Locals("user").(models.User)

	var board models.Board
	if err := config.DB.First(&board, id).Error; err != nil {
		return c.Status(fiber.StatusNotFound).JSON(fiber.Map{"error": "Board not found"})
	}

	var workspace models.Workspace
	config.DB.First(&workspace, board.WorkspaceID)

	if workspace.OwnerID != userID && user.Role != "admin" {
		return c.Status(fiber.StatusForbidden).JSON(fiber.Map{"error": "Not authorized"})
	}

	config.DB.Delete(&board)

	return c.JSON(fiber.Map{"message": "Board deleted"})
}
