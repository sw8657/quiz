// 배포 빌드: src/*.dc.html에 React 18 UMD를 주입해 루트의 플레이 파일로 출력.
// 7MB 번들(자기완결)을 CDN 의존 라이브 버전으로 교체한다. 재생성: node src/build-deploy.mjs
import { readFileSync, writeFileSync, copyFileSync } from 'node:fs';

const REACT = `<script crossorigin src="https://unpkg.com/react@18.3.1/umd/react.production.min.js"></script>
<script crossorigin src="https://unpkg.com/react-dom@18.3.1/umd/react-dom.production.min.js"></script>
`;

for (const [src, out] of [
  ['src/treasure-map-math.dc.html', 'treasure-map-math.html'],
  ['src/fairy-land-math.dc.html', 'fairy-land-math.html'],
  ['src/hangul-fairy-land.dc.html', 'hangul-fairy-land.html'],
]) {
  let html = readFileSync(src, 'utf8');
  html = html.replace('<script src="./support.js"></script>', REACT + '<script src="./support.js"></script>');
  writeFileSync(out, html);
  console.log('built', out);
}
copyFileSync('src/support.js', 'support.js');
console.log('copied support.js');
