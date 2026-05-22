package security

import "testing"

func TestPasswordHashAndVerify(t *testing.T) {
	hash, err := HashPassword("admin456")
	if err != nil {
		t.Fatalf("hash password: %v", err)
	}
	if hash == "admin456" || hash == "demo:admin456" {
		t.Fatalf("password hash should not store plaintext-compatible value: %s", hash)
	}
	if !VerifyPassword("admin456", hash) {
		t.Fatal("expected password verification to pass")
	}
	if VerifyPassword("wrong", hash) {
		t.Fatal("expected wrong password verification to fail")
	}
}

func TestPIIProtectorEncryptsAndHashes(t *testing.T) {
	protector := NewPIIProtector("test-secret")
	encrypted, err := protector.Encrypt("visitor@tandaza.demo")
	if err != nil {
		t.Fatalf("encrypt: %v", err)
	}
	if encrypted == "visitor@tandaza.demo" || encrypted == "" {
		t.Fatalf("expected encrypted value, got %q", encrypted)
	}
	if decrypted := protector.Decrypt(encrypted); decrypted != "visitor@tandaza.demo" {
		t.Fatalf("decrypted = %q", decrypted)
	}
	if protector.Hash("Visitor@Tandaza.Demo") != protector.Hash("visitor@tandaza.demo") {
		t.Fatal("expected normalized deterministic PII hash")
	}
}
