/**
 * README 에 쓰는 주요 화면 스크린샷을 찍는다.
 *
 *   npm run screenshots                          # 운영 사이트
 *   BASE=http://localhost:3000 npm run screenshots   # 로컬 개발 서버
 *
 * 맥에 설치된 Google Chrome 을 headless 로 띄워 DevTools 프로토콜로 조작한다.
 * 별도 패키지는 쓰지 않는다. Chrome 위치가 다르면 CHROME 환경변수로 지정한다.
 *
 * 계산 화면에는 README 의 "예시 값" 표와 같은 값을 넣는다. 값을 바꾸면 README 도 함께 고친다.
 * 입력란·버튼 이름이 바뀌어 찾지 못하면 멈춘다. 모든 화면을 다 찍은 뒤에만 OUT 으로 옮기므로
 * 중간에 실패해도 기존 이미지는 그대로 남는다.
 */

import { spawn } from 'node:child_process';
import { copyFileSync, existsSync, mkdirSync, mkdtempSync, readdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const PROJECT_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const BASE = process.env.BASE ?? 'https://finance-portal-beige.vercel.app';
const OUT = resolve(PROJECT_ROOT, process.env.OUT ?? 'docs/screenshots');
const CHROME = process.env.CHROME ?? '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';

/** README 의 "예시 값" 표와 맞춘다. 금액은 원 단위. */
const EXAMPLE_INPUT = {
  '은퇴 나이': '65',
  '금융자산 합계': '500000000',
  '국민연금 월 예상 수령액': '1300000',
  '월 생활비': '2500000',
};

const DESKTOP = { width: 1280, height: 860, deviceScaleFactor: 1, mobile: false };
const PHONE = { width: 390, height: 844, deviceScaleFactor: 2, mobile: true };

/** 페이지 이동 후 글꼴과 화면이 자리 잡을 때까지 기다리는 시간. */
const PAGE_SETTLE_MS = 3000;
const SHOT_SETTLE_MS = 500;
const STEP_SETTLE_MS = 500;
/** 고정 헤더에 가리지 않도록 제목 위로 남기는 여백(px). */
const HEADER_OFFSET = { desktop: 110, phone: 90 };

const wait = (ms) => new Promise((done) => setTimeout(done, ms));

if (!existsSync(CHROME)) {
  console.error(`Chrome 을 찾을 수 없습니다: ${CHROME}\nCHROME 환경변수로 위치를 지정해 주세요.`);
  process.exit(1);
}

const workDir = mkdtempSync(join(tmpdir(), 'finance-portal-screenshots-'));
const profileDir = join(workDir, 'chrome');
/** 찍은 화면을 먼저 모아 두는 곳. 전부 성공하면 OUT 으로 옮긴다. */
const stagingDir = join(workDir, 'shots');
mkdirSync(stagingDir);
// 포트 0 이면 Chrome 이 빈 포트를 고르고 DevToolsActivePort 파일에 적는다.
const chrome = spawn(
  CHROME,
  ['--headless=new', '--hide-scrollbars', '--remote-debugging-port=0', `--user-data-dir=${profileDir}`, 'about:blank'],
  { stdio: 'ignore' },
);

let ws;
try {
  ws = await connect();
  await capture(createPage(ws));
  mkdirSync(OUT, { recursive: true });
  for (const name of readdirSync(stagingDir)) {
    copyFileSync(join(stagingDir, name), join(OUT, name));
  }
  console.log(`\n완료: ${OUT}`);
} catch (error) {
  console.error(`\n스크린샷을 찍지 못했습니다: ${error.message}\n기존 이미지는 바꾸지 않았습니다.`);
  process.exitCode = 1;
} finally {
  ws?.close();
  chrome.kill();
  // Chrome 이 프로필 파일을 놓을 때까지 잠시 기다린 뒤 지운다.
  await wait(STEP_SETTLE_MS);
  rmSync(workDir, { recursive: true, force: true });
}

/** 찍을 화면 목록. 파일 이름은 README 의 이미지 경로와 같다. */
async function capture(page) {
  const { go, shot, scrollToText, setViewport, clickButton, openMobileMenu } = page;

  // ---- PC ----
  await setViewport(DESKTOP);
  await go('/');
  await shot('desktop-home.png');

  await runCalculator(page, { stepShot: 'desktop-calculator-step1.png' });
  await scrollToText('계산 결과', HEADER_OFFSET.desktop);
  await shot('desktop-result-summary.png');
  await scrollToText('생활비를 바꾸면 어떻게 달라질까요?', HEADER_OFFSET.desktop);
  await shot('desktop-result-compare.png');
  // 다음 화면(내 은퇴 계획)에 보일 계획을 저장한다.
  await clickButton('저장하기');
  await wait(STEP_SETTLE_MS);

  await go('/my-retirement');
  await shot('desktop-my-retirement.png');
  await go('/calculators/tax');
  await shot('desktop-tax.png');
  await go('/articles');
  await shot('desktop-articles.png');
  await go('/articles/can-i-retire-with-500-million');
  await shot('desktop-article.png');

  // ---- 휴대폰 ----
  await setViewport(PHONE);
  await go('/');
  await shot('mobile-home.png');
  await openMobileMenu();
  await shot('mobile-menu.png');
  await runCalculator(page);
  await scrollToText('계산 결과', HEADER_OFFSET.phone);
  await shot('mobile-result.png');
}

/** 예시 값을 넣으며 계산기를 "결과 보기" 까지 진행한다. */
async function runCalculator(page, { stepShot } = {}) {
  const { go, shot, setField, clickButton, hasButton } = page;
  const filled = new Set();
  const MAX_STEPS = 6;

  await go('/retirement-calculator');
  if (stepShot) {
    await shot(stepShot);
  }

  for (let step = 0; step < MAX_STEPS; step++) {
    for (const [label, value] of Object.entries(EXAMPLE_INPUT)) {
      if (await setField(label, value)) {
        filled.add(label);
      }
    }
    await wait(STEP_SETTLE_MS);

    if (await hasButton('결과 보기')) {
      const missing = Object.keys(EXAMPLE_INPUT).filter((label) => !filled.has(label));
      if (missing.length > 0) {
        throw new Error(`입력란을 찾지 못했습니다: ${missing.join(', ')}`);
      }
      await clickButton('결과 보기');
      await wait(PAGE_SETTLE_MS / 2);
      return;
    }
    await clickButton('다음');
    await wait(STEP_SETTLE_MS);
  }
  throw new Error(`${MAX_STEPS}단계 안에 "결과 보기" 버튼이 나오지 않았습니다.`);
}

/** Chrome 이 뜰 때까지 기다렸다가 첫 탭에 연결한다. */
async function connect() {
  const portFile = join(profileDir, 'DevToolsActivePort');
  const ATTEMPTS = 50;
  for (let attempt = 0; attempt < ATTEMPTS; attempt++) {
    await wait(200);
    if (!existsSync(portFile)) {
      continue;
    }
    const port = readFileSync(portFile, 'utf8').split('\n')[0];
    try {
      const targets = await (await fetch(`http://127.0.0.1:${port}/json`)).json();
      const target = targets.find((item) => item.type === 'page');
      if (target) {
        const socket = new WebSocket(target.webSocketDebuggerUrl);
        await new Promise((done, fail) => {
          socket.addEventListener('open', done);
          socket.addEventListener('error', () => fail(new Error('Chrome 에 연결하지 못했습니다.')));
        });
        return socket;
      }
    } catch {
      // 아직 준비 중이다. 다시 시도한다.
    }
  }
  throw new Error('Chrome 이 시작되지 않았습니다.');
}

/** DevTools 프로토콜 위에 화면 조작 함수를 만든다. */
function createPage(socket) {
  let nextId = 0;
  const pending = new Map();
  socket.addEventListener('message', (event) => {
    const message = JSON.parse(event.data);
    if (message.id && pending.has(message.id)) {
      pending.get(message.id)(message);
      pending.delete(message.id);
    }
  });

  const send = (method, params = {}) =>
    new Promise((done, fail) => {
      const id = ++nextId;
      pending.set(id, (message) =>
        message.error ? fail(new Error(`${method}: ${message.error.message}`)) : done(message.result),
      );
      socket.send(JSON.stringify({ id, method, params }));
    });

  const evaluate = async (expression) => {
    const result = await send('Runtime.evaluate', { expression, returnByValue: true, awaitPromise: true });
    if (result.exceptionDetails) {
      throw new Error(result.exceptionDetails.exception?.description ?? result.exceptionDetails.text);
    }
    return result.result.value;
  };

  const findButton = (text) =>
    `[...document.querySelectorAll('button')].find((b) => b.textContent.trim() === ${JSON.stringify(text)})`;

  return {
    setViewport: (viewport) => send('Emulation.setDeviceMetricsOverride', viewport),

    async go(path) {
      await send('Page.navigate', { url: BASE + path });
      await wait(PAGE_SETTLE_MS);
    },

    async shot(name) {
      await wait(SHOT_SETTLE_MS);
      const { data } = await send('Page.captureScreenshot', { format: 'png' });
      writeFileSync(join(stagingDir, name), Buffer.from(data, 'base64'));
      console.log(`찍음: ${name}`);
    },

    /** 글자가 정확히 일치하는 제목을 고정 헤더 바로 아래로 스크롤한다. */
    async scrollToText(text, offset) {
      const found = await evaluate(`(() => {
        const el = [...document.querySelectorAll('main h1, main h2, main h3')]
          .find((e) => e.textContent.trim() === ${JSON.stringify(text)});
        if (!el) return false;
        window.scrollTo(0, el.getBoundingClientRect().top + window.scrollY - ${offset});
        return true;
      })()`);
      if (!found) {
        throw new Error(`제목을 찾지 못했습니다: "${text}"`);
      }
    },

    /** React 가 관리하는 입력란이라 값 설정 후 input 이벤트를 직접 보낸다. */
    setField: (label, value) =>
      evaluate(`(() => {
        const l = [...document.querySelectorAll('label')].find((x) => x.textContent.trim() === ${JSON.stringify(label)});
        const el = l && document.getElementById(l.htmlFor);
        if (!el) return false;
        Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set.call(el, ${JSON.stringify(value)});
        el.dispatchEvent(new Event('input', { bubbles: true }));
        return true;
      })()`),

    hasButton: (text) => evaluate(`Boolean(${findButton(text)})`),

    async clickButton(text) {
      const clicked = await evaluate(`(() => { const b = ${findButton(text)}; if (!b) return false; b.click(); return true; })()`);
      if (!clicked) {
        throw new Error(`버튼을 찾지 못했습니다: "${text}"`);
      }
    },

    async openMobileMenu() {
      const opened = await evaluate(`(() => {
        const b = document.querySelector('header button[aria-controls]');
        if (!b) return false;
        b.click();
        return true;
      })()`);
      if (!opened) {
        throw new Error('휴대폰 메뉴 버튼을 찾지 못했습니다.');
      }
    },
  };
}
