import ErrorPage from '@/components/ErrorPage';

export default function NotFound() {
  return (
    <ErrorPage
      code="404"
      title="페이지를 찾을 수 없습니다"
      message="요청하신 페이지가 존재하지 않거나 이동되었습니다."
    />
  );
}
