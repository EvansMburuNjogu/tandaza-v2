package store

import (
	"crypto/rand"
	"fmt"
	"strings"
)

const shortCodeAlphabet = "abcdefghijklmnopqrstuvwxyz0123456789"

func randomShortCode(length int) string {
	if length <= 0 {
		length = 6
	}
	buf := make([]byte, length)
	if _, err := rand.Read(buf); err != nil {
		return ""
	}
	var out strings.Builder
	out.Grow(length)
	for _, b := range buf {
		out.WriteByte(shortCodeAlphabet[int(b)%len(shortCodeAlphabet)])
	}
	return out.String()
}

func exhibitorQRTargetPath(expoID string, expoExhibitorID string) string {
	return fmt.Sprintf("/visitor/expos/%s/exhibitors/%s", strings.TrimSpace(expoID), strings.TrimSpace(expoExhibitorID))
}
