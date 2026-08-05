import { fileURLToPath } from 'node:url';

/**
 * turbopack.root 를 명시한다.
 * 이 값이 없으면 Next 가 상위 디렉터리의 package-lock.json 을 찾아
 * 홈 디렉터리를 프로젝트 루트로 추정하려 한다.
 */
const projectRoot = fileURLToPath(new URL('.', import.meta.url));

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  turbopack: {
    root: projectRoot,
  },
};

export default nextConfig;
