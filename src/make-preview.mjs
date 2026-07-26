// 로컬 프리뷰 생성기: .dc.html은 window.React가 있어야 렌더된다.
// 원본은 그대로 두고, React 18 UMD를 support.js 앞에 주입한 사본을 preview/에 쓴다.
// 실행: node src/make-preview.mjs
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';

const REACT = `<script crossorigin src="https://unpkg.com/react@18.3.1/umd/react.production.min.js"></script>
<script crossorigin src="https://unpkg.com/react-dom@18.3.1/umd/react-dom.production.min.js"></script>
`;

mkdirSync('preview', { recursive: true });
for (const [src, out] of [['src/treasure-map-math.dc.html', 'preview/treasure.html'], ['src/fairy-land-math.dc.html', 'preview/fairy.html'], ['src/hangul-fairy-land.dc.html', 'preview/hangul.html']]) {
  let html = readFileSync(src, 'utf8');
  // support.js는 preview/ 기준 상대경로가 되도록 ../src/ 로, React는 그 앞에 삽입.
  html = html.replace('<script src="./support.js"></script>', REACT + '<script src="../src/support.js"></script>');
  writeFileSync(out, html);
  console.log('wrote', out);
}
