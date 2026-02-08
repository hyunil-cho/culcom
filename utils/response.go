package utils

import (
	"encoding/json"
	"net/http"
)

// JSONResponse - JSON 응답을 작성하는 공통 함수
func JSONResponse(w http.ResponseWriter, statusCode int, data interface{}) error {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(statusCode)
	return json.NewEncoder(w).Encode(data)
}

// JSONSuccess - 성공 응답을 작성하는 헬퍼 함수
func JSONSuccess(w http.ResponseWriter, data interface{}) error {
	// data가 map[string]interface{} 타입인지 확인
	if dataMap, ok := data.(map[string]interface{}); ok {
		// success 키가 없으면 추가
		if _, exists := dataMap["success"]; !exists {
			dataMap["success"] = true
		}
		return JSONResponse(w, http.StatusOK, dataMap)
	}
	
	// map이 아닌 경우, success 키와 함께 래핑
	return JSONResponse(w, http.StatusOK, map[string]interface{}{
		"success": true,
		"data":    data,
	})
}

// JSONError - 에러 응답을 작성하는 헬퍼 함수
func JSONError(w http.ResponseWriter, statusCode int, message string) error {
	return JSONResponse(w, statusCode, map[string]interface{}{
		"success": false,
		"error":   message,
	})
}

// JSONSuccessMessage - 성공 메시지 응답을 작성하는 헬퍼 함수
func JSONSuccessMessage(w http.ResponseWriter, message string) error {
	return JSONResponse(w, http.StatusOK, map[string]interface{}{
		"success": true,
		"message": message,
	})
}
