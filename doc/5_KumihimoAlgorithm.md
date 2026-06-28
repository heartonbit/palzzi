# Kumihimo Algorithm

1. 기본 셋업

기본 쿠미히모 디스크는 32개의 슬롯이 있는 원형 디스크이다. 짜려는 실의 갯수에 따라 초기 셋업이 정해진다. 예를 들어, 실이 8개인 경우, 

disk = Array(32)
disk[0] = "첫번째 실 색상"
disk[1] = "두번째 실 색상"
disk[8] = "세번째 실 색상"
disk[9] = "네번째 실 색상"
disk[16] = "다섯번째 실 색상"
disk[17] = "여섯번째 실 색상"
disk[24] = "일곱번째 실 색상"
disk[25] = "여덟번째 실 색상"

실은 두가닥씩 쌍으로 지정되고 180도 지점에도 대응하는 실이 지정되어야하므로, 초기 실의 위치를 initialize 하는 코드는 대략 다음과 같다. 

```
nThreads = 실개수
threadColors = [...]

distance = 32 / (실개수 / 2)
nPairs = nThreads/2

for loop i가 0부터 nPairs까지
    disk[i*distance] = threadColors[i*2]
    disk[i*distance+1] = threadColor[i*2+1]

```

2. 짜기 weave

쿠미히모의 짜기 동작은 다음 세단계로 이루어진다. 

step1: Top Right의 실을 Bottom Right의 한칸 옆 슬롯으로 이동시킨다. 
step2: Bottom Left의 실을 Top Left의 한칸 옆 슬롯으로 이동시킨다. 
step3: 디스크를 반시계방향으로 distance만큼 회전시킨다. 

위 단계들을 nPairs/2 번 반복하면 하나의 row가 짜여진다. 

이것을 코드로 구현하면 대략 다음과 같다. 

tops = Array()
bottoms = Array()

currentPos = 0
for loop nPairs/2 회

    tl = currentPos
    tr = currentPos +1
    br = currentPos + (32 / 2)
    bl = br +1

    # TR -> BR -1
    tTmp=disk[tr]
    disk[tr] = ""
    disk[br-1] = tmp # disk[br-1]이 비어있지 않으면 오류발생
    tops.push(tTmp)
    
    # BL -> TL -1
    bTmp = disk[bl]
    disk[bl] = ""
    disk[tl-1] = tmp # disk[tl-1]이 비어있지 않으면 오류발생
    bottoms.push(bTmp)

    # Rotate
    currentPos = currentPos + distance

product = tops + bottoms # 짜여진 row

3. 쿠미히모 디스크 구현

KumihimoDisk 객체는 다음과 같은 프로퍼티 및 함수를 갖는다. 

프로퍼티:
    state : 현재 디스크의 실색상 위치를 저장한 Array(32)
    product : 현재까지 자여진 실팔찌 rows 결과물 
    currentPos : 현재 짜기 위치
    nThreads : 실개수

함수
    init : 초기화 함수. 실색상 리스트를 받아서 state에 실색상의 위치를 셋업한다. 
    weaveRow : 한 row 짜기, product에 결과물을 append하고 현재 row를 return한다. 




