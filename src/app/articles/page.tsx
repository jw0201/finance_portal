import type { Metadata } from 'next';
import Link from 'next/link';
import { ARTICLES } from '@/content/articles';
import { Card, Notice, PageHeading } from '@/components/ui';

export const metadata: Metadata = {
  title: '읽을거리',
  description:
    '은퇴 준비, 국민연금, 생활비, 의료비, 금융사기 예방에 관한 글을 모았습니다.',
};

export default function ArticlesPage() {
  return (
    <div className="space-y-8">
      <PageHeading
        title="읽을거리"
        description="은퇴를 준비하며 자주 나오는 질문을 중심으로 정리했습니다. 종목 추천이나 단기 투자 정보는 다루지 않습니다."
      />

      <div className="space-y-4">
        {ARTICLES.map((article) => (
          <Card key={article.slug}>
            <p className="text-base font-bold text-brand-700">{article.category}</p>
            <h2 className="mt-2 text-xl font-bold text-slate-900 sm:text-2xl">
              <Link href={`/articles/${article.slug}`} className="hover:underline">
                {article.title}
              </Link>
            </h2>
            <p className="mt-3 text-lg text-slate-700">{article.summary}</p>
            <p className="mt-4 flex flex-wrap items-center gap-4">
              <Link
                href={`/articles/${article.slug}`}
                className="inline-flex min-h-touch items-center rounded-xl border-2 border-brand-600 px-6 text-lg font-bold text-brand-700 hover:bg-brand-50"
              >
                글 읽기
              </Link>
              <span className="text-base text-slate-500">
                약 {article.readingMinutes}분
              </span>
            </p>
          </Card>
        ))}
      </div>

      <Notice>
        <p>
          글에 나오는 금액 예시는 이 사이트 계산기로 계산한 것이며, 사용한 가정을 함께
          밝혀 두었습니다. 세율이나 연금 수령액처럼 법으로 정해진 수치는 짐작해서 쓰지
          않고 공식 기관에서 확인하는 방법을 안내합니다.
        </p>
      </Notice>
    </div>
  );
}
