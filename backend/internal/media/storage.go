package media

import (
	"bytes"
	"context"
	"crypto/hmac"
	"crypto/sha256"
	"encoding/hex"
	"fmt"
	"io"
	"net/http"
	"net/url"
	"os"
	"path"
	"path/filepath"
	"sort"
	"strings"
	"time"

	"tandaza/backend/internal/config"
)

type Object struct {
	Key         string
	URL         string
	ContentType string
	Size        int
}

type Store interface {
	Put(ctx context.Context, key string, content []byte, contentType string) (Object, error)
	Get(ctx context.Context, key string) ([]byte, string, error)
	PublicURL(key string) string
}

func NewStore(cfg config.Config) Store {
	if strings.EqualFold(strings.TrimSpace(cfg.StorageDriver), "s3") || strings.EqualFold(strings.TrimSpace(cfg.StorageDriver), "minio") {
		return S3Store{cfg: cfg, client: &http.Client{Timeout: 30 * time.Second}}
	}
	if strings.TrimSpace(cfg.LocalStorageDir) == "" {
		cfg.LocalStorageDir = "../.dev/uploads"
	}
	return LocalStore{dir: cfg.LocalStorageDir}
}

type LocalStore struct {
	dir string
}

func (s LocalStore) Put(ctx context.Context, key string, content []byte, contentType string) (Object, error) {
	if err := os.MkdirAll(s.dir, 0o755); err != nil {
		return Object{}, err
	}
	cleanKey := safeKey(key)
	if err := os.WriteFile(filepath.Join(s.dir, filepath.Base(cleanKey)), content, 0o644); err != nil {
		return Object{}, err
	}
	return Object{Key: filepath.Base(cleanKey), URL: "/api/backend/uploads/" + filepath.Base(cleanKey), ContentType: contentType, Size: len(content)}, nil
}

func (s LocalStore) Get(ctx context.Context, key string) ([]byte, string, error) {
	cleanKey := filepath.Base(safeKey(key))
	content, err := os.ReadFile(filepath.Join(s.dir, cleanKey))
	if err != nil {
		return nil, "", err
	}
	return content, http.DetectContentType(content), nil
}

func (s LocalStore) PublicURL(key string) string {
	return "/api/backend/uploads/" + filepath.Base(safeKey(key))
}

type S3Store struct {
	cfg    config.Config
	client *http.Client
}

func (s S3Store) Put(ctx context.Context, key string, content []byte, contentType string) (Object, error) {
	if err := s.validate(); err != nil {
		return Object{}, err
	}
	req, err := s.newRequest(ctx, http.MethodPut, safeKey(key), bytes.NewReader(content), contentType, content)
	if err != nil {
		return Object{}, err
	}
	resp, err := s.client.Do(req)
	if err != nil {
		return Object{}, err
	}
	defer resp.Body.Close()
	body, _ := io.ReadAll(io.LimitReader(resp.Body, 4096))
	if resp.StatusCode < 200 || resp.StatusCode > 299 {
		return Object{}, fmt.Errorf("s3 put failed: HTTP %d %s", resp.StatusCode, strings.TrimSpace(string(body)))
	}
	cleanKey := safeKey(key)
	return Object{Key: cleanKey, URL: s.PublicURL(cleanKey), ContentType: contentType, Size: len(content)}, nil
}

func (s S3Store) Get(ctx context.Context, key string) ([]byte, string, error) {
	if err := s.validate(); err != nil {
		return nil, "", err
	}
	req, err := s.newRequest(ctx, http.MethodGet, safeKey(key), nil, "", nil)
	if err != nil {
		return nil, "", err
	}
	resp, err := s.client.Do(req)
	if err != nil {
		return nil, "", err
	}
	defer resp.Body.Close()
	content, _ := io.ReadAll(io.LimitReader(resp.Body, 20<<20))
	if resp.StatusCode < 200 || resp.StatusCode > 299 {
		return nil, "", fmt.Errorf("s3 get failed: HTTP %d %s", resp.StatusCode, strings.TrimSpace(string(content)))
	}
	contentType := resp.Header.Get("Content-Type")
	if contentType == "" {
		contentType = http.DetectContentType(content)
	}
	return content, contentType, nil
}

func (s S3Store) PublicURL(key string) string {
	cleanKey := safeKey(key)
	if strings.TrimSpace(s.cfg.S3PublicURL) != "" {
		return strings.TrimRight(s.cfg.S3PublicURL, "/") + "/" + pathEscape(cleanKey)
	}
	return "/api/backend/media/" + pathEscape(cleanKey)
}

func (s S3Store) validate() error {
	if strings.TrimSpace(s.cfg.S3Endpoint) == "" || strings.TrimSpace(s.cfg.S3Bucket) == "" || strings.TrimSpace(s.cfg.S3AccessKey) == "" || strings.TrimSpace(s.cfg.S3SecretKey) == "" {
		return fmt.Errorf("s3 storage is not fully configured")
	}
	return nil
}

func (s S3Store) newRequest(ctx context.Context, method string, key string, body io.Reader, contentType string, content []byte) (*http.Request, error) {
	endpoint, err := url.Parse(strings.TrimRight(s.cfg.S3Endpoint, "/"))
	if err != nil {
		return nil, err
	}
	cleanKey := safeKey(key)
	bucket := strings.TrimSpace(s.cfg.S3Bucket)
	if s.cfg.S3ForcePathStyle {
		endpoint.Path = path.Join(endpoint.Path, bucket, cleanKey)
	} else {
		endpoint.Host = bucket + "." + endpoint.Host
		endpoint.Path = path.Join(endpoint.Path, cleanKey)
	}
	payloadHash := sha256Hex(content)
	if method == http.MethodGet {
		payloadHash = sha256Hex(nil)
	}
	req, err := http.NewRequestWithContext(ctx, method, endpoint.String(), body)
	if err != nil {
		return nil, err
	}
	if contentType != "" {
		req.Header.Set("Content-Type", contentType)
	}
	req.Header.Set("Host", endpoint.Host)
	req.Header.Set("X-Amz-Content-Sha256", payloadHash)
	now := time.Now().UTC()
	req.Header.Set("X-Amz-Date", now.Format("20060102T150405Z"))
	s.sign(req, payloadHash, now)
	return req, nil
}

func (s S3Store) sign(req *http.Request, payloadHash string, now time.Time) {
	region := strings.TrimSpace(s.cfg.S3Region)
	if region == "" {
		region = "us-east-1"
	}
	date := now.Format("20060102")
	headers := signedHeaders(req)
	canonicalHeaders := canonicalHeaders(req, headers)
	canonicalRequest := strings.Join([]string{
		req.Method,
		canonicalURI(req.URL.EscapedPath()),
		req.URL.RawQuery,
		canonicalHeaders,
		strings.Join(headers, ";"),
		payloadHash,
	}, "\n")
	scope := strings.Join([]string{date, region, "s3", "aws4_request"}, "/")
	stringToSign := strings.Join([]string{
		"AWS4-HMAC-SHA256",
		now.Format("20060102T150405Z"),
		scope,
		sha256Hex([]byte(canonicalRequest)),
	}, "\n")
	signingKey := hmacSHA256(hmacSHA256(hmacSHA256(hmacSHA256([]byte("AWS4"+s.cfg.S3SecretKey), date), region), "s3"), "aws4_request")
	signature := hex.EncodeToString(hmacSHA256(signingKey, stringToSign))
	req.Header.Set("Authorization", "AWS4-HMAC-SHA256 Credential="+s.cfg.S3AccessKey+"/"+scope+", SignedHeaders="+strings.Join(headers, ";")+", Signature="+signature)
}

func signedHeaders(req *http.Request) []string {
	headers := []string{}
	for key := range req.Header {
		headers = append(headers, strings.ToLower(key))
	}
	headers = append(headers, "host")
	sort.Strings(headers)
	return compactStrings(headers)
}

func canonicalHeaders(req *http.Request, headers []string) string {
	lines := make([]string, 0, len(headers))
	for _, key := range headers {
		value := req.Header.Get(key)
		if key == "host" {
			value = req.URL.Host
		}
		lines = append(lines, key+":"+strings.Join(strings.Fields(value), " "))
	}
	return strings.Join(lines, "\n") + "\n"
}

func canonicalURI(value string) string {
	if value == "" {
		return "/"
	}
	return value
}

func safeKey(key string) string {
	key = strings.Trim(strings.ReplaceAll(key, "\\", "/"), "/")
	key = path.Clean("/" + key)
	key = strings.TrimPrefix(key, "/")
	if key == "." || key == "" {
		return "media/object"
	}
	return key
}

func pathEscape(key string) string {
	parts := strings.Split(safeKey(key), "/")
	for index, part := range parts {
		parts[index] = url.PathEscape(part)
	}
	return strings.Join(parts, "/")
}

func sha256Hex(content []byte) string {
	sum := sha256.Sum256(content)
	return hex.EncodeToString(sum[:])
}

func hmacSHA256(key []byte, value string) []byte {
	mac := hmac.New(sha256.New, key)
	_, _ = mac.Write([]byte(value))
	return mac.Sum(nil)
}

func compactStrings(values []string) []string {
	result := []string{}
	seen := map[string]bool{}
	for _, value := range values {
		if value == "" || seen[value] {
			continue
		}
		seen[value] = true
		result = append(result, value)
	}
	return result
}
