// script.js

// ----------------------------------------------------
// 1. 모델 경로 설정 (⚠️ 이 경로를 확인하고 수정하세요!)
// ----------------------------------------------------
const URL_MODEL_1 = "./models/model_1/"; 
const URL_MODEL_2 = "./models/model_2/";

let model1, model2, webcam;
let labelContainer = document.getElementById("label-container");
let currentModel = 0; // 0: 로드 전, 1: 모델1, 2: 모델2
let maxPredictions; // 분류 클래스 개수

// ===============================================
// 2. 초기화 및 모델 로드
// ===============================================

document.getElementById("start-button").addEventListener("click", init);

async function init() {
    document.getElementById("start-button").innerText = "로딩 중...";
    labelContainer.innerHTML = "모델 로드 및 웹캠 설정 중입니다. 잠시만 기다려주세요...";

    try {
        // 두 모델 동시 로드
        model1 = await tmImage.load(URL_MODEL_1 + "model.json", URL_MODEL_1 + "metadata.json");
        model2 = await tmImage.load(URL_MODEL_2 + "model.json", URL_MODEL_2 + "metadata.json");
        maxPredictions = model1.getTotalClasses(); // (두 모델의 클래스 수가 같다고 가정)

        // 웹캠 설정 및 시작
        const flip = true; 
        webcam = new tmImage.Webcam(400, 300, flip); 
        await webcam.setup(); 
        await webcam.play();
        
        // 웹캠 캔버스를 HTML에 추가
        document.getElementById("webcam-container").appendChild(webcam.canvas);

        // 초기 상태 설정 및 루프 시작
        currentModel = 1; // 기본적으로 모델 1 활성화
        updateModelInfo();
        document.getElementById("start-button").style.display = 'none'; // 시작 버튼 숨기기
        window.requestAnimationFrame(loop);

    } catch (error) {
        console.error("초기화 중 오류 발생: 로컬 파일 경로, 파일 누락 또는 HTTPS 환경 문제일 수 있습니다.", error);
        labelContainer.innerHTML = "오류 발생! 콘솔을 확인해주세요. (모델 경로 또는 파일 확인)";
    }
}

// ===============================================
// 3. 분류 루프 및 예측 함수
// ===============================================

function loop() {
    webcam.update(); // 웹캠 캔버스 업데이트
    
    // 현재 활성화된 모델에 따라 예측 수행
    if (currentModel === 1) {
        predict(model1);
    } else if (currentModel === 2) {
        predict(model2);
    }
    
    window.requestAnimationFrame(loop); // 다음 프레임 요청
}

async function predict(modelToUse) {
    // 웹캠 캔버스로 예측 수행
    const prediction = await modelToUse.predict(webcam.canvas);

    // 예측 결과를 HTML에 표시
    let resultHTML = "";
    for (let i = 0; i < maxPredictions; i++) {
        const classPrediction = 
            `**${prediction[i].className}**: ${(prediction[i].probability * 100).toFixed(1)}%`;
        resultHTML += `<div class="prediction-item">${classPrediction}</div>`;
    }
    labelContainer.innerHTML = resultHTML;
}

// ===============================================
// 4. 모델 전환 및 UI 업데이트
// ===============================================

document.getElementById("model1-btn").addEventListener("click", () => {
    currentModel = 1;
    updateModelInfo();
});

document.getElementById("model2-btn").addEventListener("click", () => {
    currentModel = 2;
    updateModelInfo();
});

function updateModelInfo() {
    const infoElement = document.getElementById("current-model-info");
    if (currentModel === 1) {
        infoElement.innerHTML = "현재 활성화된 모델: **모델 1** (첫 번째 프로젝트)";
        document.getElementById("model1-btn").classList.add('active');
        document.getElementById("model2-btn").classList.remove('active');
    } else if (currentModel === 2) {
        infoElement.innerHTML = "현재 활성화된 모델: **모델 2** (두 번째 프로젝트)";
        document.getElementById("model1-btn").classList.remove('active');
        document.getElementById("model2-btn").classList.add('active');
    }
}