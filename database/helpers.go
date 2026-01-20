package database

import (
	"database/sql"
	"fmt"
)

// QueryHelper - 쿼리 헬퍼 함수들

// SelectOne - 단일 행 조회 및 스캔
// 사용 예: var name string; err := SelectOne("SELECT name FROM users WHERE id = ?", &name, 1)
func SelectOne(query string, dest interface{}, args ...interface{}) error {
	return DB.QueryRow(query, args...).Scan(dest)
}

// SelectMultiple - 다중 행 조회 및 처리
// 사용 예:
//
//	err := SelectMultiple("SELECT id, name FROM users", func(rows *sql.Rows) error {
//	    var id int
//	    var name string
//	    if err := rows.Scan(&id, &name); err != nil {
//	        return err
//	    }
//	    // 데이터 처리
//	    return nil
//	})
func SelectMultiple(query string, scanFunc func(*sql.Rows) error, args ...interface{}) error {
	rows, err := DB.Query(query, args...)
	if err != nil {
		return err
	}
	defer rows.Close()

	for rows.Next() {
		if err := scanFunc(rows); err != nil {
			return err
		}
	}

	return rows.Err()
}

// Insert - INSERT 실행 및 생성된 ID 반환
func Insert(query string, args ...interface{}) (int64, error) {
	result, err := DB.Exec(query, args...)
	if err != nil {
		return 0, err
	}
	return result.LastInsertId()
}

// Update - UPDATE 실행 및 영향받은 행 수 반환
func Update(query string, args ...interface{}) (int64, error) {
	result, err := DB.Exec(query, args...)
	if err != nil {
		return 0, err
	}
	return result.RowsAffected()
}

// Delete - DELETE 실행 및 영향받은 행 수 반환
func Delete(query string, args ...interface{}) (int64, error) {
	result, err := DB.Exec(query, args...)
	if err != nil {
		return 0, err
	}
	return result.RowsAffected()
}

// Transaction - 트랜잭션 실행
// 사용 예:
//
//	err := Transaction(func(tx *sql.Tx) error {
//	    _, err := tx.Exec("INSERT INTO users (name) VALUES (?)", "John")
//	    if err != nil {
//	        return err
//	    }
//	    _, err = tx.Exec("UPDATE accounts SET balance = balance - 100 WHERE user_id = ?", 1)
//	    return err
//	})
func Transaction(fn func(*sql.Tx) error) error {
	tx, err := DB.Begin()
	if err != nil {
		return err
	}

	defer func() {
		if p := recover(); p != nil {
			tx.Rollback()
			panic(p)
		}
	}()

	if err := fn(tx); err != nil {
		tx.Rollback()
		return err
	}

	return tx.Commit()
}

// Exists - 레코드 존재 여부 확인
func Exists(query string, args ...interface{}) (bool, error) {
	var exists bool
	query = fmt.Sprintf("SELECT EXISTS(%s)", query)
	err := DB.QueryRow(query, args...).Scan(&exists)
	return exists, err
}

// Count - 레코드 개수 반환
func Count(query string, args ...interface{}) (int, error) {
	var count int
	err := DB.QueryRow(query, args...).Scan(&count)
	return count, err
}
