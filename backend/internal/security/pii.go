package security

import (
	"crypto/aes"
	"crypto/cipher"
	"crypto/hmac"
	"crypto/rand"
	"crypto/sha256"
	"encoding/base64"
	"encoding/hex"
	"fmt"
	"strings"
)

type PIIProtector struct {
	key []byte
}

func NewPIIProtector(secret string) PIIProtector {
	secret = strings.TrimSpace(secret)
	if secret == "" {
		return PIIProtector{}
	}
	sum := sha256.Sum256([]byte(secret))
	return PIIProtector{key: sum[:]}
}

func (p PIIProtector) Enabled() bool {
	return len(p.key) == 32
}

func (p PIIProtector) Hash(value string) string {
	normalized := strings.ToLower(strings.TrimSpace(value))
	if normalized == "" || !p.Enabled() {
		return ""
	}
	mac := hmac.New(sha256.New, p.key)
	mac.Write([]byte(normalized))
	return hex.EncodeToString(mac.Sum(nil))
}

func (p PIIProtector) Encrypt(value string) (string, error) {
	value = strings.TrimSpace(value)
	if value == "" || !p.Enabled() {
		return value, nil
	}
	block, err := aes.NewCipher(p.key)
	if err != nil {
		return "", err
	}
	gcm, err := cipher.NewGCM(block)
	if err != nil {
		return "", err
	}
	nonce := make([]byte, gcm.NonceSize())
	if _, err := rand.Read(nonce); err != nil {
		return "", err
	}
	ciphertext := gcm.Seal(nil, nonce, []byte(value), nil)
	return "enc:v1:" + base64.RawStdEncoding.EncodeToString(append(nonce, ciphertext...)), nil
}

func (p PIIProtector) Decrypt(value string) string {
	if !strings.HasPrefix(value, "enc:v1:") || !p.Enabled() {
		return value
	}
	raw, err := base64.RawStdEncoding.DecodeString(strings.TrimPrefix(value, "enc:v1:"))
	if err != nil {
		return ""
	}
	block, err := aes.NewCipher(p.key)
	if err != nil {
		return ""
	}
	gcm, err := cipher.NewGCM(block)
	if err != nil || len(raw) < gcm.NonceSize() {
		return ""
	}
	nonce := raw[:gcm.NonceSize()]
	ciphertext := raw[gcm.NonceSize():]
	plaintext, err := gcm.Open(nil, nonce, ciphertext, nil)
	if err != nil {
		return ""
	}
	return string(plaintext)
}

func (p PIIProtector) MustEncrypt(value string) string {
	if strings.TrimSpace(value) == "" || !p.Enabled() {
		return ""
	}
	encrypted, err := p.Encrypt(value)
	if err != nil {
		return fmt.Sprintf("encryption_error:%x", sha256.Sum256([]byte(value)))
	}
	return encrypted
}
