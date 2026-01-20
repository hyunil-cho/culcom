package config

import (
	"fmt"
	"os"
)

// Environment - 실행 환경
type Environment string

const (
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

// Config - 전체 설정 구조체
type Config struct {
	Env    Environment
	DB     DBConfig
	Server ServerConfig
}

var currentConfig *Config

// Init - 설정 초기화 (환경별 로드)
func Init() error {
	env := GetEnvironment()

	// 환경별 .env 파일 로드 시도
	envFile := fmt.Sprintf(".env.%s", env)
	if _, err := os.Stat(envFile); err == nil {
		// 환경별 파일이 있으면 해당 파일의 환경변수를 로드
		// godotenv 사용 시: godotenv.Load(envFile)
		fmt.Printf("환경 파일 로드: %s\n", envFile)
	} else {
		// 기본 .env 파일 로드
		if _, err := os.Stat(".env"); err == nil {
			// godotenv.Load()
			fmt.Println("기본 .env 파일 로드")
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
	}

	return nil
}

// GetEnvironment - 현재 실행 환경 반환
func GetEnvironment() Environment {
	env := os.Getenv("APP_ENV")
	switch env {
	case "dev", "development":
		return Dev
	case "staging", "stage":
		return Staging
	case "prod", "production":
		return Production
	default:
		return Dev // 기본값
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
