package store

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"os"
	"path/filepath"
	"sort"
	"strings"
	"time"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"

	"tandaza/backend/internal/auth"
	"tandaza/backend/internal/domain"
	"tandaza/backend/internal/platform"
	"tandaza/backend/internal/security"
)

type PostgresStore struct {
	pool         *pgxpool.Pool
	tokenService auth.TokenService
	pii          security.PIIProtector
}

func NewPostgresStore(ctx context.Context, databaseURL string, tokenService auth.TokenService) (*PostgresStore, error) {
	pool, err := pgxpool.New(ctx, databaseURL)
	if err != nil {
		return nil, err
	}
	if err := pool.Ping(ctx); err != nil {
		pool.Close()
		return nil, err
	}
	return &PostgresStore{pool: pool, tokenService: tokenService, pii: security.NewPIIProtector(os.Getenv("PII_ENCRYPTION_KEY"))}, nil
}

func (s *PostgresStore) Close() {
	s.pool.Close()
}

func (s *PostgresStore) Migrate(ctx context.Context) error {
	if _, err := s.pool.Exec(ctx, `CREATE TABLE IF NOT EXISTS schema_migrations (version TEXT PRIMARY KEY, applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW())`); err != nil {
		return err
	}
	migrationsDir := filepath.Join("database", "migrations")
	entries, err := os.ReadDir(migrationsDir)
	if err != nil {
		return err
	}
	names := []string{}
	for _, entry := range entries {
		if !entry.IsDir() && strings.HasSuffix(entry.Name(), ".sql") {
			names = append(names, entry.Name())
		}
	}
	sort.Strings(names)
	for _, name := range names {
		var exists bool
		if err := s.pool.QueryRow(ctx, `SELECT EXISTS (SELECT 1 FROM schema_migrations WHERE version=$1)`, name).Scan(&exists); err != nil {
			return err
		}
		if exists {
			continue
		}
		sqlBytes, err := os.ReadFile(filepath.Join(migrationsDir, name))
		if err != nil {
			return err
		}
		tx, err := s.pool.Begin(ctx)
		if err != nil {
			return err
		}
		if _, err := tx.Exec(ctx, string(sqlBytes)); err != nil {
			_ = tx.Rollback(ctx)
			return fmt.Errorf("migration %s failed: %w", name, err)
		}
		if _, err := tx.Exec(ctx, `INSERT INTO schema_migrations (version) VALUES ($1)`, name); err != nil {
			_ = tx.Rollback(ctx)
			return err
		}
		if err := tx.Commit(ctx); err != nil {
			return err
		}
	}
	return nil
}

func (s *PostgresStore) Login(ctx context.Context, email string, password string) (domain.User, string, error) {
	var user domain.User
	var passwordHash string
	var emailCipher string
	var nameCipher string
	var companyCipher string
	emailLookup := strings.TrimSpace(strings.ToLower(email))
	emailHash := s.pii.Hash(emailLookup)
	err := s.pool.QueryRow(ctx, `SELECT id, name, email, role, COALESCE(avatar_url,''), COALESCE(company_name,''), COALESCE(country_code,''), COALESCE(status,'active'), COALESCE(must_change_password,FALSE), COALESCE(password_hash,''), COALESCE(email_cipher,''), COALESCE(name_cipher,''), COALESCE(company_name_cipher,'') FROM users WHERE (lower(email)=lower($1) OR ($2 <> '' AND email_hash=$2)) AND status='active'`, emailLookup, emailHash).
		Scan(&user.ID, &user.Name, &user.Email, &user.Role, &user.AvatarURL, &user.CompanyName, &user.CountryCode, &user.Status, &user.MustChangePassword, &passwordHash, &emailCipher, &nameCipher, &companyCipher)
	if err != nil {
		return domain.User{}, "", ErrInvalidCredentials
	}
	if !security.VerifyPassword(password, passwordHash) {
		return domain.User{}, "", ErrInvalidCredentials
	}
	user = s.decryptUser(user, emailCipher, nameCipher, companyCipher)
	token, err := s.tokenService.Sign(user)
	return user, token, err
}

func (s *PostgresStore) Register(ctx context.Context, email string, password string, input domain.RegisterInput) (domain.User, string, error) {
	if strings.TrimSpace(email) == "" || strings.TrimSpace(password) == "" || strings.TrimSpace(input.Name) == "" || isAdminRole(input.Role) {
		return domain.User{}, "", ErrInvalidCredentials
	}
	if input.Role == "" {
		input.Role = domain.RoleVisitor
	}
	if input.Role != domain.RoleVisitor {
		return domain.User{}, "", ErrInvalidCredentials
	}
	id := fmt.Sprintf("usr_%d", time.Now().UnixNano())
	countryCode := strings.ToUpper(strings.TrimSpace(input.CountryCode))
	if countryCode == "" {
		countryCode = "KE"
	}
	passwordHash, err := security.HashPassword(password)
	if err != nil {
		return domain.User{}, "", err
	}
	emailValue := strings.TrimSpace(strings.ToLower(email))
	nameValue := strings.TrimSpace(input.Name)
	companyValue := strings.TrimSpace(input.CompanyName)
	emailCipher := s.pii.MustEncrypt(emailValue)
	nameCipher := s.pii.MustEncrypt(nameValue)
	companyCipher := s.pii.MustEncrypt(companyValue)
	_, err = s.pool.Exec(ctx, `INSERT INTO users (id, email, password_hash, name, role, avatar_url, company_name, country_code, email_verified, status, email_hash, email_cipher, name_cipher, company_name_cipher)
		VALUES ($1,$2,$3,$4,$5,$6,$7,$8,FALSE,'active',$9,$10,$11,$12)`,
		id, storagePIIValue(s.pii, emailValue), passwordHash, storagePIIValue(s.pii, nameValue), input.Role, "/avatars/visitor.svg", storagePIIValue(s.pii, companyValue), countryCode, s.pii.Hash(emailValue), emailCipher, nameCipher, companyCipher)
	if err != nil {
		return domain.User{}, "", err
	}
	user, err := s.UserByID(ctx, id)
	if err != nil {
		return domain.User{}, "", err
	}
	token, err := s.tokenService.Sign(user)
	return user, token, err
}

func (s *PostgresStore) AuthWithGoogle(ctx context.Context, input domain.GoogleAuthInput) (domain.User, string, error) {
	email := strings.TrimSpace(strings.ToLower(input.Email))
	name := strings.TrimSpace(input.Name)
	if email == "" || name == "" {
		return domain.User{}, "", ErrInvalidCredentials
	}
	var existingID string
	emailHash := s.pii.Hash(email)
	err := s.pool.QueryRow(ctx, `SELECT id FROM users WHERE (lower(email)=lower($1) OR ($2 <> '' AND email_hash=$2)) AND status='active'`, email, emailHash).Scan(&existingID)
	if err == nil {
		user, err := s.UserByID(ctx, existingID)
		if err != nil {
			return domain.User{}, "", err
		}
		token, err := s.tokenService.Sign(user)
		return user, token, err
	}
	passwordHash, err := security.HashPassword(fmt.Sprintf("google:%s:%d", email, time.Now().UnixNano()))
	if err != nil {
		return domain.User{}, "", err
	}
	id := fmt.Sprintf("usr_%d", time.Now().UnixNano())
	emailCipher := s.pii.MustEncrypt(email)
	nameCipher := s.pii.MustEncrypt(name)
	if _, err := s.pool.Exec(ctx, `
		INSERT INTO users (id, email, email_cipher, email_hash, name, name_cipher, password_hash, role, avatar_url, company_name, company_name_cipher, country_code, status, email_verified)
		VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,TRUE)
	`, id, email, emailCipher, emailHash, name, nameCipher, passwordHash, string(domain.RoleVisitor), "/avatars/visitor.svg", "", "", "KE", "active"); err != nil {
		return domain.User{}, "", err
	}
	user := domain.User{
		ID:          id,
		Name:        name,
		Email:       email,
		Role:        domain.RoleVisitor,
		AvatarURL:   "/avatars/visitor.svg",
		CountryCode: "KE",
		Status:      "active",
	}
	token, err := s.tokenService.Sign(user)
	return user, token, err
}

func (s *PostgresStore) CreateEmailVerification(ctx context.Context, userID string) (string, error) {
	if strings.TrimSpace(userID) == "" {
		return "", ErrInvalidCredentials
	}
	token := fmt.Sprintf("ver_%d", time.Now().UnixNano())
	_, err := s.pool.Exec(ctx, `INSERT INTO email_verification_tokens (id, user_id, token, expires_at) VALUES ($1,$2,$3,NOW() + INTERVAL '24 hours')`, "evt_"+token, strings.TrimSpace(userID), token)
	if err != nil {
		return "", err
	}
	return token, nil
}

func (s *PostgresStore) VerifyEmail(ctx context.Context, token string) (domain.User, string, error) {
	tx, err := s.pool.Begin(ctx)
	if err != nil {
		return domain.User{}, "", err
	}
	defer tx.Rollback(ctx)
	var userID string
	err = tx.QueryRow(ctx, `SELECT user_id FROM email_verification_tokens WHERE token=$1 AND used=FALSE AND expires_at > NOW()`, strings.TrimSpace(token)).Scan(&userID)
	if err != nil {
		return domain.User{}, "", ErrInvalidCredentials
	}
	if _, err := tx.Exec(ctx, `UPDATE users SET email_verified=TRUE, updated_at=NOW() WHERE id=$1`, userID); err != nil {
		return domain.User{}, "", err
	}
	if _, err := tx.Exec(ctx, `UPDATE email_verification_tokens SET used=TRUE WHERE token=$1`, strings.TrimSpace(token)); err != nil {
		return domain.User{}, "", err
	}
	if err := tx.Commit(ctx); err != nil {
		return domain.User{}, "", err
	}
	user, err := s.UserByID(ctx, userID)
	if err != nil {
		return domain.User{}, "", err
	}
	signedToken, err := s.tokenService.Sign(user)
	return user, signedToken, err
}

func (s *PostgresStore) ForgotPassword(ctx context.Context, email string) (domain.ForgotPasswordResult, error) {
	var userID string
	emailLookup := strings.TrimSpace(strings.ToLower(email))
	emailHash := s.pii.Hash(emailLookup)
	err := s.pool.QueryRow(ctx, `SELECT id FROM users WHERE (lower(email)=lower($1) OR ($2 <> '' AND email_hash=$2)) AND status='active'`, emailLookup, emailHash).Scan(&userID)
	if err != nil {
		return domain.ForgotPasswordResult{Message: "If the account exists, a password reset token has been generated."}, nil
	}
	token := fmt.Sprintf("rst_%d", time.Now().UnixNano())
	_, err = s.pool.Exec(ctx, `INSERT INTO password_reset_tokens (id, user_id, token, expires_at) VALUES ($1,$2,$3,NOW() + INTERVAL '1 hour')`, "prt_"+token, userID, token)
	if err != nil {
		return domain.ForgotPasswordResult{}, err
	}
	return domain.ForgotPasswordResult{Message: "Password reset token generated.", Token: token}, nil
}

func (s *PostgresStore) ResetPassword(ctx context.Context, token string, newPassword string) error {
	if strings.TrimSpace(token) == "" || strings.TrimSpace(newPassword) == "" {
		return ErrInvalidCredentials
	}
	tx, err := s.pool.Begin(ctx)
	if err != nil {
		return err
	}
	defer tx.Rollback(ctx)
	var userID string
	err = tx.QueryRow(ctx, `SELECT user_id FROM password_reset_tokens WHERE token=$1 AND used=FALSE AND expires_at > NOW()`, strings.TrimSpace(token)).Scan(&userID)
	if err != nil {
		return ErrInvalidCredentials
	}
	passwordHash, err := security.HashPassword(newPassword)
	if err != nil {
		return err
	}
	if _, err := tx.Exec(ctx, `UPDATE users SET password_hash=$1, must_change_password=FALSE, updated_at=NOW() WHERE id=$2`, passwordHash, userID); err != nil {
		return err
	}
	if _, err := tx.Exec(ctx, `UPDATE password_reset_tokens SET used=TRUE WHERE token=$1`, strings.TrimSpace(token)); err != nil {
		return err
	}
	return tx.Commit(ctx)
}

func (s *PostgresStore) ChangePassword(ctx context.Context, userID string, currentPassword string, newPassword string) error {
	var passwordHash string
	err := s.pool.QueryRow(ctx, `SELECT COALESCE(password_hash,'') FROM users WHERE id=$1 AND status='active'`, strings.TrimSpace(userID)).Scan(&passwordHash)
	if err != nil || !security.VerifyPassword(currentPassword, passwordHash) {
		return ErrInvalidCredentials
	}
	nextHash, err := security.HashPassword(newPassword)
	if err != nil {
		return err
	}
	_, err = s.pool.Exec(ctx, `UPDATE users SET password_hash=$1, must_change_password=FALSE, updated_at=NOW() WHERE id=$2`, nextHash, strings.TrimSpace(userID))
	return err
}

func (s *PostgresStore) UserByID(ctx context.Context, id string) (domain.User, error) {
	var user domain.User
	var emailCipher string
	var nameCipher string
	var companyCipher string
	err := s.pool.QueryRow(ctx, `SELECT id, name, email, role, COALESCE(avatar_url,''), COALESCE(company_name,''), COALESCE(country_code,''), COALESCE(status,'active'), COALESCE(must_change_password,FALSE), COALESCE(email_cipher,''), COALESCE(name_cipher,''), COALESCE(company_name_cipher,'') FROM users WHERE id=$1`, id).
		Scan(&user.ID, &user.Name, &user.Email, &user.Role, &user.AvatarURL, &user.CompanyName, &user.CountryCode, &user.Status, &user.MustChangePassword, &emailCipher, &nameCipher, &companyCipher)
	if err != nil {
		return domain.User{}, ErrNotFound
	}
	return s.decryptUser(user, emailCipher, nameCipher, companyCipher), nil
}

func (s *PostgresStore) Users(ctx context.Context) ([]domain.User, error) {
	rows, err := s.pool.Query(ctx, `SELECT id, name, email, role, COALESCE(avatar_url,''), COALESCE(company_name,''), COALESCE(country_code,''), COALESCE(status,'active'), COALESCE(must_change_password,FALSE), COALESCE(email_cipher,''), COALESCE(name_cipher,''), COALESCE(company_name_cipher,'') FROM users ORDER BY created_at DESC`)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	users := []domain.User{}
	for rows.Next() {
		var user domain.User
		var emailCipher string
		var nameCipher string
		var companyCipher string
		if err := rows.Scan(&user.ID, &user.Name, &user.Email, &user.Role, &user.AvatarURL, &user.CompanyName, &user.CountryCode, &user.Status, &user.MustChangePassword, &emailCipher, &nameCipher, &companyCipher); err != nil {
			return nil, err
		}
		users = append(users, s.decryptUser(user, emailCipher, nameCipher, companyCipher))
	}
	return users, rows.Err()
}

func (s *PostgresStore) VisitorSettings(ctx context.Context, visitorID string) (domain.VisitorSettings, error) {
	user, err := s.UserByID(ctx, strings.TrimSpace(visitorID))
	if err != nil || user.Role != domain.RoleVisitor {
		return domain.VisitorSettings{}, ErrNotFound
	}
	input := domain.VisitorSettingsInput{Email: true, Push: true, ExpoUpdates: true, Reminders: true}
	var phoneCipher string
	err = s.pool.QueryRow(ctx, `SELECT COALESCE(phone,''), COALESCE(phone_cipher,''), COALESCE(industry,''), email_notifications, push_notifications, expo_updates, reminders FROM visitor_profiles WHERE visitor_id=$1`, user.ID).
		Scan(&input.Phone, &phoneCipher, &input.Industry, &input.Email, &input.Push, &input.ExpoUpdates, &input.Reminders)
	if err != nil && err != pgx.ErrNoRows {
		return domain.VisitorSettings{}, err
	}
	if phoneCipher != "" {
		if phone := s.pii.Decrypt(phoneCipher); strings.TrimSpace(phone) != "" {
			input.Phone = phone
		}
	}
	return visitorSettingsFrom(user, input), nil
}

func (s *PostgresStore) UpdateVisitorSettings(ctx context.Context, visitorID string, input domain.VisitorSettingsInput) (domain.VisitorSettings, error) {
	user, err := s.UserByID(ctx, strings.TrimSpace(visitorID))
	if err != nil || user.Role != domain.RoleVisitor {
		return domain.VisitorSettings{}, ErrNotFound
	}
	name := strings.TrimSpace(input.Name)
	if name == "" {
		return domain.VisitorSettings{}, ErrInvalidCredentials
	}
	company := strings.TrimSpace(input.Company)
	industry := strings.TrimSpace(input.Industry)
	phone := strings.TrimSpace(input.Phone)
	if _, err := s.pool.Exec(ctx, `UPDATE users SET name=$1, company_name=$2, name_cipher=$3, company_name_cipher=$4, updated_at=NOW() WHERE id=$5 AND role='visitor'`,
		storagePIIValue(s.pii, name), storagePIIValue(s.pii, company), s.pii.MustEncrypt(name), s.pii.MustEncrypt(company), user.ID); err != nil {
		return domain.VisitorSettings{}, err
	}
	if _, err := s.pool.Exec(ctx, `INSERT INTO visitor_profiles (visitor_id, phone, phone_cipher, industry, email_notifications, push_notifications, expo_updates, reminders, updated_at)
		VALUES ($1,$2,$3,$4,$5,$6,$7,$8,NOW())
		ON CONFLICT (visitor_id) DO UPDATE SET phone=EXCLUDED.phone, phone_cipher=EXCLUDED.phone_cipher, industry=EXCLUDED.industry, email_notifications=EXCLUDED.email_notifications, push_notifications=EXCLUDED.push_notifications, expo_updates=EXCLUDED.expo_updates, reminders=EXCLUDED.reminders, updated_at=NOW()`,
		user.ID, storagePIIValue(s.pii, phone), s.pii.MustEncrypt(phone), industry, input.Email, input.Push, input.ExpoUpdates, input.Reminders); err != nil {
		return domain.VisitorSettings{}, err
	}
	return s.VisitorSettings(ctx, user.ID)
}

func (s *PostgresStore) CreateAdminManagedUser(ctx context.Context, input domain.AdminUserInput, actor domain.User) (domain.User, error) {
	if (!isAdminRole(actor.Role) && actor.Role != domain.RoleOrganizer) || strings.TrimSpace(input.Email) == "" || strings.TrimSpace(input.Name) == "" || strings.TrimSpace(input.Password) == "" {
		return domain.User{}, ErrInvalidCredentials
	}
	if strings.EqualFold(strings.TrimSpace(input.Email), strings.TrimSpace(input.Password)) {
		return domain.User{}, ErrInvalidCredentials
	}
	if input.Role == "" {
		input.Role = domain.RoleVisitor
	}
	if !validRole(input.Role) {
		return domain.User{}, ErrInvalidCredentials
	}
	if actor.Role == domain.RoleOrganizer && input.Role != domain.RoleExhibitor && input.Role != domain.RoleSponsor && input.Role != domain.RoleOrganizer {
		return domain.User{}, ErrInvalidCredentials
	}
	status := strings.TrimSpace(input.Status)
	if status == "" {
		status = "active"
	}
	if !validAccountStatus(status) {
		return domain.User{}, ErrInvalidCredentials
	}
	passwordHash, err := security.HashPassword(input.Password)
	if err != nil {
		return domain.User{}, err
	}
	id := fmt.Sprintf("usr_%d", time.Now().UnixNano())
	emailValue := strings.TrimSpace(strings.ToLower(input.Email))
	nameValue := strings.TrimSpace(input.Name)
	companyValue := strings.TrimSpace(input.CompanyName)
	countryCode := strings.ToUpper(strings.TrimSpace(input.CountryCode))
	if countryCode == "" {
		countryCode = "KE"
	}
	mustChangePassword := true
	_, err = s.pool.Exec(ctx, `INSERT INTO users (id, email, password_hash, name, role, avatar_url, company_name, country_code, email_verified, status, must_change_password, email_hash, email_cipher, name_cipher, company_name_cipher)
		VALUES ($1,$2,$3,$4,$5,$6,$7,$8,FALSE,$9,$10,$11,$12,$13,$14)`,
		id, storagePIIValue(s.pii, emailValue), passwordHash, storagePIIValue(s.pii, nameValue), input.Role, "/avatars/visitor.svg",
		storagePIIValue(s.pii, companyValue), countryCode, status, mustChangePassword, s.pii.Hash(emailValue), s.pii.MustEncrypt(emailValue), s.pii.MustEncrypt(nameValue), s.pii.MustEncrypt(companyValue))
	if err != nil {
		return domain.User{}, err
	}
	return s.UserByID(ctx, id)
}

func (s *PostgresStore) BootstrapAdmin(ctx context.Context, input domain.AdminUserInput) (domain.User, bool, error) {
	if strings.TrimSpace(input.Email) == "" || strings.TrimSpace(input.Password) == "" {
		return domain.User{}, false, nil
	}
	emailValue := strings.TrimSpace(strings.ToLower(input.Email))
	emailHash := s.pii.Hash(emailValue)
	var existingID string
	var existingRole domain.Role
	err := s.pool.QueryRow(ctx, `SELECT id, role FROM users WHERE (lower(email)=lower($1) OR ($2 <> '' AND email_hash=$2)) AND status='active'`, emailValue, emailHash).Scan(&existingID, &existingRole)
	if err == nil {
		if !isAdminRole(existingRole) {
			return domain.User{}, false, ErrInvalidCredentials
		}
		user, err := s.UserByID(ctx, existingID)
		return user, false, err
	}
	if err != pgx.ErrNoRows {
		return domain.User{}, false, err
	}
	nameValue := strings.TrimSpace(input.Name)
	if nameValue == "" {
		nameValue = "Platform Administrator"
	}
	companyValue := strings.TrimSpace(input.CompanyName)
	passwordHash, err := security.HashPassword(input.Password)
	if err != nil {
		return domain.User{}, false, err
	}
	id := fmt.Sprintf("usr_bootstrap_%d", time.Now().UnixNano())
	countryCode := strings.ToUpper(strings.TrimSpace(input.CountryCode))
	if countryCode == "" {
		countryCode = "KE"
	}
	_, err = s.pool.Exec(ctx, `INSERT INTO users (id, email, password_hash, name, role, avatar_url, company_name, country_code, email_verified, status, must_change_password, email_hash, email_cipher, name_cipher, company_name_cipher)
		VALUES ($1,$2,$3,$4,$5,'/avatars/admin.svg',$6,$7,TRUE,'active',FALSE,$8,$9,$10,$11)`,
		id, storagePIIValue(s.pii, emailValue), passwordHash, storagePIIValue(s.pii, nameValue),
		defaultAdminRole(input.Role), storagePIIValue(s.pii, companyValue), countryCode, emailHash, s.pii.MustEncrypt(emailValue), s.pii.MustEncrypt(nameValue), s.pii.MustEncrypt(companyValue))
	if err != nil {
		return domain.User{}, false, err
	}
	user, err := s.UserByID(ctx, id)
	return user, true, err
}

func (s *PostgresStore) UpdateAdminManagedUser(ctx context.Context, id string, input domain.AdminUserInput, actor domain.User) (domain.User, error) {
	if !isAdminRole(actor.Role) || strings.TrimSpace(id) == "" {
		return domain.User{}, ErrInvalidCredentials
	}
	if input.Role != "" && !validRole(input.Role) {
		return domain.User{}, ErrInvalidCredentials
	}
	current, err := s.UserByID(ctx, id)
	if err != nil {
		return domain.User{}, err
	}
	emailValue := strings.TrimSpace(strings.ToLower(input.Email))
	if emailValue == "" {
		emailValue = current.Email
	}
	nameValue := strings.TrimSpace(input.Name)
	if nameValue == "" {
		nameValue = current.Name
	}
	companyValue := strings.TrimSpace(input.CompanyName)
	if companyValue == "" {
		companyValue = current.CompanyName
	}
	roleValue := input.Role
	if roleValue == "" {
		roleValue = current.Role
	}
	statusValue := strings.TrimSpace(input.Status)
	if statusValue == "" {
		statusValue = current.Status
	}
	if statusValue == "" {
		statusValue = "active"
	}
	if !validAccountStatus(statusValue) {
		return domain.User{}, ErrInvalidCredentials
	}
	if !strings.EqualFold(emailValue, current.Email) {
		emailHash := s.pii.Hash(emailValue)
		var exists bool
		if err := s.pool.QueryRow(ctx, `SELECT EXISTS(SELECT 1 FROM users WHERE id<>$1 AND (lower(email)=lower($2) OR ($3 <> '' AND email_hash=$3)))`, id, emailValue, emailHash).Scan(&exists); err != nil {
			return domain.User{}, err
		}
		if exists {
			return domain.User{}, ErrInvalidCredentials
		}
	}
	emailHash := s.pii.Hash(emailValue)
	countryCode := strings.ToUpper(strings.TrimSpace(input.CountryCode))
	if countryCode == "" {
		countryCode = current.CountryCode
	}
	if countryCode == "" {
		countryCode = "KE"
	}
	_, err = s.pool.Exec(ctx, `UPDATE users SET email=$1, name=$2, role=$3, company_name=$4, country_code=$5, status=$6, email_hash=$7, email_cipher=$8, name_cipher=$9, company_name_cipher=$10, updated_at=NOW() WHERE id=$11`,
		storagePIIValue(s.pii, emailValue), storagePIIValue(s.pii, nameValue), roleValue, storagePIIValue(s.pii, companyValue),
		countryCode, statusValue, emailHash, s.pii.MustEncrypt(emailValue), s.pii.MustEncrypt(nameValue), s.pii.MustEncrypt(companyValue), id)
	if err != nil {
		return domain.User{}, err
	}
	if strings.TrimSpace(input.Password) != "" {
		passwordHash, err := security.HashPassword(input.Password)
		if err != nil {
			return domain.User{}, err
		}
		if _, err := s.pool.Exec(ctx, `UPDATE users SET password_hash=$1, must_change_password=$2, updated_at=NOW() WHERE id=$3`, passwordHash, isAdminRole(roleValue), id); err != nil {
			return domain.User{}, err
		}
	}
	return s.UserByID(ctx, id)
}

func (s *PostgresStore) DeleteAdminManagedUser(ctx context.Context, id string, actor domain.User) error {
	if !isAdminRole(actor.Role) || strings.TrimSpace(id) == "" || id == actor.ID {
		return ErrInvalidCredentials
	}
	current, err := s.UserByID(ctx, id)
	if err != nil {
		return err
	}
	if !isAdminRole(current.Role) {
		return ErrInvalidCredentials
	}
	if current.Role == domain.RoleSuperAdmin {
		var count int
		if err := s.pool.QueryRow(ctx, `SELECT COUNT(*) FROM users WHERE role=$1`, domain.RoleSuperAdmin).Scan(&count); err != nil {
			return err
		}
		if count <= 1 {
			return ErrInvalidCredentials
		}
	}
	commandTag, err := s.pool.Exec(ctx, `DELETE FROM users WHERE id=$1 AND role IN ($2,$3)`, id, domain.RoleAdministrator, domain.RoleSuperAdmin)
	if err != nil {
		return err
	}
	if commandTag.RowsAffected() == 0 {
		return ErrNotFound
	}
	return nil
}

func (s *PostgresStore) Countries(ctx context.Context) ([]domain.Country, error) {
	rows, err := s.pool.Query(ctx, `SELECT code, name, default_currency_code, default_timezone, active FROM countries ORDER BY name`)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	items := []domain.Country{}
	for rows.Next() {
		var item domain.Country
		if err := rows.Scan(&item.Code, &item.Name, &item.DefaultCurrency, &item.DefaultTimezone, &item.Active); err != nil {
			return nil, err
		}
		item.PaymentMethods = []string{"paystack", "manual"}
		items = append(items, item)
	}
	return items, rows.Err()
}

func (s *PostgresStore) CreateCountry(ctx context.Context, input domain.CountryInput, actor domain.User) (domain.Country, error) {
	if !isAdminRole(actor.Role) {
		return domain.Country{}, ErrInvalidCredentials
	}
	item := countryFromInput(input)
	if !validCountryRecord(item) {
		return domain.Country{}, ErrInvalidCredentials
	}
	_, err := s.pool.Exec(ctx, `INSERT INTO countries (code, name, default_currency_code, default_timezone, active)
		VALUES ($1,$2,$3,$4,TRUE)`, item.Code, item.Name, item.DefaultCurrency, item.DefaultTimezone)
	if err != nil {
		return domain.Country{}, err
	}
	return item, nil
}

func (s *PostgresStore) UpdateCountryStatus(ctx context.Context, code string, active bool, actor domain.User) (domain.Country, error) {
	if !isAdminRole(actor.Role) {
		return domain.Country{}, ErrInvalidCredentials
	}
	code = strings.ToUpper(strings.TrimSpace(code))
	var item domain.Country
	err := s.pool.QueryRow(ctx, `UPDATE countries SET active=$2 WHERE code=$1 RETURNING code, name, default_currency_code, default_timezone, active`, code, active).
		Scan(&item.Code, &item.Name, &item.DefaultCurrency, &item.DefaultTimezone, &item.Active)
	if err != nil {
		return domain.Country{}, err
	}
	item.PaymentMethods = []string{"paystack", "manual"}
	return item, nil
}

func (s *PostgresStore) Currencies(ctx context.Context) ([]domain.Currency, error) {
	rows, err := s.pool.Query(ctx, `SELECT code, symbol, decimal_places FROM currencies WHERE active ORDER BY code`)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	items := []domain.Currency{}
	for rows.Next() {
		var item domain.Currency
		if err := rows.Scan(&item.Code, &item.Symbol, &item.DecimalPlaces); err != nil {
			return nil, err
		}
		items = append(items, item)
	}
	return items, rows.Err()
}

func (s *PostgresStore) Categories(ctx context.Context) ([]domain.Category, error) {
	rows, err := s.pool.Query(ctx, `SELECT id, name, slug, COALESCE(icon,''), active FROM categories ORDER BY name`)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	items := []domain.Category{}
	for rows.Next() {
		var item domain.Category
		if err := rows.Scan(&item.ID, &item.Name, &item.Slug, &item.Icon, &item.Active); err != nil {
			return nil, err
		}
		items = append(items, item)
	}
	return items, rows.Err()
}

func (s *PostgresStore) CreateCategory(ctx context.Context, input domain.CategoryInput, actor domain.User) (domain.Category, error) {
	if !isAdminRole(actor.Role) {
		return domain.Category{}, ErrInvalidCredentials
	}
	item := categoryFromInput(input)
	if !validCategoryRecord(item) {
		return domain.Category{}, ErrInvalidCredentials
	}
	_, err := s.pool.Exec(ctx, `INSERT INTO categories (id, name, slug, icon, active)
		VALUES ($1,$2,$3,$4,$5)`, item.ID, item.Name, item.Slug, item.Icon, item.Active)
	if err != nil {
		return domain.Category{}, err
	}
	return item, nil
}

func (s *PostgresStore) UpdateCategoryStatus(ctx context.Context, id string, active bool, actor domain.User) (domain.Category, error) {
	if !isAdminRole(actor.Role) {
		return domain.Category{}, ErrInvalidCredentials
	}
	var item domain.Category
	err := s.pool.QueryRow(ctx, `UPDATE categories SET active=$2 WHERE id=$1 RETURNING id, name, slug, COALESCE(icon,''), active`, strings.TrimSpace(id), active).
		Scan(&item.ID, &item.Name, &item.Slug, &item.Icon, &item.Active)
	if err != nil {
		return domain.Category{}, err
	}
	return item, nil
}

func (s *PostgresStore) ListExpos(ctx context.Context, filter ExpoFilter) ([]domain.Expo, error) {
	sql := expoSelectSQL()
	args := []any{}
	conditions := []string{}
	if filter.OrganizerID != "" {
		args = append(args, filter.OrganizerID)
		conditions = append(conditions, fmt.Sprintf("e.organizer_id=$%d", len(args)))
	}
	if filter.CountryCode != "" {
		args = append(args, strings.ToUpper(strings.TrimSpace(filter.CountryCode)))
		conditions = append(conditions, fmt.Sprintf("e.country_code=$%d", len(args)))
	}
	if len(conditions) > 0 {
		sql += " WHERE " + strings.Join(conditions, " AND ")
	}
	sql += expoGroupBySQL()
	sql += " ORDER BY e.created_at DESC"
	rows, err := s.pool.Query(ctx, sql, args...)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	return s.scanExpos(rows)
}

func (s *PostgresStore) ExpoByID(ctx context.Context, id string) (domain.Expo, error) {
	rows, err := s.pool.Query(ctx, expoSelectSQL()+" WHERE e.id=$1"+expoGroupBySQL(), id)
	if err != nil {
		return domain.Expo{}, err
	}
	defer rows.Close()
	expos, err := s.scanExpos(rows)
	if err != nil {
		return domain.Expo{}, err
	}
	if len(expos) == 0 {
		return domain.Expo{}, ErrNotFound
	}
	return expos[0], nil
}

func (s *PostgresStore) CreateExpo(ctx context.Context, input domain.ExpoInput, actor domain.User) (domain.Expo, error) {
	if err := platform.ValidateExpoInput(input, actor.Role); err != nil {
		return domain.Expo{}, err
	}
	organizerID := input.OrganizerID
	if actor.Role == domain.RoleOrganizer {
		organizerID = actor.ID
	}
	status := domain.ExpoDraft
	if isAdminRole(actor.Role) && input.Status != "" {
		if parsed, ok := domain.ParseExpoStatus(input.Status); ok {
			status = parsed
		}
	}
	start, _ := time.Parse("2006-01-02", input.StartDate)
	end, _ := time.Parse("2006-01-02", input.EndDate)
	id := fmt.Sprintf("expo_%d", time.Now().UnixNano())
	tx, err := s.pool.Begin(ctx)
	if err != nil {
		return domain.Expo{}, err
	}
	defer tx.Rollback(ctx)
	_, err = tx.Exec(ctx, `INSERT INTO expos (id, organizer_id, name, description, country_code, city, venue, currency_code, timezone, cover_image_url, exhibitor_activation_fee_minor, ads_addon_fee_minor, organizer_commission_bps, status, starts_at, ends_at)
		VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16)`,
		id, organizerID, input.Name, input.Description, strings.ToUpper(input.CountryCode), input.City, input.Venue, strings.ToUpper(input.CurrencyCode), input.Timezone, strings.TrimSpace(input.CoverImageURL), input.ExhibitorActivationFeeMinor, input.AdsAddonFeeMinor, input.OrganizerCommissionBps, status, start, end)
	if err != nil {
		return domain.Expo{}, err
	}
	if err := replaceExpoCategories(ctx, tx, id, input.CategoryIDs); err != nil {
		return domain.Expo{}, err
	}
	if err := tx.Commit(ctx); err != nil {
		return domain.Expo{}, err
	}
	return s.ExpoByID(ctx, id)
}

func (s *PostgresStore) UpdateExpo(ctx context.Context, id string, input domain.ExpoInput, actor domain.User) (domain.Expo, error) {
	current, err := s.ExpoByID(ctx, id)
	if err != nil {
		return domain.Expo{}, err
	}
	if actor.Role == domain.RoleOrganizer {
		if current.OrganizerID != actor.ID || !platform.OrganizerCanEdit(current.Status) {
			return domain.Expo{}, platform.ErrForbiddenExpoMutation
		}
		input.OrganizerID = current.OrganizerID
		input.ExhibitorActivationFeeMinor = current.ExhibitorActivationFeeMinor
		input.AdsAddonFeeMinor = current.AdsAddonFeeMinor
		input.OrganizerCommissionBps = current.OrganizerCommissionBps
		input.Status = string(current.Status)
		input.CoverImageURL = current.CoverImageURL
	}
	if err := platform.ValidateExpoInput(input, actor.Role); err != nil {
		return domain.Expo{}, err
	}
	start, _ := time.Parse("2006-01-02", input.StartDate)
	end, _ := time.Parse("2006-01-02", input.EndDate)
	status := current.Status
	if isAdminRole(actor.Role) && input.Status != "" {
		if parsed, ok := domain.ParseExpoStatus(input.Status); ok {
			status = parsed
		}
	}
	tx, err := s.pool.Begin(ctx)
	if err != nil {
		return domain.Expo{}, err
	}
	defer tx.Rollback(ctx)
	_, err = tx.Exec(ctx, `UPDATE expos SET organizer_id=$2, name=$3, description=$4, country_code=$5, city=$6, venue=$7, currency_code=$8, timezone=$9, cover_image_url=$10, exhibitor_activation_fee_minor=$11, ads_addon_fee_minor=$12, organizer_commission_bps=$13, status=$14, starts_at=$15, ends_at=$16, updated_at=NOW() WHERE id=$1`,
		id, input.OrganizerID, input.Name, input.Description, strings.ToUpper(input.CountryCode), input.City, input.Venue, strings.ToUpper(input.CurrencyCode), input.Timezone, strings.TrimSpace(input.CoverImageURL), input.ExhibitorActivationFeeMinor, input.AdsAddonFeeMinor, input.OrganizerCommissionBps, status, start, end)
	if err != nil {
		return domain.Expo{}, err
	}
	if err := replaceExpoCategories(ctx, tx, id, input.CategoryIDs); err != nil {
		return domain.Expo{}, err
	}
	if err := tx.Commit(ctx); err != nil {
		return domain.Expo{}, err
	}
	return s.ExpoByID(ctx, id)
}

func (s *PostgresStore) ChangeExpoStatus(ctx context.Context, id string, status domain.ExpoStatus, actor domain.User) (domain.Expo, error) {
	current, err := s.ExpoByID(ctx, id)
	if err != nil {
		return domain.Expo{}, err
	}
	if actor.Role == domain.RoleOrganizer && current.OrganizerID != actor.ID {
		return domain.Expo{}, platform.ErrForbiddenExpoMutation
	}
	if err := platform.ValidateStatusTransition(actor.Role, current.Status, status); err != nil {
		return domain.Expo{}, err
	}
	if _, err := s.pool.Exec(ctx, `UPDATE expos SET status=$2, updated_at=NOW(), published_at=CASE WHEN $2='published' THEN NOW() ELSE published_at END WHERE id=$1`, id, status); err != nil {
		return domain.Expo{}, err
	}
	return s.ExpoByID(ctx, id)
}

func (s *PostgresStore) CompleteEndedExpos(ctx context.Context, now time.Time) ([]domain.Expo, error) {
	rows, err := s.pool.Query(ctx, `
		UPDATE expos
		SET status=$1, updated_at=NOW()
		WHERE status IN ($2,$3)
		  AND ends_at::date < $4::date
		RETURNING id`,
		domain.ExpoCompleted, domain.ExpoPublished, domain.ExpoLive, now.UTC())
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	ids := []string{}
	for rows.Next() {
		var id string
		if err := rows.Scan(&id); err != nil {
			return nil, err
		}
		ids = append(ids, id)
	}
	if err := rows.Err(); err != nil {
		return nil, err
	}
	completed := make([]domain.Expo, 0, len(ids))
	for _, id := range ids {
		expo, err := s.ExpoByID(ctx, id)
		if err != nil {
			return nil, err
		}
		completed = append(completed, expo)
	}
	return completed, nil
}

func (s *PostgresStore) ListPayments(ctx context.Context, filter PaymentFilter) ([]domain.Payment, error) {
	sql := paymentSelectSQL()
	args := []any{}
	conditions := []string{}
	if filter.ExpoID != "" {
		args = append(args, filter.ExpoID)
		conditions = append(conditions, fmt.Sprintf("p.expo_id=$%d", len(args)))
	}
	if filter.PayerID != "" {
		args = append(args, filter.PayerID)
		conditions = append(conditions, fmt.Sprintf("p.payer_id=$%d", len(args)))
	}
	if filter.OrganizerID != "" {
		args = append(args, filter.OrganizerID)
		conditions = append(conditions, fmt.Sprintf("e.organizer_id=$%d", len(args)))
	}
	if filter.CountryCode != "" {
		args = append(args, strings.ToUpper(strings.TrimSpace(filter.CountryCode)))
		conditions = append(conditions, fmt.Sprintf("e.country_code=$%d", len(args)))
	}
	if len(conditions) > 0 {
		sql += " WHERE " + strings.Join(conditions, " AND ")
	}
	sql += " ORDER BY p.created_at DESC"
	rows, err := s.pool.Query(ctx, sql, args...)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	return s.scanPayments(rows)
}

func (s *PostgresStore) PaymentByID(ctx context.Context, id string) (domain.Payment, error) {
	rows, err := s.pool.Query(ctx, paymentSelectSQL()+" WHERE p.id=$1", id)
	if err != nil {
		return domain.Payment{}, err
	}
	defer rows.Close()
	payments, err := s.scanPayments(rows)
	if err != nil {
		return domain.Payment{}, err
	}
	if len(payments) == 0 {
		return domain.Payment{}, ErrNotFound
	}
	return payments[0], nil
}

func (s *PostgresStore) CreatePayment(ctx context.Context, input domain.PaymentInput, actor domain.User) (domain.Payment, error) {
	if actor.Role != domain.RoleExhibitor || input.Purpose != domain.PaymentExhibitorActivation {
		return domain.Payment{}, ErrInvalidCredentials
	}
	expo, err := s.ExpoByID(ctx, input.ExpoID)
	if err != nil {
		return domain.Payment{}, err
	}
	if expo.Status != domain.ExpoPublished && expo.Status != domain.ExpoLive {
		return domain.Payment{}, platform.ErrForbiddenExpoMutation
	}
	assignments, err := s.ListExpoExhibitors(ctx, ExpoExhibitorFilter{ExpoID: expo.ID, ExhibitorID: actor.ID})
	if err != nil {
		return domain.Payment{}, err
	}
	if len(assignments) > 0 {
		switch assignments[0].ActivationStatus {
		case "active", "disabled":
			return domain.Payment{}, ErrInvalidCredentials
		}
	}
	idempotencyKey := normalizedIdempotency(input, actor)
	existing, err := s.paymentByIdempotency(ctx, idempotencyKey)
	if err == nil {
		return existing, nil
	}
	now := time.Now().UTC()
	id := fmt.Sprintf("pay_%d", now.UnixNano())
	payerName := actor.CompanyName
	if payerName == "" {
		payerName = actor.Name
	}
	tx, err := s.pool.Begin(ctx)
	if err != nil {
		return domain.Payment{}, err
	}
	defer tx.Rollback(ctx)
	if _, err := tx.Exec(ctx, `INSERT INTO expo_exhibitors (id, expo_id, exhibitor_id, activation_status)
		VALUES ($1,$2,$3,'pending_activation') ON CONFLICT (expo_id, exhibitor_id) DO UPDATE SET activation_status='pending_activation'`,
		"exh_"+id, expo.ID, actor.ID); err != nil {
		return domain.Payment{}, err
	}
	if input.ROIEstimate.EstimatedSpend > 0 || strings.TrimSpace(input.ROIEstimate.Notes) != "" || len(input.ROIEstimate.Breakdown) > 0 {
		breakdown, _ := json.Marshal(input.ROIEstimate.Breakdown)
		currency := strings.ToUpper(strings.TrimSpace(input.ROIEstimate.Currency))
		if currency == "" {
			currency = expo.CurrencyCode
		}
		if _, err := tx.Exec(ctx, `UPDATE expo_exhibitors
			SET estimated_spend_minor=$3, roi_currency_code=$4, roi_spend_breakdown=$5, roi_notes=$6, roi_updated_at=NOW()
			WHERE expo_id=$1 AND exhibitor_id=$2`,
			expo.ID, actor.ID, maxInt64(input.ROIEstimate.EstimatedSpend, 0), currency, breakdown, strings.TrimSpace(input.ROIEstimate.Notes)); err != nil {
			return domain.Payment{}, err
		}
	}
	amountMinor := expo.ExhibitorActivationFeeMinor
	if input.IncludeAdsAddon {
		amountMinor += expo.AdsAddonFeeMinor
	}
	settings, _ := s.PaystackSettings(ctx)
	processingFeeMinor := paymentProcessingFeeMinor(amountMinor, settings)
	_, err = tx.Exec(ctx, `INSERT INTO payments (id, expo_id, payer_id, payer_role, purpose, country_code, currency_code, amount_minor, processing_fee_minor, provider, provider_reference, idempotency_key, status, created_at)
		VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,'paystack',$10,$11,'pending',$12)`,
		id, expo.ID, actor.ID, actor.Role, input.Purpose, expo.CountryCode, expo.CurrencyCode, amountMinor+processingFeeMinor, processingFeeMinor, id, idempotencyKey, now)
	if err != nil {
		return domain.Payment{}, err
	}
	if err := tx.Commit(ctx); err != nil {
		return domain.Payment{}, err
	}
	payment, err := s.PaymentByID(ctx, id)
	if err == nil {
		payment.PayerName = payerName
	}
	return payment, err
}

func (s *PostgresStore) ConfirmPayment(ctx context.Context, id string, actor domain.User) (domain.Payment, domain.CommissionSplit, error) {
	payment, err := s.PaymentByID(ctx, id)
	if err != nil {
		return domain.Payment{}, domain.CommissionSplit{}, err
	}
	if !isAdminRole(actor.Role) && payment.PayerID != actor.ID {
		return domain.Payment{}, domain.CommissionSplit{}, ErrInvalidCredentials
	}
	expo, err := s.ExpoByID(ctx, payment.ExpoID)
	if err != nil {
		return domain.Payment{}, domain.CommissionSplit{}, err
	}
	split, err := platform.CalculateCommission(paymentCommissionBaseMinor(payment), expo.OrganizerCommissionBps, payment.CurrencyCode)
	if err != nil {
		return domain.Payment{}, domain.CommissionSplit{}, err
	}
	if payment.Status == domain.PaymentPaid {
		return payment, split, nil
	}
	tx, err := s.pool.Begin(ctx)
	if err != nil {
		return domain.Payment{}, domain.CommissionSplit{}, err
	}
	defer tx.Rollback(ctx)
	if _, err := tx.Exec(ctx, `UPDATE payments SET status='paid', paid_at=NOW() WHERE id=$1`, id); err != nil {
		return domain.Payment{}, domain.CommissionSplit{}, err
	}
	if _, err := tx.Exec(ctx, `UPDATE expo_exhibitors SET activation_status='active', activated_at=NOW(), amount_minor=$3 WHERE expo_id=$1 AND exhibitor_id=$2`, payment.ExpoID, payment.PayerID, payment.AmountMinor); err != nil {
		return domain.Payment{}, domain.CommissionSplit{}, err
	}
	if _, err := tx.Exec(ctx, `INSERT INTO commissions (id, payment_id, expo_id, organizer_id, gross_minor, commission_minor, platform_minor, rate_bps, currency_code)
		VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9) ON CONFLICT (payment_id) DO NOTHING`,
		"com_"+id, id, payment.ExpoID, expo.OrganizerID, split.GrossMinor, split.CommissionMinor, split.PlatformMinor, split.RateBps, split.CurrencyCode); err != nil {
		return domain.Payment{}, domain.CommissionSplit{}, err
	}
	if err := tx.Commit(ctx); err != nil {
		return domain.Payment{}, domain.CommissionSplit{}, err
	}
	payment, err = s.PaymentByID(ctx, id)
	return payment, split, err
}

func (s *PostgresStore) UpdatePaymentProviderReference(ctx context.Context, id string, providerReference string) (domain.Payment, error) {
	if strings.TrimSpace(id) == "" || strings.TrimSpace(providerReference) == "" {
		return domain.Payment{}, ErrInvalidCredentials
	}
	tag, err := s.pool.Exec(ctx, `UPDATE payments SET provider_reference=$2 WHERE id=$1`, id, strings.TrimSpace(providerReference))
	if err != nil {
		return domain.Payment{}, err
	}
	if tag.RowsAffected() == 0 {
		return domain.Payment{}, ErrNotFound
	}
	return s.PaymentByID(ctx, id)
}

func (s *PostgresStore) UpdatePaymentStatus(ctx context.Context, id string, status domain.PaymentStatus, reason string, actor domain.User) (domain.Payment, error) {
	if !isAdminRole(actor.Role) || !validPaymentStatus(status) {
		return domain.Payment{}, ErrInvalidCredentials
	}
	payment, err := s.PaymentByID(ctx, id)
	if err != nil {
		return domain.Payment{}, err
	}
	if !allowedPaymentStatusChange(payment.Status, status) {
		return domain.Payment{}, ErrInvalidCredentials
	}
	tx, err := s.pool.Begin(ctx)
	if err != nil {
		return domain.Payment{}, err
	}
	defer tx.Rollback(ctx)
	paidAtSQL := "paid_at"
	if status == domain.PaymentPaid {
		paidAtSQL = "COALESCE(paid_at, NOW())"
	}
	if status == domain.PaymentFailed || status == domain.PaymentCancelled {
		paidAtSQL = "NULL"
	}
	if _, err := tx.Exec(ctx, fmt.Sprintf(`UPDATE payments SET status=$2, paid_at=%s WHERE id=$1`, paidAtSQL), id, status); err != nil {
		return domain.Payment{}, err
	}
	if status == domain.PaymentRefunded || status == domain.PaymentFailed || status == domain.PaymentCancelled {
		commissionStatus := "held"
		if status == domain.PaymentFailed || status == domain.PaymentCancelled {
			commissionStatus = "failed"
		}
		if _, err := tx.Exec(ctx, `UPDATE commissions SET status=$2 WHERE payment_id=$1`, id, commissionStatus); err != nil {
			return domain.Payment{}, err
		}
	}
	if payment.Purpose == domain.PaymentSponsorPlacement {
		paymentStatus := "unpaid"
		adStatus := "pending_payment"
		if status == domain.PaymentRefunded {
			paymentStatus = "refunded"
		}
		if status == domain.PaymentPaid {
			paymentStatus = "paid"
			adStatus = "draft"
		}
		if _, err := tx.Exec(ctx, `UPDATE sponsor_ads SET payment_status=$2, status=$3 WHERE 'sponsor_ad_' || id=(SELECT idempotency_key FROM payments WHERE id=$1)`, id, paymentStatus, adStatus); err != nil {
			return domain.Payment{}, err
		}
	}
	if err := tx.Commit(ctx); err != nil {
		return domain.Payment{}, err
	}
	return s.PaymentByID(ctx, id)
}

func (s *PostgresStore) ListExpoExhibitors(ctx context.Context, filter ExpoExhibitorFilter) ([]domain.ExpoExhibitor, error) {
	sql := expoExhibitorSelectSQL()
	args := []any{}
	conditions := []string{}
	if filter.ExpoID != "" {
		args = append(args, filter.ExpoID)
		conditions = append(conditions, fmt.Sprintf("ee.expo_id=$%d", len(args)))
	}
	if filter.ExhibitorID != "" {
		args = append(args, filter.ExhibitorID)
		conditions = append(conditions, fmt.Sprintf("ee.exhibitor_id=$%d", len(args)))
	}
	if filter.OrganizerID != "" {
		args = append(args, filter.OrganizerID)
		conditions = append(conditions, fmt.Sprintf("e.organizer_id=$%d", len(args)))
	}
	if filter.CountryCode != "" {
		args = append(args, strings.ToUpper(strings.TrimSpace(filter.CountryCode)))
		conditions = append(conditions, fmt.Sprintf("e.country_code=$%d", len(args)))
	}
	if len(conditions) > 0 {
		sql += " WHERE " + strings.Join(conditions, " AND ")
	}
	sql += " ORDER BY ee.created_at DESC"
	rows, err := s.pool.Query(ctx, sql, args...)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	return s.scanExpoExhibitors(rows)
}

func (s *PostgresStore) AssignExpoExhibitor(ctx context.Context, input domain.ExpoExhibitorInput, actor domain.User) (domain.ExpoExhibitor, error) {
	expo, err := s.ExpoByID(ctx, strings.TrimSpace(input.ExpoID))
	if err != nil {
		return domain.ExpoExhibitor{}, err
	}
	if actor.Role == domain.RoleOrganizer && expo.OrganizerID != actor.ID {
		return domain.ExpoExhibitor{}, ErrInvalidCredentials
	}
	if !isAdminRole(actor.Role) && actor.Role != domain.RoleOrganizer {
		return domain.ExpoExhibitor{}, ErrInvalidCredentials
	}
	exhibitor, err := s.UserByID(ctx, strings.TrimSpace(input.ExhibitorID))
	if err != nil || exhibitor.Role != domain.RoleExhibitor {
		return domain.ExpoExhibitor{}, ErrNotFound
	}
	id := fmt.Sprintf("exe_%d", time.Now().UnixNano())
	status := validExpoExhibitorStatus(input.Status)
	boothNumber := defaultString(strings.TrimSpace(input.BoothNumber), "Assigned")
	boothLabel := defaultString(strings.TrimSpace(input.BoothLabel), "Digital Workspace")
	_, err = s.pool.Exec(ctx, `INSERT INTO expo_exhibitors (id, expo_id, exhibitor_id, booth_number, booth_label, activation_status)
		VALUES ($1,$2,$3,$4,$5,$6)
		ON CONFLICT (expo_id, exhibitor_id) DO UPDATE SET booth_number=$4, booth_label=$5, activation_status=$6`,
		id, expo.ID, exhibitor.ID, boothNumber, boothLabel, status)
	if err != nil {
		return domain.ExpoExhibitor{}, err
	}
	items, err := s.ListExpoExhibitors(ctx, ExpoExhibitorFilter{ExpoID: expo.ID, ExhibitorID: exhibitor.ID})
	if err != nil || len(items) == 0 {
		return domain.ExpoExhibitor{}, err
	}
	return items[0], nil
}

func (s *PostgresStore) UpdateExhibitorROI(ctx context.Context, expoID string, exhibitorID string, input domain.ROIEstimateInput) (domain.ExpoExhibitor, error) {
	expo, err := s.ExpoByID(ctx, strings.TrimSpace(expoID))
	if err != nil {
		return domain.ExpoExhibitor{}, err
	}
	breakdown, _ := json.Marshal(input.Breakdown)
	currency := strings.ToUpper(strings.TrimSpace(input.Currency))
	if currency == "" {
		currency = expo.CurrencyCode
	}
	tag, err := s.pool.Exec(ctx, `UPDATE expo_exhibitors
		SET estimated_spend_minor=$3, roi_currency_code=$4, roi_spend_breakdown=$5, roi_notes=$6, roi_updated_at=NOW()
		WHERE expo_id=$1 AND exhibitor_id=$2`,
		expo.ID, strings.TrimSpace(exhibitorID), maxInt64(input.EstimatedSpend, 0), currency, breakdown, strings.TrimSpace(input.Notes))
	if err != nil {
		return domain.ExpoExhibitor{}, err
	}
	if tag.RowsAffected() == 0 {
		return domain.ExpoExhibitor{}, ErrNotFound
	}
	items, err := s.ListExpoExhibitors(ctx, ExpoExhibitorFilter{ExpoID: expo.ID, ExhibitorID: strings.TrimSpace(exhibitorID)})
	if err != nil || len(items) == 0 {
		return domain.ExpoExhibitor{}, err
	}
	return items[0], nil
}

func (s *PostgresStore) EnsureExhibitorQRCode(ctx context.Context, expoID string, exhibitorID string) (domain.QRCodeRecord, error) {
	exhibitors, err := s.ListExpoExhibitors(ctx, ExpoExhibitorFilter{ExpoID: expoID, ExhibitorID: exhibitorID})
	if err != nil {
		return domain.QRCodeRecord{}, err
	}
	if len(exhibitors) == 0 {
		return domain.QRCodeRecord{}, ErrNotFound
	}
	if exhibitors[0].ActivationStatus != "active" {
		return domain.QRCodeRecord{}, ErrInvalidCredentials
	}
	expoExhibitorID := exhibitors[0].ID
	targetPath := exhibitorQRTargetPath(expoID, expoExhibitorID)
	existing, err := s.qrByExpoExhibitor(ctx, expoExhibitorID)
	if err == nil {
		if existing.TargetPath != targetPath {
			if _, updateErr := s.pool.Exec(ctx, `UPDATE qr_codes SET target_path=$1 WHERE id=$2`, targetPath, existing.ID); updateErr == nil {
				existing.TargetPath = targetPath
			}
		}
		return existing, nil
	}
	now := time.Now().UTC()
	shortCode, err := s.uniquePostgresQRCode(ctx)
	if err != nil {
		return domain.QRCodeRecord{}, err
	}
	record := domain.QRCodeRecord{
		ID: fmt.Sprintf("qr_%d", now.UnixNano()), ExpoID: expoID, ExpoExhibitorID: expoExhibitorID,
		Code: shortCode, TargetPath: targetPath,
		Type: "exhibitor_booth", Active: true, CreatedAt: now.Format(time.RFC3339),
	}
	_, err = s.pool.Exec(ctx, `INSERT INTO qr_codes (id, expo_id, expo_exhibitor_id, code, target_path, type, active, created_at)
		VALUES ($1,$2,$3,$4,$5,$6,$7,$8)`,
		record.ID, record.ExpoID, record.ExpoExhibitorID, record.Code, record.TargetPath, record.Type, record.Active, now)
	if err != nil {
		return domain.QRCodeRecord{}, err
	}
	return record, nil
}

func (s *PostgresStore) uniquePostgresQRCode(ctx context.Context) (string, error) {
	for i := 0; i < 8; i++ {
		code := randomShortCode(6)
		if code == "" {
			continue
		}
		var exists bool
		if err := s.pool.QueryRow(ctx, `SELECT EXISTS(SELECT 1 FROM qr_codes WHERE lower(code)=lower($1) OR lower(id)=lower($1) OR lower(id)=lower('qr_' || $1))`, code).Scan(&exists); err != nil {
			return "", err
		}
		if !exists {
			return code, nil
		}
	}
	return fmt.Sprintf("%d", time.Now().UTC().Unix()%1000000), nil
}

func (s *PostgresStore) ResolveQRCode(ctx context.Context, code string) (domain.QRCodeRecord, error) {
	var item domain.QRCodeRecord
	var created time.Time
	lookup := strings.TrimSpace(code)
	err := s.pool.QueryRow(ctx, `SELECT id, expo_id, COALESCE(expo_exhibitor_id,''), code, target_path, type, active, created_at FROM qr_codes
		WHERE (lower(code)=lower($1) OR lower(id)=lower($1) OR lower(id)=lower('qr_' || $1)) AND active=TRUE`, lookup).
		Scan(&item.ID, &item.ExpoID, &item.ExpoExhibitorID, &item.Code, &item.TargetPath, &item.Type, &item.Active, &created)
	if err != nil {
		return domain.QRCodeRecord{}, ErrNotFound
	}
	item.CreatedAt = created.Format(time.RFC3339)
	return item, nil
}

func (s *PostgresStore) ListProducts(ctx context.Context, filter ProductFilter) ([]domain.ProductRecord, error) {
	sql := `SELECT p.id, ee.exhibitor_id, ee.expo_id, p.name, p.description, COALESCE(p.price_minor,0),
		COALESCE(p.discounted_price_minor,0), COALESCE(p.currency_code,e.currency_code), COALESCE(p.media_type,'image'),
		COALESCE(p.media_url,''), COALESCE(p.image_urls,'[]'::jsonb), COALESCE(p.demo_video_url,''), COALESCE(p.presentation_url,''),
		COALESCE(p.specifications,''), COALESCE(c.name,'Uncategorized'), p.status,
		COALESCE(p.featured,FALSE), p.created_at
		FROM products p
		JOIN expo_exhibitors ee ON ee.id=p.expo_exhibitor_id
		JOIN expos e ON e.id=ee.expo_id
		LEFT JOIN categories c ON c.id=p.category_id`
	args := []any{}
	conditions := []string{}
	if filter.ExhibitorID != "" {
		args = append(args, filter.ExhibitorID)
		conditions = append(conditions, fmt.Sprintf("ee.exhibitor_id=$%d", len(args)))
	}
	if filter.ExpoID != "" {
		args = append(args, filter.ExpoID)
		conditions = append(conditions, fmt.Sprintf("ee.expo_id=$%d", len(args)))
	}
	if len(conditions) > 0 {
		sql += " WHERE " + strings.Join(conditions, " AND ")
	}
	sql += " ORDER BY p.created_at DESC"
	rows, err := s.pool.Query(ctx, sql, args...)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	return scanProducts(rows)
}

func (s *PostgresStore) ProductByID(ctx context.Context, id string, exhibitorID string) (domain.ProductRecord, error) {
	filtered := `SELECT p.id, ee.exhibitor_id, ee.expo_id, p.name, p.description, COALESCE(p.price_minor,0),
		COALESCE(p.discounted_price_minor,0), COALESCE(p.currency_code,e.currency_code), COALESCE(p.media_type,'image'),
		COALESCE(p.media_url,''), COALESCE(p.image_urls,'[]'::jsonb), COALESCE(p.demo_video_url,''), COALESCE(p.presentation_url,''),
		COALESCE(p.specifications,''), COALESCE(c.name,'Uncategorized'), p.status,
		COALESCE(p.featured,FALSE), p.created_at
		FROM products p
		JOIN expo_exhibitors ee ON ee.id=p.expo_exhibitor_id
		JOIN expos e ON e.id=ee.expo_id
		LEFT JOIN categories c ON c.id=p.category_id
		WHERE p.id=$1`
	args := []any{id}
	if exhibitorID != "" {
		args = append(args, exhibitorID)
		filtered += " AND ee.exhibitor_id=$2"
	}
	rows, err := s.pool.Query(ctx, filtered, args...)
	if err != nil {
		return domain.ProductRecord{}, err
	}
	defer rows.Close()
	products, err := scanProducts(rows)
	if err != nil {
		return domain.ProductRecord{}, err
	}
	if len(products) == 0 {
		return domain.ProductRecord{}, ErrNotFound
	}
	return products[0], nil
}

func (s *PostgresStore) CreateProduct(ctx context.Context, input domain.ProductInput, actor domain.User) (domain.ProductRecord, error) {
	if actor.Role != domain.RoleExhibitor {
		return domain.ProductRecord{}, ErrInvalidCredentials
	}
	booth, err := s.exhibitorBoothForProduct(ctx, actor.ID, input.ExpoID)
	if err != nil {
		return domain.ProductRecord{}, err
	}
	if err := validateProductInput(input); err != nil {
		return domain.ProductRecord{}, err
	}
	id := fmt.Sprintf("prd_%d", time.Now().UnixNano())
	categoryID, _ := s.categoryIDByName(ctx, input.Category)
	status := storageProductStatus(defaultString(input.Status, "available"))
	currency := strings.ToUpper(strings.TrimSpace(input.Currency))
	if currency == "" {
		currency = booth.CurrencyCode
	}
	imageURLs, _ := json.Marshal(compactProductStrings(input.ImageURLs))
	_, err = s.pool.Exec(ctx, `INSERT INTO products (id, expo_exhibitor_id, category_id, name, description, price_minor, discounted_price_minor, currency_code, media_type, media_url, image_urls, demo_video_url, presentation_url, specifications, featured, cta_type, status, created_at, updated_at)
		VALUES ($1,$2,NULLIF($3,''),$4,$5,$6,NULLIF($7,0),$8,$9,$10,$11,$12,$13,$14,$15,'inquiry',$16,NOW(),NOW())`,
		id, booth.ID, categoryID, strings.TrimSpace(input.Name), strings.TrimSpace(input.Description), input.Price, input.DiscountedPrice,
		currency, defaultString(input.MediaType, "image"), strings.TrimSpace(input.MediaURL), imageURLs, strings.TrimSpace(input.DemoVideoURL),
		strings.TrimSpace(input.PresentationURL), strings.TrimSpace(input.Specifications), input.Featured, status)
	if err != nil {
		return domain.ProductRecord{}, err
	}
	return s.ProductByID(ctx, id, actor.ID)
}

func (s *PostgresStore) UpdateProduct(ctx context.Context, id string, input domain.ProductInput, actor domain.User) (domain.ProductRecord, error) {
	if actor.Role != domain.RoleExhibitor {
		return domain.ProductRecord{}, ErrInvalidCredentials
	}
	if _, err := s.ProductByID(ctx, id, actor.ID); err != nil {
		return domain.ProductRecord{}, err
	}
	if err := validateProductInput(input); err != nil {
		return domain.ProductRecord{}, err
	}
	categoryID, _ := s.categoryIDByName(ctx, input.Category)
	status := storageProductStatus(defaultString(input.Status, "available"))
	imageURLs, _ := json.Marshal(compactProductStrings(input.ImageURLs))
	_, err := s.pool.Exec(ctx, `UPDATE products SET category_id=NULLIF($1,''), name=$2, description=$3, price_minor=$4,
		discounted_price_minor=NULLIF($5,0), currency_code=COALESCE(NULLIF($6,''), currency_code), media_type=$7,
		media_url=$8, image_urls=$9, demo_video_url=$10, presentation_url=$11, specifications=$12, featured=$13, status=$14, updated_at=NOW() WHERE id=$15`,
		categoryID, strings.TrimSpace(input.Name), strings.TrimSpace(input.Description), input.Price, input.DiscountedPrice,
		strings.ToUpper(strings.TrimSpace(input.Currency)), defaultString(input.MediaType, "image"), strings.TrimSpace(input.MediaURL),
		imageURLs, strings.TrimSpace(input.DemoVideoURL), strings.TrimSpace(input.PresentationURL), strings.TrimSpace(input.Specifications), input.Featured, status, id)
	if err != nil {
		return domain.ProductRecord{}, err
	}
	return s.ProductByID(ctx, id, actor.ID)
}

func (s *PostgresStore) DeleteProduct(ctx context.Context, id string, actor domain.User) error {
	if actor.Role != domain.RoleExhibitor {
		return ErrInvalidCredentials
	}
	if _, err := s.ProductByID(ctx, id, actor.ID); err != nil {
		return err
	}
	tag, err := s.pool.Exec(ctx, `DELETE FROM products WHERE id=$1`, id)
	if err != nil {
		return err
	}
	if tag.RowsAffected() == 0 {
		return ErrNotFound
	}
	return nil
}

func (s *PostgresStore) ListLeads(ctx context.Context, filter LeadFilter) ([]domain.LeadRecord, error) {
	sql := `SELECT l.id, l.expo_id, e.name, ee.exhibitor_id, l.name, COALESCE(l.email,''), COALESCE(l.phone,''),
		COALESCE(l.metadata->>'notes',''), l.source, l.temperature, l.status, COALESCE(l.metadata->>'nextFollowUpAt',''),
		COALESCE(l.metadata->>'lastContactedAt',''), COALESCE(l.metadata->>'followUpNotes',''), COALESCE(l.metadata->>'lastActivity',''),
		COALESCE(l.metadata->'interestedProductIds','[]'::jsonb), COALESCE(l.metadata->>'productName',''),
		COALESCE(NULLIF(l.metadata->>'productPrice','')::bigint, 0), COALESCE(l.metadata->>'productCurrency',''),
		COALESCE(NULLIF(l.metadata->>'quantity','')::int, 0), COALESCE(l.metadata->'activities','[]'::jsonb), l.created_at
		FROM leads l JOIN expos e ON e.id=l.expo_id JOIN expo_exhibitors ee ON ee.id=l.expo_exhibitor_id`
	args := []any{}
	conditions := []string{}
	if filter.ExpoID != "" {
		args = append(args, filter.ExpoID)
		conditions = append(conditions, fmt.Sprintf("l.expo_id=$%d", len(args)))
	}
	if filter.ExhibitorID != "" {
		args = append(args, filter.ExhibitorID)
		conditions = append(conditions, fmt.Sprintf("ee.exhibitor_id=$%d", len(args)))
	}
	if filter.OrganizerID != "" {
		args = append(args, filter.OrganizerID)
		conditions = append(conditions, fmt.Sprintf("e.organizer_id=$%d", len(args)))
	}
	if filter.CountryCode != "" {
		args = append(args, strings.ToUpper(strings.TrimSpace(filter.CountryCode)))
		conditions = append(conditions, fmt.Sprintf("e.country_code=$%d", len(args)))
	}
	if len(conditions) > 0 {
		sql += " WHERE " + strings.Join(conditions, " AND ")
	}
	sql += " ORDER BY l.created_at DESC"
	rows, err := s.pool.Query(ctx, sql, args...)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	items := []domain.LeadRecord{}
	for rows.Next() {
		var item domain.LeadRecord
		var created time.Time
		var productIDs []byte
		var activities []byte
		if err := rows.Scan(&item.ID, &item.ExpoID, &item.ExpoName, &item.ExhibitorID, &item.VisitorName, &item.VisitorEmail, &item.VisitorPhone, &item.Notes, &item.Source, &item.Temperature, &item.Status, &item.NextFollowUpAt, &item.LastContactedAt, &item.FollowUpNotes, &item.LastActivity, &productIDs, &item.ProductName, &item.ProductPrice, &item.ProductCurrency, &item.Quantity, &activities, &created); err != nil {
			return nil, err
		}
		_ = json.Unmarshal(productIDs, &item.InterestedProductIds)
		_ = json.Unmarshal(activities, &item.Activities)
		item.CapturedAt = created.Format(time.RFC3339)
		items = append(items, item)
	}
	return items, rows.Err()
}

func (s *PostgresStore) CreateLead(ctx context.Context, expoExhibitorID string, input domain.LeadInput, actor domain.User) (domain.LeadRecord, error) {
	exhibitors, err := s.ListExpoExhibitors(ctx, ExpoExhibitorFilter{})
	if err != nil {
		return domain.LeadRecord{}, err
	}
	var booth domain.ExpoExhibitor
	for _, item := range exhibitors {
		if item.ID == expoExhibitorID {
			booth = item
			break
		}
	}
	if booth.ID == "" {
		return domain.LeadRecord{}, ErrNotFound
	}
	name := strings.TrimSpace(input.Name)
	email := strings.TrimSpace(input.Email)
	if actor.ID != "" {
		if name == "" {
			name = actor.Name
		}
		if email == "" {
			email = actor.Email
		}
	}
	if name == "" {
		return domain.LeadRecord{}, ErrInvalidCredentials
	}
	id := fmt.Sprintf("lead_%d", time.Now().UnixNano())
	metadata := map[string]any{"notes": strings.TrimSpace(input.Notes), "interestedProductIds": compactProductStrings([]string{input.ProductID})}
	if strings.TrimSpace(input.Action) != "" {
		metadata["action"] = strings.TrimSpace(input.Action)
	}
	if input.Quantity > 0 {
		metadata["quantity"] = input.Quantity
	}
	if strings.TrimSpace(input.ProductName) != "" {
		metadata["productName"] = strings.TrimSpace(input.ProductName)
	}
	if input.ProductPrice > 0 {
		metadata["productPrice"] = input.ProductPrice
	}
	if strings.TrimSpace(input.ProductCurrency) != "" {
		metadata["productCurrency"] = strings.ToUpper(strings.TrimSpace(input.ProductCurrency))
	}
	if strings.TrimSpace(input.ScheduledAt) != "" {
		metadata["scheduledAt"] = strings.TrimSpace(input.ScheduledAt)
	}
	notes, _ := json.Marshal(metadata)
	_, err = s.pool.Exec(ctx, `INSERT INTO leads (id, expo_id, expo_exhibitor_id, visitor_id, source, name, email, phone, temperature, status, metadata)
		VALUES ($1,$2,$3,NULLIF($4,''),$5,$6,$7,$8,$9,'new',$10)`,
		id, booth.ExpoID, booth.ID, nullEmpty(actor.ID), validLeadSource(input.Source, input.Action), name, email, strings.TrimSpace(input.Phone), validLeadTemperature(input.Temperature), notes)
	if err != nil {
		return domain.LeadRecord{}, err
	}
	_ = s.RecordVisitorActivity(ctx, actor, booth.ExpoID, booth.ID, "contact", "Shared contact with "+booth.ExhibitorName)
	items, err := s.ListLeads(ctx, LeadFilter{ExpoID: booth.ExpoID, ExhibitorID: booth.ExhibitorID})
	if err != nil || len(items) == 0 {
		return domain.LeadRecord{}, err
	}
	return items[0], nil
}

func (s *PostgresStore) UpdateLead(ctx context.Context, id string, input domain.LeadUpdateInput, actor domain.User) (domain.LeadRecord, error) {
	leads, err := s.ListLeads(ctx, LeadFilter{})
	if err != nil {
		return domain.LeadRecord{}, err
	}
	var existing domain.LeadRecord
	for _, lead := range leads {
		if lead.ID == id {
			existing = lead
			break
		}
	}
	if existing.ID == "" {
		return domain.LeadRecord{}, ErrNotFound
	}
	if actor.Role == domain.RoleExhibitor && existing.ExhibitorID != actor.ID {
		return domain.LeadRecord{}, ErrInvalidCredentials
	}
	status := existing.Status
	if strings.TrimSpace(input.Status) != "" {
		status = validLeadStatus(input.Status)
	}
	temperature := existing.Temperature
	if strings.TrimSpace(input.Temperature) != "" {
		temperature = validLeadTemperature(input.Temperature)
	}
	followUpNotes := existing.FollowUpNotes
	if strings.TrimSpace(input.FollowUpNotes) != "" {
		followUpNotes = strings.TrimSpace(input.FollowUpNotes)
	}
	nextFollowUpAt := existing.NextFollowUpAt
	if strings.TrimSpace(input.NextFollowUpAt) != "" {
		nextFollowUpAt = strings.TrimSpace(input.NextFollowUpAt)
	}
	interestedProductIds := existing.InterestedProductIds
	if input.InterestedProductIds != nil {
		interestedProductIds = input.InterestedProductIds
	}
	metadata := map[string]any{
		"notes": existing.Notes, "followUpNotes": followUpNotes,
		"nextFollowUpAt": nextFollowUpAt, "interestedProductIds": interestedProductIds,
		"lastContactedAt": existing.LastContactedAt, "lastActivity": existing.LastActivity,
	}
	now := time.Now().UTC()
	activities := append([]domain.LeadActivityRecord{}, existing.Activities...)
	if status != existing.Status {
		activities = append(activities, domain.LeadActivityRecord{ID: fmt.Sprintf("lact_%d", now.UnixNano()), LeadID: id, Type: "status", Notes: "Status changed from " + fallbackString(existing.Status, "new") + " to " + status, CreatedAt: now.Format(time.RFC3339)})
	}
	if temperature != existing.Temperature {
		activities = append(activities, domain.LeadActivityRecord{ID: fmt.Sprintf("lact_%d_temp", now.UnixNano()), LeadID: id, Type: "temperature", Notes: "Temperature changed from " + fallbackString(existing.Temperature, "warm") + " to " + temperature, CreatedAt: now.Format(time.RFC3339)})
	}
	if len(activities) > len(existing.Activities) {
		metadata["activities"] = activities
	}
	payload, _ := json.Marshal(metadata)
	if _, err := s.pool.Exec(ctx, `UPDATE leads SET status=$1, temperature=$2, metadata=COALESCE(metadata,'{}'::jsonb) || $3::jsonb, updated_at=NOW() WHERE id=$4`, status, temperature, payload, id); err != nil {
		return domain.LeadRecord{}, err
	}
	items, err := s.ListLeads(ctx, LeadFilter{ExpoID: existing.ExpoID, ExhibitorID: existing.ExhibitorID})
	if err != nil {
		return domain.LeadRecord{}, err
	}
	for _, item := range items {
		if item.ID == id {
			return item, nil
		}
	}
	return domain.LeadRecord{}, ErrNotFound
}

func (s *PostgresStore) RecordLeadActivity(ctx context.Context, id string, input domain.LeadActivityInput, actor domain.User) (domain.LeadActivityRecord, error) {
	leads, err := s.ListLeads(ctx, LeadFilter{})
	if err != nil {
		return domain.LeadActivityRecord{}, err
	}
	var lead domain.LeadRecord
	for _, item := range leads {
		if item.ID == id {
			lead = item
			break
		}
	}
	if lead.ID == "" {
		return domain.LeadActivityRecord{}, ErrNotFound
	}
	if actor.Role == domain.RoleExhibitor && lead.ExhibitorID != actor.ID {
		return domain.LeadActivityRecord{}, ErrInvalidCredentials
	}
	activityType := validLeadActivityType(input.Type)
	now := time.Now().UTC()
	record := domain.LeadActivityRecord{ID: fmt.Sprintf("lact_%d", now.UnixNano()), LeadID: id, Type: activityType, Notes: strings.TrimSpace(input.Notes), ScheduledAt: strings.TrimSpace(input.ScheduledAt), CreatedAt: now.Format(time.RFC3339)}
	activities := append(lead.Activities, record)
	metadata := map[string]any{"lastActivity": activityType}
	metadata["activities"] = activities
	if activityType == "call" || activityType == "email" || activityType == "whatsapp" || activityType == "meeting" {
		metadata["lastContactedAt"] = now.Format(time.RFC3339)
	}
	if strings.TrimSpace(input.ScheduledAt) != "" {
		metadata["nextFollowUpAt"] = strings.TrimSpace(input.ScheduledAt)
	}
	if strings.TrimSpace(input.Notes) != "" {
		metadata["followUpNotes"] = strings.TrimSpace(input.Notes)
	}
	payload, _ := json.Marshal(metadata)
	status := lead.Status
	if status == "" || status == "new" {
		status = "contacted"
	}
	if _, err := s.pool.Exec(ctx, `UPDATE leads SET status=$1, metadata=COALESCE(metadata,'{}'::jsonb) || $2::jsonb, updated_at=NOW() WHERE id=$3`, status, payload, id); err != nil {
		return domain.LeadActivityRecord{}, err
	}
	return record, nil
}

func (s *PostgresStore) ListChatThreads(ctx context.Context, filter ChatThreadFilter, actor domain.User) ([]domain.ExhibitorConversationThread, error) {
	sql := `SELECT ct.id, ct.expo_id, ct.exhibitor_id, COALESCE(NULLIF(ex.company_name,''), ex.name),
			COALESCE(ex.name_cipher,''), COALESCE(ex.company_name_cipher,''), ct.visitor_id, v.name, v.email,
			COALESCE(v.name_cipher,''), COALESCE(v.email_cipher,''), COALESCE(v.company_name_cipher,''), ct.created_at, ct.updated_at
		FROM chat_threads ct
		JOIN users ex ON ex.id=ct.exhibitor_id
		JOIN users v ON v.id=ct.visitor_id`
	args := []any{}
	conditions := []string{}
	if filter.ThreadID != "" {
		args = append(args, strings.TrimSpace(filter.ThreadID))
		conditions = append(conditions, fmt.Sprintf("ct.id=$%d", len(args)))
	}
	if filter.ExpoID != "" {
		args = append(args, strings.TrimSpace(filter.ExpoID))
		conditions = append(conditions, fmt.Sprintf("ct.expo_id=$%d", len(args)))
	}
	if filter.ExhibitorID != "" {
		args = append(args, strings.TrimSpace(filter.ExhibitorID))
		conditions = append(conditions, fmt.Sprintf("ct.exhibitor_id=$%d", len(args)))
	}
	if filter.VisitorID != "" {
		args = append(args, strings.TrimSpace(filter.VisitorID))
		conditions = append(conditions, fmt.Sprintf("ct.visitor_id=$%d", len(args)))
	}
	switch actor.Role {
	case domain.RoleVisitor:
		args = append(args, actor.ID)
		conditions = append(conditions, fmt.Sprintf("ct.visitor_id=$%d", len(args)))
	case domain.RoleExhibitor:
		args = append(args, actor.ID)
		conditions = append(conditions, fmt.Sprintf("ct.exhibitor_id=$%d", len(args)))
	default:
		return nil, ErrInvalidCredentials
	}
	if len(conditions) > 0 {
		sql += " WHERE " + strings.Join(conditions, " AND ")
	}
	sql += " ORDER BY ct.updated_at DESC"
	rows, err := s.pool.Query(ctx, sql, args...)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	items := []domain.ExhibitorConversationThread{}
	for rows.Next() {
		var item domain.ExhibitorConversationThread
		var createdAt, updatedAt time.Time
		var exhibitorNameCipher, exhibitorCompanyCipher, visitorNameCipher, visitorEmailCipher, visitorCompanyCipher string
		if err := rows.Scan(&item.ID, &item.ExpoID, &item.ExhibitorID, &item.ExhibitorName, &exhibitorNameCipher, &exhibitorCompanyCipher, &item.VisitorID, &item.VisitorName, &item.VisitorEmail, &visitorNameCipher, &visitorEmailCipher, &visitorCompanyCipher, &createdAt, &updatedAt); err != nil {
			return nil, err
		}
		if company := strings.TrimSpace(s.pii.Decrypt(exhibitorCompanyCipher)); company != "" {
			item.ExhibitorName = company
		} else if name := strings.TrimSpace(s.pii.Decrypt(exhibitorNameCipher)); name != "" {
			item.ExhibitorName = name
		} else if looksLikeProtectedPII(item.ExhibitorName) {
			item.ExhibitorName = "Exhibitor"
		}
		if company := strings.TrimSpace(s.pii.Decrypt(visitorCompanyCipher)); company != "" {
			item.VisitorName = company
		} else if name := strings.TrimSpace(s.pii.Decrypt(visitorNameCipher)); name != "" {
			item.VisitorName = name
		} else if looksLikeProtectedPII(item.VisitorName) {
			item.VisitorName = "Visitor"
		}
		if email := strings.TrimSpace(s.pii.Decrypt(visitorEmailCipher)); email != "" {
			item.VisitorEmail = email
		} else if looksLikeProtectedPII(item.VisitorEmail) {
			item.VisitorEmail = ""
		}
		item.CreatedAt = createdAt.Format(time.RFC3339)
		item.LastMessageAt = updatedAt.Format(time.RFC3339)
		item.Messages, err = s.chatMessages(ctx, item.ID)
		if err != nil {
			return nil, err
		}
		if len(item.Messages) > 0 {
			last := item.Messages[len(item.Messages)-1]
			item.LastMessage = last.Message
			item.LastMessageAt = last.CreatedAt
		}
		item.UnreadCount = chatUnreadCount(item.Messages, actor.Role)
		items = append(items, item)
	}
	return items, rows.Err()
}

func (s *PostgresStore) CreateChatMessage(ctx context.Context, expoID string, exhibitorID string, input domain.ChatMessageInput, actor domain.User) (domain.ExhibitorConversationThread, domain.ChatMessageRecord, error) {
	message := strings.TrimSpace(input.Message)
	expoID = strings.TrimSpace(expoID)
	exhibitorID = strings.TrimSpace(exhibitorID)
	if message == "" || len(message) > 2000 || (actor.Role != domain.RoleVisitor && actor.Role != domain.RoleExhibitor) {
		return domain.ExhibitorConversationThread{}, domain.ChatMessageRecord{}, ErrInvalidCredentials
	}
	if err := s.ensureExpoDocumentAccess(ctx, expoID, exhibitorID); err != nil {
		return domain.ExhibitorConversationThread{}, domain.ChatMessageRecord{}, err
	}
	threadID := strings.TrimSpace(input.ThreadID)
	visitorID := actor.ID
	if actor.Role == domain.RoleExhibitor {
		if actor.ID != exhibitorID || threadID == "" {
			return domain.ExhibitorConversationThread{}, domain.ChatMessageRecord{}, ErrInvalidCredentials
		}
		if err := s.pool.QueryRow(ctx, `SELECT visitor_id FROM chat_threads WHERE id=$1 AND expo_id=$2 AND exhibitor_id=$3`, threadID, expoID, exhibitorID).Scan(&visitorID); err != nil {
			if err == pgx.ErrNoRows {
				return domain.ExhibitorConversationThread{}, domain.ChatMessageRecord{}, ErrNotFound
			}
			return domain.ExhibitorConversationThread{}, domain.ChatMessageRecord{}, err
		}
	} else {
		threadID = fmt.Sprintf("chat_%s_%s_%s", expoID, exhibitorID, actor.ID)
		_, err := s.pool.Exec(ctx, `INSERT INTO chat_threads (id, expo_id, exhibitor_id, visitor_id)
			VALUES ($1,$2,$3,$4) ON CONFLICT (expo_id, exhibitor_id, visitor_id) DO NOTHING`, threadID, expoID, exhibitorID, actor.ID)
		if err != nil {
			return domain.ExhibitorConversationThread{}, domain.ChatMessageRecord{}, err
		}
		if err := s.pool.QueryRow(ctx, `SELECT id FROM chat_threads WHERE expo_id=$1 AND exhibitor_id=$2 AND visitor_id=$3`, expoID, exhibitorID, actor.ID).Scan(&threadID); err != nil {
			return domain.ExhibitorConversationThread{}, domain.ChatMessageRecord{}, err
		}
	}
	id := fmt.Sprintf("chatmsg_%d", time.Now().UnixNano())
	senderName := defaultString(strings.TrimSpace(actor.CompanyName), actor.Name)
	var createdAt time.Time
	record := domain.ChatMessageRecord{}
	err := s.pool.QueryRow(ctx, `INSERT INTO chat_messages (id, thread_id, expo_id, exhibitor_id, visitor_id, sender_id, sender_role, sender_name, message, read_by_visitor, read_by_exhibitor)
		VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)
		RETURNING id, thread_id, expo_id, exhibitor_id, visitor_id, sender_id, sender_role, sender_name, message, read_by_visitor, read_by_exhibitor, created_at`,
		id, threadID, expoID, exhibitorID, visitorID, actor.ID, string(actor.Role), senderName, message, actor.Role == domain.RoleVisitor, actor.Role == domain.RoleExhibitor).
		Scan(&record.ID, &record.ThreadID, &record.ExpoID, &record.ExhibitorID, &record.VisitorID, &record.SenderID, &record.SenderRole, &record.SenderName, &record.Message, &record.ReadByVisitor, &record.ReadByExhibitor, &createdAt)
	if err != nil {
		return domain.ExhibitorConversationThread{}, domain.ChatMessageRecord{}, err
	}
	record.CreatedAt = createdAt.Format(time.RFC3339)
	_, _ = s.pool.Exec(ctx, `UPDATE chat_threads SET updated_at=NOW() WHERE id=$1`, threadID)
	threads, err := s.ListChatThreads(ctx, ChatThreadFilter{ThreadID: threadID}, actor)
	if err != nil || len(threads) == 0 {
		return domain.ExhibitorConversationThread{}, record, err
	}
	return threads[0], record, nil
}

func (s *PostgresStore) MarkChatThreadRead(ctx context.Context, expoID string, exhibitorID string, actor domain.User) (int, error) {
	expoID = strings.TrimSpace(expoID)
	exhibitorID = strings.TrimSpace(exhibitorID)
	if actor.Role != domain.RoleVisitor && actor.Role != domain.RoleExhibitor {
		return 0, ErrInvalidCredentials
	}
	threadID := ""
	args := []any{expoID, exhibitorID}
	sql := `SELECT id FROM chat_threads WHERE expo_id=$1 AND exhibitor_id=$2`
	if actor.Role == domain.RoleVisitor {
		args = append(args, actor.ID)
		sql += " AND visitor_id=$3"
	} else {
		args = append(args, actor.ID)
		sql += " AND exhibitor_id=$3"
	}
	if err := s.pool.QueryRow(ctx, sql, args...).Scan(&threadID); err != nil {
		if err == pgx.ErrNoRows {
			return 0, ErrNotFound
		}
		return 0, err
	}
	updateSQL := `UPDATE chat_messages SET read_by_visitor=true WHERE thread_id=$1 AND read_by_visitor=false`
	if actor.Role == domain.RoleExhibitor {
		updateSQL = `UPDATE chat_messages SET read_by_exhibitor=true WHERE thread_id=$1 AND read_by_exhibitor=false`
	}
	tag, err := s.pool.Exec(ctx, updateSQL, threadID)
	if err != nil {
		return 0, err
	}
	return int(tag.RowsAffected()), nil
}

func (s *PostgresStore) chatMessages(ctx context.Context, threadID string) ([]domain.ChatMessageRecord, error) {
	rows, err := s.pool.Query(ctx, `SELECT id, thread_id, expo_id, exhibitor_id, visitor_id, sender_id, sender_role, sender_name, message, read_by_visitor, read_by_exhibitor, created_at
		FROM chat_messages WHERE thread_id=$1 ORDER BY created_at ASC`, threadID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	items := []domain.ChatMessageRecord{}
	for rows.Next() {
		var item domain.ChatMessageRecord
		var createdAt time.Time
		if err := rows.Scan(&item.ID, &item.ThreadID, &item.ExpoID, &item.ExhibitorID, &item.VisitorID, &item.SenderID, &item.SenderRole, &item.SenderName, &item.Message, &item.ReadByVisitor, &item.ReadByExhibitor, &createdAt); err != nil {
			return nil, err
		}
		item.CreatedAt = createdAt.Format(time.RFC3339)
		items = append(items, item)
	}
	return items, rows.Err()
}

func (s *PostgresStore) ListExhibitorFeedback(ctx context.Context, filter ExhibitorFeedbackFilter) ([]domain.ExhibitorFeedbackRecord, error) {
	sql := `SELECT id, expo_id, exhibitor_id, COALESCE(visitor_id,''), visitor_name, COALESCE(visitor_email,''), rating, comment, submitted_at
		FROM exhibitor_feedback`
	args := []any{}
	conditions := []string{}
	if filter.ExpoID != "" {
		args = append(args, filter.ExpoID)
		conditions = append(conditions, fmt.Sprintf("expo_id=$%d", len(args)))
	}
	if filter.ExhibitorID != "" {
		args = append(args, filter.ExhibitorID)
		conditions = append(conditions, fmt.Sprintf("exhibitor_id=$%d", len(args)))
	}
	if filter.VisitorID != "" {
		args = append(args, filter.VisitorID)
		conditions = append(conditions, fmt.Sprintf("visitor_id=$%d", len(args)))
	}
	if len(conditions) > 0 {
		sql += " WHERE " + strings.Join(conditions, " AND ")
	}
	sql += " ORDER BY submitted_at DESC"
	rows, err := s.pool.Query(ctx, sql, args...)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	items := []domain.ExhibitorFeedbackRecord{}
	for rows.Next() {
		var item domain.ExhibitorFeedbackRecord
		var submittedAt time.Time
		if err := rows.Scan(&item.ID, &item.ExpoID, &item.ExhibitorID, &item.VisitorID, &item.VisitorName, &item.VisitorEmail, &item.Rating, &item.Comment, &submittedAt); err != nil {
			return nil, err
		}
		item.SubmittedAt = submittedAt.Format(time.RFC3339)
		items = append(items, item)
	}
	return items, rows.Err()
}

func (s *PostgresStore) CreateExhibitorFeedback(ctx context.Context, input domain.ExhibitorFeedbackInput, actor domain.User) (domain.ExhibitorFeedbackRecord, error) {
	expoID := strings.TrimSpace(input.ExpoID)
	exhibitorID := strings.TrimSpace(input.ExhibitorID)
	comment := strings.TrimSpace(input.Comment)
	if actor.Role != domain.RoleVisitor || expoID == "" || exhibitorID == "" || input.Rating < 1 || input.Rating > 5 || comment == "" {
		return domain.ExhibitorFeedbackRecord{}, ErrInvalidCredentials
	}
	assignments, err := s.ListExpoExhibitors(ctx, ExpoExhibitorFilter{ExpoID: expoID, ExhibitorID: exhibitorID})
	if err != nil {
		return domain.ExhibitorFeedbackRecord{}, err
	}
	if len(assignments) == 0 {
		return domain.ExhibitorFeedbackRecord{}, ErrNotFound
	}
	id := fmt.Sprintf("xfb_%d", time.Now().UnixNano())
	_, err = s.pool.Exec(ctx, `INSERT INTO exhibitor_feedback (id, expo_id, exhibitor_id, visitor_id, visitor_name, visitor_email, rating, comment)
		VALUES ($1,$2,$3,$4,$5,$6,$7,$8)`, id, expoID, exhibitorID, actor.ID, actor.Name, actor.Email, input.Rating, comment)
	if err != nil {
		return domain.ExhibitorFeedbackRecord{}, err
	}
	items, err := s.ListExhibitorFeedback(ctx, ExhibitorFeedbackFilter{ExpoID: expoID, ExhibitorID: exhibitorID})
	if err != nil {
		return domain.ExhibitorFeedbackRecord{}, err
	}
	for _, item := range items {
		if item.ID == id {
			return item, nil
		}
	}
	return domain.ExhibitorFeedbackRecord{}, ErrNotFound
}

func (s *PostgresStore) ListOrganizerFeedback(ctx context.Context, organizerID string) ([]domain.OrganizerFeedbackRecord, error) {
	rows, err := s.pool.Query(ctx, `SELECT f.id, f.expo_id, e.name, f.organizer_id, f.exhibitor_id, f.exhibitor_name, f.rating, f.category, f.comment, f.improvements, f.dislikes, f.submitted_at
		FROM organizer_feedback f
		JOIN expos e ON e.id=f.expo_id
		WHERE f.organizer_id=$1
		ORDER BY f.submitted_at DESC`, organizerID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	items := []domain.OrganizerFeedbackRecord{}
	for rows.Next() {
		var item domain.OrganizerFeedbackRecord
		var submittedAt time.Time
		if err := rows.Scan(&item.ID, &item.ExpoID, &item.ExpoName, &item.OrganizerID, &item.ExhibitorID, &item.ExhibitorName, &item.Rating, &item.Category, &item.Comment, &item.Improvements, &item.Dislikes, &submittedAt); err != nil {
			return nil, err
		}
		item.SubmittedAt = submittedAt.Format(time.RFC3339)
		items = append(items, item)
	}
	return items, rows.Err()
}

func (s *PostgresStore) CreateOrganizerFeedback(ctx context.Context, expoID string, exhibitorID string, input domain.OrganizerFeedbackInput, actor domain.User) (domain.OrganizerFeedbackRecord, error) {
	expoID = strings.TrimSpace(expoID)
	exhibitorID = strings.TrimSpace(exhibitorID)
	comment := strings.TrimSpace(input.Comment)
	improvements := strings.TrimSpace(input.Improvements)
	dislikes := strings.TrimSpace(input.Dislikes)
	category := organizerFeedbackCategory(input.Category)
	if actor.Role != domain.RoleExhibitor || expoID == "" || exhibitorID == "" || input.Rating < 1 || input.Rating > 5 || comment == "" {
		return domain.OrganizerFeedbackRecord{}, ErrInvalidCredentials
	}
	expo, err := s.ExpoByID(ctx, expoID)
	if err != nil || expo.OrganizerID == "" {
		return domain.OrganizerFeedbackRecord{}, ErrNotFound
	}
	assignments, err := s.ListExpoExhibitors(ctx, ExpoExhibitorFilter{ExpoID: expoID, ExhibitorID: exhibitorID})
	if err != nil {
		return domain.OrganizerFeedbackRecord{}, err
	}
	if len(assignments) == 0 {
		return domain.OrganizerFeedbackRecord{}, ErrNotFound
	}
	exhibitorName := strings.TrimSpace(actor.CompanyName)
	if exhibitorName == "" {
		exhibitorName = strings.TrimSpace(actor.Name)
	}
	id := fmt.Sprintf("ofb_%d", time.Now().UnixNano())
	if _, err := s.pool.Exec(ctx, `INSERT INTO organizer_feedback (id, expo_id, organizer_id, exhibitor_id, exhibitor_name, rating, category, comment, improvements, dislikes)
		VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)`, id, expo.ID, expo.OrganizerID, exhibitorID, exhibitorName, input.Rating, category, comment, improvements, dislikes); err != nil {
		return domain.OrganizerFeedbackRecord{}, err
	}
	items, err := s.ListOrganizerFeedback(ctx, expo.OrganizerID)
	if err != nil {
		return domain.OrganizerFeedbackRecord{}, err
	}
	for _, item := range items {
		if item.ID == id {
			return item, nil
		}
	}
	return domain.OrganizerFeedbackRecord{}, ErrNotFound
}

func (s *PostgresStore) ListExhibitorCampaignDrafts(ctx context.Context, filter ExhibitorCampaignDraftFilter) ([]domain.ExhibitorCampaignDraftRecord, error) {
	sql := `SELECT id, expo_id, exhibitor_id, channel, name, audience, subject, message, status, created_at, updated_at
		FROM exhibitor_campaign_drafts`
	args := []any{}
	conditions := []string{}
	if filter.ExpoID != "" {
		args = append(args, filter.ExpoID)
		conditions = append(conditions, fmt.Sprintf("expo_id=$%d", len(args)))
	}
	if filter.ExhibitorID != "" {
		args = append(args, filter.ExhibitorID)
		conditions = append(conditions, fmt.Sprintf("exhibitor_id=$%d", len(args)))
	}
	if len(conditions) > 0 {
		sql += " WHERE " + strings.Join(conditions, " AND ")
	}
	sql += " ORDER BY created_at DESC"
	rows, err := s.pool.Query(ctx, sql, args...)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	items := []domain.ExhibitorCampaignDraftRecord{}
	for rows.Next() {
		var item domain.ExhibitorCampaignDraftRecord
		var createdAt, updatedAt time.Time
		if err := rows.Scan(&item.ID, &item.ExpoID, &item.ExhibitorID, &item.Channel, &item.Name, &item.Audience, &item.Subject, &item.Message, &item.Status, &createdAt, &updatedAt); err != nil {
			return nil, err
		}
		item.CreatedAt = createdAt.Format(time.RFC3339)
		item.UpdatedAt = updatedAt.Format(time.RFC3339)
		items = append(items, item)
	}
	return items, rows.Err()
}

func (s *PostgresStore) CreateExhibitorCampaignDraft(ctx context.Context, expoID string, exhibitorID string, input domain.ExhibitorCampaignDraftInput, actor domain.User) (domain.ExhibitorCampaignDraftRecord, error) {
	if actor.Role != domain.RoleExhibitor {
		return domain.ExhibitorCampaignDraftRecord{}, ErrInvalidCredentials
	}
	expoID = strings.TrimSpace(expoID)
	exhibitorID = strings.TrimSpace(exhibitorID)
	assignments, err := s.ListExpoExhibitors(ctx, ExpoExhibitorFilter{ExpoID: expoID, ExhibitorID: exhibitorID})
	if err != nil {
		return domain.ExhibitorCampaignDraftRecord{}, err
	}
	if len(assignments) == 0 {
		return domain.ExhibitorCampaignDraftRecord{}, ErrNotFound
	}
	channel := validCampaignChannel(input.Channel)
	name := strings.TrimSpace(input.Name)
	audience := validCampaignAudience(input.Audience)
	subject := strings.TrimSpace(input.Subject)
	message := strings.TrimSpace(input.Message)
	if channel == "" || name == "" || audience == "" || subject == "" || message == "" {
		return domain.ExhibitorCampaignDraftRecord{}, ErrInvalidCredentials
	}
	id := fmt.Sprintf("xcd_%d", time.Now().UnixNano())
	_, err = s.pool.Exec(ctx, `INSERT INTO exhibitor_campaign_drafts (id, expo_id, exhibitor_id, channel, name, audience, subject, message, status)
		VALUES ($1,$2,$3,$4,$5,$6,$7,$8,'draft')`, id, expoID, exhibitorID, channel, name, audience, subject, message)
	if err != nil {
		return domain.ExhibitorCampaignDraftRecord{}, err
	}
	items, err := s.ListExhibitorCampaignDrafts(ctx, ExhibitorCampaignDraftFilter{ExpoID: expoID, ExhibitorID: exhibitorID})
	if err != nil {
		return domain.ExhibitorCampaignDraftRecord{}, err
	}
	for _, item := range items {
		if item.ID == id {
			return item, nil
		}
	}
	return domain.ExhibitorCampaignDraftRecord{}, ErrNotFound
}

func (s *PostgresStore) ListMeetings(ctx context.Context, filter MeetingFilter) ([]domain.MeetingRecord, error) {
	sql := `SELECT m.id, m.lead_id, m.expo_id, ee.exhibitor_id, COALESCE(l.visitor_id,''), l.name, COALESCE(l.email,''), COALESCE(l.phone,''), m.title, m.meeting_type, m.scheduled_at, COALESCE(NULLIF(m.meeting_link,''), m.location_or_link, ''), COALESCE(m.cc_emails,''), m.status, m.created_at
		FROM meetings m JOIN leads l ON l.id=m.lead_id JOIN expo_exhibitors ee ON ee.id=l.expo_exhibitor_id`
	args := []any{}
	conditions := []string{}
	if filter.ExpoID != "" {
		args = append(args, filter.ExpoID)
		conditions = append(conditions, fmt.Sprintf("m.expo_id=$%d", len(args)))
	}
	if filter.ExhibitorID != "" {
		args = append(args, filter.ExhibitorID)
		conditions = append(conditions, fmt.Sprintf("ee.exhibitor_id=$%d", len(args)))
	}
	if filter.VisitorID != "" || strings.TrimSpace(filter.VisitorEmail) != "" {
		attendeeConditions := []string{}
		if filter.VisitorID != "" {
			args = append(args, filter.VisitorID)
			attendeeConditions = append(attendeeConditions, fmt.Sprintf("l.visitor_id=$%d", len(args)))
		}
		if strings.TrimSpace(filter.VisitorEmail) != "" {
			args = append(args, strings.ToLower(strings.TrimSpace(filter.VisitorEmail)))
			emailArg := len(args)
			attendeeConditions = append(attendeeConditions, fmt.Sprintf("(LOWER(COALESCE(l.email,''))=$%d OR POSITION(',' || $%d || ',' IN ',' || LOWER(REPLACE(COALESCE(m.cc_emails,''), ' ', '')) || ',') > 0)", emailArg, emailArg))
		}
		conditions = append(conditions, "("+strings.Join(attendeeConditions, " OR ")+")")
	}
	if len(conditions) > 0 {
		sql += " WHERE " + strings.Join(conditions, " AND ")
	}
	sql += " ORDER BY m.scheduled_at ASC"
	rows, err := s.pool.Query(ctx, sql, args...)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	items := []domain.MeetingRecord{}
	for rows.Next() {
		var item domain.MeetingRecord
		var ccEmails string
		var scheduledAt, createdAt time.Time
		if err := rows.Scan(&item.ID, &item.LeadID, &item.ExpoID, &item.ExhibitorID, &item.VisitorID, &item.VisitorName, &item.VisitorEmail, &item.VisitorPhone, &item.Title, &item.MeetingType, &scheduledAt, &item.LocationOrLink, &ccEmails, &item.Status, &createdAt); err != nil {
			return nil, err
		}
		item.ScheduledAt = scheduledAt.Format(time.RFC3339)
		item.CreatedAt = createdAt.Format(time.RFC3339)
		item.CCEmails = splitStoredEmails(ccEmails)
		items = append(items, item)
	}
	return items, rows.Err()
}

func (s *PostgresStore) CreateMeeting(ctx context.Context, expoID string, exhibitorID string, input domain.MeetingInput, actor domain.User) (domain.MeetingRecord, error) {
	scheduledAtRaw := strings.TrimSpace(input.ScheduledAt)
	scheduledAt, err := time.Parse(time.RFC3339, scheduledAtRaw)
	if err != nil {
		return domain.MeetingRecord{}, ErrInvalidCredentials
	}
	leadID := strings.TrimSpace(input.LeadID)
	if leadID == "" {
		exhibitors, err := s.ListExpoExhibitors(ctx, ExpoExhibitorFilter{ExpoID: expoID, ExhibitorID: exhibitorID})
		if err != nil || len(exhibitors) == 0 {
			return domain.MeetingRecord{}, ErrNotFound
		}
		lead, err := s.CreateLead(ctx, exhibitors[0].ID, domain.LeadInput{
			Name: input.VisitorName, Email: input.VisitorEmail, Phone: input.VisitorPhone, Notes: input.Notes,
			Source: "inquiry", Action: "meeting", ScheduledAt: scheduledAt.Format(time.RFC3339),
		}, actor)
		if err != nil {
			return domain.MeetingRecord{}, err
		}
		leadID = lead.ID
	}
	leads, err := s.ListLeads(ctx, LeadFilter{ExpoID: expoID, ExhibitorID: exhibitorID})
	if err != nil {
		return domain.MeetingRecord{}, err
	}
	var lead domain.LeadRecord
	for _, item := range leads {
		if item.ID == leadID {
			lead = item
			break
		}
	}
	if lead.ID == "" {
		return domain.MeetingRecord{}, ErrNotFound
	}
	title := strings.TrimSpace(input.Title)
	if title == "" {
		title = "Meeting with " + fallbackString(lead.VisitorName, "visitor")
	}
	id := fmt.Sprintf("meet_%d", time.Now().UnixNano())
	location := strings.TrimSpace(input.Location)
	if location == "" {
		return domain.MeetingRecord{}, ErrInvalidCredentials
	}
	_, err = s.pool.Exec(ctx, `INSERT INTO meetings (id, lead_id, expo_id, title, meeting_type, scheduled_at, location_or_link, meeting_link, cc_emails, status)
		VALUES ($1,$2,$3,$4,$5,$6,$7,$7,$8,'scheduled')`, id, leadID, expoID, title, validMeetingType(input.MeetingType), scheduledAt, location, strings.Join(input.CCEmails, ","))
	if err != nil {
		return domain.MeetingRecord{}, err
	}
	_, _ = s.pool.Exec(ctx, `UPDATE leads SET status='meeting_booked', metadata=COALESCE(metadata,'{}'::jsonb) || $1::jsonb, updated_at=NOW() WHERE id=$2`,
		fmt.Sprintf(`{"nextFollowUpAt":%q,"lastActivity":"meeting"}`, scheduledAt.Format(time.RFC3339)), leadID)
	items, err := s.ListMeetings(ctx, MeetingFilter{ExpoID: expoID, ExhibitorID: exhibitorID})
	if err != nil {
		return domain.MeetingRecord{}, err
	}
	for _, item := range items {
		if item.ID == id {
			return item, nil
		}
	}
	return domain.MeetingRecord{}, ErrNotFound
}

func (s *PostgresStore) DeleteMeeting(ctx context.Context, id string, expoID string, exhibitorID string) error {
	result, err := s.pool.Exec(ctx, `DELETE FROM meetings m
		USING leads l, expo_exhibitors ee
		WHERE m.lead_id=l.id AND l.expo_exhibitor_id=ee.id
			AND m.id=$1 AND m.expo_id=$2 AND ee.exhibitor_id=$3`, id, expoID, exhibitorID)
	if err != nil {
		return err
	}
	if result.RowsAffected() == 0 {
		return ErrNotFound
	}
	return nil
}

func (s *PostgresStore) CancelMeetingNotifications(ctx context.Context, meetingID string) (int, error) {
	tag, err := s.pool.Exec(ctx, `UPDATE notifications
		SET status='cancelled'
		WHERE status='queued' AND payload->>'meetingId'=$1`, meetingID)
	if err != nil {
		return 0, err
	}
	return int(tag.RowsAffected()), nil
}

func (s *PostgresStore) CancelLeadFollowUpNotifications(ctx context.Context, leadID string) (int, error) {
	tag, err := s.pool.Exec(ctx, `UPDATE notifications
		SET status='cancelled'
		WHERE status='queued' AND template_key='lead_follow_up_reminder' AND payload->>'leadId'=$1`, leadID)
	if err != nil {
		return 0, err
	}
	return int(tag.RowsAffected()), nil
}

func (s *PostgresStore) RecordVisitorActivity(ctx context.Context, actor domain.User, expoID string, expoExhibitorID string, activityType string, description string) error {
	_, err := s.pool.Exec(ctx, `INSERT INTO visitor_timeline_events (id, visitor_id, expo_id, expo_exhibitor_id, source, event_type, metadata)
		VALUES ($1,NULLIF($2,''),$3,NULLIF($4,''),'remote',$5,$6)`,
		fmt.Sprintf("vte_%d", time.Now().UnixNano()), actor.ID, expoID, expoExhibitorID, activityType, map[string]string{"description": description})
	return err
}

func (s *PostgresStore) VisitorTimeline(ctx context.Context, visitorID string) ([]domain.VisitorTimelineDay, error) {
	rows, err := s.pool.Query(ctx, `SELECT id, event_type, COALESCE(metadata->>'description', event_type), occurred_at, expo_id, COALESCE(expo_exhibitor_id,'') FROM visitor_timeline_events WHERE visitor_id=$1 ORDER BY occurred_at DESC`, visitorID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	grouped := map[string][]domain.VisitorActivityItem{}
	for rows.Next() {
		var item domain.VisitorActivityItem
		var occurred time.Time
		if err := rows.Scan(&item.ID, &item.Type, &item.Description, &occurred, &item.ExpoID, &item.ExhibitorID); err != nil {
			return nil, err
		}
		item.Title = item.Description
		item.Timestamp = occurred.Format(time.RFC3339)
		grouped[occurred.Format("2006-01-02")] = append(grouped[occurred.Format("2006-01-02")], item)
	}
	days := []domain.VisitorTimelineDay{}
	for day, activities := range grouped {
		days = append(days, domain.VisitorTimelineDay{Date: day, Activities: activities})
	}
	return days, rows.Err()
}

func (s *PostgresStore) VisitorFavorites(ctx context.Context, visitorID string) ([]domain.VisitorFavoriteRecord, error) {
	rows, err := s.pool.Query(ctx, `SELECT vf.id, vf.type, vf.item_id,
			CASE WHEN vf.type='expo' THEN vf.item_id ELSE COALESCE(ee.expo_id, '') END AS expo_id,
			vf.name, vf.image_url, vf.created_at
		FROM visitor_favorites vf
		LEFT JOIN LATERAL (
			SELECT expo_id
			FROM expo_exhibitors
			WHERE vf.type='exhibitor' AND (id=vf.item_id OR exhibitor_id=vf.item_id)
			ORDER BY created_at DESC
			LIMIT 1
		) ee ON TRUE
		WHERE vf.visitor_id=$1
		ORDER BY vf.created_at DESC`, visitorID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	items := []domain.VisitorFavoriteRecord{}
	for rows.Next() {
		var item domain.VisitorFavoriteRecord
		var created time.Time
		if err := rows.Scan(&item.ID, &item.Type, &item.ItemID, &item.ExpoID, &item.Name, &item.Image, &created); err != nil {
			return nil, err
		}
		item.AddedAt = created.Format(time.RFC3339)
		items = append(items, item)
	}
	return items, rows.Err()
}

func (s *PostgresStore) AddVisitorFavorite(ctx context.Context, visitorID string, input domain.VisitorFavoriteInput) (domain.VisitorFavoriteRecord, error) {
	favoriteType := strings.ToLower(strings.TrimSpace(input.Type))
	itemID := strings.TrimSpace(input.ItemID)
	if visitorID == "" || itemID == "" || (favoriteType != "expo" && favoriteType != "exhibitor") {
		return domain.VisitorFavoriteRecord{}, ErrInvalidCredentials
	}
	name, image, expoID, err := s.resolveVisitorFavoriteTarget(ctx, favoriteType, itemID)
	if err != nil {
		return domain.VisitorFavoriteRecord{}, err
	}
	id := fmt.Sprintf("vf_%d", time.Now().UnixNano())
	var record domain.VisitorFavoriteRecord
	var created time.Time
	err = s.pool.QueryRow(ctx, `INSERT INTO visitor_favorites (id, visitor_id, type, item_id, name, image_url)
		VALUES ($1,$2,$3,$4,$5,$6)
		ON CONFLICT (visitor_id, type, item_id) DO UPDATE SET name=EXCLUDED.name, image_url=EXCLUDED.image_url
		RETURNING id, type, item_id, name, image_url, created_at`, id, visitorID, favoriteType, itemID, name, image).
		Scan(&record.ID, &record.Type, &record.ItemID, &record.Name, &record.Image, &created)
	if err != nil {
		return domain.VisitorFavoriteRecord{}, err
	}
	record.ExpoID = expoID
	record.AddedAt = created.Format(time.RFC3339)
	return record, nil
}

func (s *PostgresStore) DeleteVisitorFavorite(ctx context.Context, visitorID string, id string) error {
	tag, err := s.pool.Exec(ctx, `DELETE FROM visitor_favorites WHERE visitor_id=$1 AND id=$2`, visitorID, strings.TrimSpace(id))
	if err != nil {
		return err
	}
	if tag.RowsAffected() == 0 {
		return ErrNotFound
	}
	return nil
}

func (s *PostgresStore) resolveVisitorFavoriteTarget(ctx context.Context, favoriteType string, itemID string) (string, string, string, error) {
	if favoriteType == "expo" {
		var name, image string
		if err := s.pool.QueryRow(ctx, `SELECT name, COALESCE(cover_image_url,'') FROM expos WHERE id=$1`, itemID).Scan(&name, &image); err != nil {
			return "", "", "", err
		}
		return name, image, itemID, nil
	}
	var company, name, companyCipher, nameCipher, logo, expoID string
	err := s.pool.QueryRow(ctx, `SELECT COALESCE(u.company_name,''), COALESCE(u.name,''), COALESCE(u.company_name_cipher,''), COALESCE(u.name_cipher,''), COALESCE(ep.logo_url, u.avatar_url, ''), ee.expo_id
		FROM expo_exhibitors ee
		JOIN users u ON u.id=ee.exhibitor_id
		LEFT JOIN exhibitor_profiles ep ON ep.exhibitor_id=u.id
		WHERE ee.id=$1 OR ee.exhibitor_id=$1
		ORDER BY ee.created_at DESC
		LIMIT 1`, itemID).Scan(&company, &name, &companyCipher, &nameCipher, &logo, &expoID)
	if err != nil {
		return "", "", "", err
	}
	display := strings.TrimSpace(s.pii.Decrypt(companyCipher))
	if display == "" {
		display = strings.TrimSpace(company)
	}
	if display == "" {
		display = strings.TrimSpace(s.pii.Decrypt(nameCipher))
	}
	if display == "" {
		display = strings.TrimSpace(name)
	}
	if display == "" {
		return "", "", "", ErrNotFound
	}
	return display, logo, expoID, nil
}

func (s *PostgresStore) CreateVisitorBooking(ctx context.Context, expoID string, ticketType string, actor domain.User) (domain.VisitorBookingRecord, error) {
	expo, err := s.ExpoByID(ctx, expoID)
	if err != nil {
		return domain.VisitorBookingRecord{}, err
	}
	booking := visitorBookingFromExpo(expo, actor, ticketType, int(time.Now().UnixNano()))
	_ = s.RecordVisitorActivity(ctx, actor, expoID, "", "booked", "Booked remote access for "+expo.Name)
	return booking, nil
}

func (s *PostgresStore) VisitorBookings(ctx context.Context, visitorID string) ([]domain.VisitorBookingRecord, error) {
	return []domain.VisitorBookingRecord{}, nil
}

func (s *PostgresStore) CreateNotification(ctx context.Context, input domain.NotificationInput, actor domain.User) (domain.Notification, error) {
	scheduledAt := time.Now().UTC()
	if strings.TrimSpace(input.ScheduledAt) != "" {
		if parsed, err := time.Parse(time.RFC3339, input.ScheduledAt); err == nil {
			scheduledAt = parsed
		}
	}
	payload := input.Payload
	if payload == nil {
		payload = map[string]any{}
	}
	payloadJSON, _ := json.Marshal(payload)
	id := fmt.Sprintf("ntf_%d", time.Now().UnixNano())
	_, err := s.pool.Exec(ctx, `INSERT INTO notifications (id, user_id, expo_id, role, channel, template_key, payload, status, scheduled_at)
		VALUES ($1,NULLIF($2,''),NULLIF($3,''),$4,$5,$6,$7,'queued',$8)`,
		id, input.UserID, input.ExpoID, input.Role, defaultString(input.Channel, "in_app"), defaultString(input.TemplateKey, "general_notice"), payloadJSON, scheduledAt)
	if err != nil {
		return domain.Notification{}, err
	}
	items, err := s.ListNotifications(ctx, NotificationFilter{})
	if err != nil {
		return domain.Notification{}, err
	}
	for _, item := range items {
		if item.ID == id {
			return item, nil
		}
	}
	return domain.Notification{}, ErrNotFound
}

func (s *PostgresStore) ListNotifications(ctx context.Context, filter NotificationFilter) ([]domain.Notification, error) {
	sql := `SELECT n.id, COALESCE(n.user_id,''), COALESCE(NULLIF(u.company_name,''), u.name, ''), COALESCE(u.email,''), COALESCE(u.company_name_cipher,''), COALESCE(u.name_cipher,''), COALESCE(u.email_cipher,''), COALESCE(n.expo_id,''), n.role, n.channel, n.template_key, n.payload, n.status, n.scheduled_at, n.sent_at, n.read_at, n.dismissed_at, COALESCE(n.failure_reason,'')
		FROM notifications n LEFT JOIN users u ON u.id=n.user_id`
	args := []any{}
	conditions := []string{}
	if filter.UserID != "" {
		args = append(args, filter.UserID)
		conditions = append(conditions, fmt.Sprintf("n.user_id=$%d", len(args)))
		conditions = append(conditions, "n.dismissed_at IS NULL")
		conditions = append(conditions, "(n.status <> 'queued' OR n.scheduled_at <= NOW())")
	}
	if filter.Role != "" {
		args = append(args, filter.Role)
		conditions = append(conditions, fmt.Sprintf("n.role=$%d", len(args)))
	}
	if filter.ExpoID != "" {
		args = append(args, filter.ExpoID)
		conditions = append(conditions, fmt.Sprintf("n.expo_id=$%d", len(args)))
	}
	if len(conditions) > 0 {
		sql += " WHERE " + strings.Join(conditions, " AND ")
	}
	sql += " ORDER BY n.scheduled_at DESC LIMIT 250"
	rows, err := s.pool.Query(ctx, sql, args...)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	items := []domain.Notification{}
	for rows.Next() {
		var item domain.Notification
		var payload []byte
		var companyCipher, nameCipher, emailCipher string
		if err := rows.Scan(&item.ID, &item.UserID, &item.Recipient, &item.RecipientEmail, &companyCipher, &nameCipher, &emailCipher, &item.ExpoID, &item.Role, &item.Channel, &item.TemplateKey, &payload, &item.Status, &item.ScheduledAt, &item.SentAt, &item.ReadAt, &item.DismissedAt, &item.FailureReason); err != nil {
			return nil, err
		}
		_ = json.Unmarshal(payload, &item.Payload)
		s.hydrateNotificationRecipient(&item, companyCipher, nameCipher, emailCipher)
		items = append(items, item)
	}
	return items, rows.Err()
}

func (s *PostgresStore) DueNotifications(ctx context.Context, nowValue string) ([]domain.Notification, error) {
	now := time.Now().UTC()
	if parsed, err := time.Parse(time.RFC3339, nowValue); err == nil {
		now = parsed
	}
	sql := `SELECT n.id, COALESCE(n.user_id,''), COALESCE(NULLIF(u.company_name,''), u.name, ''), COALESCE(u.email,''), COALESCE(u.company_name_cipher,''), COALESCE(u.name_cipher,''), COALESCE(u.email_cipher,''), COALESCE(n.expo_id,''), n.role, n.channel, n.template_key, n.payload, n.status, n.scheduled_at, n.sent_at, n.read_at, n.dismissed_at, COALESCE(n.failure_reason,'')
		FROM notifications n LEFT JOIN users u ON u.id=n.user_id
		WHERE n.status='queued' AND n.scheduled_at <= $1
		ORDER BY n.scheduled_at ASC LIMIT 100`
	rows, err := s.pool.Query(ctx, sql, now)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	items := []domain.Notification{}
	for rows.Next() {
		var item domain.Notification
		var payload []byte
		var companyCipher, nameCipher, emailCipher string
		if err := rows.Scan(&item.ID, &item.UserID, &item.Recipient, &item.RecipientEmail, &companyCipher, &nameCipher, &emailCipher, &item.ExpoID, &item.Role, &item.Channel, &item.TemplateKey, &payload, &item.Status, &item.ScheduledAt, &item.SentAt, &item.ReadAt, &item.DismissedAt, &item.FailureReason); err != nil {
			return nil, err
		}
		_ = json.Unmarshal(payload, &item.Payload)
		s.hydrateNotificationRecipient(&item, companyCipher, nameCipher, emailCipher)
		items = append(items, item)
	}
	return items, rows.Err()
}

func (s *PostgresStore) hydrateNotificationRecipient(item *domain.Notification, companyCipher string, nameCipher string, emailCipher string) {
	if company := strings.TrimSpace(s.pii.Decrypt(companyCipher)); company != "" {
		item.Recipient = company
	} else if name := strings.TrimSpace(s.pii.Decrypt(nameCipher)); name != "" {
		item.Recipient = name
	} else if looksLikeProtectedPII(item.Recipient) {
		item.Recipient = firstNonEmptyString(notificationPayloadString(item.Payload, "recipient"), notificationPayloadString(item.Payload, "name"), "Recipient")
	}
	if email := strings.TrimSpace(s.pii.Decrypt(emailCipher)); email != "" {
		item.RecipientEmail = email
	} else if looksLikeProtectedPII(item.RecipientEmail) {
		item.RecipientEmail = firstNonEmptyString(notificationPayloadString(item.Payload, "to"), notificationPayloadString(item.Payload, "email"))
	}
	item.RecipientPhone = notificationPayloadString(item.Payload, "phone")
	if strings.TrimSpace(item.Recipient) == "" {
		item.Recipient = firstNonEmptyString(notificationPayloadString(item.Payload, "recipient"), notificationPayloadString(item.Payload, "name"), item.RecipientEmail, item.RecipientPhone)
	}
}

func (s *PostgresStore) UpdateNotificationDelivery(ctx context.Context, id string, status string, sentAt string, failureReason string) error {
	var parsedSentAt any
	if strings.TrimSpace(sentAt) != "" {
		if parsed, err := time.Parse(time.RFC3339, sentAt); err == nil {
			parsedSentAt = parsed
		}
	}
	_, err := s.pool.Exec(ctx, `UPDATE notifications SET status=$2, sent_at=$3, failure_reason=NULLIF($4,'') WHERE id=$1`, id, status, parsedSentAt, failureReason)
	return err
}

func (s *PostgresStore) MarkNotificationRead(ctx context.Context, id string, userID string) error {
	tag, err := s.pool.Exec(ctx, `UPDATE notifications SET read_at=COALESCE(read_at,NOW()) WHERE id=$1 AND user_id=$2 AND dismissed_at IS NULL`, id, userID)
	if err != nil {
		return err
	}
	if tag.RowsAffected() == 0 {
		return ErrNotFound
	}
	return nil
}

func (s *PostgresStore) MarkNotificationsRead(ctx context.Context, userID string) (int, error) {
	tag, err := s.pool.Exec(ctx, `UPDATE notifications SET read_at=COALESCE(read_at,NOW()) WHERE user_id=$1 AND dismissed_at IS NULL AND read_at IS NULL`, userID)
	if err != nil {
		return 0, err
	}
	return int(tag.RowsAffected()), nil
}

func (s *PostgresStore) DismissNotification(ctx context.Context, id string, userID string) error {
	tag, err := s.pool.Exec(ctx, `UPDATE notifications SET read_at=COALESCE(read_at,NOW()), dismissed_at=COALESCE(dismissed_at,NOW()) WHERE id=$1 AND user_id=$2`, id, userID)
	if err != nil {
		return err
	}
	if tag.RowsAffected() == 0 {
		return ErrNotFound
	}
	return nil
}

func (s *PostgresStore) RecordNotificationAttempt(ctx context.Context, attempt domain.NotificationAttempt) (domain.NotificationAttempt, error) {
	if attempt.ID == "" {
		attempt.ID = fmt.Sprintf("nta_%d", time.Now().UnixNano())
	}
	if attempt.CreatedAt.IsZero() {
		attempt.CreatedAt = time.Now().UTC()
	}
	requestPayload, _ := json.Marshal(attempt.RequestPayload)
	responsePayload, _ := json.Marshal(attempt.ResponsePayload)
	_, err := s.pool.Exec(ctx, `INSERT INTO notification_delivery_attempts (id, notification_id, channel, provider, status, request_payload, response_payload, failure_reason, created_at)
		VALUES ($1,$2,$3,$4,$5,$6,$7,NULLIF($8,''),$9)`,
		attempt.ID, attempt.NotificationID, attempt.Channel, attempt.Provider, attempt.Status, requestPayload, responsePayload, attempt.FailureReason, attempt.CreatedAt)
	return attempt, err
}

func (s *PostgresStore) ListNotificationAttempts(ctx context.Context, notificationID string) ([]domain.NotificationAttempt, error) {
	sql := `SELECT id, notification_id, channel, provider, status, request_payload, response_payload, COALESCE(failure_reason,''), created_at
		FROM notification_delivery_attempts`
	args := []any{}
	if strings.TrimSpace(notificationID) != "" {
		args = append(args, strings.TrimSpace(notificationID))
		sql += " WHERE notification_id=$1"
	}
	sql += " ORDER BY created_at DESC LIMIT 250"
	rows, err := s.pool.Query(ctx, sql, args...)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	items := []domain.NotificationAttempt{}
	for rows.Next() {
		var item domain.NotificationAttempt
		var requestPayload []byte
		var responsePayload []byte
		if err := rows.Scan(&item.ID, &item.NotificationID, &item.Channel, &item.Provider, &item.Status, &requestPayload, &responsePayload, &item.FailureReason, &item.CreatedAt); err != nil {
			return nil, err
		}
		_ = json.Unmarshal(requestPayload, &item.RequestPayload)
		_ = json.Unmarshal(responsePayload, &item.ResponsePayload)
		items = append(items, item)
	}
	return items, rows.Err()
}

func (s *PostgresStore) MarkDueNotificationsSent(ctx context.Context) (int, error) {
	tag, err := s.pool.Exec(ctx, `UPDATE notifications SET status='sent', sent_at=NOW() WHERE status='queued' AND scheduled_at <= NOW()`)
	return int(tag.RowsAffected()), err
}

func (s *PostgresStore) SponsorPlans(ctx context.Context, countryCode string) ([]domain.SponsorPlanRecord, error) {
	query := `SELECT id, name, description, COALESCE(country_code,''), tier, price_minor, currency_code, billing_cycle, features, organizer_commission_percent, status, created_at FROM sponsor_plans`
	args := []any{}
	if strings.TrimSpace(countryCode) != "" {
		args = append(args, strings.ToUpper(strings.TrimSpace(countryCode)))
		query += " WHERE country_code=$1"
	}
	query += " ORDER BY price_minor"
	rows, err := s.pool.Query(ctx, query, args...)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	items := []domain.SponsorPlanRecord{}
	for rows.Next() {
		var item domain.SponsorPlanRecord
		var features []byte
		var created time.Time
		if err := rows.Scan(&item.ID, &item.Name, &item.Description, &item.CountryCode, &item.Tier, &item.Price, &item.Currency, &item.BillingCycle, &features, &item.OrganizerCommissionPercent, &item.Status, &created); err != nil {
			return nil, err
		}
		_ = json.Unmarshal(features, &item.Features)
		item.CreatedAt = created.Format(time.RFC3339)
		items = append(items, item)
	}
	return items, rows.Err()
}

func (s *PostgresStore) SponsorPlanByID(ctx context.Context, id string) (domain.SponsorPlanRecord, error) {
	rows, err := s.pool.Query(ctx, `SELECT id, name, description, COALESCE(country_code,''), tier, price_minor, currency_code, billing_cycle, features, organizer_commission_percent, status, created_at FROM sponsor_plans WHERE id=$1`, id)
	if err != nil {
		return domain.SponsorPlanRecord{}, err
	}
	defer rows.Close()
	items := []domain.SponsorPlanRecord{}
	for rows.Next() {
		var item domain.SponsorPlanRecord
		var features []byte
		var created time.Time
		if err := rows.Scan(&item.ID, &item.Name, &item.Description, &item.CountryCode, &item.Tier, &item.Price, &item.Currency, &item.BillingCycle, &features, &item.OrganizerCommissionPercent, &item.Status, &created); err != nil {
			return domain.SponsorPlanRecord{}, err
		}
		_ = json.Unmarshal(features, &item.Features)
		item.CreatedAt = created.Format(time.RFC3339)
		items = append(items, item)
	}
	if len(items) == 0 {
		return domain.SponsorPlanRecord{}, ErrNotFound
	}
	return items[0], rows.Err()
}

func (s *PostgresStore) CreateSponsorPlan(ctx context.Context, input domain.SponsorPlanInput, actor domain.User) (domain.SponsorPlanRecord, error) {
	input = s.sponsorPlanInputWithCountryCurrency(ctx, input)
	if !isAdminRole(actor.Role) || !validSponsorPlanInput(input) {
		return domain.SponsorPlanRecord{}, ErrInvalidCredentials
	}
	id := fmt.Sprintf("spn_%d", time.Now().UnixNano())
	features, _ := json.Marshal(input.Features)
	_, err := s.pool.Exec(ctx, `INSERT INTO sponsor_plans (id, name, description, country_code, tier, price_minor, currency_code, billing_cycle, features, organizer_commission_percent, status)
		VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)`, id, strings.TrimSpace(input.Name), strings.TrimSpace(input.Description), defaultString(strings.ToUpper(strings.TrimSpace(input.CountryCode)), "KE"), strings.TrimSpace(input.Tier), input.Price, strings.ToUpper(strings.TrimSpace(input.Currency)), strings.TrimSpace(input.BillingCycle), features, input.OrganizerCommissionPercent, defaultString(input.Status, "active"))
	if err != nil {
		return domain.SponsorPlanRecord{}, err
	}
	return s.SponsorPlanByID(ctx, id)
}

func (s *PostgresStore) UpdateSponsorPlan(ctx context.Context, id string, input domain.SponsorPlanInput, actor domain.User) (domain.SponsorPlanRecord, error) {
	if !isAdminRole(actor.Role) || strings.TrimSpace(id) == "" {
		return domain.SponsorPlanRecord{}, ErrInvalidCredentials
	}
	current, err := s.SponsorPlanByID(ctx, id)
	if err != nil {
		return domain.SponsorPlanRecord{}, err
	}
	merged := current
	if strings.TrimSpace(input.Name) != "" {
		merged.Name = strings.TrimSpace(input.Name)
	}
	if strings.TrimSpace(input.Description) != "" {
		merged.Description = strings.TrimSpace(input.Description)
	}
	if strings.TrimSpace(input.CountryCode) != "" {
		merged.CountryCode = strings.ToUpper(strings.TrimSpace(input.CountryCode))
	}
	if strings.TrimSpace(input.Tier) != "" {
		merged.Tier = strings.TrimSpace(input.Tier)
	}
	if input.Price >= 0 {
		merged.Price = input.Price
	}
	if strings.TrimSpace(input.Currency) != "" {
		merged.Currency = strings.ToUpper(strings.TrimSpace(input.Currency))
	}
	merged.Currency = s.defaultCurrencyForCountry(ctx, merged.CountryCode, merged.Currency)
	if strings.TrimSpace(input.BillingCycle) != "" {
		merged.BillingCycle = strings.TrimSpace(input.BillingCycle)
	}
	if input.Features != nil {
		merged.Features = input.Features
	}
	if input.OrganizerCommissionPercent >= 0 {
		merged.OrganizerCommissionPercent = input.OrganizerCommissionPercent
	}
	if strings.TrimSpace(input.Status) != "" {
		merged.Status = strings.TrimSpace(input.Status)
	}
	if !validSponsorPlanRecord(merged) {
		return domain.SponsorPlanRecord{}, ErrInvalidCredentials
	}
	features, _ := json.Marshal(merged.Features)
	_, err = s.pool.Exec(ctx, `UPDATE sponsor_plans SET name=$2, description=$3, country_code=$4, tier=$5, price_minor=$6, currency_code=$7, billing_cycle=$8, features=$9, organizer_commission_percent=$10, status=$11 WHERE id=$1`,
		id, merged.Name, merged.Description, defaultString(strings.ToUpper(strings.TrimSpace(merged.CountryCode)), "KE"), merged.Tier, merged.Price, merged.Currency, merged.BillingCycle, features, merged.OrganizerCommissionPercent, merged.Status)
	if err != nil {
		return domain.SponsorPlanRecord{}, err
	}
	return s.SponsorPlanByID(ctx, id)
}

func (s *PostgresStore) UpdateSponsorPlanStatus(ctx context.Context, id string, status string, actor domain.User) (domain.SponsorPlanRecord, error) {
	status = strings.TrimSpace(status)
	if !isAdminRole(actor.Role) || strings.TrimSpace(id) == "" {
		return domain.SponsorPlanRecord{}, ErrInvalidCredentials
	}
	switch status {
	case "active", "inactive", "archived":
	default:
		return domain.SponsorPlanRecord{}, ErrInvalidCredentials
	}
	_, err := s.pool.Exec(ctx, `UPDATE sponsor_plans SET status=$2 WHERE id=$1`, strings.TrimSpace(id), status)
	if err != nil {
		return domain.SponsorPlanRecord{}, err
	}
	return s.SponsorPlanByID(ctx, id)
}

func (s *PostgresStore) sponsorPlanInputWithCountryCurrency(ctx context.Context, input domain.SponsorPlanInput) domain.SponsorPlanInput {
	input.CountryCode = defaultString(strings.ToUpper(strings.TrimSpace(input.CountryCode)), "KE")
	input.Currency = s.defaultCurrencyForCountry(ctx, input.CountryCode, input.Currency)
	return input
}

func (s *PostgresStore) defaultCurrencyForCountry(ctx context.Context, countryCode string, fallback string) string {
	countryCode = strings.ToUpper(strings.TrimSpace(countryCode))
	var currency string
	err := s.pool.QueryRow(ctx, `SELECT default_currency_code FROM countries WHERE code=$1 AND active=TRUE`, countryCode).Scan(&currency)
	if err == nil && strings.TrimSpace(currency) != "" {
		return strings.ToUpper(strings.TrimSpace(currency))
	}
	return defaultString(strings.ToUpper(strings.TrimSpace(fallback)), "KES")
}

func (s *PostgresStore) ListSponsorCampaigns(ctx context.Context, sponsorID string) ([]domain.SponsorCampaignRecord, error) {
	sql := sponsorCampaignSelectSQL()
	args := []any{}
	if sponsorID != "" {
		sql += " WHERE sc.sponsor_id=$1"
		args = append(args, sponsorID)
	}
	sql += " ORDER BY sc.created_at DESC"
	rows, err := s.pool.Query(ctx, sql, args...)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	return scanSponsorCampaigns(rows)
}

func (s *PostgresStore) SponsorCampaignByID(ctx context.Context, id string, sponsorID string) (domain.SponsorCampaignRecord, error) {
	sql := sponsorCampaignSelectSQL() + " WHERE sc.id=$1"
	args := []any{id}
	if sponsorID != "" {
		sql += " AND sc.sponsor_id=$2"
		args = append(args, sponsorID)
	}
	rows, err := s.pool.Query(ctx, sql, args...)
	if err != nil {
		return domain.SponsorCampaignRecord{}, err
	}
	defer rows.Close()
	items, err := scanSponsorCampaigns(rows)
	if err != nil {
		return domain.SponsorCampaignRecord{}, err
	}
	if len(items) == 0 {
		return domain.SponsorCampaignRecord{}, ErrNotFound
	}
	return items[0], nil
}

func (s *PostgresStore) CreateSponsorCampaign(ctx context.Context, input domain.SponsorCampaignInput, actor domain.User) (domain.SponsorCampaignRecord, error) {
	if actor.Role != domain.RoleSponsor || strings.TrimSpace(input.Name) == "" {
		return domain.SponsorCampaignRecord{}, ErrInvalidCredentials
	}
	start, _ := time.Parse("2006-01-02", input.StartDate)
	end, _ := time.Parse("2006-01-02", input.EndDate)
	if start.IsZero() {
		start = time.Now().UTC()
	}
	if end.IsZero() {
		end = start.AddDate(0, 1, 0)
	}
	id := fmt.Sprintf("sc_%d", time.Now().UnixNano())
	_, err := s.pool.Exec(ctx, `INSERT INTO sponsor_campaigns (id, sponsor_id, name, objective, budget_minor, status, starts_at, ends_at)
		VALUES ($1,$2,$3,$4,$5,$6,$7,$8)`, id, actor.ID, strings.TrimSpace(input.Name), strings.TrimSpace(input.Objective), input.Budget, defaultString(input.Status, "draft"), start, end)
	if err != nil {
		return domain.SponsorCampaignRecord{}, err
	}
	return s.SponsorCampaignByID(ctx, id, actor.ID)
}

func (s *PostgresStore) ListSponsorAds(ctx context.Context, filter SponsorAdFilter) ([]domain.SponsorAdRecord, error) {
	if err := s.expireEndedSponsorAds(ctx); err != nil {
		return nil, err
	}
	sql := sponsorAdSelectSQL()
	args := []any{}
	conditions := []string{}
	if filter.SponsorID != "" {
		args = append(args, filter.SponsorID)
		conditions = append(conditions, fmt.Sprintf("sa.sponsor_id=$%d", len(args)))
	}
	if filter.Status != "" {
		args = append(args, filter.Status)
		conditions = append(conditions, fmt.Sprintf("sa.status=$%d", len(args)))
	}
	if filter.CountryCode != "" {
		args = append(args, strings.ToUpper(strings.TrimSpace(filter.CountryCode)))
		conditions = append(conditions, fmt.Sprintf("u.country_code=$%d", len(args)))
	}
	if filter.ExpoID != "" {
		args = append(args, strings.TrimSpace(filter.ExpoID))
		conditions = append(conditions, fmt.Sprintf("sa.expo_id=$%d", len(args)))
	}
	if len(conditions) > 0 {
		sql += " WHERE " + strings.Join(conditions, " AND ")
	}
	sql += " ORDER BY sa.created_at DESC"
	rows, err := s.pool.Query(ctx, sql, args...)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	return s.scanSponsorAds(rows)
}

func (s *PostgresStore) SponsorAdByID(ctx context.Context, id string, sponsorID string) (domain.SponsorAdRecord, error) {
	if err := s.expireEndedSponsorAds(ctx); err != nil {
		return domain.SponsorAdRecord{}, err
	}
	sql := sponsorAdSelectSQL() + " WHERE sa.id=$1"
	args := []any{id}
	if sponsorID != "" {
		sql += " AND sa.sponsor_id=$2"
		args = append(args, sponsorID)
	}
	rows, err := s.pool.Query(ctx, sql, args...)
	if err != nil {
		return domain.SponsorAdRecord{}, err
	}
	defer rows.Close()
	items, err := s.scanSponsorAds(rows)
	if err != nil {
		return domain.SponsorAdRecord{}, err
	}
	if len(items) == 0 {
		return domain.SponsorAdRecord{}, ErrNotFound
	}
	return items[0], nil
}

func (s *PostgresStore) CreateSponsorAd(ctx context.Context, input domain.SponsorAdInput, actor domain.User) (domain.SponsorAdRecord, error) {
	if (actor.Role != domain.RoleSponsor && actor.Role != domain.RoleExhibitor) || strings.TrimSpace(input.Name) == "" {
		return domain.SponsorAdRecord{}, ErrInvalidCredentials
	}
	if strings.TrimSpace(input.ExpoID) != "" {
		activeAllowed, err := s.expoStillAcceptsAds(ctx, input.ExpoID)
		if err != nil {
			return domain.SponsorAdRecord{}, err
		}
		if !activeAllowed {
			return domain.SponsorAdRecord{}, ErrInvalidCredentials
		}
	}
	campaignID := strings.TrimSpace(input.CampaignID)
	if actor.Role == domain.RoleExhibitor {
		if strings.TrimSpace(input.ExpoID) == "" {
			return domain.SponsorAdRecord{}, ErrInvalidCredentials
		}
		existing, err := s.ListSponsorAds(ctx, SponsorAdFilter{SponsorID: actor.ID, ExpoID: strings.TrimSpace(input.ExpoID)})
		if err != nil {
			return domain.SponsorAdRecord{}, err
		}
		if len(existing) > 0 {
			return domain.SponsorAdRecord{}, ErrInvalidCredentials
		}
		if _, err := s.exhibitorBoothForProduct(ctx, actor.ID, input.ExpoID); err != nil {
			return domain.SponsorAdRecord{}, err
		}
		campaignID = ""
	}
	id := fmt.Sprintf("sa_%d", time.Now().UnixNano())
	status := defaultString(input.Status, "draft")
	paymentStatus := "unpaid"
	if actor.Role == domain.RoleExhibitor {
		status = "active"
		paymentStatus = "paid"
	}
	_, err := s.pool.Exec(ctx, `INSERT INTO sponsor_ads (id, expo_id, campaign_id, sponsor_id, name, placement, dimensions, media_url, media_type, budget_minor, status, payment_status)
		VALUES ($1,NULLIF($2,''),NULLIF($3,''),$4,$5,$6,$7,$8,$9,$10,$11,$12)`,
		id, strings.TrimSpace(input.ExpoID), campaignID, actor.ID, strings.TrimSpace(input.Name), defaultString(input.Placement, "banner"), defaultString(input.Dimensions, "728x90"), strings.TrimSpace(input.MediaURL), defaultString(input.MediaType, "image"), input.Budget, status, paymentStatus)
	if err != nil {
		return domain.SponsorAdRecord{}, err
	}
	return s.SponsorAdByID(ctx, id, actor.ID)
}

func (s *PostgresStore) UpdateSponsorAd(ctx context.Context, id string, input domain.SponsorAdInput, actor domain.User) (domain.SponsorAdRecord, error) {
	if (actor.Role != domain.RoleSponsor && actor.Role != domain.RoleExhibitor) || strings.TrimSpace(input.Name) == "" {
		return domain.SponsorAdRecord{}, ErrInvalidCredentials
	}
	existing, err := s.SponsorAdByID(ctx, id, actor.ID)
	if err != nil {
		return domain.SponsorAdRecord{}, err
	}
	expoID := strings.TrimSpace(input.ExpoID)
	if actor.Role == domain.RoleExhibitor {
		if expoID == "" || existing.ExpoID != expoID {
			return domain.SponsorAdRecord{}, ErrInvalidCredentials
		}
		if activeAllowed, err := s.expoStillAcceptsAds(ctx, expoID); err != nil {
			return domain.SponsorAdRecord{}, err
		} else if !activeAllowed {
			return domain.SponsorAdRecord{}, ErrInvalidCredentials
		}
		if _, err := s.exhibitorBoothForProduct(ctx, actor.ID, expoID); err != nil {
			return domain.SponsorAdRecord{}, err
		}
	}
	status := existing.Status
	if actor.Role == domain.RoleExhibitor {
		status = "pending_payment"
	}
	tag, err := s.pool.Exec(ctx, `UPDATE sponsor_ads
		SET name=$2, placement=$3, dimensions=$4, media_url=$5, media_type=$6, budget_minor=$7, status=$8
		WHERE id=$1 AND sponsor_id=$9`,
		id, strings.TrimSpace(input.Name), defaultString(input.Placement, "banner"), defaultString(input.Dimensions, "728x90"), strings.TrimSpace(input.MediaURL), defaultString(input.MediaType, "image"), input.Budget, status, actor.ID)
	if err != nil {
		return domain.SponsorAdRecord{}, err
	}
	if tag.RowsAffected() == 0 {
		return domain.SponsorAdRecord{}, ErrNotFound
	}
	return s.SponsorAdByID(ctx, id, actor.ID)
}

func (s *PostgresStore) UpdateSponsorAdStatus(ctx context.Context, id string, status string, actor domain.User) (domain.SponsorAdRecord, error) {
	if !isAdminRole(actor.Role) || !validAdStatus(status) {
		return domain.SponsorAdRecord{}, ErrInvalidCredentials
	}
	status = strings.TrimSpace(status)
	if status == "active" {
		activeAllowed, err := s.sponsorAdExpoStillActive(ctx, id)
		if err != nil {
			return domain.SponsorAdRecord{}, err
		}
		if !activeAllowed {
			return domain.SponsorAdRecord{}, ErrInvalidCredentials
		}
	}
	tag, err := s.pool.Exec(ctx, `UPDATE sponsor_ads SET status=$2 WHERE id=$1`, id, strings.TrimSpace(status))
	if err != nil {
		return domain.SponsorAdRecord{}, err
	}
	if tag.RowsAffected() == 0 {
		return domain.SponsorAdRecord{}, ErrNotFound
	}
	return s.SponsorAdByID(ctx, id, "")
}

func (s *PostgresStore) CreateSponsorAdPayment(ctx context.Context, adID string, actor domain.User) (domain.SponsorPaymentRecord, error) {
	if actor.Role != domain.RoleSponsor {
		return domain.SponsorPaymentRecord{}, ErrInvalidCredentials
	}
	ad, err := s.SponsorAdByID(ctx, adID, actor.ID)
	if err != nil {
		return domain.SponsorPaymentRecord{}, err
	}
	sponsorID := actor.ID
	if isAdminRole(actor.Role) {
		sponsorID = ""
	}
	payments, err := s.ListSponsorPayments(ctx, sponsorID)
	if err == nil {
		for _, payment := range payments {
			if payment.AdID == ad.ID && payment.Status == "pending" {
				return payment, nil
			}
		}
	}
	var expoID string
	countryCode := defaultString(ad.CountryCode, defaultString(actor.CountryCode, "KE"))
	if err := s.pool.QueryRow(ctx, `SELECT id FROM expos WHERE country_code=$1 ORDER BY created_at DESC LIMIT 1`, countryCode).Scan(&expoID); err != nil {
		return domain.SponsorPaymentRecord{}, ErrNotFound
	}
	now := time.Now().UTC()
	id := fmt.Sprintf("spay_%d", now.UnixNano())
	reference := fmt.Sprintf("SP-PAY-%d", now.UnixNano())
	idempotency := "sponsor_ad_" + ad.ID
	_, err = s.pool.Exec(ctx, `INSERT INTO payments (id, expo_id, payer_id, payer_role, purpose, country_code, currency_code, amount_minor, provider, provider_reference, idempotency_key, status, created_at)
		VALUES ($1,$2,$3,$4,'sponsor_placement',$5,'KES',$6,'paystack',$7,$8,'pending',$9)
		ON CONFLICT (idempotency_key) DO NOTHING`,
		id, expoID, actor.ID, actor.Role, countryCode, maxInt64(ad.Budget, 1), reference, idempotency, now)
	if err != nil {
		return domain.SponsorPaymentRecord{}, err
	}
	items, err := s.ListSponsorPayments(ctx, actor.ID)
	if err != nil {
		return domain.SponsorPaymentRecord{}, err
	}
	for _, payment := range items {
		if payment.AdID == ad.ID && payment.Status == "pending" {
			return payment, nil
		}
	}
	return domain.SponsorPaymentRecord{}, ErrNotFound
}

func (s *PostgresStore) ConfirmSponsorAdPayment(ctx context.Context, paymentID string, actor domain.User) (domain.SponsorPaymentRecord, domain.SponsorAdRecord, error) {
	if actor.Role != domain.RoleSponsor && !isAdminRole(actor.Role) {
		return domain.SponsorPaymentRecord{}, domain.SponsorAdRecord{}, ErrInvalidCredentials
	}
	sponsorID := actor.ID
	if isAdminRole(actor.Role) {
		sponsorID = ""
	}
	payments, err := s.ListSponsorPayments(ctx, sponsorID)
	if err != nil {
		return domain.SponsorPaymentRecord{}, domain.SponsorAdRecord{}, err
	}
	var payment domain.SponsorPaymentRecord
	for _, item := range payments {
		if item.ID == paymentID {
			payment = item
			break
		}
	}
	if payment.ID == "" {
		return domain.SponsorPaymentRecord{}, domain.SponsorAdRecord{}, ErrNotFound
	}
	ad, err := s.SponsorAdByID(ctx, payment.AdID, "")
	if err != nil {
		return domain.SponsorPaymentRecord{}, domain.SponsorAdRecord{}, err
	}
	if actor.Role == domain.RoleSponsor && ad.SponsorID != actor.ID {
		return domain.SponsorPaymentRecord{}, domain.SponsorAdRecord{}, ErrInvalidCredentials
	}
	tx, err := s.pool.Begin(ctx)
	if err != nil {
		return domain.SponsorPaymentRecord{}, domain.SponsorAdRecord{}, err
	}
	defer tx.Rollback(ctx)
	if _, err := tx.Exec(ctx, `UPDATE payments SET status='paid', paid_at=NOW() WHERE id=$1`, payment.ID); err != nil {
		return domain.SponsorPaymentRecord{}, domain.SponsorAdRecord{}, err
	}
	nextStatus := ad.Status
	if nextStatus == "pending_payment" {
		nextStatus = "draft"
	}
	if _, err := tx.Exec(ctx, `UPDATE sponsor_ads SET payment_status='paid', status=$2 WHERE id=$1`, ad.ID, nextStatus); err != nil {
		return domain.SponsorPaymentRecord{}, domain.SponsorAdRecord{}, err
	}
	if err := tx.Commit(ctx); err != nil {
		return domain.SponsorPaymentRecord{}, domain.SponsorAdRecord{}, err
	}
	updatedPayment, updatedAd, err := s.sponsorPaymentAndAd(ctx, payment.ID, sponsorID)
	return updatedPayment, updatedAd, err
}

func (s *PostgresStore) TrackSponsorAdEvent(ctx context.Context, adID string, event string) (domain.SponsorAdRecord, error) {
	if err := s.expireEndedSponsorAds(ctx); err != nil {
		return domain.SponsorAdRecord{}, err
	}
	event = strings.TrimSpace(strings.ToLower(event))
	if event != "impression" && event != "click" {
		return domain.SponsorAdRecord{}, ErrInvalidCredentials
	}
	column := "impressions"
	if event == "click" {
		column = "clicks"
	}
	tag, err := s.pool.Exec(ctx, fmt.Sprintf(`UPDATE sponsor_ads SET %s=%s+1 WHERE id=$1 AND status='active' AND (expo_id IS NULL OR EXISTS (SELECT 1 FROM expos e WHERE e.id=sponsor_ads.expo_id AND e.ends_at::date >= CURRENT_DATE))`, column, column), adID)
	if err != nil {
		return domain.SponsorAdRecord{}, err
	}
	if tag.RowsAffected() == 0 {
		return domain.SponsorAdRecord{}, ErrNotFound
	}
	return s.SponsorAdByID(ctx, adID, "")
}

func (s *PostgresStore) expireEndedSponsorAds(ctx context.Context) error {
	_, err := s.pool.Exec(ctx, `
		UPDATE sponsor_ads sa
		SET status='paused'
		WHERE sa.status='active'
		  AND sa.expo_id IS NOT NULL
		  AND EXISTS (
		    SELECT 1
		    FROM expos e
		    WHERE e.id=sa.expo_id
		      AND e.ends_at::date < CURRENT_DATE
		  )`)
	return err
}

func (s *PostgresStore) sponsorAdExpoStillActive(ctx context.Context, adID string) (bool, error) {
	var ended bool
	err := s.pool.QueryRow(ctx, `
		SELECT EXISTS (
		  SELECT 1
		  FROM sponsor_ads sa
		  JOIN expos e ON e.id=sa.expo_id
		  WHERE sa.id=$1
		    AND e.ends_at::date < CURRENT_DATE
		)`, adID).Scan(&ended)
	if err != nil {
		return false, err
	}
	return !ended, nil
}

func (s *PostgresStore) expoStillAcceptsAds(ctx context.Context, expoID string) (bool, error) {
	var active bool
	err := s.pool.QueryRow(ctx, `SELECT EXISTS (SELECT 1 FROM expos WHERE id=$1 AND ends_at::date >= CURRENT_DATE)`, strings.TrimSpace(expoID)).Scan(&active)
	return active, err
}

func (s *PostgresStore) SettlementStatus(ctx context.Context, id string) (string, error) {
	expoID := strings.TrimPrefix(strings.TrimSpace(id), "set_")
	if expoID == "" {
		return "pending_review", nil
	}
	var status string
	err := s.pool.QueryRow(ctx, `SELECT COALESCE(MAX(status),'pending_review') FROM commissions WHERE expo_id=$1`, expoID).Scan(&status)
	if err != nil || strings.TrimSpace(status) == "" {
		return "pending_review", nil
	}
	return status, nil
}

func (s *PostgresStore) UpdateSettlementStatus(ctx context.Context, id string, status string, actor domain.User) (string, error) {
	if !isAdminRole(actor.Role) || !validSettlementStatus(status) {
		return "", ErrInvalidCredentials
	}
	expoID := strings.TrimPrefix(strings.TrimSpace(id), "set_")
	if expoID == "" {
		return "", ErrInvalidCredentials
	}
	persistedStatus := strings.TrimSpace(status)
	if persistedStatus == "rejected" {
		persistedStatus = "held"
	}
	tag, err := s.pool.Exec(ctx, `UPDATE commissions SET status=$2 WHERE expo_id=$1`, expoID, persistedStatus)
	if err != nil {
		return "", err
	}
	if tag.RowsAffected() == 0 {
		return "", ErrNotFound
	}
	return status, nil
}

func (s *PostgresStore) ListSponsorPayments(ctx context.Context, sponsorID string) ([]domain.SponsorPaymentRecord, error) {
	sql := `SELECT p.id, COALESCE(p.provider_reference,p.id), COALESCE(sa.id,''), COALESCE(sa.name,'Sponsor placement'), p.amount_minor, p.currency_code, p.provider, p.status, p.paid_at
		FROM payments p LEFT JOIN sponsor_ads sa ON p.idempotency_key='sponsor_ad_' || sa.id
		WHERE p.purpose='sponsor_placement'`
	args := []any{}
	if strings.TrimSpace(sponsorID) != "" {
		args = append(args, sponsorID)
		sql += fmt.Sprintf(" AND p.payer_id=$%d", len(args))
	}
	sql += " ORDER BY p.created_at DESC"
	rows, err := s.pool.Query(ctx, sql, args...)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	items := []domain.SponsorPaymentRecord{}
	for rows.Next() {
		var item domain.SponsorPaymentRecord
		var paidAt *time.Time
		if err := rows.Scan(&item.ID, &item.Reference, &item.AdID, &item.AdName, &item.Amount, &item.Currency, &item.PaymentMethod, &item.Status, &paidAt); err != nil {
			return nil, err
		}
		if paidAt != nil {
			item.PaidAt = paidAt.Format(time.RFC3339)
		}
		items = append(items, item)
	}
	return items, rows.Err()
}

func (s *PostgresStore) sponsorPaymentAndAd(ctx context.Context, paymentID string, sponsorID string) (domain.SponsorPaymentRecord, domain.SponsorAdRecord, error) {
	payments, err := s.ListSponsorPayments(ctx, sponsorID)
	if err != nil {
		return domain.SponsorPaymentRecord{}, domain.SponsorAdRecord{}, err
	}
	for _, payment := range payments {
		if payment.ID == paymentID {
			ad, err := s.SponsorAdByID(ctx, payment.AdID, sponsorID)
			return payment, ad, err
		}
	}
	return domain.SponsorPaymentRecord{}, domain.SponsorAdRecord{}, ErrNotFound
}

func (s *PostgresStore) RecordAudit(ctx context.Context, log domain.AuditLog) (domain.AuditLog, error) {
	if log.ID == "" {
		log.ID = fmt.Sprintf("aud_%d", time.Now().UnixNano())
	}
	if log.CreatedAt.IsZero() {
		log.CreatedAt = time.Now().UTC()
	}
	metadata, _ := json.Marshal(log.Metadata)
	_, err := s.pool.Exec(ctx, `INSERT INTO audit_logs (id, actor_id, actor, actor_role, expo_id, action, entity_type, entity_id, ip_address, metadata, created_at)
		VALUES ($1,$2,$3,$4,NULLIF($5,''),$6,$7,$8,NULLIF($9,'')::inet,$10,$11)`,
		log.ID, nullEmpty(log.ActorID), log.Actor, string(log.ActorRole), log.ExpoID, log.Action, log.EntityType, log.EntityID, log.IPAddress, metadata, log.CreatedAt)
	return log, err
}

func (s *PostgresStore) AuditLogs(ctx context.Context) ([]domain.AuditLog, error) {
	rows, err := s.pool.Query(ctx, `SELECT id, COALESCE(actor_id,''), COALESCE(actor,''), COALESCE(actor_role,''), COALESCE(expo_id,''), action, entity_type, entity_id, COALESCE(ip_address::TEXT,''), metadata, created_at FROM audit_logs ORDER BY created_at DESC LIMIT 200`)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	items := []domain.AuditLog{}
	for rows.Next() {
		var item domain.AuditLog
		var metadata []byte
		if err := rows.Scan(&item.ID, &item.ActorID, &item.Actor, &item.ActorRole, &item.ExpoID, &item.Action, &item.EntityType, &item.EntityID, &item.IPAddress, &metadata, &item.CreatedAt); err != nil {
			return nil, err
		}
		_ = json.Unmarshal(metadata, &item.Metadata)
		items = append(items, item)
	}
	if err := rows.Err(); err != nil {
		return nil, err
	}
	for index, item := range items {
		if strings.TrimSpace(item.ActorID) == "" {
			continue
		}
		user, err := s.UserByID(ctx, item.ActorID)
		if err != nil {
			if looksLikeProtectedPII(item.Actor) {
				items[index].Actor = "User"
			}
			continue
		}
		items[index].Actor = displayNameForUser(user, "User")
	}
	return items, nil
}

func (s *PostgresStore) RecordAppLog(ctx context.Context, log domain.AppLog) (domain.AppLog, error) {
	if log.ID == "" {
		log.ID = fmt.Sprintf("app_%d", time.Now().UnixNano())
	}
	if log.CreatedAt.IsZero() {
		log.CreatedAt = time.Now().UTC()
	}
	metadata, _ := json.Marshal(log.Metadata)
	_, err := s.pool.Exec(ctx, `INSERT INTO app_logs (id, level, message, request_id, method, path, status, latency_ms, user_id, metadata, created_at)
		VALUES ($1,$2,$3,$4,$5,$6,$7,$8,NULLIF($9,''),$10,$11)`,
		log.ID, log.Level, log.Message, log.RequestID, log.Method, log.Path, log.Status, log.LatencyMs, log.UserID, metadata, log.CreatedAt)
	return log, err
}

func (s *PostgresStore) AppLogs(ctx context.Context) ([]domain.AppLog, error) {
	rows, err := s.pool.Query(ctx, `SELECT id, level, message, COALESCE(request_id,''), COALESCE(method,''), COALESCE(path,''), COALESCE(status,0), COALESCE(latency_ms,0), COALESCE(user_id,''), metadata, created_at FROM app_logs ORDER BY created_at DESC LIMIT 200`)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	items := []domain.AppLog{}
	for rows.Next() {
		var item domain.AppLog
		var metadata []byte
		if err := rows.Scan(&item.ID, &item.Level, &item.Message, &item.RequestID, &item.Method, &item.Path, &item.Status, &item.LatencyMs, &item.UserID, &metadata, &item.CreatedAt); err != nil {
			return nil, err
		}
		_ = json.Unmarshal(metadata, &item.Metadata)
		items = append(items, item)
	}
	return items, rows.Err()
}

func expoSelectSQL() string {
	return `SELECT e.id, e.name, e.description, e.organizer_id, COALESCE(NULLIF(u.company_name,''), u.name) organizer_name,
		COALESCE(u.company_name_cipher,''), COALESCE(u.name_cipher,''),
		e.country_code, e.city, e.venue, e.currency_code, e.timezone, COALESCE(e.cover_image_url,''), e.exhibitor_activation_fee_minor,
		COALESCE(e.ads_addon_fee_minor,0), e.organizer_commission_bps, e.status, e.starts_at, e.ends_at, e.created_at, e.updated_at,
		COALESCE(COUNT(DISTINCT ee.id),0),
		COALESCE(json_agg(DISTINCT jsonb_build_object('id', c.id, 'name', c.name, 'slug', c.slug, 'icon', COALESCE(c.icon,''), 'active', c.active)) FILTER (WHERE c.id IS NOT NULL), '[]')
		FROM expos e
		JOIN users u ON u.id=e.organizer_id
		LEFT JOIN expo_exhibitors ee ON ee.expo_id=e.id
		LEFT JOIN expo_categories ec ON ec.expo_id=e.id
		LEFT JOIN categories c ON c.id=ec.category_id`
}

func expoGroupBySQL() string {
	return ` GROUP BY e.id, u.company_name, u.name, u.company_name_cipher, u.name_cipher`
}

func (s *PostgresStore) scanExpos(rows pgx.Rows) ([]domain.Expo, error) {
	expos := []domain.Expo{}
	for rows.Next() {
		var expo domain.Expo
		var categoriesJSON []byte
		var companyCipher string
		var nameCipher string
		if err := rows.Scan(&expo.ID, &expo.Name, &expo.Description, &expo.OrganizerID, &expo.OrganizerName, &companyCipher, &nameCipher, &expo.CountryCode, &expo.City, &expo.Venue, &expo.CurrencyCode, &expo.Timezone, &expo.CoverImageURL, &expo.ExhibitorActivationFeeMinor, &expo.AdsAddonFeeMinor, &expo.OrganizerCommissionBps, &expo.Status, &expo.StartDate, &expo.EndDate, &expo.CreatedAt, &expo.UpdatedAt, &expo.ExhibitorCount, &categoriesJSON); err != nil {
			return nil, err
		}
		if company := strings.TrimSpace(s.pii.Decrypt(companyCipher)); company != "" {
			expo.OrganizerName = company
		} else if name := strings.TrimSpace(s.pii.Decrypt(nameCipher)); name != "" {
			expo.OrganizerName = name
		} else if looksLikeProtectedPII(expo.OrganizerName) {
			expo.OrganizerName = "Organizer"
		}
		_ = json.Unmarshal(categoriesJSON, &expo.Categories)
		expos = append(expos, expo)
	}
	return expos, rows.Err()
}

func paymentSelectSQL() string {
	return `SELECT p.id, p.expo_id, e.name, p.payer_id, COALESCE(NULLIF(u.company_name,''), u.name), u.email,
		COALESCE(u.company_name_cipher,''), COALESCE(u.name_cipher,''), COALESCE(u.email_cipher,''),
		p.payer_role, p.purpose, p.country_code, p.currency_code, p.amount_minor, COALESCE(p.processing_fee_minor,0), p.provider,
		COALESCE(p.provider_reference,''), p.status, p.idempotency_key, p.created_at, p.paid_at
		FROM payments p
		JOIN expos e ON e.id=p.expo_id
		JOIN users u ON u.id=p.payer_id`
}

func (s *PostgresStore) scanPayments(rows pgx.Rows) ([]domain.Payment, error) {
	items := []domain.Payment{}
	for rows.Next() {
		var item domain.Payment
		var companyCipher string
		var nameCipher string
		var emailCipher string
		if err := rows.Scan(&item.ID, &item.ExpoID, &item.ExpoName, &item.PayerID, &item.PayerName, &item.PayerEmail, &companyCipher, &nameCipher, &emailCipher, &item.PayerRole, &item.Purpose, &item.CountryCode, &item.CurrencyCode, &item.AmountMinor, &item.ProcessingFeeMinor, &item.Provider, &item.ProviderRef, &item.Status, &item.IdempotencyKey, &item.CreatedAt, &item.PaidAt); err != nil {
			return nil, err
		}
		if company := strings.TrimSpace(s.pii.Decrypt(companyCipher)); company != "" {
			item.PayerName = company
		} else if name := strings.TrimSpace(s.pii.Decrypt(nameCipher)); name != "" {
			item.PayerName = name
		} else if looksLikeProtectedPII(item.PayerName) {
			item.PayerName = "Customer"
		}
		if email := strings.TrimSpace(s.pii.Decrypt(emailCipher)); email != "" {
			item.PayerEmail = email
		} else if looksLikeProtectedPII(item.PayerEmail) {
			item.PayerEmail = ""
		}
		items = append(items, item)
	}
	return items, rows.Err()
}

func expoExhibitorSelectSQL() string {
	return `SELECT ee.id, ee.expo_id, e.name, e.description, ee.exhibitor_id, COALESCE(NULLIF(u.company_name,''), u.name),
		u.email, COALESCE(u.company_name_cipher,''), COALESCE(u.name_cipher,''), COALESCE(u.email_cipher,''),
		COALESCE(ee.booth_number,''), COALESCE(ee.booth_label,'Digital Workspace'), COALESCE(ee.booth_label,'Digital Workspace'), ee.activation_status, e.currency_code, e.exhibitor_activation_fee_minor,
		COALESCE(ee.estimated_spend_minor,0), COALESCE(NULLIF(ee.roi_currency_code,''), e.currency_code), COALESCE(ee.roi_spend_breakdown,'{}'::jsonb), COALESCE(ee.roi_notes,''),
		CONCAT(e.venue, ', ', e.city), e.starts_at, e.ends_at, ee.activated_at, ee.created_at
		FROM expo_exhibitors ee
		JOIN expos e ON e.id=ee.expo_id
		JOIN users u ON u.id=ee.exhibitor_id`
}

func (s *PostgresStore) scanExpoExhibitors(rows pgx.Rows) ([]domain.ExpoExhibitor, error) {
	items := []domain.ExpoExhibitor{}
	for rows.Next() {
		var item domain.ExpoExhibitor
		var companyCipher string
		var nameCipher string
		var emailCipher string
		var roiBreakdown []byte
		if err := rows.Scan(&item.ID, &item.ExpoID, &item.ExpoName, &item.ExpoDescription, &item.ExhibitorID, &item.ExhibitorName, &item.ExhibitorEmail, &companyCipher, &nameCipher, &emailCipher, &item.BoothNumber, &item.BoothLabel, &item.BoothSize, &item.ActivationStatus, &item.CurrencyCode, &item.AmountMinor, &item.EstimatedSpendMinor, &item.ROICurrencyCode, &roiBreakdown, &item.ROINotes, &item.Location, &item.StartDate, &item.EndDate, &item.ActivatedAt, &item.CreatedAt); err != nil {
			return nil, err
		}
		_ = json.Unmarshal(roiBreakdown, &item.ROISpendBreakdown)
		if company := strings.TrimSpace(s.pii.Decrypt(companyCipher)); company != "" {
			item.ExhibitorName = company
		} else if name := strings.TrimSpace(s.pii.Decrypt(nameCipher)); name != "" {
			item.ExhibitorName = name
		} else if looksLikeProtectedPII(item.ExhibitorName) {
			item.ExhibitorName = "Exhibitor"
		}
		if email := strings.TrimSpace(s.pii.Decrypt(emailCipher)); email != "" {
			item.ExhibitorEmail = email
		} else if looksLikeProtectedPII(item.ExhibitorEmail) {
			item.ExhibitorEmail = ""
		}
		items = append(items, item)
	}
	return items, rows.Err()
}

func scanProducts(rows pgx.Rows) ([]domain.ProductRecord, error) {
	items := []domain.ProductRecord{}
	for rows.Next() {
		var item domain.ProductRecord
		var storageStatus string
		var created time.Time
		var imageURLs []byte
		if err := rows.Scan(&item.ID, &item.ExhibitorID, &item.ExpoID, &item.Name, &item.Description, &item.Price, &item.DiscountedPrice, &item.Currency, &item.MediaType, &item.MediaURL, &imageURLs, &item.DemoVideoURL, &item.PresentationURL, &item.Specifications, &item.Category, &storageStatus, &item.Featured, &created); err != nil {
			return nil, err
		}
		item.Status = publicProductStatus(storageStatus)
		item.CreatedAt = created.Format(time.RFC3339)
		_ = json.Unmarshal(imageURLs, &item.Images)
		if len(item.Images) == 0 && item.MediaURL != "" && item.MediaType == "image" {
			item.Images = []string{item.MediaURL}
		}
		items = append(items, item)
	}
	return items, rows.Err()
}

func (s *PostgresStore) exhibitorBoothForProduct(ctx context.Context, exhibitorID string, expoID string) (domain.ExpoExhibitor, error) {
	filter := ExpoExhibitorFilter{ExhibitorID: exhibitorID}
	if expoID != "" {
		filter.ExpoID = expoID
	}
	booths, err := s.ListExpoExhibitors(ctx, filter)
	if err != nil {
		return domain.ExpoExhibitor{}, err
	}
	for _, booth := range booths {
		if booth.ActivationStatus == "active" {
			return booth, nil
		}
	}
	return domain.ExpoExhibitor{}, ErrNotFound
}

func (s *PostgresStore) categoryIDByName(ctx context.Context, value string) (string, error) {
	value = strings.TrimSpace(value)
	if value == "" {
		return "", nil
	}
	var id string
	err := s.pool.QueryRow(ctx, `SELECT id FROM categories WHERE lower(name)=lower($1) OR lower(slug)=lower($1) ORDER BY active DESC LIMIT 1`, value).Scan(&id)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return "", nil
		}
		return "", err
	}
	return id, nil
}

func (s *PostgresStore) qrByExpoExhibitor(ctx context.Context, expoExhibitorID string) (domain.QRCodeRecord, error) {
	var item domain.QRCodeRecord
	var created time.Time
	err := s.pool.QueryRow(ctx, `SELECT id, expo_id, COALESCE(expo_exhibitor_id,''), code, target_path, type, active, created_at FROM qr_codes WHERE expo_exhibitor_id=$1 AND active=TRUE`, expoExhibitorID).
		Scan(&item.ID, &item.ExpoID, &item.ExpoExhibitorID, &item.Code, &item.TargetPath, &item.Type, &item.Active, &created)
	if err != nil {
		return domain.QRCodeRecord{}, ErrNotFound
	}
	item.CreatedAt = created.Format(time.RFC3339)
	return item, nil
}

func sponsorCampaignSelectSQL() string {
	return `SELECT sc.id, sc.sponsor_id, sc.name, sc.objective, sc.budget_minor, sc.status, sc.starts_at, sc.ends_at,
		COUNT(sa.id), COALESCE(SUM(sa.impressions),0), COALESCE(SUM(sa.clicks),0), COALESCE(SUM(sa.daily_spend_minor),0), sc.created_at
		FROM sponsor_campaigns sc LEFT JOIN sponsor_ads sa ON sa.campaign_id=sc.id
		GROUP BY sc.id`
}

func scanSponsorCampaigns(rows pgx.Rows) ([]domain.SponsorCampaignRecord, error) {
	items := []domain.SponsorCampaignRecord{}
	for rows.Next() {
		var item domain.SponsorCampaignRecord
		var start time.Time
		var end time.Time
		var created time.Time
		if err := rows.Scan(&item.ID, &item.SponsorID, &item.Name, &item.Objective, &item.Budget, &item.Status, &start, &end, &item.AdsCount, &item.TotalImpressions, &item.TotalClicks, &item.TotalSpend, &created); err != nil {
			return nil, err
		}
		item.StartDate = start.Format("2006-01-02")
		item.EndDate = end.Format("2006-01-02")
		item.CreatedAt = created.Format(time.RFC3339)
		items = append(items, item)
	}
	return items, rows.Err()
}

func sponsorAdSelectSQL() string {
	return `SELECT sa.id, COALESCE(sa.expo_id,''), sa.sponsor_id, COALESCE(NULLIF(u.company_name,''), u.name), COALESCE(u.company_name_cipher,''), COALESCE(u.name_cipher,''), COALESCE(u.country_code,''), COALESCE(sa.campaign_id,''), COALESCE(sc.name,'Unassigned'), sa.name, sa.placement,
		sa.dimensions, sa.media_url, sa.media_type, sa.budget_minor, sa.daily_spend_minor, sa.impressions, sa.clicks,
		CASE WHEN sa.impressions > 0 THEN (sa.clicks::FLOAT / sa.impressions::FLOAT) * 100 ELSE 0 END,
		sa.status, sa.payment_status, sa.created_at
		FROM sponsor_ads sa
		JOIN users u ON u.id=sa.sponsor_id
		LEFT JOIN sponsor_campaigns sc ON sc.id=sa.campaign_id`
}

func (s *PostgresStore) scanSponsorAds(rows pgx.Rows) ([]domain.SponsorAdRecord, error) {
	items := []domain.SponsorAdRecord{}
	for rows.Next() {
		var item domain.SponsorAdRecord
		var created time.Time
		var companyCipher string
		var nameCipher string
		if err := rows.Scan(&item.ID, &item.ExpoID, &item.SponsorID, &item.SponsorName, &companyCipher, &nameCipher, &item.CountryCode, &item.CampaignID, &item.CampaignName, &item.Name, &item.Placement, &item.Dimensions, &item.MediaURL, &item.MediaType, &item.Budget, &item.DailySpend, &item.Impressions, &item.Clicks, &item.CTR, &item.Status, &item.PaymentStatus, &created); err != nil {
			return nil, err
		}
		if company := strings.TrimSpace(s.pii.Decrypt(companyCipher)); company != "" {
			item.SponsorName = company
		} else if name := strings.TrimSpace(s.pii.Decrypt(nameCipher)); name != "" {
			item.SponsorName = name
		} else if looksLikeProtectedPII(item.SponsorName) {
			item.SponsorName = "Sponsor"
		}
		item.CreatedAt = created.Format(time.RFC3339)
		items = append(items, item)
	}
	return items, rows.Err()
}

func (s *PostgresStore) paymentByIdempotency(ctx context.Context, key string) (domain.Payment, error) {
	rows, err := s.pool.Query(ctx, paymentSelectSQL()+" WHERE p.idempotency_key=$1", key)
	if err != nil {
		return domain.Payment{}, err
	}
	defer rows.Close()
	payments, err := s.scanPayments(rows)
	if err != nil {
		return domain.Payment{}, err
	}
	if len(payments) == 0 {
		return domain.Payment{}, ErrNotFound
	}
	return payments[0], nil
}

func (s *PostgresStore) OrganizerProfile(ctx context.Context, organizerID string) (domain.OrganizerProfile, error) {
	user, err := s.UserByID(ctx, organizerID)
	if err != nil || user.Role != domain.RoleOrganizer {
		return domain.OrganizerProfile{}, ErrNotFound
	}
	profile := domain.OrganizerProfile{ID: user.ID, Name: user.Name, Email: user.Email, CompanyName: user.CompanyName, CountryCode: user.CountryCode, LogoURL: user.AvatarURL, EmailNotifications: true, PushNotifications: true}
	err = s.pool.QueryRow(ctx, `SELECT phone, address, COALESCE(logo_url,''), COALESCE(payout_method,''), COALESCE(payout_account_name,''), COALESCE(payout_bank_name,''), COALESCE(payout_account_number,''), COALESCE(payout_bank_branch,''), COALESCE(payout_swift_code,''), COALESCE(payout_mobile_provider,''), COALESCE(payout_mobile_number,''), COALESCE(payout_notes,''), email_notifications, sms_notifications, push_notifications FROM organizer_profiles WHERE organizer_id=$1`, organizerID).
		Scan(&profile.Phone, &profile.Address, &profile.LogoURL, &profile.PayoutMethod, &profile.PayoutAccountName, &profile.PayoutBankName, &profile.PayoutAccountNumber, &profile.PayoutBankBranch, &profile.PayoutSwiftCode, &profile.PayoutMobileProvider, &profile.PayoutMobileNumber, &profile.PayoutNotes, &profile.EmailNotifications, &profile.SMSNotifications, &profile.PushNotifications)
	if err != nil && err != pgx.ErrNoRows {
		return domain.OrganizerProfile{}, err
	}
	return profile, nil
}

func (s *PostgresStore) UpdateOrganizerProfile(ctx context.Context, organizerID string, input domain.OrganizerProfileInput) (domain.OrganizerProfile, error) {
	current, err := s.UserByID(ctx, organizerID)
	if err != nil || current.Role != domain.RoleOrganizer {
		return domain.OrganizerProfile{}, ErrNotFound
	}
	nameValue := strings.TrimSpace(input.Name)
	companyValue := strings.TrimSpace(input.CompanyName)
	if nameValue == "" || companyValue == "" {
		return domain.OrganizerProfile{}, ErrInvalidCredentials
	}
	logoURL := strings.TrimSpace(input.LogoURL)
	if _, err := s.pool.Exec(ctx, `UPDATE users SET name=$1, company_name=$2, avatar_url=COALESCE(NULLIF($3,''), avatar_url), name_cipher=$4, company_name_cipher=$5, updated_at=NOW() WHERE id=$6 AND role='organizer'`,
		storagePIIValue(s.pii, nameValue), storagePIIValue(s.pii, companyValue), logoURL, s.pii.MustEncrypt(nameValue), s.pii.MustEncrypt(companyValue), organizerID); err != nil {
		return domain.OrganizerProfile{}, err
	}
	if _, err := s.pool.Exec(ctx, `INSERT INTO organizer_profiles (organizer_id, phone, address, logo_url, payout_method, payout_account_name, payout_bank_name, payout_account_number, payout_bank_branch, payout_swift_code, payout_mobile_provider, payout_mobile_number, payout_notes, email_notifications, sms_notifications, push_notifications, updated_at)
		VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,NOW())
		ON CONFLICT (organizer_id) DO UPDATE SET phone=EXCLUDED.phone, address=EXCLUDED.address, logo_url=EXCLUDED.logo_url, payout_method=EXCLUDED.payout_method, payout_account_name=EXCLUDED.payout_account_name, payout_bank_name=EXCLUDED.payout_bank_name, payout_account_number=EXCLUDED.payout_account_number, payout_bank_branch=EXCLUDED.payout_bank_branch, payout_swift_code=EXCLUDED.payout_swift_code, payout_mobile_provider=EXCLUDED.payout_mobile_provider, payout_mobile_number=EXCLUDED.payout_mobile_number, payout_notes=EXCLUDED.payout_notes, email_notifications=EXCLUDED.email_notifications, sms_notifications=EXCLUDED.sms_notifications, push_notifications=EXCLUDED.push_notifications, updated_at=NOW()`,
		organizerID, strings.TrimSpace(input.Phone), strings.TrimSpace(input.Address), logoURL, strings.TrimSpace(input.PayoutMethod), strings.TrimSpace(input.PayoutAccountName), strings.TrimSpace(input.PayoutBankName), strings.TrimSpace(input.PayoutAccountNumber), strings.TrimSpace(input.PayoutBankBranch), strings.TrimSpace(input.PayoutSwiftCode), strings.TrimSpace(input.PayoutMobileProvider), strings.TrimSpace(input.PayoutMobileNumber), strings.TrimSpace(input.PayoutNotes), input.EmailNotifications, input.SMSNotifications, input.PushNotifications); err != nil {
		return domain.OrganizerProfile{}, err
	}
	return s.OrganizerProfile(ctx, organizerID)
}

func (s *PostgresStore) ExhibitorProfile(ctx context.Context, exhibitorID string) (domain.ExhibitorProfile, error) {
	user, err := s.UserByID(ctx, exhibitorID)
	if err != nil || user.Role != domain.RoleExhibitor {
		return domain.ExhibitorProfile{}, ErrNotFound
	}
	logo := user.AvatarURL
	profile := domain.ExhibitorProfile{
		ID: user.ID, CompanyName: displayName(user), Logo: logo, LogoURL: logo, Email: user.Email,
		Categories: []string{}, SocialLinks: map[string]string{"linkedin": "", "twitter": "", "instagram": ""},
		TeamMembers: []map[string]string{{"id": user.ID, "name": user.Name, "email": user.Email, "role": "owner"}},
	}
	var social []byte
	err = s.pool.QueryRow(ctx, `SELECT description, website, phone, address, logo_url, categories, social_links FROM exhibitor_profiles WHERE exhibitor_id=$1`, exhibitorID).
		Scan(&profile.Description, &profile.Website, &profile.Phone, &profile.Address, &profile.LogoURL, &profile.Categories, &social)
	if err != nil && err != pgx.ErrNoRows {
		return domain.ExhibitorProfile{}, err
	}
	if len(social) > 0 {
		_ = json.Unmarshal(social, &profile.SocialLinks)
	}
	if profile.LogoURL == "" {
		profile.LogoURL = logo
	}
	profile.Logo = profile.LogoURL
	return profile, nil
}

func (s *PostgresStore) UpdateExhibitorProfile(ctx context.Context, exhibitorID string, input domain.ExhibitorProfileInput) (domain.ExhibitorProfile, error) {
	current, err := s.UserByID(ctx, exhibitorID)
	if err != nil || current.Role != domain.RoleExhibitor {
		return domain.ExhibitorProfile{}, ErrNotFound
	}
	companyValue := strings.TrimSpace(input.CompanyName)
	if companyValue == "" {
		return domain.ExhibitorProfile{}, ErrInvalidCredentials
	}
	logoURL := strings.TrimSpace(input.LogoURL)
	if _, err := s.pool.Exec(ctx, `UPDATE users SET company_name=$1, avatar_url=COALESCE(NULLIF($2,''), avatar_url), company_name_cipher=$3, updated_at=NOW() WHERE id=$4 AND role='exhibitor'`,
		storagePIIValue(s.pii, companyValue), logoURL, s.pii.MustEncrypt(companyValue), exhibitorID); err != nil {
		return domain.ExhibitorProfile{}, err
	}
	social := input.SocialLinks
	if social == nil {
		social = map[string]string{"linkedin": "", "twitter": "", "instagram": ""}
	}
	socialJSON, _ := json.Marshal(social)
	if _, err := s.pool.Exec(ctx, `INSERT INTO exhibitor_profiles (exhibitor_id, description, website, phone, address, logo_url, categories, social_links, updated_at)
		VALUES ($1,$2,$3,$4,$5,$6,$7,$8,NOW())
		ON CONFLICT (exhibitor_id) DO UPDATE SET description=EXCLUDED.description, website=EXCLUDED.website, phone=EXCLUDED.phone, address=EXCLUDED.address, logo_url=EXCLUDED.logo_url, categories=EXCLUDED.categories, social_links=EXCLUDED.social_links, updated_at=NOW()`,
		exhibitorID, strings.TrimSpace(input.Description), "", strings.TrimSpace(input.Phone), strings.TrimSpace(input.Address), logoURL, uniqueStrings(input.Categories), socialJSON); err != nil {
		return domain.ExhibitorProfile{}, err
	}
	return s.ExhibitorProfile(ctx, exhibitorID)
}

func (s *PostgresStore) ListExhibitorDocuments(ctx context.Context, exhibitorID string) ([]domain.CompanyDocumentRecord, error) {
	user, err := s.UserByID(ctx, exhibitorID)
	if err != nil || user.Role != domain.RoleExhibitor {
		return nil, ErrNotFound
	}
	rows, err := s.pool.Query(ctx, `SELECT id, exhibitor_id, name, url, mime_type, size_bytes, uploaded_at FROM exhibitor_company_documents WHERE exhibitor_id=$1 ORDER BY uploaded_at DESC`, exhibitorID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	items := []domain.CompanyDocumentRecord{}
	for rows.Next() {
		var item domain.CompanyDocumentRecord
		var uploadedAt time.Time
		if err := rows.Scan(&item.ID, &item.ExhibitorID, &item.Name, &item.URL, &item.MimeType, &item.Size, &uploadedAt); err != nil {
			return nil, err
		}
		item.UploadedAt = uploadedAt.Format(time.RFC3339)
		items = append(items, item)
	}
	return items, rows.Err()
}

func (s *PostgresStore) CreateExhibitorDocument(ctx context.Context, exhibitorID string, input domain.CompanyDocumentInput) (domain.CompanyDocumentRecord, error) {
	user, err := s.UserByID(ctx, exhibitorID)
	if err != nil || user.Role != domain.RoleExhibitor {
		return domain.CompanyDocumentRecord{}, ErrNotFound
	}
	name := strings.TrimSpace(input.Name)
	url := strings.TrimSpace(input.URL)
	mimeType := strings.TrimSpace(input.MimeType)
	if name == "" || url == "" || mimeType != "application/pdf" {
		return domain.CompanyDocumentRecord{}, ErrInvalidCredentials
	}
	id := fmt.Sprintf("doc_%d", time.Now().UnixNano())
	var uploadedAt time.Time
	err = s.pool.QueryRow(ctx, `INSERT INTO exhibitor_company_documents (id, exhibitor_id, name, url, mime_type, size_bytes)
		VALUES ($1,$2,$3,$4,$5,$6)
		RETURNING uploaded_at`, id, exhibitorID, name, url, mimeType, input.Size).Scan(&uploadedAt)
	if err != nil {
		return domain.CompanyDocumentRecord{}, err
	}
	return domain.CompanyDocumentRecord{ID: id, ExhibitorID: exhibitorID, Name: name, URL: url, MimeType: mimeType, Size: input.Size, UploadedAt: uploadedAt.Format(time.RFC3339)}, nil
}

func (s *PostgresStore) DeleteExhibitorDocument(ctx context.Context, exhibitorID string, id string) error {
	user, err := s.UserByID(ctx, exhibitorID)
	if err != nil || user.Role != domain.RoleExhibitor {
		return ErrNotFound
	}
	commandTag, err := s.pool.Exec(ctx, `DELETE FROM exhibitor_company_documents WHERE exhibitor_id=$1 AND id=$2`, exhibitorID, id)
	if err != nil {
		return err
	}
	if commandTag.RowsAffected() == 0 {
		return ErrNotFound
	}
	return nil
}

func (s *PostgresStore) ListExpoDocuments(ctx context.Context, expoID string, exhibitorID string) ([]domain.ExpoDocumentRecord, error) {
	if err := s.ensureExpoDocumentAccess(ctx, expoID, exhibitorID); err != nil {
		return nil, err
	}
	rows, err := s.pool.Query(ctx, `SELECT id, expo_id, exhibitor_id, name, url, mime_type, size_bytes, uploaded_at FROM exhibitor_expo_documents WHERE expo_id=$1 AND exhibitor_id=$2 ORDER BY uploaded_at DESC`, expoID, exhibitorID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	items := []domain.ExpoDocumentRecord{}
	for rows.Next() {
		var item domain.ExpoDocumentRecord
		var uploadedAt time.Time
		if err := rows.Scan(&item.ID, &item.ExpoID, &item.ExhibitorID, &item.Name, &item.URL, &item.MimeType, &item.Size, &uploadedAt); err != nil {
			return nil, err
		}
		item.Type = "document"
		item.UploadedAt = uploadedAt.Format(time.RFC3339)
		items = append(items, item)
	}
	return items, rows.Err()
}

func (s *PostgresStore) CreateExpoDocument(ctx context.Context, expoID string, exhibitorID string, input domain.CompanyDocumentInput) (domain.ExpoDocumentRecord, error) {
	if err := s.ensureExpoDocumentAccess(ctx, expoID, exhibitorID); err != nil {
		return domain.ExpoDocumentRecord{}, err
	}
	name := strings.TrimSpace(input.Name)
	url := strings.TrimSpace(input.URL)
	mimeType := strings.TrimSpace(input.MimeType)
	if name == "" || url == "" || mimeType != "application/pdf" {
		return domain.ExpoDocumentRecord{}, ErrInvalidCredentials
	}
	id := fmt.Sprintf("edoc_%d", time.Now().UnixNano())
	var uploadedAt time.Time
	err := s.pool.QueryRow(ctx, `INSERT INTO exhibitor_expo_documents (id, expo_id, exhibitor_id, name, url, mime_type, size_bytes)
		VALUES ($1,$2,$3,$4,$5,$6,$7)
		RETURNING uploaded_at`, id, expoID, exhibitorID, name, url, mimeType, input.Size).Scan(&uploadedAt)
	if err != nil {
		return domain.ExpoDocumentRecord{}, err
	}
	return domain.ExpoDocumentRecord{ID: id, ExpoID: expoID, ExhibitorID: exhibitorID, Name: name, URL: url, Type: "document", MimeType: mimeType, Size: input.Size, UploadedAt: uploadedAt.Format(time.RFC3339)}, nil
}

func (s *PostgresStore) DeleteExpoDocument(ctx context.Context, expoID string, exhibitorID string, id string) error {
	if err := s.ensureExpoDocumentAccess(ctx, expoID, exhibitorID); err != nil {
		return err
	}
	commandTag, err := s.pool.Exec(ctx, `DELETE FROM exhibitor_expo_documents WHERE id=$1 AND expo_id=$2 AND exhibitor_id=$3`, strings.TrimSpace(id), expoID, exhibitorID)
	if err != nil {
		return err
	}
	if commandTag.RowsAffected() == 0 {
		return ErrNotFound
	}
	return nil
}

func (s *PostgresStore) ExhibitorLiveStream(ctx context.Context, expoID string, exhibitorID string) (domain.ExhibitorLiveStreamRecord, error) {
	if err := s.ensureExpoDocumentAccess(ctx, expoID, exhibitorID); err != nil {
		return domain.ExhibitorLiveStreamRecord{}, err
	}
	var item domain.ExhibitorLiveStreamRecord
	var updatedAt time.Time
	err := s.pool.QueryRow(ctx, `SELECT expo_id, exhibitor_id, title, youtube_url, embed_url, enabled, live_chat_enabled, updated_at
		FROM exhibitor_live_streams WHERE expo_id=$1 AND exhibitor_id=$2`, strings.TrimSpace(expoID), strings.TrimSpace(exhibitorID)).
		Scan(&item.ExpoID, &item.ExhibitorID, &item.Title, &item.YoutubeURL, &item.EmbedURL, &item.Enabled, &item.LiveChatEnabled, &updatedAt)
	if err == pgx.ErrNoRows {
		return domain.ExhibitorLiveStreamRecord{ExpoID: strings.TrimSpace(expoID), ExhibitorID: strings.TrimSpace(exhibitorID), Title: "Expo live stream", Enabled: false}, nil
	}
	if err != nil {
		return domain.ExhibitorLiveStreamRecord{}, err
	}
	item.UpdatedAt = updatedAt.Format(time.RFC3339)
	return item, nil
}

func (s *PostgresStore) UpdateExhibitorLiveStream(ctx context.Context, expoID string, exhibitorID string, input domain.ExhibitorLiveStreamInput, actor domain.User) (domain.ExhibitorLiveStreamRecord, error) {
	expoID = strings.TrimSpace(expoID)
	exhibitorID = strings.TrimSpace(exhibitorID)
	if actor.Role != domain.RoleExhibitor || actor.ID != exhibitorID {
		return domain.ExhibitorLiveStreamRecord{}, ErrInvalidCredentials
	}
	if err := s.ensureExpoDocumentAccess(ctx, expoID, exhibitorID); err != nil {
		return domain.ExhibitorLiveStreamRecord{}, err
	}
	url := strings.TrimSpace(input.YoutubeURL)
	if input.Enabled && !isYouTubeURL(url) {
		return domain.ExhibitorLiveStreamRecord{}, ErrInvalidCredentials
	}
	title := defaultString(strings.TrimSpace(input.Title), "Expo live stream")
	embedURL := youtubeEmbedURL(url)
	enabled := input.Enabled && embedURL != ""
	var item domain.ExhibitorLiveStreamRecord
	var updatedAt time.Time
	err := s.pool.QueryRow(ctx, `INSERT INTO exhibitor_live_streams (expo_id, exhibitor_id, title, youtube_url, embed_url, enabled, live_chat_enabled, updated_at)
		VALUES ($1,$2,$3,$4,$5,$6,$7,NOW())
		ON CONFLICT (expo_id, exhibitor_id) DO UPDATE SET title=EXCLUDED.title, youtube_url=EXCLUDED.youtube_url, embed_url=EXCLUDED.embed_url, enabled=EXCLUDED.enabled, live_chat_enabled=EXCLUDED.live_chat_enabled, updated_at=NOW()
		RETURNING expo_id, exhibitor_id, title, youtube_url, embed_url, enabled, live_chat_enabled, updated_at`,
		expoID, exhibitorID, title, url, embedURL, enabled, input.LiveChatEnabled && enabled).
		Scan(&item.ExpoID, &item.ExhibitorID, &item.Title, &item.YoutubeURL, &item.EmbedURL, &item.Enabled, &item.LiveChatEnabled, &updatedAt)
	if err != nil {
		return domain.ExhibitorLiveStreamRecord{}, err
	}
	item.UpdatedAt = updatedAt.Format(time.RFC3339)
	return item, nil
}

func (s *PostgresStore) ensureExpoDocumentAccess(ctx context.Context, expoID string, exhibitorID string) error {
	user, err := s.UserByID(ctx, exhibitorID)
	if err != nil || user.Role != domain.RoleExhibitor {
		return ErrNotFound
	}
	var exists bool
	if err := s.pool.QueryRow(ctx, `SELECT EXISTS (SELECT 1 FROM expos e JOIN expo_exhibitors ee ON ee.expo_id=e.id WHERE e.id=$1 AND ee.exhibitor_id=$2)`, strings.TrimSpace(expoID), exhibitorID).Scan(&exists); err != nil {
		return err
	}
	if !exists {
		return ErrNotFound
	}
	return nil
}

func (s *PostgresStore) ListExhibitorTeam(ctx context.Context, exhibitorID string) ([]domain.OrganizerTeamMember, error) {
	user, err := s.UserByID(ctx, exhibitorID)
	if err != nil || user.Role != domain.RoleExhibitor {
		return nil, ErrNotFound
	}
	items := []domain.OrganizerTeamMember{{ID: user.ID, OrganizerID: user.ID, Name: user.Name, Email: user.Email, Role: "owner", Status: "active", Permissions: []string{"profile:manage", "products:manage", "leads:manage", "payments:view"}}}
	rows, err := s.pool.Query(ctx, `SELECT id, exhibitor_id, name, email, role, status, permissions, created_at FROM exhibitor_team_members WHERE exhibitor_id=$1 ORDER BY created_at DESC`, exhibitorID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	for rows.Next() {
		var item domain.OrganizerTeamMember
		var created time.Time
		if err := rows.Scan(&item.ID, &item.OrganizerID, &item.Name, &item.Email, &item.Role, &item.Status, &item.Permissions, &created); err != nil {
			return nil, err
		}
		item.CreatedAt = created.Format(time.RFC3339)
		items = append(items, item)
	}
	return items, rows.Err()
}

func (s *PostgresStore) EffectiveExhibitorID(ctx context.Context, userID string) (string, error) {
	var exhibitorID string
	err := s.pool.QueryRow(ctx, `SELECT exhibitor_id FROM exhibitor_team_members WHERE id=$1 AND status='active' LIMIT 1`, userID).Scan(&exhibitorID)
	if err == pgx.ErrNoRows {
		return userID, nil
	}
	if err != nil {
		return "", err
	}
	return exhibitorID, nil
}

func (s *PostgresStore) CreateExhibitorTeamMember(ctx context.Context, exhibitorID string, input domain.OrganizerTeamMemberInput) (domain.OrganizerTeamMember, error) {
	id := fmt.Sprintf("etm_%d", time.Now().UnixNano())
	member, err := organizerTeamMemberFromInput(id, exhibitorID, input)
	if err != nil {
		return domain.OrganizerTeamMember{}, err
	}
	_, err = s.pool.Exec(ctx, `INSERT INTO exhibitor_team_members (id, exhibitor_id, name, email, role, status, permissions) VALUES ($1,$2,$3,$4,$5,$6,$7)`,
		member.ID, member.OrganizerID, member.Name, member.Email, member.Role, member.Status, member.Permissions)
	if err != nil {
		return domain.OrganizerTeamMember{}, err
	}
	items, err := s.ListExhibitorTeam(ctx, exhibitorID)
	if err != nil {
		return domain.OrganizerTeamMember{}, err
	}
	for _, item := range items {
		if item.ID == id {
			return item, nil
		}
	}
	return domain.OrganizerTeamMember{}, ErrNotFound
}

func (s *PostgresStore) CreateExhibitorTeamMemberAccount(ctx context.Context, exhibitor domain.User, input domain.OrganizerTeamMemberInput) (domain.OrganizerTeamMember, error) {
	temporaryPassword := strings.TrimSpace(input.TemporaryPassword)
	if exhibitor.Role != domain.RoleExhibitor || temporaryPassword == "" {
		return domain.OrganizerTeamMember{}, ErrInvalidCredentials
	}
	id := fmt.Sprintf("usr_%d", time.Now().UnixNano())
	member, err := organizerTeamMemberFromInput(id, exhibitor.ID, input)
	if err != nil {
		return domain.OrganizerTeamMember{}, err
	}
	passwordHash, err := security.HashPassword(temporaryPassword)
	if err != nil {
		return domain.OrganizerTeamMember{}, err
	}
	tx, err := s.pool.Begin(ctx)
	if err != nil {
		return domain.OrganizerTeamMember{}, err
	}
	defer tx.Rollback(ctx)
	emailValue := strings.TrimSpace(strings.ToLower(member.Email))
	nameValue := strings.TrimSpace(member.Name)
	companyValue := strings.TrimSpace(exhibitor.CompanyName)
	countryCode := strings.ToUpper(strings.TrimSpace(exhibitor.CountryCode))
	if countryCode == "" {
		countryCode = "KE"
	}
	emailHash := s.pii.Hash(emailValue)
	var alreadyTeamMember bool
	if err := tx.QueryRow(ctx, `SELECT EXISTS(SELECT 1 FROM exhibitor_team_members WHERE exhibitor_id=$1 AND lower(email)=lower($2))`, exhibitor.ID, emailValue).Scan(&alreadyTeamMember); err != nil {
		return domain.OrganizerTeamMember{}, err
	}
	if alreadyTeamMember {
		return domain.OrganizerTeamMember{}, ErrInvalidCredentials
	}
	var existingID string
	var existingRole domain.Role
	var existingStatus string
	err = tx.QueryRow(ctx, `SELECT id, role, COALESCE(status,'active') FROM users WHERE lower(email)=lower($1) OR ($2 <> '' AND email_hash=$2)`, emailValue, emailHash).Scan(&existingID, &existingRole, &existingStatus)
	if err == nil {
		if existingRole != domain.RoleExhibitor || existingStatus == "active" {
			return domain.OrganizerTeamMember{}, ErrInvalidCredentials
		}
		id = existingID
		member.ID = id
		if _, err := tx.Exec(ctx, `UPDATE users SET password_hash=$1, name=$2, company_name=$3, country_code=$4, email_verified=TRUE, status='active', must_change_password=TRUE, name_cipher=$5, company_name_cipher=$6, updated_at=NOW() WHERE id=$7`,
			passwordHash, storagePIIValue(s.pii, nameValue), storagePIIValue(s.pii, companyValue), countryCode, s.pii.MustEncrypt(nameValue), s.pii.MustEncrypt(companyValue), id); err != nil {
			return domain.OrganizerTeamMember{}, err
		}
	} else if err == pgx.ErrNoRows {
		if _, err := tx.Exec(ctx, `INSERT INTO users (id, email, password_hash, name, role, avatar_url, company_name, country_code, email_verified, status, must_change_password, email_hash, email_cipher, name_cipher, company_name_cipher)
			VALUES ($1,$2,$3,$4,$5,$6,$7,$8,TRUE,'active',TRUE,$9,$10,$11,$12)`,
			id, storagePIIValue(s.pii, emailValue), passwordHash, storagePIIValue(s.pii, nameValue), domain.RoleExhibitor, "/avatars/exhibitor.svg",
			storagePIIValue(s.pii, companyValue), countryCode, emailHash, s.pii.MustEncrypt(emailValue), s.pii.MustEncrypt(nameValue), s.pii.MustEncrypt(companyValue)); err != nil {
			return domain.OrganizerTeamMember{}, err
		}
	} else {
		return domain.OrganizerTeamMember{}, err
	}
	if _, err := tx.Exec(ctx, `INSERT INTO exhibitor_team_members (id, exhibitor_id, name, email, role, status, permissions) VALUES ($1,$2,$3,$4,$5,$6,$7)`,
		member.ID, member.OrganizerID, member.Name, member.Email, member.Role, member.Status, member.Permissions); err != nil {
		return domain.OrganizerTeamMember{}, err
	}
	if err := tx.Commit(ctx); err != nil {
		return domain.OrganizerTeamMember{}, err
	}
	items, err := s.ListExhibitorTeam(ctx, exhibitor.ID)
	if err != nil {
		return domain.OrganizerTeamMember{}, err
	}
	for _, item := range items {
		if item.ID == id {
			return item, nil
		}
	}
	return domain.OrganizerTeamMember{}, ErrNotFound
}

func (s *PostgresStore) UpdateExhibitorTeamMember(ctx context.Context, exhibitorID string, id string, input domain.OrganizerTeamMemberInput) (domain.OrganizerTeamMember, error) {
	if id == exhibitorID {
		return domain.OrganizerTeamMember{}, ErrInvalidCredentials
	}
	member, err := organizerTeamMemberFromInput(id, exhibitorID, input)
	if err != nil {
		return domain.OrganizerTeamMember{}, err
	}
	commandTag, err := s.pool.Exec(ctx, `UPDATE exhibitor_team_members SET name=$1, email=$2, role=$3, status=$4, permissions=$5 WHERE id=$6 AND exhibitor_id=$7`,
		member.Name, member.Email, member.Role, member.Status, member.Permissions, id, exhibitorID)
	if err != nil {
		return domain.OrganizerTeamMember{}, err
	}
	if commandTag.RowsAffected() == 0 {
		return domain.OrganizerTeamMember{}, ErrNotFound
	}
	emailValue := strings.TrimSpace(strings.ToLower(member.Email))
	nameValue := strings.TrimSpace(member.Name)
	if _, err := s.pool.Exec(ctx, `UPDATE users SET email=$1, name=$2, status=$3, email_hash=$4, email_cipher=$5, name_cipher=$6, updated_at=NOW() WHERE id=$7 AND role='exhibitor'`,
		storagePIIValue(s.pii, emailValue), storagePIIValue(s.pii, nameValue), member.Status, s.pii.Hash(emailValue), s.pii.MustEncrypt(emailValue), s.pii.MustEncrypt(nameValue), id); err != nil {
		return domain.OrganizerTeamMember{}, err
	}
	items, err := s.ListExhibitorTeam(ctx, exhibitorID)
	if err != nil {
		return domain.OrganizerTeamMember{}, err
	}
	for _, item := range items {
		if item.ID == id {
			return item, nil
		}
	}
	return domain.OrganizerTeamMember{}, ErrNotFound
}

func (s *PostgresStore) DeleteExhibitorTeamMember(ctx context.Context, exhibitorID string, id string) error {
	if id == exhibitorID {
		return ErrInvalidCredentials
	}
	commandTag, err := s.pool.Exec(ctx, `DELETE FROM exhibitor_team_members WHERE id=$1 AND exhibitor_id=$2`, id, exhibitorID)
	if err != nil {
		return err
	}
	if commandTag.RowsAffected() == 0 {
		_, _ = s.pool.Exec(ctx, `UPDATE users SET status='inactive', updated_at=NOW() WHERE id=$1 AND role='exhibitor'`, id)
		return nil
	}
	if _, err := s.pool.Exec(ctx, `UPDATE users SET status='inactive', updated_at=NOW() WHERE id=$1 AND role='exhibitor'`, id); err != nil {
		return err
	}
	return nil
}

func (s *PostgresStore) ListOrganizerTeam(ctx context.Context, organizerID string) ([]domain.OrganizerTeamMember, error) {
	user, err := s.UserByID(ctx, organizerID)
	if err != nil || user.Role != domain.RoleOrganizer {
		return nil, ErrNotFound
	}
	items := []domain.OrganizerTeamMember{{ID: user.ID, OrganizerID: user.ID, Name: user.Name, Email: user.Email, Role: "owner", Status: "active", Permissions: []string{"expos:manage", "team:manage", "reports:view", "payments:view"}}}
	rows, err := s.pool.Query(ctx, `SELECT id, organizer_id, name, email, role, status, permissions, created_at FROM organizer_team_members WHERE organizer_id=$1 ORDER BY created_at DESC`, organizerID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	for rows.Next() {
		var item domain.OrganizerTeamMember
		var created time.Time
		if err := rows.Scan(&item.ID, &item.OrganizerID, &item.Name, &item.Email, &item.Role, &item.Status, &item.Permissions, &created); err != nil {
			return nil, err
		}
		item.CreatedAt = created.Format(time.RFC3339)
		items = append(items, item)
	}
	return items, rows.Err()
}

func (s *PostgresStore) OrganizerTeamMemberByID(ctx context.Context, organizerID string, id string) (domain.OrganizerTeamMember, error) {
	if id == organizerID {
		user, err := s.UserByID(ctx, organizerID)
		if err != nil || user.Role != domain.RoleOrganizer {
			return domain.OrganizerTeamMember{}, ErrNotFound
		}
		return domain.OrganizerTeamMember{ID: user.ID, OrganizerID: user.ID, Name: user.Name, Email: user.Email, Role: "owner", Status: "active", Permissions: []string{"expos:manage", "team:manage", "reports:view", "payments:view"}}, nil
	}
	var item domain.OrganizerTeamMember
	var created time.Time
	err := s.pool.QueryRow(ctx, `SELECT id, organizer_id, name, email, role, status, permissions, created_at FROM organizer_team_members WHERE organizer_id=$1 AND id=$2`, organizerID, id).
		Scan(&item.ID, &item.OrganizerID, &item.Name, &item.Email, &item.Role, &item.Status, &item.Permissions, &created)
	if err != nil {
		return domain.OrganizerTeamMember{}, ErrNotFound
	}
	item.CreatedAt = created.Format(time.RFC3339)
	return item, nil
}

func (s *PostgresStore) EffectiveOrganizerID(ctx context.Context, userID string) (string, error) {
	var organizerID string
	err := s.pool.QueryRow(ctx, `SELECT organizer_id FROM organizer_team_members WHERE id=$1 AND status='active' LIMIT 1`, userID).Scan(&organizerID)
	if err == pgx.ErrNoRows {
		return userID, nil
	}
	if err != nil {
		return "", err
	}
	return organizerID, nil
}

func (s *PostgresStore) CreateOrganizerTeamMember(ctx context.Context, organizerID string, input domain.OrganizerTeamMemberInput) (domain.OrganizerTeamMember, error) {
	id := fmt.Sprintf("otm_%d", time.Now().UnixNano())
	member, err := organizerTeamMemberFromInput(id, organizerID, input)
	if err != nil {
		return domain.OrganizerTeamMember{}, err
	}
	_, err = s.pool.Exec(ctx, `INSERT INTO organizer_team_members (id, organizer_id, name, email, role, status, permissions) VALUES ($1,$2,$3,$4,$5,$6,$7)`,
		member.ID, member.OrganizerID, member.Name, member.Email, member.Role, member.Status, member.Permissions)
	if err != nil {
		return domain.OrganizerTeamMember{}, err
	}
	return s.OrganizerTeamMemberByID(ctx, organizerID, id)
}

func (s *PostgresStore) CreateOrganizerTeamMemberAccount(ctx context.Context, organizer domain.User, input domain.OrganizerTeamMemberInput) (domain.OrganizerTeamMember, error) {
	temporaryPassword := strings.TrimSpace(input.TemporaryPassword)
	if organizer.Role != domain.RoleOrganizer || temporaryPassword == "" {
		return domain.OrganizerTeamMember{}, ErrInvalidCredentials
	}
	id := fmt.Sprintf("usr_%d", time.Now().UnixNano())
	member, err := organizerTeamMemberFromInput(id, organizer.ID, input)
	if err != nil {
		return domain.OrganizerTeamMember{}, err
	}
	passwordHash, err := security.HashPassword(temporaryPassword)
	if err != nil {
		return domain.OrganizerTeamMember{}, err
	}
	tx, err := s.pool.Begin(ctx)
	if err != nil {
		return domain.OrganizerTeamMember{}, err
	}
	defer tx.Rollback(ctx)
	emailValue := strings.TrimSpace(strings.ToLower(member.Email))
	nameValue := strings.TrimSpace(member.Name)
	companyValue := strings.TrimSpace(organizer.CompanyName)
	countryCode := strings.ToUpper(strings.TrimSpace(organizer.CountryCode))
	if countryCode == "" {
		countryCode = "KE"
	}
	emailHash := s.pii.Hash(emailValue)
	var alreadyTeamMember bool
	if err := tx.QueryRow(ctx, `SELECT EXISTS(SELECT 1 FROM organizer_team_members WHERE organizer_id=$1 AND lower(email)=lower($2))`, organizer.ID, emailValue).Scan(&alreadyTeamMember); err != nil {
		return domain.OrganizerTeamMember{}, err
	}
	if alreadyTeamMember {
		return domain.OrganizerTeamMember{}, ErrInvalidCredentials
	}
	var existingID string
	var existingRole domain.Role
	var existingStatus string
	err = tx.QueryRow(ctx, `SELECT id, role, COALESCE(status,'active') FROM users WHERE lower(email)=lower($1) OR ($2 <> '' AND email_hash=$2)`, emailValue, emailHash).Scan(&existingID, &existingRole, &existingStatus)
	if err == nil {
		if existingRole != domain.RoleOrganizer || existingStatus == "active" {
			return domain.OrganizerTeamMember{}, ErrInvalidCredentials
		}
		id = existingID
		member.ID = id
		if _, err := tx.Exec(ctx, `UPDATE users SET password_hash=$1, name=$2, company_name=$3, country_code=$4, email_verified=TRUE, status='active', must_change_password=TRUE, name_cipher=$5, company_name_cipher=$6, updated_at=NOW() WHERE id=$7`,
			passwordHash, storagePIIValue(s.pii, nameValue), storagePIIValue(s.pii, companyValue), countryCode, s.pii.MustEncrypt(nameValue), s.pii.MustEncrypt(companyValue), id); err != nil {
			return domain.OrganizerTeamMember{}, err
		}
	} else if err == pgx.ErrNoRows {
		if _, err := tx.Exec(ctx, `INSERT INTO users (id, email, password_hash, name, role, avatar_url, company_name, country_code, email_verified, status, must_change_password, email_hash, email_cipher, name_cipher, company_name_cipher)
			VALUES ($1,$2,$3,$4,$5,$6,$7,$8,TRUE,'active',TRUE,$9,$10,$11,$12)`,
			id, storagePIIValue(s.pii, emailValue), passwordHash, storagePIIValue(s.pii, nameValue), domain.RoleOrganizer, "/avatars/organizer.svg",
			storagePIIValue(s.pii, companyValue), countryCode, emailHash, s.pii.MustEncrypt(emailValue), s.pii.MustEncrypt(nameValue), s.pii.MustEncrypt(companyValue)); err != nil {
			return domain.OrganizerTeamMember{}, err
		}
	} else {
		return domain.OrganizerTeamMember{}, err
	}
	if _, err := tx.Exec(ctx, `INSERT INTO organizer_team_members (id, organizer_id, name, email, role, status, permissions) VALUES ($1,$2,$3,$4,$5,$6,$7)`,
		member.ID, member.OrganizerID, member.Name, member.Email, member.Role, member.Status, member.Permissions); err != nil {
		return domain.OrganizerTeamMember{}, err
	}
	if err := tx.Commit(ctx); err != nil {
		return domain.OrganizerTeamMember{}, err
	}
	return s.OrganizerTeamMemberByID(ctx, organizer.ID, id)
}

func (s *PostgresStore) UpdateOrganizerTeamMember(ctx context.Context, organizerID string, id string, input domain.OrganizerTeamMemberInput) (domain.OrganizerTeamMember, error) {
	if id == organizerID {
		return domain.OrganizerTeamMember{}, ErrInvalidCredentials
	}
	member, err := organizerTeamMemberFromInput(id, organizerID, input)
	if err != nil {
		return domain.OrganizerTeamMember{}, err
	}
	tag, err := s.pool.Exec(ctx, `UPDATE organizer_team_members SET name=$3, email=$4, role=$5, status=$6, permissions=$7, updated_at=NOW() WHERE organizer_id=$1 AND id=$2`,
		organizerID, id, member.Name, member.Email, member.Role, member.Status, member.Permissions)
	if err != nil {
		return domain.OrganizerTeamMember{}, err
	}
	if tag.RowsAffected() == 0 {
		return domain.OrganizerTeamMember{}, ErrNotFound
	}
	return s.OrganizerTeamMemberByID(ctx, organizerID, id)
}

func (s *PostgresStore) DeleteOrganizerTeamMember(ctx context.Context, organizerID string, id string) error {
	if id == organizerID {
		return ErrInvalidCredentials
	}
	tx, err := s.pool.Begin(ctx)
	if err != nil {
		return err
	}
	defer tx.Rollback(ctx)
	if _, err := tx.Exec(ctx, `DELETE FROM organizer_team_members WHERE id=$1 AND organizer_id=$2`, id, organizerID); err != nil {
		return err
	}
	if _, err := tx.Exec(ctx, `UPDATE users SET status='inactive', updated_at=NOW() WHERE id=$1 AND role='organizer'`, id); err != nil {
		return err
	}
	return tx.Commit(ctx)
}

func (s *PostgresStore) ListOrganizerSponsors(ctx context.Context, organizerID string) ([]domain.OrganizerSponsor, error) {
	rows, err := s.pool.Query(ctx, `SELECT id, organizer_id, company, contact_name, email, phone, plan_name, plan_tier, status, commissioned_by, COALESCE(commission_rate_percent,0), commission_earned_minor, total_paid_minor, joined_at FROM organizer_sponsors WHERE organizer_id=$1 ORDER BY joined_at DESC`, organizerID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	items := []domain.OrganizerSponsor{}
	for rows.Next() {
		var item domain.OrganizerSponsor
		var joined time.Time
		if err := rows.Scan(&item.ID, &item.OrganizerID, &item.Company, &item.ContactName, &item.Email, &item.Phone, &item.PlanName, &item.PlanTier, &item.Status, &item.CommissionedBy, &item.CommissionRate, &item.CommissionEarned, &item.TotalPaid, &joined); err != nil {
			return nil, err
		}
		item.JoinedAt = joined.Format(time.RFC3339)
		items = append(items, item)
	}
	return items, rows.Err()
}

func (s *PostgresStore) OrganizerSponsorByID(ctx context.Context, organizerID string, id string) (domain.OrganizerSponsor, error) {
	var item domain.OrganizerSponsor
	var joined time.Time
	err := s.pool.QueryRow(ctx, `SELECT id, organizer_id, company, contact_name, email, phone, plan_name, plan_tier, status, commissioned_by, COALESCE(commission_rate_percent,0), commission_earned_minor, total_paid_minor, joined_at FROM organizer_sponsors WHERE organizer_id=$1 AND id=$2`, organizerID, id).
		Scan(&item.ID, &item.OrganizerID, &item.Company, &item.ContactName, &item.Email, &item.Phone, &item.PlanName, &item.PlanTier, &item.Status, &item.CommissionedBy, &item.CommissionRate, &item.CommissionEarned, &item.TotalPaid, &joined)
	if err != nil {
		return domain.OrganizerSponsor{}, ErrNotFound
	}
	item.JoinedAt = joined.Format(time.RFC3339)
	return item, nil
}

func (s *PostgresStore) CreateOrganizerSponsor(ctx context.Context, organizerID string, input domain.OrganizerSponsorInput) (domain.OrganizerSponsor, error) {
	user, err := s.UserByID(ctx, organizerID)
	if err != nil || user.Role != domain.RoleOrganizer {
		return domain.OrganizerSponsor{}, ErrNotFound
	}
	id := fmt.Sprintf("orgsp_%d", time.Now().UnixNano())
	sponsor, err := organizerSponsorFromInput(id, organizerID, displayName(user), input)
	if err != nil {
		return domain.OrganizerSponsor{}, err
	}
	_, err = s.pool.Exec(ctx, `INSERT INTO organizer_sponsors (id, organizer_id, company, contact_name, email, phone, plan_name, plan_tier, status, commissioned_by, commission_rate_percent) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)`,
		sponsor.ID, sponsor.OrganizerID, sponsor.Company, sponsor.ContactName, sponsor.Email, sponsor.Phone, sponsor.PlanName, sponsor.PlanTier, sponsor.Status, sponsor.CommissionedBy, sponsor.CommissionRate)
	if err != nil {
		return domain.OrganizerSponsor{}, err
	}
	return s.OrganizerSponsorByID(ctx, organizerID, id)
}

func (s *PostgresStore) UpdateOrganizerSponsor(ctx context.Context, organizerID string, id string, input domain.OrganizerSponsorInput) (domain.OrganizerSponsor, error) {
	current, err := s.OrganizerSponsorByID(ctx, organizerID, id)
	if err != nil {
		return domain.OrganizerSponsor{}, err
	}
	sponsor, err := organizerSponsorFromInput(id, organizerID, current.CommissionedBy, input)
	if err != nil {
		return domain.OrganizerSponsor{}, err
	}
	tag, err := s.pool.Exec(ctx, `UPDATE organizer_sponsors SET company=$3, contact_name=$4, email=$5, phone=$6, plan_name=$7, plan_tier=$8, status=$9, commission_rate_percent=$10, updated_at=NOW() WHERE organizer_id=$1 AND id=$2`,
		organizerID, id, sponsor.Company, sponsor.ContactName, sponsor.Email, sponsor.Phone, sponsor.PlanName, sponsor.PlanTier, sponsor.Status, sponsor.CommissionRate)
	if err != nil {
		return domain.OrganizerSponsor{}, err
	}
	if tag.RowsAffected() == 0 {
		return domain.OrganizerSponsor{}, ErrNotFound
	}
	return s.OrganizerSponsorByID(ctx, organizerID, id)
}

func (s *PostgresStore) EmailSettings(ctx context.Context) (domain.EmailSettings, error) {
	var raw []byte
	if err := s.pool.QueryRow(ctx, `SELECT value FROM app_settings WHERE key='email'`).Scan(&raw); err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return defaultEmailSettings(), nil
		}
		return domain.EmailSettings{}, err
	}
	settings := defaultEmailSettings()
	_ = json.Unmarshal(raw, &settings)
	if settings.SMTPPort == 0 {
		settings.SMTPPort = 587
	}
	if strings.TrimSpace(settings.Encryption) == "" {
		settings.Encryption = "starttls"
	}
	return settings, nil
}

func (s *PostgresStore) UpdateEmailSettings(ctx context.Context, settings domain.EmailSettings) (domain.EmailSettings, error) {
	if settings.SMTPPort == 0 {
		settings.SMTPPort = 587
	}
	if strings.TrimSpace(settings.Encryption) == "" {
		settings.Encryption = "starttls"
	}
	raw, _ := json.Marshal(settings)
	_, err := s.pool.Exec(ctx, `INSERT INTO app_settings (key, value, updated_at) VALUES ('email',$1,NOW())
		ON CONFLICT (key) DO UPDATE SET value=EXCLUDED.value, updated_at=NOW()`, raw)
	return settings, err
}

func (s *PostgresStore) SMSSettings(ctx context.Context) (domain.SMSSettings, error) {
	var raw []byte
	if err := s.pool.QueryRow(ctx, `SELECT value FROM app_settings WHERE key='sms'`).Scan(&raw); err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return defaultSMSSettings(), nil
		}
		return domain.SMSSettings{}, err
	}
	settings := defaultSMSSettings()
	_ = json.Unmarshal(raw, &settings)
	if strings.TrimSpace(settings.Provider) == "" {
		settings.Provider = "tiaraconnect"
	}
	if strings.TrimSpace(settings.SenderID) == "" {
		settings.SenderID = "CONNECT"
	}
	if strings.TrimSpace(settings.BaseURL) == "" {
		settings.BaseURL = "https://api2.tiaraconnect.io"
	}
	return settings, nil
}

func (s *PostgresStore) UpdateSMSSettings(ctx context.Context, settings domain.SMSSettings) (domain.SMSSettings, error) {
	settings.Provider = strings.ToLower(strings.TrimSpace(settings.Provider))
	if settings.Provider == "" {
		settings.Provider = "tiaraconnect"
	}
	if settings.Provider != "tiaraconnect" {
		return domain.SMSSettings{}, ErrInvalidCredentials
	}
	if strings.TrimSpace(settings.SenderID) == "" {
		settings.SenderID = "CONNECT"
	}
	settings.SenderID = strings.TrimSpace(settings.SenderID)
	settings.APIKey = strings.TrimSpace(settings.APIKey)
	settings.BaseURL = strings.TrimRight(strings.TrimSpace(settings.BaseURL), "/")
	if settings.BaseURL == "" {
		settings.BaseURL = "https://api2.tiaraconnect.io"
	}
	raw, _ := json.Marshal(settings)
	_, err := s.pool.Exec(ctx, `INSERT INTO app_settings (key, value, updated_at) VALUES ('sms',$1,NOW())
		ON CONFLICT (key) DO UPDATE SET value=EXCLUDED.value, updated_at=NOW()`, raw)
	return settings, err
}

func defaultEmailSettings() domain.EmailSettings {
	return domain.EmailSettings{
		SenderName:  "Tandaza",
		SenderEmail: "notifications@tandaza.africa",
		SMTPPort:    587,
		Encryption:  "starttls",
	}
}

func defaultSMSSettings() domain.SMSSettings {
	return domain.SMSSettings{
		Provider: "tiaraconnect",
		SenderID: "CONNECT",
		BaseURL:  "https://api2.tiaraconnect.io",
	}
}

func (s *PostgresStore) PaystackSettings(ctx context.Context) (domain.PaystackSettings, error) {
	var raw []byte
	if err := s.pool.QueryRow(ctx, `SELECT value FROM app_settings WHERE key='paystack'`).Scan(&raw); err != nil {
		return domain.PaystackSettings{}, nil
	}
	var settings domain.PaystackSettings
	_ = json.Unmarshal(raw, &settings)
	return settings, nil
}

func (s *PostgresStore) UpdatePaystackSettings(ctx context.Context, settings domain.PaystackSettings) (domain.PaystackSettings, error) {
	raw, _ := json.Marshal(settings)
	_, err := s.pool.Exec(ctx, `INSERT INTO app_settings (key, value, updated_at) VALUES ('paystack',$1,NOW())
		ON CONFLICT (key) DO UPDATE SET value=EXCLUDED.value, updated_at=NOW()`, raw)
	return settings, err
}

func (s *PostgresStore) GoogleSettings(ctx context.Context) (domain.GoogleSettings, error) {
	var raw []byte
	if err := s.pool.QueryRow(ctx, `SELECT value FROM app_settings WHERE key='google'`).Scan(&raw); err != nil {
		return domain.GoogleSettings{}, nil
	}
	var settings domain.GoogleSettings
	_ = json.Unmarshal(raw, &settings)
	return settings, nil
}

func (s *PostgresStore) UpdateGoogleSettings(ctx context.Context, settings domain.GoogleSettings) (domain.GoogleSettings, error) {
	raw, _ := json.Marshal(settings)
	_, err := s.pool.Exec(ctx, `INSERT INTO app_settings (key, value, updated_at) VALUES ('google',$1,NOW())
		ON CONFLICT (key) DO UPDATE SET value=EXCLUDED.value, updated_at=NOW()`, raw)
	return settings, err
}

func (s *PostgresStore) MeetingSettings(ctx context.Context) (domain.MeetingSettings, error) {
	var raw []byte
	if err := s.pool.QueryRow(ctx, `SELECT value FROM app_settings WHERE key='meeting_categories'`).Scan(&raw); err != nil {
		return domain.MeetingSettings{CategoryTypes: []string{"Online demo", "Sales consultation", "Product walkthrough", "Partnership discussion", "Post-expo follow-up"}}, nil
	}
	var settings domain.MeetingSettings
	_ = json.Unmarshal(raw, &settings)
	if len(settings.CategoryTypes) == 0 {
		settings.CategoryTypes = []string{"Online demo", "Sales consultation", "Product walkthrough", "Partnership discussion", "Post-expo follow-up"}
	}
	return settings, nil
}

func (s *PostgresStore) UpdateMeetingSettings(ctx context.Context, settings domain.MeetingSettings) (domain.MeetingSettings, error) {
	cleaned := cleanMeetingCategories(settings.CategoryTypes)
	if len(cleaned) == 0 {
		cleaned = []string{"Online demo", "Sales consultation", "Product walkthrough", "Partnership discussion", "Post-expo follow-up"}
	}
	settings.CategoryTypes = cleaned
	raw, _ := json.Marshal(settings)
	_, err := s.pool.Exec(ctx, `INSERT INTO app_settings (key, value, updated_at) VALUES ('meeting_categories',$1,NOW())
		ON CONFLICT (key) DO UPDATE SET value=EXCLUDED.value, updated_at=NOW()`, raw)
	return settings, err
}

func (s *PostgresStore) ExhibitorMeetingSettings(ctx context.Context, exhibitorID string) (domain.MeetingSettings, error) {
	var raw []byte
	if err := s.pool.QueryRow(ctx, `SELECT value FROM exhibitor_meeting_settings WHERE exhibitor_id=$1`, exhibitorID).Scan(&raw); err != nil {
		return s.MeetingSettings(ctx)
	}
	var settings domain.MeetingSettings
	_ = json.Unmarshal(raw, &settings)
	if len(settings.CategoryTypes) == 0 {
		return s.MeetingSettings(ctx)
	}
	return settings, nil
}

func (s *PostgresStore) UpdateExhibitorMeetingSettings(ctx context.Context, exhibitorID string, settings domain.MeetingSettings) (domain.MeetingSettings, error) {
	cleaned := cleanMeetingCategories(settings.CategoryTypes)
	if len(cleaned) == 0 {
		cleaned = []string{"Online demo", "Sales consultation", "Product walkthrough", "Partnership discussion", "Post-expo follow-up"}
	}
	settings.CategoryTypes = cleaned
	raw, _ := json.Marshal(settings)
	_, err := s.pool.Exec(ctx, `INSERT INTO exhibitor_meeting_settings (exhibitor_id, value, updated_at) VALUES ($1,$2,NOW())
		ON CONFLICT (exhibitor_id) DO UPDATE SET value=EXCLUDED.value, updated_at=NOW()`, exhibitorID, raw)
	return settings, err
}

func (s *PostgresStore) OpenAISettings(ctx context.Context) (domain.OpenAISettings, error) {
	var raw []byte
	if err := s.pool.QueryRow(ctx, `SELECT value FROM app_settings WHERE key='openai'`).Scan(&raw); err != nil {
		return domain.OpenAISettings{Enabled: false, Model: "gpt-4.1-mini"}, nil
	}
	settings := domain.OpenAISettings{Enabled: false, Model: "gpt-4.1-mini"}
	_ = json.Unmarshal(raw, &settings)
	if strings.TrimSpace(settings.Model) == "" {
		settings.Model = "gpt-4.1-mini"
	}
	return settings, nil
}

func (s *PostgresStore) UpdateOpenAISettings(ctx context.Context, settings domain.OpenAISettings) (domain.OpenAISettings, error) {
	if strings.TrimSpace(settings.Model) == "" {
		settings.Model = "gpt-4.1-mini"
	}
	raw, _ := json.Marshal(settings)
	_, err := s.pool.Exec(ctx, `INSERT INTO app_settings (key, value, updated_at) VALUES ('openai',$1,NOW())
		ON CONFLICT (key) DO UPDATE SET value=EXCLUDED.value, updated_at=NOW()`, raw)
	return settings, err
}

func (s *PostgresStore) LatestAIAnalyticsSummary(ctx context.Context, scope string, scopeID string, countryCode string) (domain.AIAnalyticsSummary, error) {
	var item domain.AIAnalyticsSummary
	var risks, opportunities, recommendations, nextActions, sourceMetrics []byte
	var generated time.Time
	err := s.pool.QueryRow(ctx, `SELECT id, scope, scope_id, country_code, summary, risks, opportunities, recommendations, next_actions, confidence_notes, source_metrics, generated_by, generated_at, provider, model, status, COALESCE(error_message,'')
		FROM ai_analytics_summaries
		WHERE scope=$1 AND scope_id=$2 AND country_code=$3
		ORDER BY generated_at DESC
		LIMIT 1`, scope, scopeID, countryCode).Scan(&item.ID, &item.Scope, &item.ScopeID, &item.CountryCode, &item.Summary, &risks, &opportunities, &recommendations, &nextActions, &item.ConfidenceNotes, &sourceMetrics, &item.GeneratedBy, &generated, &item.Provider, &item.Model, &item.Status, &item.ErrorMessage)
	if err != nil {
		return domain.AIAnalyticsSummary{}, ErrNotFound
	}
	item.GeneratedAt = generated.UTC().Format(time.RFC3339)
	_ = json.Unmarshal(risks, &item.Risks)
	_ = json.Unmarshal(opportunities, &item.Opportunities)
	_ = json.Unmarshal(recommendations, &item.Recommendations)
	_ = json.Unmarshal(nextActions, &item.NextActions)
	_ = json.Unmarshal(sourceMetrics, &item.SourceMetrics)
	return item, nil
}

func (s *PostgresStore) SaveAIAnalyticsSummary(ctx context.Context, summary domain.AIAnalyticsSummary) (domain.AIAnalyticsSummary, error) {
	if strings.TrimSpace(summary.ID) == "" {
		summary.ID = fmt.Sprintf("ais_%d", time.Now().UTC().UnixNano())
	}
	if strings.TrimSpace(summary.GeneratedAt) == "" {
		summary.GeneratedAt = time.Now().UTC().Format(time.RFC3339)
	}
	risks, _ := json.Marshal(summary.Risks)
	opportunities, _ := json.Marshal(summary.Opportunities)
	recommendations, _ := json.Marshal(summary.Recommendations)
	nextActions, _ := json.Marshal(summary.NextActions)
	sourceMetrics, _ := json.Marshal(summary.SourceMetrics)
	_, err := s.pool.Exec(ctx, `INSERT INTO ai_analytics_summaries (id, scope, scope_id, country_code, summary, risks, opportunities, recommendations, next_actions, confidence_notes, source_metrics, generated_by, generated_at, provider, model, status, error_message)
		VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17)`,
		summary.ID, summary.Scope, summary.ScopeID, summary.CountryCode, summary.Summary, risks, opportunities, recommendations, nextActions, summary.ConfidenceNotes, sourceMetrics, summary.GeneratedBy, summary.GeneratedAt, summary.Provider, summary.Model, summary.Status, summary.ErrorMessage)
	return summary, err
}

func (s *PostgresStore) WhatsappSettings(ctx context.Context) (domain.WhatsappSettings, error) {
	var raw []byte
	if err := s.pool.QueryRow(ctx, `SELECT value FROM app_settings WHERE key='whatsapp'`).Scan(&raw); err != nil {
		return domain.WhatsappSettings{}, nil
	}
	var settings domain.WhatsappSettings
	_ = json.Unmarshal(raw, &settings)
	return settings, nil
}

func (s *PostgresStore) UpdateWhatsappSettings(ctx context.Context, settings domain.WhatsappSettings) (domain.WhatsappSettings, error) {
	raw, _ := json.Marshal(settings)
	_, err := s.pool.Exec(ctx, `INSERT INTO app_settings (key, value, updated_at) VALUES ('whatsapp',$1,NOW())
		ON CONFLICT (key) DO UPDATE SET value=EXCLUDED.value, updated_at=NOW()`, raw)
	return settings, err
}

func replaceExpoCategories(ctx context.Context, tx pgx.Tx, expoID string, categoryIDs []string) error {
	if _, err := tx.Exec(ctx, `DELETE FROM expo_categories WHERE expo_id=$1`, expoID); err != nil {
		return err
	}
	for _, id := range categoryIDs {
		if strings.TrimSpace(id) == "" {
			continue
		}
		if _, err := tx.Exec(ctx, `INSERT INTO expo_categories (expo_id, category_id) VALUES ($1,$2) ON CONFLICT DO NOTHING`, expoID, id); err != nil {
			return err
		}
	}
	return nil
}

func nullEmpty(value string) any {
	if value == "" {
		return nil
	}
	return value
}

func defaultString(value string, fallback string) string {
	if strings.TrimSpace(value) == "" {
		return fallback
	}
	return strings.TrimSpace(value)
}

func maxInt64(value int64, fallback int64) int64 {
	if value > fallback {
		return value
	}
	return fallback
}

func validateProductInput(input domain.ProductInput) error {
	if strings.TrimSpace(input.Name) == "" || input.Price < 0 || input.DiscountedPrice < 0 {
		return ErrInvalidCredentials
	}
	if len(compactProductStrings(input.ImageURLs)) > 5 {
		return ErrInvalidCredentials
	}
	status := defaultString(input.Status, "available")
	if !validPublicProductStatus(status) {
		return ErrInvalidCredentials
	}
	mediaType := defaultString(input.MediaType, "image")
	if mediaType != "image" && mediaType != "video" {
		return ErrInvalidCredentials
	}
	return nil
}

func compactProductStrings(values []string) []string {
	out := []string{}
	seen := map[string]bool{}
	for _, value := range values {
		clean := strings.TrimSpace(value)
		if clean == "" || seen[clean] {
			continue
		}
		seen[clean] = true
		out = append(out, clean)
	}
	return out
}

func validPublicProductStatus(status string) bool {
	switch strings.TrimSpace(status) {
	case "available", "out_of_stock", "discontinued":
		return true
	default:
		return false
	}
}

func storageProductStatus(status string) string {
	switch strings.TrimSpace(status) {
	case "out_of_stock":
		return "draft"
	case "discontinued":
		return "archived"
	default:
		return "active"
	}
}

func publicProductStatus(status string) string {
	switch strings.TrimSpace(status) {
	case "draft":
		return "out_of_stock"
	case "archived":
		return "discontinued"
	default:
		return "available"
	}
}

func storagePIIValue(protector security.PIIProtector, value string) string {
	value = strings.TrimSpace(value)
	if !protector.Enabled() {
		return value
	}
	hash := protector.Hash(value)
	if hash == "" {
		return ""
	}
	return "pii:" + hash
}

func looksLikeProtectedPII(value string) bool {
	return strings.HasPrefix(strings.TrimSpace(value), "pii:")
}

func firstNonEmptyString(values ...string) string {
	for _, value := range values {
		if cleaned := strings.TrimSpace(value); cleaned != "" {
			return cleaned
		}
	}
	return ""
}

func displayNameForUser(user domain.User, fallback string) string {
	if cleaned := strings.TrimSpace(user.CompanyName); cleaned != "" && !looksLikeProtectedPII(cleaned) {
		return cleaned
	}
	if cleaned := strings.TrimSpace(user.Name); cleaned != "" && !looksLikeProtectedPII(cleaned) {
		return cleaned
	}
	if cleaned := strings.TrimSpace(fallback); cleaned != "" {
		return cleaned
	}
	return "User"
}

func uniqueStrings(values []string) []string {
	seen := map[string]struct{}{}
	items := []string{}
	for _, value := range values {
		cleaned := strings.TrimSpace(value)
		if cleaned == "" {
			continue
		}
		key := strings.ToLower(cleaned)
		if _, ok := seen[key]; ok {
			continue
		}
		seen[key] = struct{}{}
		items = append(items, cleaned)
	}
	return items
}

func splitStoredEmails(value string) []string {
	items := []string{}
	for _, part := range strings.Split(value, ",") {
		if cleaned := strings.TrimSpace(part); cleaned != "" {
			items = append(items, cleaned)
		}
	}
	return items
}

func (s *PostgresStore) decryptUser(user domain.User, emailCipher string, nameCipher string, companyCipher string) domain.User {
	if email := s.pii.Decrypt(emailCipher); strings.TrimSpace(email) != "" {
		user.Email = email
	}
	if name := s.pii.Decrypt(nameCipher); strings.TrimSpace(name) != "" {
		user.Name = name
	}
	if company := s.pii.Decrypt(companyCipher); strings.TrimSpace(company) != "" {
		user.CompanyName = company
	}
	return user
}

func validRole(role domain.Role) bool {
	switch role {
	case domain.RoleVisitor, domain.RoleExhibitor, domain.RoleOrganizer, domain.RoleSponsor, domain.RoleAdministrator, domain.RoleSuperAdmin:
		return true
	default:
		return false
	}
}

func isAdminRole(role domain.Role) bool {
	return role == domain.RoleAdministrator || role == domain.RoleSuperAdmin
}

func defaultAdminRole(role domain.Role) domain.Role {
	if role == domain.RoleAdministrator || role == domain.RoleSuperAdmin {
		return role
	}
	return domain.RoleSuperAdmin
}

func validAccountStatus(status string) bool {
	switch strings.TrimSpace(status) {
	case "active", "inactive", "suspended":
		return true
	default:
		return false
	}
}
