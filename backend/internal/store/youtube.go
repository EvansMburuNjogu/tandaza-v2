package store

import (
	"net/url"
	"strings"
)

func isYouTubeURL(value string) bool {
	return youtubeVideoID(value) != ""
}

func youtubeEmbedURL(value string) string {
	id := youtubeVideoID(value)
	if id == "" {
		return ""
	}
	return "https://www.youtube.com/embed/" + id
}

func youtubeVideoID(value string) string {
	raw := strings.TrimSpace(value)
	if raw == "" {
		return ""
	}
	parsed, err := url.Parse(raw)
	if err != nil {
		return ""
	}
	host := strings.ToLower(strings.TrimPrefix(parsed.Hostname(), "www."))
	switch host {
	case "youtu.be":
		return cleanYoutubeID(strings.Trim(parsed.Path, "/"))
	case "youtube.com", "m.youtube.com", "music.youtube.com":
		if id := cleanYoutubeID(parsed.Query().Get("v")); id != "" {
			return id
		}
		parts := strings.Split(strings.Trim(parsed.Path, "/"), "/")
		if len(parts) >= 2 && (parts[0] == "live" || parts[0] == "embed" || parts[0] == "shorts") {
			return cleanYoutubeID(parts[1])
		}
	}
	return ""
}

func cleanYoutubeID(value string) string {
	value = strings.TrimSpace(value)
	if value == "" {
		return ""
	}
	for _, char := range value {
		if !(char >= 'a' && char <= 'z') && !(char >= 'A' && char <= 'Z') && !(char >= '0' && char <= '9') && char != '-' && char != '_' {
			return ""
		}
	}
	return value
}
