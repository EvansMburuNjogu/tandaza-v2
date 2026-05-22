package auth

import (
	"testing"
	"time"

	"tandaza/backend/internal/domain"
)

func TestTokenRoundTrip(t *testing.T) {
	service := NewTokenService("test-secret", time.Hour)
	token, err := service.Sign(domain.User{
		ID:    "usr_admin_001",
		Email: "admin@tandaza.demo",
		Role:  domain.RoleAdministrator,
	})
	if err != nil {
		t.Fatalf("sign failed: %v", err)
	}
	claims, err := service.Verify(token)
	if err != nil {
		t.Fatalf("verify failed: %v", err)
	}
	if claims.UserID != "usr_admin_001" || claims.Role != domain.RoleAdministrator {
		t.Fatalf("claims mismatch: %+v", claims)
	}
}

func TestTokenRejectsTampering(t *testing.T) {
	service := NewTokenService("test-secret", time.Hour)
	token, err := service.Sign(domain.User{ID: "usr_001", Email: "u@example.com", Role: domain.RoleVisitor})
	if err != nil {
		t.Fatalf("sign failed: %v", err)
	}
	if _, err := service.Verify(token + "x"); err == nil {
		t.Fatal("expected tampered token to fail")
	}
}
