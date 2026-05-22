package store

import (
	"context"
	"testing"
	"time"

	"tandaza/backend/internal/auth"
	"tandaza/backend/internal/domain"
)

func TestBootstrapAdminCreatesIdempotentLoginUser(t *testing.T) {
	tokenService := auth.NewTokenService("test-secret", time.Hour)
	mem := NewMemoryStore(tokenService)
	input := domain.AdminUserInput{
		Name:        "Bootstrap Admin",
		Email:       "root@tandaza.test",
		Password:    "root-password",
		CompanyName: "Tandaza",
	}

	user, created, err := mem.BootstrapAdmin(context.Background(), input)
	if err != nil {
		t.Fatalf("bootstrap admin: %v", err)
	}
	if !created {
		t.Fatal("expected first bootstrap call to create admin")
	}
	if user.Role != domain.RoleSuperAdmin {
		t.Fatalf("role = %s, want super_administrator", user.Role)
	}

	again, created, err := mem.BootstrapAdmin(context.Background(), input)
	if err != nil {
		t.Fatalf("second bootstrap admin: %v", err)
	}
	if created {
		t.Fatal("expected second bootstrap call to be idempotent")
	}
	if again.ID != user.ID {
		t.Fatalf("second user ID = %s, want %s", again.ID, user.ID)
	}

	loggedIn, token, err := mem.Login(context.Background(), "root@tandaza.test", "root-password")
	if err != nil {
		t.Fatalf("login bootstrap admin: %v", err)
	}
	if token == "" || loggedIn.ID != user.ID {
		t.Fatalf("unexpected login result user=%+v token=%q", loggedIn, token)
	}
}

func TestBootstrapAdminRejectsExistingNonAdminEmail(t *testing.T) {
	tokenService := auth.NewTokenService("test-secret", time.Hour)
	mem := NewMemoryStore(tokenService)

	_, _, err := mem.BootstrapAdmin(context.Background(), domain.AdminUserInput{
		Email:    "visitor@tandaza.demo",
		Password: "root-password",
	})
	if err == nil {
		t.Fatal("expected bootstrap to reject an existing non-admin email")
	}
}
