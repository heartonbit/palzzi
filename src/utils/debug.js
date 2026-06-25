/**
 * 디버그 로깅 헬퍼 - 개발환경(vite dev)에서만 console.log 출력
 * 프로덕션 빌드에서는 아무것도 출력하지 않음
 * 
 * Vite가 process.env.NODE_ENV를 'production'/'development'로 대체하므로
 * 빌드 타임에 dead code elimination 됨
 */
const isDev = typeof process !== 'undefined' && process.env?.NODE_ENV !== 'production';

export const debug = isDev ? console.log : () => {};
export default debug;
