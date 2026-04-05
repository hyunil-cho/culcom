export function MessageButton({ onClick }: { onClick: () => void }) {
  return (
    <button type="button" onClick={onClick}
      style={{ padding: '5px 12px', fontSize: '0.85rem', fontWeight: 600, cursor: 'pointer', background: '#fff', color: '#2c3e50', border: '1px solid #2c3e50', borderRadius: 4 }}>
      메시지
    </button>
  );
}
