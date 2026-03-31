package models

import "time"

type Board struct {
	ID          uint      `json:"id" gorm:"primaryKey"`
	Name        string    `json:"name" gorm:"not null"`
	WorkspaceID uint      `json:"workspace_id" gorm:"not null"`
	Workspace   Workspace `json:"-" gorm:"foreignKey:WorkspaceID"`
	CreatedAt   time.Time `json:"created_at"`
	UpdatedAt   time.Time `json:"updated_at"`
}
