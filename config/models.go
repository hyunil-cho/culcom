package config

// Environment - 실행 환경
type Environment string

const (
	Local      Environment = "local"
	Test       Environment = "test"
	Dev        Environment = "dev"
	Staging    Environment = "staging"
	Production Environment = "prod"
)

// DBConfig - 데이터베이스 설정 구조체
type DBConfig struct {
	Driver   string // "mysql", "postgres", "sqlite3", "sqlserver" 등
	Host     string
	Port     string
	User     string
	Password string
	DBName   string
	SSLMode  string // postgres용
}

// ServerConfig - 서버 설정 구조체
type ServerConfig struct {
	Port        string
	LogLevel    string
	Debug       bool
	TLSEnabled  bool
	TLSCertFile string
	TLSKeyFile  string
}

// SMSConfig - SMS API 설정 구조체
type SMSConfig struct {
	APIBaseURL  string
	SMSEndpoint string
	LMSEndpoint string
	MaxLength   int
}

// KakaoOAuthConfig - Kakao OAuth 설정 구조체
type KakaoOAuthConfig struct {
	ClientID     string
	ClientSecret string
	RedirectURI  string
}

// SessionConfig - 세션 설정 구조체
type SessionConfig struct {
	SecretKey string
	MaxAge    int
	Secure    bool
}

// Config - 전체 설정 구조체
type Config struct {
	Env        Environment
	DB         DBConfig
	Server     ServerConfig
	SMS        SMSConfig
	KakaoOAuth KakaoOAuthConfig
	Session    SessionConfig
}
