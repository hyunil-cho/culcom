package opens

import (
	"backoffice/config"
	"encoding/json"
	"net/http"
)

// VersionHandler godoc
// @Summary      버전 정보 조회
// @Description  애플리케이션의 버전 정보를 반환합니다
// @Tags         system
// @Produce      json
// @Success      200  {object}  config.VersionInfo  "버전 정보"
// @Router       /api/version [get]
func VersionHandler(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	versionInfo := config.GetVersionInfo()

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(versionInfo)
}

// HealthCheckHandler godoc
// @Summary      헬스 체크
// @Description  서버 상태를 확인합니다 (버전 정보 포함)
// @Tags         system
// @Produce      json
// @Success      200  {object}  map[string]interface{}  "상태 정보"
// @Router       /health [get]
func HealthCheckHandler(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	versionInfo := config.GetVersionInfo()

	response := map[string]interface{}{
		"status":      "ok",
		"version":     versionInfo.Version,
		"environment": versionInfo.Environment,
		"timestamp":   versionInfo.BuildTime,
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(response)
}
