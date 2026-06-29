# 쿠미히모 원형틀 스타일로 짜여진 실팔찌를 시각화하는 방법

쿠미히모 원형틀은 원통형으로 실이 짜여진다. 짜여진 각 Row가 수직으로 나열되는 것이 아니라, 일정 각도로 나선회전하면서 짜여진다. 이를 시각화할 수 있는 방법이 필요하다. 

## ChatGPT 의 답변

네. 이 문제는 사실 **원형 쿠미히모를 "2D 격자"로 표현하려고 해서 생기는 문제**입니다.

실제로 원형 디스크(Kumihimo disk)에서 만들어지는 braid는

* 중심축(z)을 따라 진행하면서
* 일정한 각도(θ)만큼 계속 회전하는
* **Helix(나선)** 구조입니다.

즉 각 Row는

```
Row0
Row1
Row2
Row3
```

처럼 단순히 아래로 쌓이는 것이 아니라

```
Row0   θ=0°
Row1   θ=6°
Row2   θ=12°
Row3   θ=18°
...
```

처럼 조금씩 회전합니다.

---

# 가장 쉬운 시각화 방법

보통 3가지 방법이 있습니다.

## ① Cylinder UV Mapping (추천)

원통을 펼친 UV 좌표로 표현합니다.

```
   θ →
+----------------------------+
| Row0                       |
|     \                      |
|       \                    |
|         \                  |
|           \                |
|             \              |
+----------------------------+
            z
```

여기서

```
x = θ
y = row
```

입니다.

실은 직선이 아니라

```
θ = θ0 + row * twist
```

를 따라 이동합니다.

즉

```js
theta = theta0 + row * twistPerRow;
```

만 해주면 됩니다.

이 방법이 가장 구현하기 쉽습니다.

---

## ② 실제 원통 위에 그리기

Three.js에서 가장 많이 사용하는 방법입니다.

원통 반지름을 R이라 하면

```
x = R * cos(theta)
y = R * sin(theta)
z = row * pitch
```

입니다.

즉

```js
const x = R * Math.cos(theta);
const y = R * Math.sin(theta);
const z = row * pitch;
```

이 점들을 이어서

```
THREE.CatmullRomCurve3
```

또는

```
THREE.TubeGeometry
```

로 그립니다.

결과는

```
      ////////
    ///      ///
   ||        ||
   || ////// ||
   ||/////// ||
   ||/////// ||
   || ////// ||
   ||        ||
```

처럼 실제 쿠미히모와 거의 동일하게 보입니다.

---

## ③ Spiral Sheet (내가 추천)

Palzzi처럼 Pattern Simulator라면 가장 보기 쉽습니다.

원통을 펼쳤는데

가로축이

```
0°
360°
720°
1080°
```

로 계속 이어집니다.

그러면 실은

```
///////////////
///////////////
///////////////
```

처럼 거의 직선으로 표현됩니다.

원통으로 다시 말면

자동으로 Helix가 됩니다.

이 방식은 CAD나 섬유 설계 프로그램에서도 자주 사용됩니다.

---

# 각도 계산

핵심은 Row마다 얼마나 회전하느냐입니다.

이를

```
twistPerRow
```

라고 하면

```
θ(row)

= θ0 + row * twistPerRow
```

입니다.

예를 들어

```
8줄 쿠미히모
```

에서

```
twistPerRow = 7°
```

라면

```
Row0  0°
Row1  7°
Row2 14°
Row3 21°
...
```

입니다.

---

# 코드 예시

```javascript
const radius = 50;
const pitch = 6;
const twist = THREE.MathUtils.degToRad(7);

function getPoint(theta0, row) {

    const theta = theta0 + row * twist;

    return new THREE.Vector3(
        radius * Math.cos(theta),
        radius * Math.sin(theta),
        row * pitch
    );
}
```

실 하나는

```javascript
const points = [];

for (let row = 0; row < rows; row++) {
    points.push(getPoint(theta0, row));
}
```

로 만들 수 있습니다.

---

# 더 실제 쿠미히모처럼 만들려면

실제 쿠미히모는 **각 Row마다 일정 각도로 회전하는 것이 아니라**, **매 Knot마다 braid angle이 결정**됩니다.

즉 각도는

```
θ += Δθ
```

가 아니라

```
θ += atan(circumferenceAdvance / pitch)
```

와 같은 기하학적 관계로 계산됩니다.

즉

```
advance around cylinder
---------------------- = tan(braidAngle)
vertical pitch
```

여기서 braid angle(브레이드 각도)을 이용하면 실제 편조 구조와 거의 동일한 나선을 재현할 수 있습니다.

---

### Palzzi라면 추천하는 구조

Palzzi는 이미 **Row 기반 시뮬레이터**를 가지고 있으므로, 렌더링을 다음처럼 분리하는 것을 추천합니다.

1. **Simulation**: 각 Row에서 어떤 실이 어떤 위치로 이동하는지만 계산
2. **Geometry**: 각 Row를 `(θ, z)` 좌표로 변환
3. **Renderer**: `(θ, z)`를 2D(펼친 원통) 또는 3D(Three.js 원통)로 렌더링

이렇게 하면 동일한 시뮬레이션 데이터를 이용해 평면 패턴과 실제 원통형 편조를 모두 표현할 수 있습니다.

그리고 한 단계 더 발전시키면 **실의 굵기, 교차(위/아래), 장력에 따른 자연스러운 곡률**까지 표현하는 알고리즘도 추가할 수 있습니다. 이는 실제 쿠미히모와 매우 유사한 시각화를 구현하는 데 도움이 됩니다.

