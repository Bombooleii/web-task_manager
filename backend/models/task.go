package models

import "time"

type Task struct {
	ID          uint      `json:"id" gorm:"primaryKey"`
	Title       string    `json:"title" gorm:"not null"`
	Description string    `json:"description"`
	Status      string    `json:"status" gorm:"default:todo;not null"`
	AssigneeID  *uint     `json:"assignee_id"`
	Assignee    *User     `json:"assignee,omitempty" gorm:"foreignKey:AssigneeID"`
	BoardID     uint      `json:"board_id" gorm:"not null"`
	Board       Board     `json:"-" gorm:"foreignKey:BoardID"`
	DueDate     *time.Time `json:"due_date"`
	Position    int       `json:"position" gorm:"default:0"`
	CreatedAt   time.Time `json:"created_at"`
	UpdatedAt   time.Time `json:"updated_at"`
}
