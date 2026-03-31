package handlers

import (
	"strconv"

	"task-manager-backend/config"
	"task-manager-backend/models"

	"github.com/gofiber/fiber/v2"
)

type CreateWorkspaceInput struct {
	Name string `json:"name" validate:"required,min=2"`
}

type InviteInput struct {
	Email string `json:"email" validate:"required,email"`
}

func CreateWorkspace(c *fiber.Ctx) error {
	var input CreateWorkspaceInput
	if err := c.BodyParser(&input); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Invalid input"})
	}
	if err := validate.Struct(input); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": err.Error()})
	}

	userID := c.Locals("userID").(uint)
	user := c.Locals("user").(models.User)

	workspace := models.Workspace{
		Name:    input.Name,
		OwnerID: userID,
		Members: []models.User{user},
	}

	if err := config.DB.Create(&workspace).Error; err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "Failed to create workspace"})
	}

	config.DB.Preload("Owner").Preload("Members").First(&workspace, workspace.ID)

	return c.Status(fiber.StatusCreated).JSON(workspace)
}

func GetWorkspaces(c *fiber.Ctx) error {
	userID := c.Locals("userID").(uint)
	user := c.Locals("user").(models.User)

	page, _ := strconv.Atoi(c.Query("page", "1"))
	limit, _ := strconv.Atoi(c.Query("limit", "20"))
	offset := (page - 1) * limit

	var workspaces []models.Workspace
	query := config.DB.Preload("Owner").Preload("Members")

	if user.Role == "admin" {
		query.Offset(offset).Limit(limit).Find(&workspaces)
	} else {
		query.Joins("JOIN workspace_members ON workspace_members.workspace_id = workspaces.id").
			Where("workspace_members.user_id = ?", userID).
			Offset(offset).Limit(limit).
			Find(&workspaces)
	}

	return c.JSON(workspaces)
}

func DeleteWorkspace(c *fiber.Ctx) error {
	id := c.Params("id")
	userID := c.Locals("userID").(uint)
	user := c.Locals("user").(models.User)

	var workspace models.Workspace
	if err := config.DB.First(&workspace, id).Error; err != nil {
		return c.Status(fiber.StatusNotFound).JSON(fiber.Map{"error": "Workspace not found"})
	}

	if workspace.OwnerID != userID && user.Role != "admin" {
		return c.Status(fiber.StatusForbidden).JSON(fiber.Map{"error": "Not authorized"})
	}

	config.DB.Select("Members").Delete(&workspace)

	return c.JSON(fiber.Map{"message": "Workspace deleted"})
}

func InviteToWorkspace(c *fiber.Ctx) error {
	id := c.Params("id")
	userID := c.Locals("userID").(uint)
	user := c.Locals("user").(models.User)

	var input InviteInput
	if err := c.BodyParser(&input); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Invalid input"})
	}
	if err := validate.Struct(input); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": err.Error()})
	}

	var workspace models.Workspace
	if err := config.DB.First(&workspace, id).Error; err != nil {
		return c.Status(fiber.StatusNotFound).JSON(fiber.Map{"error": "Workspace not found"})
	}

	if workspace.OwnerID != userID && user.Role != "admin" {
		return c.Status(fiber.StatusForbidden).JSON(fiber.Map{"error": "Not authorized"})
	}

	var invitee models.User
	if err := config.DB.Where("email = ?", input.Email).First(&invitee).Error; err != nil {
		return c.Status(fiber.StatusNotFound).JSON(fiber.Map{"error": "User not found"})
	}

	config.DB.Model(&workspace).Association("Members").Append(&invitee)

	return c.JSON(fiber.Map{"message": "User invited successfully"})
}

func GetWorkspaceMembers(c *fiber.Ctx) error {
	id := c.Params("id")

	var workspace models.Workspace
	if err := config.DB.Preload("Members").First(&workspace, id).Error; err != nil {
		return c.Status(fiber.StatusNotFound).JSON(fiber.Map{"error": "Workspace not found"})
	}

	return c.JSON(workspace.Members)
}
