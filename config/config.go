package config

import (
	"fmt"
	"os"

	"github.com/joho/godotenv"
)

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
	Port     string
	LogLevel string
	Debug    bool
}

// SMSConfig - SMS API 설정 구조체
type SMSConfig struct {
	APIBaseURL  string
	SMSEndpoint string
	LMSEndpoint string
	MaxLength   int
}

// Config - 전체 설정 구조체
type Config struct {
	Env    Environment
	DB     DBConfig
	Server ServerConfig
	SMS    SMSConfig
}

var currentConfig *Config

// Init - 설정 초기화 (환경별 로드)
func Init() error {
	env := GetEnvironment()

	// 환경별 .env 파일 로드 시도
	envFile := fmt.Sprintf(".env.%s", env)
	if _, err := os.Stat(envFile); err == nil {
		// 환경별 파일이 있으면 해당 파일의 환경변수를 로드
		if err := godotenv.Load(envFile); err != nil {
			fmt.Printf("환경 파일 로드 실패: %s, 오류: %v\n", envFile, err)
		} else {
			fmt.Printf("환경 파일 로드 완료: %s\n", envFile)
		}
	} else {
		// 기본 .env 파일 로드
		if _, err := os.Stat(".env"); err == nil {
			if err := godotenv.Load(); err != nil {
				fmt.Printf("기본 .env 파일 로드 실패: %v\n", err)
			} else {
				fmt.Println("기본 .env 파일 로드 완료")
			}
		}
	}

	currentConfig = &Config{
		Env: env,
		DB:  GetDBConfig(),
		Server: ServerConfig{
			Port:     getEnv("SERVER_PORT", "8080"),
			LogLevel: getEnv("LOG_LEVEL", "info"),
			Debug:    getEnv("DEBUG", "false") == "true",
		},
		SMS: SMSConfig{
			APIBaseURL:  getEnv("SMS_API_BASE_URL", "https://api.example.com"),
			SMSEndpoint: getEnv("SMS_ENDPOINT", "/send/sms"),
			LMSEndpoint: getEnv("LMS_ENDPOINT", "/send/lms"),
			MaxLength:   getEnvAsInt("SMS_MAX_LENGTH", 90),
		},
	}

	return nil
}

// GetEnvironment - 현재 실행 환경 반환
func GetEnvironment() Environment {
	env := os.Getenv("APP_ENV")
	switch env {
	case "local":
		return Local
	case "test", "testing":
		return Test
	case "dev", "development":
		return Dev
	case "staging", "stage":
		return Staging
	case "prod", "production":
		return Production
	default:
		return Local // 기본값을 Local로 변경
	}
}

// GetConfig - 현재 설정 반환
func GetConfig() *Config {
	if currentConfig == nil {
		Init()
	}
	return currentConfig
}

// IsDevelopment - 개발 환경 여부
func IsDevelopment() bool {
	return GetEnvironment() == Dev
}

// IsProduction - 운영 환경 여부
func IsProduction() bool {
	return GetEnvironment() == Production
}

// IsMockMode - Mock 모드 여부 (local 또는 test 환경)
func IsMockMode() bool {
	env := GetEnvironment()
	return env == Local || env == Test
}

// GetDBConfig - 환경변수에서 DB 설정 가져오기
func GetDBConfig() DBConfig {
	return DBConfig{
		Driver:   getEnv("DB_DRIVER", "mysql"),
		Host:     getEnv("DB_HOST", "localhost"),
		Port:     getEnv("DB_PORT", "3306"),
		User:     getEnv("DB_USER", "root"),
		Password: getEnv("DB_PASSWORD", ""),
		DBName:   getEnv("DB_NAME", "backoffice"),
		SSLMode:  getEnv("DB_SSLMODE", "disable"),
	}
}

// getEnv - 환경변수 가져오기 (기본값 포함)
func getEnv(key, defaultValue string) string {
	value := os.Getenv(key)
	if value == "" {
		return defaultValue
	}
	return value
}

// getEnvAsInt - 환경변수를 정수로 가져오기 (기본값 포함)
func getEnvAsInt(key string, defaultValue int) int {
	value := os.Getenv(key)
	if value == "" {
		return defaultValue
	}

	var intValue int
	if _, err := fmt.Sscanf(value, "%d", &intValue); err != nil {
		return defaultValue
	}
	return intValue
}
