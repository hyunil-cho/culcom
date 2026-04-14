import { describe, it, expect } from 'vitest';

/**
 * 설문 불러오기 시 인적사항·코멘트 매핑 로직 테스트.
 *
 * add/page.tsx의 selectSubmission 내부에서 수행하는 변환 로직을
 * 순수 함수로 추출하여 검증한다.
 */

// selectSubmission 내부의 info/comment 매핑 로직을 재현
interface SurveyDetail {
  location: string | null;
  gender: string | null;
  ageGroup: string | null;
  occupation: string | null;
  adSource: string | null;
  customerComment: string | null;
}

function buildInfoAndComment(detail: SurveyDetail) {
  const info = [detail.location, detail.gender, detail.ageGroup, detail.occupation, detail.adSource]
    .filter(Boolean).join(' / ');
  const comment = detail.customerComment ?? '';
  return { info, comment };
}

describe('설문 → 회원폼 인적사항 매핑', () => {
  it('모든 인적사항 필드가 있을 때 "/" 구분으로 info에 매핑', () => {
    const detail: SurveyDetail = {
      location: '서울',
      gender: '남성',
      ageGroup: '30대',
      occupation: '직장인',
      adSource: '인스타그램',
      customerComment: '영어 초급',
    };

    const { info, comment } = buildInfoAndComment(detail);

    expect(info).toBe('서울 / 남성 / 30대 / 직장인 / 인스타그램');
    expect(comment).toBe('영어 초급');
  });

  it('일부 필드만 있으면 null/빈값은 제외하고 매핑', () => {
    const detail: SurveyDetail = {
      location: '부산',
      gender: null,
      ageGroup: '20대',
      occupation: null,
      adSource: null,
      customerComment: null,
    };

    const { info, comment } = buildInfoAndComment(detail);

    expect(info).toBe('부산 / 20대');
    expect(comment).toBe('');
  });

  it('모든 인적사항 필드가 null이면 info는 빈 문자열', () => {
    const detail: SurveyDetail = {
      location: null,
      gender: null,
      ageGroup: null,
      occupation: null,
      adSource: null,
      customerComment: '메모만 있음',
    };

    const { info, comment } = buildInfoAndComment(detail);

    expect(info).toBe('');
    expect(comment).toBe('메모만 있음');
  });

  it('customerComment가 null이면 comment는 빈 문자열', () => {
    const detail: SurveyDetail = {
      location: '대전',
      gender: '여성',
      ageGroup: null,
      occupation: '학생',
      adSource: '블로그',
      customerComment: null,
    };

    const { info, comment } = buildInfoAndComment(detail);

    expect(info).toBe('대전 / 여성 / 학생 / 블로그');
    expect(comment).toBe('');
  });

  it('빈 문자열 필드도 falsy이므로 필터링된다', () => {
    const detail: SurveyDetail = {
      location: '',
      gender: '남성',
      ageGroup: '',
      occupation: '',
      adSource: '지인 추천',
      customerComment: '',
    };

    const { info, comment } = buildInfoAndComment(detail);

    expect(info).toBe('남성 / 지인 추천');
    expect(comment).toBe('');
  });
});
