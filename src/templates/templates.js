/**
 * Template library for kumihimo patterns
 */
const TEMPLATES = [
  {
    id: 'kumi-8-basic',
    name: '8줄 기본 나선형',
    craftType: 'KUMIHIMO_ROUND',
    nThreads: 8,
    description: '8줄 기본 쿠미히모 나선 패턴',
    colors: ['#E74C3C', '#E67E22', '#F1C40F', '#2ECC71', '#3498DB', '#9B59B6', '#1ABC9C', '#E84393'],
    difficulty: '초급'
  },
  {
    id: 'kumi-8-ocean',
    name: '8줄 오션 웨이브',
    craftType: 'KUMIHIMO_ROUND',
    nThreads: 8,
    description: '파란색 계열의 바다 물결 패턴',
    colors: ['#006266', '#0ABDE3', '#18DCFF', '#0ABDE3', '#006266', '#0ABDE3', '#18DCFF', '#0ABDE3'],
    difficulty: '초급'
  },
  {
    id: 'kumi-8-sunset',
    name: '8줄 선셋 글로우',
    craftType: 'KUMIHIMO_ROUND',
    nThreads: 8,
    description: '노을빛 그라데이션 패턴',
    colors: ['#FF512F', '#DD2476', '#FF512F', '#F09819', '#FF512F', '#DD2476', '#FF512F', '#F09819'],
    difficulty: '초급'
  },
  {
    id: 'kumi-8-rainbow',
    name: '8줄 레인보우',
    craftType: 'KUMIHIMO_ROUND',
    nThreads: 8,
    description: '무지개 색상의 화려한 패턴',
    colors: ['#FF0000', '#FF7700', '#FFFF00', '#00FF00', '#0000FF', '#4B0082', '#8B00FF', '#FF1493'],
    difficulty: '초급'
  },
  {
    id: 'kumi-16-basic',
    name: '16줄 기본',
    craftType: 'KUMIHIMO_ROUND',
    nThreads: 16,
    description: '16줄 기본 쿠미히모 패턴',
    colors: ['#E74C3C', '#C0392B', '#E67E22', '#D35400',
             '#F1C40F', '#F39C12', '#2ECC71', '#27AE60',
             '#3498DB', '#2980B9', '#9B59B6', '#8E44AD',
             '#1ABC9C', '#16A085', '#E84393', '#C2185B'],
    difficulty: '중급'
  },
  {
    id: 'kumi-4-basic',
    name: '4줄 기본',
    craftType: 'KUMIHIMO_ROUND',
    nThreads: 4,
    description: '4줄 기본 쿠미히모 패턴 (입문용)',
    colors: ['#FF5733', '#33FF57', '#3357FF', '#F3FF33'],
    difficulty: '초급'
  },
  {
    id: 'kumi-12-basic',
    name: '12줄 기본',
    craftType: 'KUMIHIMO_ROUND',
    nThreads: 12,
    description: '12줄 기본 쿠미히모 패턴',
    colors: ['#E74C3C', '#E67E22', '#F1C40F', '#2ECC71',
             '#3498DB', '#9B59B6', '#1ABC9C', '#E84393',
             '#FF5733', '#33FF57', '#3357FF', '#F3FF33'],
    difficulty: '중급'
  },
  {
    id: 'kumi-8-monochrome',
    name: '8줄 모노크롬',
    craftType: 'KUMIHIMO_ROUND',
    nThreads: 8,
    description: '흑백 그라데이션 모노크롬 패턴',
    colors: ['#FFFFFF', '#D5D8DC', '#AAB7B8', '#808B96',
             '#566573', '#2C3E50', '#17202A', '#000000'],
    difficulty: '초급'
  }
];

export default TEMPLATES;
