# 데이터베이스 연결 가이드

## 지원하는 데이터베이스

### 1. MySQL
```bash
# 드라이버 설치
go get -u github.com/go-sql-driver/mysql

# .env 설정
DB_DRIVER=mysql
DB_HOST=localhost
DB_PORT=3306
DB_USER=root
DB_PASSWORD=your_password
DB_NAME=backoffice
```

### 2. PostgreSQL
```bash
# 드라이버 설치
go get -u github.com/lib/pq

# .env 설정
DB_DRIVER=postgres
DB_HOST=localhost
DB_PORT=5432
DB_USER=postgres
DB_PASSWORD=your_password
DB_NAME=backoffice
DB_SSLMODE=disable
```

### 3. SQLite
```bash
# 드라이버 설치
go get -u github.com/mattn/go-sqlite3

# .env 설정
DB_DRIVER=sqlite3
DB_NAME=./data.db
```

### 4. SQL Server
```bash
# 드라이버 설치
go get -u github.com/denisenkom/go-mssqldb

# .env 설정
DB_DRIVER=sqlserver
DB_HOST=localhost
DB_PORT=1433
DB_USER=sa
DB_PASSWORD=your_password
DB_NAME=backoffice
```

## 사용 방법

### database/db.go 파일에서 해당 드라이버 import 주석 해제
```go
import (
    _ "github.com/go-sql-driver/mysql"  // MySQL 사용 시
)
```

### main.go에서 초기화
```go
import "backoffice/database"

func main() {
    // DB 초기화
    if err := database.Init(); err != nil {
        log.Fatal(err)
    }
    defer database.Close()
    
    // 서버 시작...
}
```

## 쿼리 예시

### 단일 행 조회
```go
var name string
err := database.SelectOne("SELECT name FROM users WHERE id = ?", &name, 1)
```

### 다중 행 조회
```go
customers := []Customer{}
err := database.SelectMultiple(
    "SELECT id, name, phone FROM customers",
    func(rows *sql.Rows) error {
        var c Customer
        if err := rows.Scan(&c.ID, &c.Name, &c.Phone); err != nil {
            return err
        }
        customers = append(customers, c)
        return nil
    },
)
```

### INSERT
```go
id, err := database.Insert(
    "INSERT INTO customers (name, phone, email) VALUES (?, ?, ?)",
    "홍길동", "010-1234-5678", "hong@email.com",
)
```

### UPDATE
```go
affected, err := database.Update(
    "UPDATE customers SET name = ? WHERE id = ?",
    "김철수", 1,
)
```

### DELETE
```go
affected, err := database.Delete(
    "DELETE FROM customers WHERE id = ?",
    1,
)
```

### 트랜잭션
```go
err := database.Transaction(func(tx *sql.Tx) error {
    _, err := tx.Exec("INSERT INTO orders (customer_id, amount) VALUES (?, ?)", 1, 10000)
    if err != nil {
        return err
    }
    _, err = tx.Exec("UPDATE customers SET last_order = NOW() WHERE id = ?", 1)
    return err
})
```
