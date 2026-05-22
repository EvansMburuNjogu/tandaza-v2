package auth

import (
	"crypto/hmac"
	"crypto/sha256"
	"encoding/base64"
	"encoding/json"
	"errors"
	"fmt"
	"strings"
	"time"

	"tandaza/backend/internal/domain"
)

var ErrInvalidToken = errors.New("invalid token")
var ErrExpiredToken = errors.New("expired token")

type Claims struct {
	UserID    string      `json:"sub"`
	Email     string      `json:"email"`
	Role      domain.Role `json:"role"`
	ExpiresAt int64       `json:"exp"`
}

type TokenService struct {
	secret []byte
	ttl    time.Duration
}

func NewTokenService(secret string, ttl time.Duration) TokenService {
	return TokenService{secret: []byte(secret), ttl: ttl}
}

func (s TokenService) Sign(user domain.User) (string, error) {
	claims := Claims{
		UserID:    user.ID,
		Email:     user.Email,
		Role:      user.Role,
		ExpiresAt: time.Now().Add(s.ttl).Unix(),
	}
	payload, err := json.Marshal(claims)
	if err != nil {
		return "", err
	}
	encodedPayload := base64.RawURLEncoding.EncodeToString(payload)
	signature := s.sign(encodedPayload)
	return fmt.Sprintf("tdz.%s.%s", encodedPayload, signature), nil
}

func (s TokenService) Verify(token string) (Claims, error) {
	parts := strings.Split(token, ".")
	if len(parts) != 3 || parts[0] != "tdz" {
		return Claims{}, ErrInvalidToken
	}
	if !hmac.Equal([]byte(parts[2]), []byte(s.sign(parts[1]))) {
		return Claims{}, ErrInvalidToken
	}
	payload, err := base64.RawURLEncoding.DecodeString(parts[1])
	if err != nil {
		return Claims{}, ErrInvalidToken
	}
	var claims Claims
	if err := json.Unmarshal(payload, &claims); err != nil {
		return Claims{}, ErrInvalidToken
	}
	if time.Now().Unix() > claims.ExpiresAt {
		return Claims{}, ErrExpiredToken
	}
	return claims, nil
}

func (s TokenService) sign(payload string) string {
	mac := hmac.New(sha256.New, s.secret)
	mac.Write([]byte(payload))
	return base64.RawURLEncoding.EncodeToString(mac.Sum(nil))
}
