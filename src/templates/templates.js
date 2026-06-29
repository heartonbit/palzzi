/**
 * Preset templates for Kumihimo patterns with multi-language (i18n) support (doc/2_PRD / doc/4_Design)
 */
export const KUMIHIMO_TEMPLATES = [
  {
    id: "kumihimo-4-basic",
    name_ko: "4줄 기본 트위스트 (4-Strand Basic Twist)",
    name_en: "4-Strand Basic Twist",
    threads: 4,
    desc_ko: "초보자를 위한 가장 기본적인 4가닥 꼬임 패턴입니다.",
    desc_en: "The absolute basic 4-strand twisting pattern for beginners.",
    defaultColors: ["#FF5733", "#3366FF", "#FF5733", "#3366FF"],
  },
  {
    id: "kumihimo-6-spiral",
    name_ko: "6줄 나선 줄무늬 (6-Strand Spiral Stripe)",
    name_en: "6-Strand Spiral Stripe",
    threads: 6,
    desc_ko: "나선형으로 회전하는 형태의 줄무늬가 생기는 6가닥 패턴입니다.",
    desc_en: "A 6-strand rotating stripe pattern that forms spiral structures.",
    defaultColors: ["#FF5733", "#33FF57", "#3357FF", "#FF5733", "#33FF57", "#3357FF"],
  },
  {
    id: "kumihimo-8-candy",
    name_ko: "8줄 캔디 케인 (8-Strand Candy Cane)",
    name_en: "8-Strand Candy Cane",
    threads: 8,
    desc_ko: "좌우 대칭 색상 배치를 통해 사선 방향의 예쁜 나선형 무늬를 만듭니다.",
    desc_en: "A symmetrical layout creating beautiful candy-cane diagonal stripes.",
    defaultColors: ["#FF3B30", "#FF3B30", "#FFFFFF", "#FFFFFF", "#FF3B30", "#FF3B30", "#FFFFFF", "#FFFFFF"],
  },
  {
    id: "kumihimo-8-rainbow",
    name_ko: "8줄 레인보우 휠 (8-Strand Rainbow Wheel)",
    name_en: "8-Strand Rainbow Wheel",
    threads: 8,
    desc_ko: "무지개빛 색상들이 회전하면서 아름다운 복합 컬러 밴드를 형성합니다.",
    desc_en: "Rainbow colors rotating together to form a rich, colorful spectrum band.",
    defaultColors: ["#FF3B30", "#FF9500", "#FFCC00", "#4CD964", "#5AC8FA", "#007AFF", "#5856D6", "#FF2D55"],
  },
  {
    id: "kumihimo-12-sakura",
    name_ko: "12줄 사쿠라 (12-Strand Sakura Blossom)",
    name_en: "12-Strand Sakura Blossom",
    threads: 12,
    desc_ko: "화사한 벚꽃을 연상시키는 핑크, 화이트, 그린 계열의 12가닥 입체 패턴입니다.",
    desc_en: "Bright sakura floral theme utilizing white, pink, and light green shades.",
    defaultColors: [
      "#FFB7C5", "#FFB7C5", "#FFFFFF", "#FFFFFF", "#FF69B4", "#FF69B4",
      "#98FB98", "#98FB98", "#FFFFFF", "#FFFFFF", "#FFB7C5", "#FFB7C5"
    ],
  },
  {
    id: "kumihimo-16-chevron",
    name_ko: "16줄 화살표 나선 (16-Strand Chevron Spiral)",
    name_en: "16-Strand Chevron Spiral",
    threads: 16,
    desc_ko: "매우 정교하고 굵은 원통 형태로 제작되는 고급자용 16가닥 패턴입니다.",
    desc_en: "A thick, expert-grade 16-strand chevron stripe with solid overlapping layers.",
    defaultColors: [
      "#1D1D1F", "#1D1D1F", "#FFCC00", "#FFCC00", "#007AFF", "#007AFF", "#FFFFFF", "#FFFFFF",
      "#1D1D1F", "#1D1D1F", "#FFCC00", "#FFCC00", "#007AFF", "#007AFF", "#FFFFFF", "#FFFFFF"
    ],
  },
  {
    id: "kumihimo-20-marine",
    name_ko: "20줄 마린 스트라이프 (20-Strand Marine Stripe)",
    name_en: "20-Strand Marine Stripe",
    threads: 20,
    desc_ko: "바다의 깊이를 연상시키는 세련된 대용량 20가닥 마린 무늬 패턴입니다.",
    desc_en: "An elegant, massive 20-strand maritime sailor stripe reflecting oceanic depths.",
    defaultColors: [
      "#001F3F", "#001F3F", "#0074D9", "#0074D9", "#7FDBFF", "#7FDBFF", "#FFFFFF", "#FFFFFF", "#FFDC00", "#FFDC00",
      "#001F3F", "#001F3F", "#0074D9", "#0074D9", "#7FDBFF", "#7FDBFF", "#FFFFFF", "#FFFFFF", "#FFDC00", "#FFDC00"
    ],
  },
  {
    id: "kumihimo-24-peacock",
    name_ko: "24줄 피콕 휠 (24-Strand Peacock Wheel)",
    name_en: "24-Strand Peacock Wheel",
    threads: 24,
    desc_ko: "공작의 깃털처럼 영롱하고 다채로운 터쿼이즈, 에메랄드, 골드, 바이올렛의 24가닥 패턴입니다.",
    desc_en: "Luxurious peacock-feather palette featuring turquoise, emerald, violet, and gold.",
    defaultColors: [
      "#39CCCC", "#39CCCC", "#2ECC40", "#2ECC40", "#FFDC00", "#FFDC00", "#B10DC9", "#B10DC9", "#0074D9", "#0074D9", "#FFFFFF", "#FFFFFF",
      "#39CCCC", "#39CCCC", "#2ECC40", "#2ECC40", "#FFDC00", "#FFDC00", "#B10DC9", "#B10DC9", "#0074D9", "#0074D9", "#FFFFFF", "#FFFFFF"
    ],
  },
  {
    id: "kumihimo-28-forest",
    name_ko: "28줄 포레스트 캐노피 (28-Strand Forest Canopy)",
    name_en: "28-Strand Forest Canopy",
    threads: 28,
    desc_ko: "올리브, 딥그린, 골든옐로우가 겹겹이 쌓여 울창한 숲의 조화를 그리는 28가닥 패턴입니다.",
    desc_en: "Olive, deep greens, and golden yellows blending into a dense jungle canopy design.",
    defaultColors: [
      "#3D9970", "#3D9970", "#2ECC40", "#2ECC40", "#FFCC00", "#FFCC00", "#FFFFFF", "#FFFFFF", "#01FF70", "#01FF70", "#111111", "#111111", "#aaaaaa", "#aaaaaa",
      "#3D9970", "#3D9970", "#2ECC40", "#2ECC40", "#FFCC00", "#FFCC00", "#FFFFFF", "#FFFFFF", "#01FF70", "#01FF70", "#111111", "#111111", "#aaaaaa", "#aaaaaa"
    ],
  },
  {
    id: "kumihimo-32-aurora",
    name_ko: "32줄 미드나잇 오로라 (32-Strand Midnight Aurora)",
    name_en: "32-Strand Midnight Aurora",
    threads: 32,
    desc_ko: "칠흑 같은 밤하늘에 뿜어져 나오는 극광의 네온그린과 오로라 보랏빛을 수놓는 최대 규격의 32가닥 패턴입니다.",
    desc_en: "Ethereal auroral waves of neon greens, violet, and deep void blacks in a massive 32-strand scale.",
    defaultColors: [
      "#111111", "#111111", "#2ECC40", "#2ECC40", "#B10DC9", "#B10DC9", "#0074D9", "#0074D9", "#FFFFFF", "#FFFFFF", "#01FF70", "#01FF70", "#FF851B", "#FF851B", "#7FDBFF", "#7FDBFF",
      "#111111", "#111111", "#2ECC40", "#2ECC40", "#B10DC9", "#B10DC9", "#0074D9", "#0074D9", "#FFFFFF", "#FFFFFF", "#01FF70", "#01FF70", "#FF851B", "#FF851B", "#7FDBFF", "#7FDBFF"
    ],
  }
];
