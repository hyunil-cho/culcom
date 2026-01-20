package database

import (
	"database/sql"
	"fmt"
	"log"

	"backoffice/config"
	// 필요한 드라이버 import (사용할 때 주석 해제)
	// _ "github.com/go-sql-driver/mysql"           // MySQL
	// _ "github.com/lib/pq"                        // PostgreSQL
	// _ "github.com/mattn/go-sqlite3"              // SQLite
	// _ "github.com/denisenkom/go-mssqldb"         // SQL Server
)

var DB *sql.DB

// Init - 데이터베이스 연결 초기화
func Init() error {
	cfg := config.GetConfig().DB

	var dsn string
	switch cfg.Driver {
	case "mysql":
		// MySQL DSN: user:password@tcp(host:port)/dbname
		dsn = fmt.Sprintf("%s:%s@tcp(%s:%s)/%s?parseTime=true",
			cfg.User, cfg.Password, cfg.Host, cfg.Port, cfg.DBName)

	case "postgres":
		// PostgreSQL DSN: host=localhost port=5432 user=username password=password dbname=dbname sslmode=disable
		dsn = fmt.Sprintf("host=%s port=%s user=%s password=%s dbname=%s sslmode=%s",
			cfg.Host, cfg.Port, cfg.User, cfg.Password, cfg.DBName, cfg.SSLMode)

	case "sqlite3":
		// SQLite DSN: file path
		dsn = cfg.DBName

	case "sqlserver":
		// SQL Server DSN: sqlserver://username:password@host:port?database=dbname
		dsn = fmt.Sprintf("sqlserver://%s:%s@%s:%s?database=%s",
			cfg.User, cfg.Password, cfg.Host, cfg.Port, cfg.DBName)

	default:
		return fmt.Errorf("지원하지 않는 데이터베이스 드라이버: %s", cfg.Driver)
	}

	var err error
	DB, err = sql.Open(cfg.Driver, dsn)
	if err != nil {
		return fmt.Errorf("데이터베이스 연결 실패: %v", err)
	}

	// 연결 테스트
	if err = DB.Ping(); err != nil {
		return fmt.Errorf("데이터베이스 Ping 실패: %v", err)
	}

	// 커넥션 풀 설정
	DB.SetMaxOpenConns(25)
	DB.SetMaxIdleConns(5)

	log.Printf("데이터베이스 연결 성공: %s", cfg.Driver)
	return nil
}

// Close - 데이터베이스 연결 종료
func Close() error {
	if DB != nil {
		return DB.Close()
	}
	return nil
}

// QueryRow - 단일 행 조회
func QueryRow(query string, args ...interface{}) *sql.Row {
	return DB.QueryRow(query, args...)
}

// Query - 다중 행 조회
func Query(query string, args ...interface{}) (*sql.Rows, error) {
	return DB.Query(query, args...)
}

// Exec - 실행 (INSERT, UPDATE, DELETE)
func Exec(query string, args ...interface{}) (sql.Result, error) {
	return DB.Exec(query, args...)
}

// Begin - 트랜잭션 시작
func Begin() (*sql.Tx, error) {
	return DB.Begin()
}

// GetDB - DB 인스턴스 반환
func GetDB() *sql.DB {
	return DB
}
