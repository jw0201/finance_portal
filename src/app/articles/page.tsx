import type { Metadata } from 'next';
import Link from 'next/link';
import { ARTICLES } from '@/content/articles';
import { Card, Notice, PageHeading, Section, Shell } from '@/components/ui';

export const metadata: Metadata = {
  title: '읽을거리',
  description:
    '은퇴 준비, 국민연금, 생활비, 의료비, 금융사기 예방에 관한 글을 모았습니다.',
};

export default function ArticlesPage() {
  return (
    <>
      <PageHeading
        eyebrow="콘텐츠"
        title="읽을거리"
        description="은퇴를 준비하며 자주 나오는 질문을 중심으로 정리했습니다. 종목 추천이나 단기 투자 정보는 다루지 않습니다."
      />

      <div className="bg-slate-50">
        <Shell>
          <Section>
            {/* 넓은 화면에서는 여러 편을 한눈에 훑을 수 있게 여러 칸으로 벌린다. */}
            <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
              {ARTICLES.map((article) => (
                <Card key={article.slug} className="flex flex-col">
                  <p className="text-base font-bold text-brand-700">
                    {article.category}
                  </p>
                  <h2 className="mt-3 text-xl font-bold leading-snug tracking-tight text-slate-900">
                    <Link
                      href={`/articles/${article.slug}`}
                      className="hover:text-brand-700 hover:underline"
                    >
                      {article.title}
                    </Link>
                  </h2>
                  <p className="mt-3 text-base leading-relaxed text-slate-600">
                    {article.summary}
                  </p>
                  <div className="mt-auto flex flex-wrap items-center gap-4 pt-6">
                    <Link
                      href={`/articles/${article.slug}`}
                      className="inline-flex min-h-touch items-center rounded-xl border-2 border-slate-300 px-6 text-lg font-bold text-slate-800 transition-colors hover:border-brand-600 hover:text-brand-700"
                    >
                      글 읽기
                    </Link>
                    <span className="text-base text-slate-500">
                      약 {article.readingMinutes}분
                    </span>
                  </div>
                </Card>
              ))}
            </div>

            <div className="mt-8">
              <Notice>
                <p>
                  글에 나오는 금액 예시는 이 사이트 계산기로 계산한 것이며, 사용한 가정을
                  함께 밝혀 두었습니다. 세율이나 연금 수령액처럼 법으로 정해진 수치는
                  짐작해서 쓰지 않고 공식 기관에서 확인하는 방법을 안내합니다.
                </p>
              </Notice>
            </div>
          </Section>
        </Shell>
      </div>
    </>
  );
}
