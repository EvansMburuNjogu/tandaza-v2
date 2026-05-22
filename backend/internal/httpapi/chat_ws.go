package httpapi

import (
	"net/http"
	"strings"
	"sync"

	"tandaza/backend/internal/auth"
	"tandaza/backend/internal/domain"
	"tandaza/backend/internal/store"

	"github.com/gorilla/websocket"
)

type chatSocketEvent struct {
	Type    string                             `json:"type"`
	Thread  domain.ExhibitorConversationThread `json:"thread"`
	Message domain.ChatMessageRecord           `json:"message,omitempty"`
}

type chatHub struct {
	mu      sync.Mutex
	clients map[string]map[*websocket.Conn]bool
}

func newChatHub() *chatHub {
	return &chatHub{clients: map[string]map[*websocket.Conn]bool{}}
}

func (h *chatHub) add(threadID string, conn *websocket.Conn) {
	h.mu.Lock()
	defer h.mu.Unlock()
	if h.clients[threadID] == nil {
		h.clients[threadID] = map[*websocket.Conn]bool{}
	}
	h.clients[threadID][conn] = true
}

func (h *chatHub) remove(threadID string, conn *websocket.Conn) {
	h.mu.Lock()
	defer h.mu.Unlock()
	if h.clients[threadID] != nil {
		delete(h.clients[threadID], conn)
	}
}

func (h *chatHub) broadcast(threadID string, event chatSocketEvent) {
	h.mu.Lock()
	connections := make([]*websocket.Conn, 0, len(h.clients[threadID]))
	for conn := range h.clients[threadID] {
		connections = append(connections, conn)
	}
	h.mu.Unlock()
	for _, conn := range connections {
		_ = conn.WriteJSON(event)
	}
}

var chatUpgrader = websocket.Upgrader{
	CheckOrigin: func(r *http.Request) bool { return true },
}

func (s *Server) chatWebSocket(w http.ResponseWriter, r *http.Request) {
	claims, ok := s.claimsFromWebSocket(r)
	if !ok {
		http.Error(w, "unauthorized", http.StatusUnauthorized)
		return
	}
	actor, err := s.store.UserByID(r.Context(), claims.UserID)
	if err != nil {
		http.Error(w, "unauthorized", http.StatusUnauthorized)
		return
	}
	if actor.Role == domain.RoleExhibitor {
		actor = s.exhibitorWorkspaceUser(r.Context(), actor)
	}
	threadID := strings.TrimSpace(r.URL.Query().Get("thread"))
	if threadID == "" {
		http.Error(w, "thread required", http.StatusBadRequest)
		return
	}
	threads, err := s.store.ListChatThreads(r.Context(), structToChatThreadFilter(r.PathValue("id"), threadID, actor), actor)
	if err != nil || len(threads) == 0 {
		http.Error(w, "thread not found", http.StatusNotFound)
		return
	}
	conn, err := chatUpgrader.Upgrade(w, r, nil)
	if err != nil {
		return
	}
	s.chatHub.add(threadID, conn)
	defer func() {
		s.chatHub.remove(threadID, conn)
		_ = conn.Close()
	}()
	for {
		if _, _, err := conn.NextReader(); err != nil {
			return
		}
	}
}

func (s *Server) claimsFromWebSocket(r *http.Request) (auth.Claims, bool) {
	token := strings.TrimSpace(r.URL.Query().Get("token"))
	if token == "" {
		return auth.Claims{}, false
	}
	claims, err := s.tokenService.Verify(token)
	if err != nil {
		return auth.Claims{}, false
	}
	return claims, true
}

func structToChatThreadFilter(expoID string, threadID string, actor domain.User) store.ChatThreadFilter {
	filter := store.ChatThreadFilter{ExpoID: expoID, ThreadID: threadID}
	if actor.Role == domain.RoleExhibitor {
		filter.ExhibitorID = actor.ID
	}
	if actor.Role == domain.RoleVisitor {
		filter.VisitorID = actor.ID
	}
	return filter
}
