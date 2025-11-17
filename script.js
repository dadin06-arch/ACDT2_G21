// script.js - AI StyleMate Logic (Final Version with Face Detection and Low Confidence Check)

// ----------------------------------------------------
// 1. MODEL PATHS, VARIABLES & DATA DEFINITION
// ----------------------------------------------------
const URL_MODEL_1 = "./models/model_1/"; 
const URL_MODEL_2 = "./models/model_2/"; 

// 💡 신뢰도 임계값: 가장 높은 확률이 60% (0.60) 미만일 경우 경고 메시지 출력
const CONFIDENCE_THRESHOLD = 0.60; 

let model1, model2, webcam;
let faceDetectorModel; // 💡 얼굴 감지 모델 변수
let labelContainer = document.getElementById("label-container");
let currentModel = 0; 
let requestID; 
let isRunning = false; 
let isInitialized = false; 
let currentSource = 'webcam'; 

// 💡 얼굴 감지 임계값 (필요 시 조정 가능)
const FACE_DETECTION_THRESHOLD = 0.9; // 얼굴 감지 신뢰도
const MIN_FACE_SIZE = 50; // 최소 얼굴 크기 (픽셀)

// 💡 얼굴형별 추천 데이터 및 이미지 URL 정의
const faceTypeData = {
    "Oval": {
        summary: "The most versatile face shape. Naturally suits most hairstyles.",
        short: "Crop cut, undercut, bob.",
        long: "Layered cuts, natural waves.",
        shortImage: 'images/oval_short.png',
        longImage: 'images/oval_long.png'
    },
    "Round": {
        summary: "Styles that look longer and sharper work well. Best with styles that add vertical length and slim the sides.",
        short: "Voluminous tops, side-parted bob.",
        long: "Long layers, high ponytail.",
        shortImage: 'images/round_short.png',
        longImage: 'images/round_long.png'
    },
    "Square": {
        summary: "Softening styles that reduce angularity. Best with rounded styles or voluminous curls.",
        short: "Soft waves, graduated bob.",
        long: "Long layers, soft curls.",
        shortImage: 'images/square_short.png',
        longImage: 'images/square_long.png'
    },
    "Heart": {
        summary: "Styles that balance the narrow chin. Best with volume around the jawline.",
        short: "Pixie cut, chin-length bob.",
        long: "Long layers with volume at the bottom.",
        shortImage: 'images/heart_short.png',
        longImage: 'images/heart_long.png'
    },
    "Oblong": {
        summary: "Styles that add width and reduce length. Best with styles that cover the forehead or add horizontal volume.",
        short: "Chin-length bob, fringe/bangs.",
        long: "Shoulder-length waves, full bangs.",
        shortImage: 'images/oblong_short.png',
        longImage: 'images/oblong_long.png'
    }
};

// 💡 퍼스널 톤별 추천 데이터 및 이미지 URL 정의
const personalToneData = {
    "Warm": {
        summary: "Warm tones benefit from hair colors with golden, honey, or copper undertones.",
        hair: "Warm browns (mocha, chestnut), rich reds (copper, auburn), golden blondes (honey, caramel).",
        clothing: "Earth tones (olive green, terracotta), mustard yellow, warm reds.",
        makeup: "Gold, bronze, coral, peach.",
        image: 'images/warm_palette.png'
    },
    "Cool": {
        summary: "Cool tones benefit from hair colors with ash, platinum, or blue-red undertones.",
        hair: "Cool browns (ash brown, deep espresso), cool reds (burgundy, true red), ash blondes (platinum, silver).",
        clothing: "Jewel tones (sapphire, emerald), pure white, cool pinks, navy blue.",
        makeup: "Silver, pewter, cool pink, ruby red.",
        image: 'images/cool_palette.png'
    }
};


// ===============================================
// 2. Event Listeners and Setup
// ===============================================

document.addEventListener("DOMContentLoaded", () => {
    // 버튼 연결
    document.getElementById("start-button").addEventListener("click", toggleAnalysis);
    
    // 모델 전환 버튼 연결
    document.getElementById("model1-btn").addEventListener("click", () => handleModelChange(1));
    document.getElementById("model2-btn").addEventListener("click", () => handleModelChange(2));
    
    // 모드 전환 버튼 연결
    document.getElementById("mode-webcam").addEventListener("click", () => switchMode('webcam'));
    document.getElementById("mode-upload").addEventListener("click", () => switchMode('image'));

    // 이미지 업로드 및 처리 버튼 연결
    document.getElementById("image-upload").addEventListener("change", handleImageUpload);
    document.getElementById("process-image-btn").addEventListener("click", processUploadedImage);
    
    // 수동 선택 버튼 연결 (for Tone/Face Type)
    document.querySelectorAll('.face-select-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            handleManualSelection('Face Type', e.target.getAttribute('data-facetype'));
        });
    });
    document.querySelectorAll('.tone-select-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            handleManualSelection('Personal Tone', e.target.getAttribute('data-tonetype'));
        });
    });

    // 초기 모드 설정
    switchMode('webcam'); 
});


// ===============================================
// 3. Mode Switching Logic
// ===============================================

function switchMode(mode) {
    if (currentSource === mode) return;

    if (isRunning) {
        toggleAnalysis(); 
    }
    
    const webcamContainer = document.getElementById("webcam-container");
    webcamContainer.innerHTML = '';
    
    currentSource = mode;
    
    // 활성화된 모드 버튼 스타일 변경
    document.getElementById("mode-webcam").classList.remove('active');
    document.getElementById("mode-upload").classList.remove('active');
    document.getElementById(`mode-${mode}`).classList.add('active');
    
    const webcamControls = document.getElementById("webcam-controls");
    const uploadControls = document.getElementById("upload-controls");

    if (mode === 'webcam') {
        webcamControls.style.display = 'block';
        uploadControls.style.display = 'none';
        
        if(webcam && webcam.canvas) {
            webcamContainer.appendChild(webcam.canvas);
        } else {
            webcamContainer.innerHTML = '<p id="initial-message">분석을 시작하려면 "Start Analysis" 버튼을 클릭하세요.</p>';
        }

    } else if (mode === 'image') {
        webcamControls.style.display = 'none';
        uploadControls.style.display = 'block';
        webcamContainer.innerHTML = '<p id="initial-message">분석할 이미지를 업로드해 주세요.</p>';
        
        if(webcam) {
            webcam.pause();
        }
    }
    
    // 모드 전환 시 결과 영역 초기화
    labelContainer.innerHTML = '분석 대기 중...';
    document.getElementById("recommendation-output").innerHTML = '<p>Select a model to begin the analysis or selection.</p>';
}

function handleImageUpload(event) {
    const file = event.target.files[0];
    const processBtn = document.getElementById("process-image-btn");
    const webcamContainer = document.getElementById("webcam-container");

    if (file && file.type.startsWith('image/')) {
        const reader = new FileReader();
        reader.onload = (e) => {
            // 이미지 미리보기를 위한 img 태그 삽입
            webcamContainer.innerHTML = `<img id="uploaded-image" src="${e.target.result}" alt="Uploaded Image" style="width: 100%; height: auto; border-radius: 10px;">`;
            processBtn.disabled = false;
            processBtn.innerText = currentModel === 0 ? 'Select Model First' : 'Process Uploaded Image';
        };
        reader.readAsDataURL(file);
    } else {
        webcamContainer.innerHTML = `
            <div class="error-message">
                <i class="fas fa-times-circle"></i>
                <h3>🚫 파일 오류: 유효하지 않은 파일입니다.</h3>
                <p>이미지 파일(JPG, PNG 등)만 업로드할 수 있습니다.</p>
            </div>
        `;
        processBtn.disabled = true;
    }
}

function processUploadedImage() {
    if (currentModel === 0) {
        labelContainer.innerHTML = `<div class="error-message"><h3>❌ 모델 오류: 분석을 시작하기 전에 모델을 선택해 주세요.</h3></div>`;
        return;
    }
    const uploadedImg = document.getElementById('uploaded-image');
    if (uploadedImg) {
        labelContainer.innerHTML = '이미지 분석 중... 잠시만 기다려 주세요.';
        
        // 이미지에서 얼굴 감지 및 자르기 시도 
        cropAndPredict(uploadedImg);
        
        document.getElementById("process-image-btn").innerText = 'Re-Analyze Image';
        
    } else {
        labelContainer.innerHTML = `<div class="error-message"><h3>❌ 오류: 업로드된 이미지를 찾을 수 없습니다. 파일을 다시 선택해 주세요.</h3></div>`;
    }
}


// ===============================================
// 4. Initialization, Webcam Loop Control & Face Detection
// ===============================================

async function init() {
    if (isInitialized) return;

    try {
        // 모델 로드
        model1 = await tmImage.load(URL_MODEL_1 + "model.json", URL_MODEL_1 + "metadata.json");
        model2 = await tmImage.load(URL_MODEL_2 + "model.json", URL_MODEL_2 + "metadata.json");
        
        // BlazeFace 얼굴 감지 모델 로드
        faceDetectorModel = await blazeface.load();
        
        isInitialized = true;
        
        // 초기 모델 설정 (기본 모델 1)
        handleModelChange(1); 
        
        // 웹캠 초기화 (캔버스 준비)
        const size = 400; // 캔버스 크기
        const flip = true; 
        
        const webcamContainer = document.getElementById("webcam-container");
        webcam = new tmImage.Webcam(size, size, flip); 
        await webcam.setup(); 
        webcamContainer.innerHTML = ''; 
        webcamContainer.appendChild(webcam.canvas); 
        
        document.getElementById("start-button").textContent = '⏸️ Stop Analysis';
        isRunning = true;
        loop(); 
        
        document.getElementById("initial-message")?.remove(); 

    } catch (e) {
        console.error("Initialization error:", e);
        let errorMessage = "AI 모델 로드에 실패했거나 웹캠에 접근할 수 없습니다.";

        if (e.name === "NotAllowedError" || e.name === "PermissionDeniedError") {
            errorMessage = `<i class="fas fa-video-slash"></i><h3>🚫 권한 오류: 웹캠 사용이 거부되었습니다.</h3><p>브라우저 설정에서 카메라 접근 권한을 **허용**해 주세요.</p>`;
        } else {
             errorMessage = `<i class="fas fa-network-wired"></i><h3>❌ 오류: AI 모델 로드 실패 또는 네트워크 문제</h3><p>파일 경로(\`models/\`)를 확인하거나 네트워크 상태를 점검해 주세요. 자세한 내용은 콘솔을 확인하십시오.</p>`;
        }
        
        labelContainer.innerHTML = `<div class="error-message">${errorMessage}</div>`;
        isInitialized = false;
        isRunning = false; 
    }
}

async function loop() {
    if (!isRunning || currentSource !== 'webcam') {
        return;
    }
    
    webcam.update(); 
    // 웹캠 캔버스를 사용하여 얼굴 감지 및 예측
    cropAndPredict(webcam.canvas); 
    
    requestID = window.requestAnimationFrame(loop);
}

function toggleAnalysis() {
    const startButton = document.getElementById("start-button");
    if (currentSource !== 'webcam') return;

    if (!isInitialized) {
        startButton.textContent = '모델 로드 중...';
        init();
        return;
    }

    if (isRunning) {
        window.cancelAnimationFrame(requestID);
        webcam.pause();
        startButton.textContent = '🚀 Start Analysis';
        labelContainer.innerHTML = '분석이 중지되었습니다.';
    } else {
        webcam.play();
        startButton.textContent = '⏸️ Stop Analysis';
        isRunning = true;
        loop();
        labelContainer.innerHTML = '실시간 분석 중...';
    }
    isRunning = !isRunning;
}

// 💡 얼굴 감지 및 이미지 자르기 (Face Detection and Cropping)
async function cropAndPredict(sourceElement) {
    if (!faceDetectorModel) {
        console.warn("Face detection model not loaded. Predicting with full image.");
        predict(sourceElement); // 얼굴 감지 모델이 없으면 전체 이미지로 예측 시도
        return;
    }

    try {
        const predictions = await faceDetectorModel.estimateFaces(sourceElement, FACE_DETECTION_THRESHOLD);

        if (predictions.length > 0) {
            const face = predictions[0];
            const [x, y] = face.topLeft;
            const [x2, y2] = face.bottomRight;
            const width = x2 - x;
            const height = y2 - y;

            if (width < MIN_FACE_SIZE || height < MIN_FACE_SIZE) {
                labelContainer.innerHTML = `
                    <div class="warning-message">
                        <i class="fas fa-search-minus"></i>
                        <h3>🔍 얼굴이 너무 작습니다.</h3>
                        <p>카메라에 더 가까이 다가가거나 더 선명한 이미지를 사용해 주세요.</p>
                    </div>
                `;
                document.getElementById("recommendation-output").innerHTML = `<p>Cannot provide recommendation until a face is detected.</p>`;
                return;
            }

            // 얼굴 영역을 담을 임시 캔버스 생성 (Teachable Machine 입력 크기 사용)
            const tempCanvas = document.createElement('canvas');
            const tmSize = model1.inputShape ? model1.inputShape[1] : 224; // 모델 입력 크기
            tempCanvas.width = tmSize;
            tempCanvas.height = tmSize;
            const ctx = tempCanvas.getContext('2d');
            
            // 얼굴 주변에 여백을 추가하여 자르기 (Bounding Box를 1.2배 확대)
            const margin = Math.max(width, height) * 0.1; 
            const cropX = Math.max(0, x - margin);
            const cropY = Math.max(0, y - margin);
            const cropWidth = width + 2 * margin;
            const cropHeight = height + 2 * margin;

            // 원본 이미지를 자르고 임시 캔버스에 그립니다.
            ctx.drawImage(sourceElement, cropX, cropY, cropWidth, cropHeight, 0, 0, tmSize, tmSize);

            // 자른 이미지로 예측 실행
            predict(tempCanvas);
            
            // 실시간 웹캠 모드에서만 Bounding Box 시각화
            if (currentSource === 'webcam' && sourceElement instanceof HTMLCanvasElement) {
                drawBoundingBox(sourceElement, x, y, width, height);
            }

        } else {
            // 얼굴 감지 실패
            labelContainer.innerHTML = `
                <div class="warning-message">
                    <i class="fas fa-user-slash"></i>
                    <h3>🤔 얼굴 감지 실패</h3>
                    <p>이미지 중앙에 얼굴이 잘 보이도록 위치를 조정하거나, 조명을 밝게 해주세요.</p>
                </div>
            `;
            document.getElementById("recommendation-output").innerHTML = `<p>Cannot provide recommendation until a face is detected.</p>`;
        }
    } catch (error) {
        console.error("Error during face detection:", error);
        labelContainer.innerHTML = `<div class="error-message"><h3>❌ 분석 중 오류 발생</h3><p>얼굴 감지 과정에서 문제가 발생했습니다. 콘솔을 확인하십시오.</p></div>`;
    }
}

// 💡 바운딩 박스 그리기 (웹캠 모드 시)
function drawBoundingBox(canvas, x, y, width, height) {
    const ctx = canvas.getContext('2d');
    
    // Bounding Box를 그립니다.
    ctx.strokeStyle = '#6a82fb'; // 밝은 파란색/보라색
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.rect(x, y, width, height);
    ctx.stroke();

    // 텍스트 라벨 추가
    ctx.font = '16px Arial';
    ctx.fillStyle = '#6a82fb';
    ctx.fillText('FACE DETECTED', x, y > 10 ? y - 5 : y + 20); 
}


// ===============================================
// 5. Model Switching
// ===============================================

function handleModelChange(modelId) {
    if (!isInitialized && modelId !== currentModel) {
        labelContainer.innerHTML = `<div class="warning-message">모델을 먼저 로드해 주세요. 'Start Analysis' 버튼을 눌러 초기화할 수 있습니다.</div>`;
        return;
    }
    
    // 모델 전환 시 수동 선택 옵션도 변경
    const faceControls = document.getElementById("face-selection-controls");
    const toneControls = document.getElementById("tone-selection-controls");

    currentModel = modelId;
    updateModelInfo();
    
    labelContainer.innerHTML = `모델 ${modelId} **(${modelId === 1 ? '얼굴형' : '퍼스널 톤'})**이 활성화되었습니다.`;
    document.getElementById("recommendation-output").innerHTML = `<p>분석 또는 수동 선택 결과를 기다립니다.</p>`;
    
    if (modelId === 1) {
        faceControls.style.display = 'block';
        toneControls.style.display = 'none';
    } else if (modelId === 2) {
        faceControls.style.display = 'none';
        toneControls.style.display = 'block';
    }
}

function updateModelInfo() {
    const infoElement = document.getElementById("current-model-info");
    const btn1 = document.getElementById("model1-btn");
    const btn2 = document.getElementById("model2-btn");

    if (currentModel === 1) {
        infoElement.innerHTML = "Active Model: **Face Type Analysis**";
        btn1.classList.add('active');
        btn2.classList.remove('active');
    } else if (currentModel === 2) {
        infoElement.innerHTML = "Active Model: **Personal Tone Analysis**";
        btn1.classList.remove('active');
        btn2.classList.add('active');
    } else {
        infoElement.innerHTML = "Active Model: **Not yet loaded**";
        btn1.classList.remove('active');
        btn2.classList.remove('active');
    }
    
    // 이미지 처리 버튼 텍스트 업데이트
    const processBtn = document.getElementById("process-image-btn");
    if (currentSource === 'image' && processBtn && !processBtn.disabled) {
         processBtn.innerText = 'Process Uploaded Image';
    }
}


// ===============================================
// 6. Prediction & Recommendation Logic (with Confidence Check)
// ===============================================

async function predict(element) {
    if (currentModel === 0) return; 
    
    const modelToUse = currentModel === 1 ? model1 : model2;
    const modelName = currentModel === 1 ? "Face Type Analysis (얼굴형)" : "Personal Tone Analysis (퍼스널 톤)";
    
    const currentMaxPredictions = modelToUse.getTotalClasses(); 

    const prediction = await modelToUse.predict(element);
    
    const topPrediction = prediction[0];
    const topPredictionProbability = topPrediction.probability;

    // 💡 1. 신뢰도 기반 피드백 및 안내 메시지 로직 (핵심)
    if (topPredictionProbability < CONFIDENCE_THRESHOLD) {
        // 신뢰도가 낮을 경우, 안내 메시지 출력
        labelContainer.innerHTML = `
            <div class="low-confidence-warning">
                <i class="fas fa-exclamation-triangle"></i>
                <h3>⚠️ 경고: 현재 이미지의 신뢰도가 낮습니다. (${(topPredictionProbability * 100).toFixed(1)}%)</h3>
                <p>더 정확한 결과를 위해 **조명을 밝게 하거나, 얼굴을 정면으로 하고, 배경을 단순화**하여 다시 시도해 주세요.</p>
            </div>
        `;
        document.getElementById("recommendation-output").innerHTML = `<p>Recommendation is paused due to low analysis confidence.</p>`;
        return; // 낮은 신뢰도일 경우, Top-K 표시 및 추천을 건너뜁니다.
    }
    
    // 신뢰도가 높을 경우, 기존 Top-K 표시 로직 실행
    let resultHTML = `<div class=\"model-name-title\"><h3>${modelName} Results:</h3></div>`;
    
    for (let i = 0; i < currentMaxPredictions; i++) {
        const item = prediction[i];
        const probabilityPercent = (item.probability * 100).toFixed(1);
        const isTop = (i === 0);
        
        const classPrediction = 
            `<strong>${item.className}</strong>: ${probabilityPercent}%`;
        
        resultHTML += `<div class=\"prediction-item ${isTop ? 'top-prediction' : ''}\">${classPrediction}</div>`;
    }
    labelContainer.innerHTML = resultHTML;
    
    // 💡 2. 최고 확률 결과에 따른 추천 출력
    if (currentModel === 1) {
        displayFaceTypeRecommendation(topPrediction.className);
    } else if (currentModel === 2) {
        displayPersonalToneRecommendation(topPrediction.className);
    }
}

// 💡 수동 선택 처리 로직
function handleManualSelection(type, value) {
    document.getElementById("recommendation-output").innerHTML = `<div class="warning-message"><i class="fas fa-fingerprint"></i> Manually selected: ${value}</div>`;
    labelContainer.innerHTML = `Manual selection activated for ${type}.`;
    
    if (type === 'Face Type') {
        displayFaceTypeRecommendation(value);
    } else if (type === 'Personal Tone') {
        displayPersonalToneRecommendation(value);
    }
}

// 💡 얼굴형 추천 표시
function displayFaceTypeRecommendation(faceType) {
    const outputContainer = document.getElementById("recommendation-output");
    const data = faceTypeData[faceType] || faceTypeData["Oval"]; 
    
    const recommendationHTML = `
        <div class="recommendation-box">
            <h3><i class="fas fa-cut"></i> Hair Style Recommendation for: ${faceType}</h3>
            <p class="summary-text">${data.summary}</p>
            
            <div class="style-column-container">
                <div class="style-column">
                    <h5><i class="fas fa-male"></i> Short Styles: ${data.short}</h5>
                    <img src="${data.shortImage}" alt="${faceType} Short Style" onerror="this.src='https://placehold.co/150x150/f0f0f0/787878?text=Placeholder'" loading="lazy">
                </div>
                <div class="style-column">
                    <h5><i class="fas fa-female"></i> Long Styles: ${data.long}</h5>
                    <img src="${data.longImage}" alt="${faceType} Long Style" onerror="this.src='https://placehold.co/150x150/f0f0f0/787878?text=Placeholder'" loading="lazy">
                </div>
            </div>
        </div>
    `;
    outputContainer.innerHTML = recommendationHTML; 
}

// 💡 퍼스널 톤 추천 표시
function displayPersonalToneRecommendation(toneType) {
    const outputContainer = document.getElementById("recommendation-output");
    const data = personalToneData[toneType] || personalToneData["Cool"]; 
    
    const recommendationHTML = `
        <div class="recommendation-box tone-recommendation">
            <h3><i class="fas fa-palette"></i> Color Recommendation for: ${toneType} Tone</h3>
            <p class="summary-text">${data.summary}</p>
            
            <div class="tone-content-wrapper">
                <div class="tone-text-column">
                    <div class="tone-category">
                        <h5><i class="fas fa-paint-brush"></i> Hair Colors</h5>
                        <p>${data.hair}</p>
                    </div>
                    <div class="tone-category">
                        <h5><i class="fas fa-tshirt"></i> Clothing Colors</h5>
                        <p>${data.clothing}</p>
                    </div>
                    <div class="tone-category">
                        <h5><i class="fas fa-gem"></i> Makeup Colors</h5>
                        <p>${data.makeup}</p>
                    </div>
                </div>
                <div class="tone-image-column">
                    <img src="${data.image}" alt="${toneType} Color Palette" onerror="this.src='https://placehold.co/200x200/f0f0f0/787878?text=Palette'">
                </div>
            </div>
        </div>
    `;
    outputContainer.innerHTML = recommendationHTML; 
}
