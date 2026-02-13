package config

import (
	"fmt"
	"os"
	"strings"
	"time"
)

// Version 정보를 담는 구조체
type VersionInfo struct {
	Version     string `json:"version"`
	BuildTime   string `json:"build_time"`
	GoVersion   string `json:"go_version"`
	GitCommit   string `json:"git_commit,omitempty"`
	Environment string `json:"environment"`
}

var (
	// 빌드 시점에 ldflags로 주입될 수 있는 변수들
	Version   = "dev"     // VERSION 파일에서 읽거나 빌드 시 주입
	BuildTime = "unknown" // 빌드 시점
	GitCommit = ""        // Git 커밋 해시
	GoVersion = "unknown" // Go 버전
)

// GetVersion - VERSION 파일에서 버전 정보를 읽어옴
func GetVersion() string {
	// 이미 버전이 설정되어 있고 "dev"가 아니면 그대로 반환 (빌드 시 주입된 경우)
	if Version != "dev" {
		return Version
	}

	// VERSION 파일에서 읽기 시도
	data, err := os.ReadFile("VERSION")
	if err == nil {
		version := strings.TrimSpace(string(data))
		if version != "" {
			Version = version
			return version
		}
	}

	// 실패 시 기본값 반환
	return Version
}

// GetVersionInfo - 전체 버전 정보를 반환
func GetVersionInfo() VersionInfo {
	version := GetVersion()

	return VersionInfo{
		Version:     version,
		BuildTime:   BuildTime,
		GoVersion:   GoVersion,
		GitCommit:   GitCommit,
		Environment: GetEnvironment(),
	}
}

// GetVersionString - 버전 정보를 문자열로 반환
func GetVersionString() string {
	info := GetVersionInfo()

	versionStr := fmt.Sprintf("Version: %s", info.Version)

	if info.BuildTime != "unknown" {
		versionStr += fmt.Sprintf("\nBuild Time: %s", info.BuildTime)
	}

	if info.GitCommit != "" {
		versionStr += fmt.Sprintf("\nGit Commit: %s", info.GitCommit)
	}

	if info.GoVersion != "unknown" {
		versionStr += fmt.Sprintf("\nGo Version: %s", info.GoVersion)
	}

	versionStr += fmt.Sprintf("\nEnvironment: %s", info.Environment)

	return versionStr
}

// SetBuildInfo - 빌드 정보를 설정 (테스트나 개발 중에 사용)
func SetBuildInfo(version, buildTime, gitCommit, goVersion string) {
	if version != "" {
		Version = version
	}
	if buildTime != "" {
		BuildTime = buildTime
	}
	if gitCommit != "" {
		GitCommit = gitCommit
	}
	if goVersion != "" {
		GoVersion = goVersion
	}
}

// InitVersion - 버전 정보 초기화 (애플리케이션 시작 시 호출)
func InitVersion() {
	// VERSION 파일에서 버전 읽기
	GetVersion()

	// BuildTime이 설정되지 않았으면 현재 시간으로 설정 (개발 모드)
	if BuildTime == "unknown" {
		BuildTime = time.Now().Format("2006-01-02 15:04:05")
	}
}
