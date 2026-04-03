'use client';

import { useEffect, useState, useRef, useCallback } from 'react';
import { QRCodeCanvas } from 'qrcode.react';
import { kakaoSyncApi } from '@/lib/api';
import { Button } from '@/components/ui/Button';

export default function KakaoSyncPage() {
  const [kakaoSyncUrl, setKakaoSyncUrl] = useState('');
  const [branchName, setBranchName] = useState('');
  const [qrSize, setQrSize] = useState(300);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const downloadRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    kakaoSyncApi.getUrl().then((res) => {
      if (res.success) {
        setKakaoSyncUrl(res.data.kakaoSyncUrl);
        setBranchName(res.data.branchName);
      }
    });
  }, []);

  const copyUrl = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(kakaoSyncUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      const input = document.createElement('input');
      input.value = kakaoSyncUrl;
      document.body.appendChild(input);
      input.select();
      document.execCommand('copy');
      document.body.removeChild(input);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  }, [kakaoSyncUrl]);

  const downloadQR = useCallback(() => {
    const padding = Math.max(15, Math.floor(qrSize * 0.05));
    const qrInnerSize = qrSize - padding * 2;

    const tempCanvas = document.createElement('canvas');
    tempCanvas.width = qrSize;
    tempCanvas.height = qrSize;
    const ctx = tempCanvas.getContext('2d');
    if (!ctx) return;

    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, qrSize, qrSize);

    // QRCodeCanvas를 임시로 렌더링하여 이미지 데이터를 가져옴
    const offscreen = document.createElement('canvas');
    offscreen.width = qrInnerSize;
    offscreen.height = qrInnerSize;

    // 현재 페이지에 있는 preview QR canvas 또는 hidden canvas 사용
    const sourceCanvas = document.querySelector('#download-qr canvas') as HTMLCanvasElement;
    if (sourceCanvas) {
      ctx.drawImage(sourceCanvas, padding, padding, qrInnerSize, qrInnerSize);
    }

    const dataURL = tempCanvas.toDataURL('image/png');
    const link = document.createElement('a');
    link.download = `kakaosync-qr-${branchName}-${qrSize}px.png`;
    link.href = dataURL;
    link.click();
  }, [qrSize, branchName]);

  const presetSizes = [
    { label: '기본 (300px)', value: 300 },
    { label: '중형 (600px)', value: 600 },
    { label: '인쇄용 (1000px)', value: 1000 },
  ];

  if (!kakaoSyncUrl) {
    return (
      <div style={{ padding: '2rem', textAlign: 'center', color: '#666' }}>
        로딩 중...
      </div>
    );
  }

  return (
    <>
      <div style={{ marginBottom: '2rem' }}>
        <h1 style={{ fontSize: '1.5rem', fontWeight: 700, color: '#1a1a1a', marginBottom: '0.5rem' }}>
          카카오싱크 URL 및 QR 코드 생성
        </h1>
        <p style={{ color: '#666', fontSize: '0.95rem' }}>
          현재 선택된 지점(<strong>{branchName}</strong>) 전용 카카오싱크 연결 정보입니다.
        </p>
      </div>

      {/* URL 섹션 */}
      <div className="content-card" style={{ marginBottom: '1.5rem', padding: '1.5rem' }}>
        <h3 style={{ fontSize: '1.1rem', fontWeight: 600, color: '#333', marginBottom: '1.2rem', display: 'flex', alignItems: 'center', gap: 8 }}>
          카카오싱크 연결 URL
        </h3>
        <div style={{ background: '#f8f9fa', border: '1px solid #e5e7eb', borderRadius: 8, padding: '1.25rem' }}>
          <div style={{ display: 'flex', gap: 8 }}>
            <input
              type="text"
              value={kakaoSyncUrl}
              readOnly
              style={{
                flex: 1, padding: '0.75rem', border: '1px solid #d1d5db',
                borderRadius: 6, background: 'white', fontFamily: 'monospace',
                fontSize: '0.9rem', color: '#374151',
              }}
            />
            <Button
              onClick={copyUrl}
              style={{ padding: '0 1.25rem', whiteSpace: 'nowrap' }}
            >
              {copied ? '복사됨!' : 'URL 복사'}
            </Button>
          </div>
        </div>
      </div>

      {/* QR 코드 설정 섹션 */}
      <div className="content-card" style={{ padding: '1.5rem' }}>
        <h3 style={{ fontSize: '1.1rem', fontWeight: 600, color: '#333', marginBottom: '1.2rem' }}>
          QR 코드 설정 및 생성
        </h3>
        <div style={{ maxWidth: 600, margin: '0 auto', background: '#fafafa', padding: '2rem', borderRadius: 12, border: '1px solid #eee' }}>
          {/* 크기 슬라이더 */}
          <div style={{ marginBottom: '2rem' }}>
            <label style={{ display: 'block', fontWeight: 600, marginBottom: 15, color: '#4b5563', textAlign: 'center' }}>
              출력 크기 설정: <span style={{ color: '#007bff', fontSize: '1.2rem' }}>{qrSize}</span> x <span style={{ color: '#007bff', fontSize: '1.2rem' }}>{qrSize}</span> px
            </label>
            <input
              type="range"
              min={128}
              max={1200}
              step={32}
              value={qrSize}
              onChange={(e) => setQrSize(Number(e.target.value))}
              style={{ width: '100%', cursor: 'pointer' }}
            />
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', color: '#9ca3af', marginTop: 8 }}>
              <span>작게 (128px)</span>
              <span>크게 (1200px)</span>
            </div>
          </div>

          {/* 프리셋 버튼 */}
          <div style={{ display: 'flex', justifyContent: 'center', gap: 10, marginBottom: '2rem' }}>
            {presetSizes.map((p) => (
              <Button
                key={p.value}
                variant="secondary"
                style={{ padding: '6px 16px', fontSize: '0.85rem' }}
                onClick={() => setQrSize(p.value)}
              >
                {p.label}
              </Button>
            ))}
          </div>

          {/* 액션 버튼 */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <Button
              variant="secondary"
              onClick={() => setPreviewOpen(true)}
              style={{ padding: '1rem', fontSize: '1rem', fontWeight: 600, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}
            >
              실제 크기 미리보기
            </Button>
            <Button
              onClick={downloadQR}
              style={{ padding: '1rem', fontSize: '1rem', fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}
            >
              PNG 다운로드
            </Button>
          </div>
        </div>
      </div>

      {/* 다운로드용 숨겨진 QR 캔버스 */}
      <div id="download-qr" style={{ position: 'absolute', left: -9999, top: -9999 }}>
        <QRCodeCanvas
          value={kakaoSyncUrl}
          size={qrSize}
          level="H"
          ref={downloadRef}
        />
      </div>

      {/* 미리보기 모달 */}
      {previewOpen && (
        <div
          onClick={(e) => { if (e.target === e.currentTarget) setPreviewOpen(false); }}
          style={{
            position: 'fixed', top: 0, left: 0, width: '100%', height: '100%',
            background: 'rgba(0,0,0,0.7)', zIndex: 10000,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}
        >
          <div style={{
            background: 'white', borderRadius: 16, width: '90%', maxWidth: 900,
            maxHeight: '90vh', display: 'flex', flexDirection: 'column', overflow: 'hidden',
          }}>
            {/* 모달 헤더 */}
            <div style={{
              padding: '1.25rem 1.5rem', borderBottom: '1px solid #eee',
              display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#f8f9fa',
            }}>
              <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 700 }}>
                QR 코드 실제 크기 미리보기 ({qrSize}px)
              </h3>
              <button
                onClick={() => setPreviewOpen(false)}
                style={{ background: 'none', border: 'none', fontSize: '1.5rem', cursor: 'pointer', color: '#999' }}
              >
                &times;
              </button>
            </div>

            {/* 모달 본문 */}
            <div style={{
              flex: 1, overflow: 'auto', padding: '2rem',
              display: 'flex', justifyContent: 'center', alignItems: 'flex-start', background: '#f0f0f0',
            }}>
              <div style={{
                background: 'white', padding: Math.max(15, Math.floor(qrSize * 0.05)),
                boxShadow: '0 10px 25px rgba(0,0,0,0.1)', borderRadius: 8, display: 'inline-block',
              }}>
                <QRCodeCanvas
                  value={kakaoSyncUrl}
                  size={qrSize - Math.max(15, Math.floor(qrSize * 0.05)) * 2}
                  level="H"
                />
              </div>
            </div>

            {/* 모달 푸터 */}
            <div style={{ padding: '1rem', borderTop: '1px solid #eee', textAlign: 'center', background: '#fff' }}>
              <p style={{ fontSize: '0.85rem', color: '#666', marginBottom: '1rem' }}>
                ※ 화면보다 큰 경우 스크롤하여 확인할 수 있습니다.
              </p>
              <Button onClick={downloadQR} style={{ padding: '0.75rem 2rem' }}>
                이 크기로 다운로드
              </Button>
              <Button
                variant="secondary"
                onClick={() => setPreviewOpen(false)}
                style={{ padding: '0.75rem 2rem', marginLeft: 8 }}
              >
                닫기
              </Button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}