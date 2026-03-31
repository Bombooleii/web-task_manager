package models

import "time"

type Workspace struct {
	ID        uint      `json:"id" gorm:"primaryKey"`
	Name      string    `json:"name" gorm:"not null"`
	OwnerID   uint      `json:"owner_id" gorm:"not null"`
	Owner     User      `json:"owner" gorm:"foreignKey:OwnerID"`
	Members   []User    `json:"members" gorm:"many2many:workspace_members;"`
	CreatedAt time.Time `json:"created_at"`
	UpdatedAt time.Time `json:"updated_at"`
}
