'use client';

import { useEffect, useState, useRef, useCallback } from 'react';
import { QRCodeCanvas } from 'qrcode.react';
import { kakaoSyncApi } from '@/lib/api';
import { Button } from '@/components/ui/Button';
import styles from './page.module.css';

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
    return <div className={styles.loading}>로딩 중...</div>;
  }

  return (
    <>
      <div className={styles.header}>
        <h1 className={styles.title}>카카오싱크 URL 및 QR 코드 생성</h1>
        <p className={styles.subtitle}>
          현재 선택된 지점(<strong>{branchName}</strong>) 전용 카카오싱크 연결 정보입니다.
        </p>
      </div>

      <div className={`content-card ${styles.section}`}>
        <h3 className={styles.sectionTitle}>카카오싱크 연결 URL</h3>
        <div className={styles.urlBox}>
          <div className={styles.urlRow}>
            <input type="text" value={kakaoSyncUrl} readOnly className={styles.urlInput} />
            <Button onClick={copyUrl} style={{ padding: '0 1.25rem', whiteSpace: 'nowrap' }}>
              {copied ? '복사됨!' : 'URL 복사'}
            </Button>
          </div>
        </div>
      </div>

      <div className={`content-card ${styles.section}`}>
        <h3 className={styles.sectionTitle}>QR 코드 설정 및 생성</h3>
        <div className={styles.qrContainer}>
          <div className={styles.sizeGroup}>
            <label className={styles.sizeLabel}>
              출력 크기 설정: <span className={styles.sizeValue}>{qrSize}</span> x <span className={styles.sizeValue}>{qrSize}</span> px
            </label>
            <input type="range" min={128} max={1200} step={32} value={qrSize}
              onChange={(e) => setQrSize(Number(e.target.value))} className={styles.slider} />
            <div className={styles.sliderRange}>
              <span>작게 (128px)</span>
              <span>크게 (1200px)</span>
            </div>
          </div>

          <div className={styles.presetRow}>
            {presetSizes.map((p) => (
              <Button key={p.value} variant="secondary"
                style={{ padding: '6px 16px', fontSize: '0.85rem' }}
                onClick={() => setQrSize(p.value)}>
                {p.label}
              </Button>
            ))}
          </div>

          <div className={styles.actionGrid}>
            <Button variant="secondary" onClick={() => setPreviewOpen(true)}
              style={{ padding: '1rem', fontSize: '1rem', fontWeight: 600, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
              실제 크기 미리보기
            </Button>
            <Button onClick={downloadQR}
              style={{ padding: '1rem', fontSize: '1rem', fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
              PNG 다운로드
            </Button>
          </div>
        </div>
      </div>

      <div id="download-qr" className={styles.hiddenQr}>
        <QRCodeCanvas value={kakaoSyncUrl} size={qrSize} level="H" ref={downloadRef} />
      </div>

      {previewOpen && (
        <div className={styles.previewOverlay}
          onClick={(e) => { if (e.target === e.currentTarget) setPreviewOpen(false); }}>
          <div className={styles.previewModal}>
            <div className={styles.previewHeader}>
              <h3 className={styles.previewTitle}>QR 코드 실제 크기 미리보기 ({qrSize}px)</h3>
              <button onClick={() => setPreviewOpen(false)} className={styles.previewCloseBtn}>&times;</button>
            </div>
            <div className={styles.previewBody}>
              <div className={styles.previewQrWrap}
                style={{ padding: Math.max(15, Math.floor(qrSize * 0.05)) }}>
                <QRCodeCanvas value={kakaoSyncUrl}
                  size={qrSize - Math.max(15, Math.floor(qrSize * 0.05)) * 2} level="H" />
              </div>
            </div>
            <div className={styles.previewFooter}>
              <p className={styles.previewHint}>※ 화면보다 큰 경우 스크롤하여 확인할 수 있습니다.</p>
              <Button onClick={downloadQR} style={{ padding: '0.75rem 2rem' }}>이 크기로 다운로드</Button>
              <Button variant="secondary" onClick={() => setPreviewOpen(false)}
                style={{ padding: '0.75rem 2rem', marginLeft: 8 }}>닫기</Button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}