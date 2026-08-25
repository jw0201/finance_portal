import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ARTICLES, findArticle, type ArticleBlock } from '@/content/articles';
import { ButtonLink, Card, Notice, Section, Shell } from '@/components/ui';

/** 정적으로 만들어 둘 글 목록. */
export function generateStaticParams(): Array<{ slug: string }> {
  return ARTICLES.map((article) => ({ slug: article.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const article = findArticle(slug);
  if (!article) {
    return { title: '글을 찾을 수 없습니다' };
  }
  return { title: article.title, description: article.summary };
}

/** 본문 한 조각을 그린다. */
function Block({ block }: { block: ArticleBlock }) {
  if (block.kind === 'heading') {
    return (
      <h2 className="mt-12 text-2xl font-bold tracking-tight text-slate-900">
        {block.text}
      </h2>
    );
  }

  if (block.kind === 'paragraph') {
    return <p className="mt-5 text-lg leading-relaxed text-slate-800">{block.text}</p>;
  }

  if (block.kind === 'list') {
    return (
      <ul className="mt-5 space-y-3">
        {block.items.map((item) => (
          <li key={item} className="flex gap-3 text-lg leading-relaxed text-slate-800">
            <span aria-hidden="true" className="text-brand-600">
              •
            </span>
            <span>{item}</span>
          </li>
        ))}
      </ul>
    );
  }

  return (
    <div className="mt-6">
      <Notice>
        <p>{block.text}</p>
      </Notice>
    </div>
  );
}

export default async function ArticlePage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const article = findArticle(slug);

  if (!article) {
    notFound();
  }

  // 같은 영역의 다른 글을 추천한다.
  const related = ARTICLES.filter(
    (candidate) =>
      candidate.slug !== article.slug && candidate.category === article.category,
  ).slice(0, 2);

  return (
    <>
      {/* 글 머리. 어두운 띠를 화면 끝까지 채운다. */}
      <div className="grid-texture bg-brand-950">
        <Shell className="py-12 lg:py-16">
          <p className="mb-6">
            <Link
              href="/articles"
              className="inline-flex min-h-touch items-center text-lg font-bold text-brand-300 hover:text-white"
            >
              ← 읽을거리 목록
            </Link>
          </p>
          <p className="text-base font-bold tracking-wide text-brand-300">
            {article.category}
          </p>
          <h1 className="mt-4 max-w-prose text-3xl font-bold leading-tight tracking-tight text-white sm:text-4xl">
            {article.title}
          </h1>
          <p className="mt-5 max-w-prose text-lg leading-relaxed text-slate-300">
            {article.summary}
          </p>
          <p className="mt-4 text-base text-slate-400">
            약 {article.readingMinutes}분 분량
          </p>
        </Shell>
      </div>

      <Shell>
        <Section>
          {/*
           * 본문은 한 줄이 길어지면 읽기 어려우므로 글줄 폭을 제한한다.
           * 남는 폭은 옆의 안내 칸이 쓴다.
           */}
          <div className="grid gap-12 lg:grid-cols-[minmax(0,1fr)_20rem] xl:gap-16">
            <article className="max-w-prose">
              {article.body.map((block, index) => (
                <Block key={`${block.kind}-${index}`} block={block} />
              ))}
            </article>

            <aside className="space-y-6 lg:sticky lg:top-28 lg:self-start">
              <Card>
                <h2 className="text-lg font-bold tracking-tight text-slate-900">
                  내 상황으로 계산해 보세요
                </h2>
                <p className="mt-3 text-base leading-relaxed text-slate-600">
                  글에 나온 예시는 특정 조건일 뿐입니다. 내 자산과 연금, 생활비를 넣으면
                  자산이 언제까지 유지되는지 바로 확인할 수 있습니다.
                </p>
                <div className="mt-6">
                  <ButtonLink href="/retirement-calculator">계산기 열기</ButtonLink>
                </div>
              </Card>

              {related.length > 0 ? (
                <Card>
                  <h2 className="text-lg font-bold tracking-tight text-slate-900">
                    함께 읽어보면 좋은 글
                  </h2>
                  <ul className="mt-4 space-y-5">
                    {related.map((candidate) => (
                      <li key={candidate.slug}>
                        <Link
                          href={`/articles/${candidate.slug}`}
                          className="text-lg font-bold text-brand-700 hover:underline"
                        >
                          {candidate.title}
                        </Link>
                        <p className="mt-1 text-base leading-relaxed text-slate-600">
                          {candidate.summary}
                        </p>
                      </li>
                    ))}
                  </ul>
                </Card>
              ) : null}
            </aside>
          </div>
        </Section>
      </Shell>
    </>
  );
}
