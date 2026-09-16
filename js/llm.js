/**
 * llm.js - LLM Vision API 기반 이미지/영수증 가격 분석 및 AI 레시피 추천 모듈
 */

const LLMService = (() => {
  const STORAGE_KEY_API_KEY = 'fridge_llm_api_key';

  // 허용된 카테고리 목록
  const VALID_CATEGORIES = ['냉동', '달걀', '유제품', '곡물', '수산물', '반찬', '기타'];

  /**
   * 로컬 스토리지 또는 key.env(ENV_CONFIG)에서 API Key 조회
   * @returns {string}
   */
  const getApiKey = () => {
    try {
      // 1. key.env에서 로드된 기본 OpenAI API 키 우선 적용
      if (typeof window !== 'undefined' && window.ENV_CONFIG?.OPENAI_API_KEY) {
        return window.ENV_CONFIG.OPENAI_API_KEY;
      }
      // 2. localStorage에 저장된 API Key
      return localStorage.getItem(STORAGE_KEY_API_KEY) || '';
    } catch (e) {
      console.error('[LLMService] Failed to read API key', e);
      return '';
    }
  };

  /**
   * API Key를 로컬 스토리지에 저장
   * @param {string} key
   */
  const saveApiKey = (key) => {
    try {
      const trimmed = (key || '').trim();
      if (trimmed) {
        localStorage.setItem(STORAGE_KEY_API_KEY, trimmed);
      } else {
        localStorage.removeItem(STORAGE_KEY_API_KEY);
      }
      return true;
    } catch (e) {
      console.error('[LLMService] Failed to save API key to localStorage', e);
      return false;
    }
  };

  /**
   * File 객체를 Base64 문자열 및 MIME 타입으로 인코딩
   * (접두사 data:image/jpeg;base64, 부분은 API 스펙에 맞게 파싱)
   * @param {File|Blob} file
   * @returns {Promise<{base64Data: string, mimeType: string}>}
   */
  const encodeFileToBase64 = (file) => {
    return new Promise((resolve, reject) => {
      if (!file) {
        return reject(new Error('유효한 이미지 파일이 아닙니다.'));
      }

      // 브라우저 FileReader 지원
      if (typeof FileReader !== 'undefined' && file instanceof Blob) {
        const reader = new FileReader();
        reader.onload = () => {
          const resultStr = reader.result;
          if (typeof resultStr !== 'string') {
            return reject(new Error('Base64 변환 결과를 읽을 수 없습니다.'));
          }
          // 접두사 data:image/xxx;base64, 분리 파싱
          const match = resultStr.match(/^data:([^;]+);base64,(.+)$/);
          if (match) {
            resolve({
              mimeType: match[1],
              base64Data: match[2]
            });
          } else {
            reject(new Error('Base64 변환 형식이 올바르지 않습니다.'));
          }
        };
        reader.onerror = (error) => reject(error);
        reader.readAsDataURL(file);
      } else if (typeof Buffer !== 'undefined' && (Buffer.isBuffer(file) || file.buffer)) {
        // Node.js 단위 테스트 지원
        const buf = Buffer.isBuffer(file) ? file : Buffer.from(file.buffer);
        resolve({
          mimeType: file.type || 'image/jpeg',
          base64Data: buf.toString('base64')
        });
      } else {
        reject(new Error('유효한 이미지 파일 객체가 아닙니다.'));
      }
    });
  };

  /**
   * 대용량 이미지 파일 자동 압축 (브라우저 Canvas 지원 환경)
   * 스마트폰 초고화질 사진(10MB+) 업로드 시 메모리 초과/지연 방지
   */
  const compressImageIfNeeded = (file, maxWidth = 1600, maxHeight = 1600, quality = 0.85) => {
    return new Promise((resolve) => {
      if (!file || typeof Image === 'undefined' || typeof document === 'undefined') {
        return resolve(file);
      }
      if (file.type && !file.type.startsWith('image/')) {
        return resolve(file);
      }
      if (file.size && file.size <= 1024 * 1024) {
        return resolve(file);
      }

      const img = new Image();
      const url = URL.createObjectURL(file);
      img.onload = () => {
        URL.revokeObjectURL(url);
        let width = img.width;
        let height = img.height;
        if (!width || !height) return resolve(file);

        if (width > maxWidth || height > maxHeight) {
          if (width > height) {
            height = Math.round((height * maxWidth) / width);
            width = maxWidth;
          } else {
            width = Math.round((width * maxHeight) / height);
            height = maxHeight;
          }
        }

        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (!ctx) return resolve(file);
        ctx.drawImage(img, 0, 0, width, height);

        canvas.toBlob((blob) => {
          if (blob && blob.size < file.size) {
            resolve(blob);
          } else {
            resolve(file);
          }
        }, 'image/jpeg', quality);
      };
      img.onerror = () => {
        URL.revokeObjectURL(url);
        resolve(file);
      };
      img.src = url;
    });
  };

  /**
   * 영수증 및 식재료 분석 프롬프트 (Prompt 5 지시사항 준수)
   */
  const createVisionPrompt = () => {
    return `이 사진을 보고 식재료의 1) 물품명, 2) 카테고리('냉동', '달걀', '유제품', '곡물', '수산물', '반찬', '기타' 중 하나로 정확히 매칭), 3) 용량(예: 1L, 500g 등), 4) 유통기한(YYYY-MM-DD 형식, 안 보이면 빈 문자열)을 추출해 줘. 영수증이나 가격표에 금액이 있다면 5) 가격(원 단위 숫자, 없으면 0)도 함께 추출해 줘. 반드시 마크다운 코드블록 없이 순수 JSON 객체 포맷으로만 응답해.
응답 키 규격:
{"name":"물품명","category":"카테고리","capacity":"용량","expiryDate":"유통기한","price":0}`;
  };

  /**
   * 응답 텍스트에서 JSON 객체 파싱 및 검증
   * (영문 키 및 한글 키 유연한 매핑 지원)
   * @param {string} rawText
   * @returns {Object}
   */
  const parseJsonResponse = (rawText) => {
    if (!rawText || typeof rawText !== 'string') {
      throw new Error('응답 데이터가 비어 있습니다.');
    }

    let cleaned = rawText.trim();
    // 마크다운 코드블록 제거
    cleaned = cleaned.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '').trim();

    // 혹시 모를 서술형 텍스트 방어: 가장 외곽의 { ... } 추출
    const jsonMatch = cleaned.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      cleaned = jsonMatch[0];
    }

    const parsed = JSON.parse(cleaned);
    if (!parsed || typeof parsed !== 'object') {
      throw new Error('유효한 JSON 응답이 아닙니다.');
    }

    // 영문 키 및 한글 키 다중 지원
    const rawName = (parsed.name || parsed['물품명'] || '').trim();
    const rawCategory = (parsed.category || parsed['카테고리'] || '').trim();
    const rawCapacity = (parsed.capacity || parsed['용량'] || '').trim();
    const rawExpiry = (parsed.expiryDate || parsed['유통기한'] || '').trim();
    const rawConsumption = (parsed.consumptionDate || parsed['소비기한'] || '').trim();
    const rawPrice = parsed.price !== undefined ? parsed.price : (parsed['가격'] !== undefined ? parsed['가격'] : 0);

    // 카테고리 매칭 및 정규화
    let category = rawCategory;
    if (!VALID_CATEGORIES.includes(category)) {
      if (category.includes('냉동')) category = '냉동';
      else if (category.includes('달걀') || category.includes('계란')) category = '달걀';
      else if (category.includes('우유') || category.includes('유제품') || category.includes('치즈')) category = '유제품';
      else if (category.includes('곡물') || category.includes('쌀') || category.includes('곡류')) category = '곡물';
      else if (category.includes('수산') || category.includes('생선')) category = '수산물';
      else if (category.includes('반찬') || category.includes('김치')) category = '반찬';
      else category = '기타';
    }

    // 날짜 유효성 검증
    let expiryDate = rawExpiry;
    if (expiryDate && !/^\d{4}-\d{2}-\d{2}$/.test(expiryDate)) {
      expiryDate = '';
    }

    let consumptionDate = rawConsumption;
    if (consumptionDate && !/^\d{4}-\d{2}-\d{2}$/.test(consumptionDate)) {
      consumptionDate = '';
    }

    // 보관 위치 판별 (냉동 식품은 자동으로 FREEZER 지정)
    const storageType = (parsed.storageType === 'FREEZER' || parsed['보관위치'] === 'FREEZER' || category === '냉동') 
      ? 'FREEZER' 
      : 'FRIDGE';

    const priceNum = parseInt(rawPrice, 10);
    const validPrice = !isNaN(priceNum) && priceNum >= 0 ? priceNum : 0;

    return {
      name: rawName,
      category: category,
      capacity: rawCapacity,
      expiryDate: expiryDate,
      consumptionDate: consumptionDate,
      storageType: storageType,
      price: validPrice
    };
  };

  /**
   * LLM Vision API로 이미지를 전송하여 식재료 및 가격 정보 분석
   * @param {File|Blob} file
   * @param {string} [apiKeyOverride]
   * @returns {Promise<Object>}
   */
  const analyzeImage = async (file, apiKeyOverride) => {
    const apiKey = (apiKeyOverride || getApiKey()).trim();
    if (!apiKey) {
      throw new Error('LLM API Key가 설정되지 않았습니다. 상단 설정에서 API Key를 입력해 주세요.');
    }
    if (!file) {
      throw new Error('분석할 이미지 파일이 선택되지 않았습니다.');
    }

    const processedFile = await compressImageIfNeeded(file);
    const { base64Data, mimeType } = await encodeFileToBase64(processedFile);

    if (apiKey.startsWith('sk-')) {
      // OpenAI Vision API 호환
      const endpoint = 'https://api.openai.com/v1/chat/completions';
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`
        },
        body: JSON.stringify({
          model: 'gpt-4o-mini',
          messages: [
            {
              role: 'user',
              content: [
                { type: 'text', text: createVisionPrompt() },
                { type: 'image_url', image_url: { url: `data:${mimeType};base64,${base64Data}` } }
              ]
            }
          ],
          response_format: { type: 'json_object' },
          temperature: 0.1
        })
      });
      if (!response.ok) {
        let errMsg = `OpenAI API 오류 (${response.status})`;
        try {
          const errData = await response.json();
          if (errData?.error?.code === 'credit_balance_exhausted' || errData?.error?.type === 'insufficient_quota') {
            errMsg = 'OpenAI API 크레딧 잔액이 소진되었습니다 (잔액 부족: credit_balance_exhausted).\nOpenAI 계정에 크레딧을 충전하시거나 유효한 API Key로 교체해 주세요.';
          } else if (errData?.error?.code === 'invalid_api_key') {
            errMsg = '유효하지 않은 OpenAI API Key입니다. key.env 파일을 확인해 주세요.';
          } else if (errData?.error?.message) {
            errMsg += `: ${errData.error.message}`;
          }
        } catch (_) {}
        throw new Error(errMsg);
      }
      const data = await response.json();
      return parseJsonResponse(data.choices?.[0]?.message?.content);
    } else {
      // 무료 Gemini Vision API (REST fetch 호출)
      const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${encodeURIComponent(apiKey)}`;
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [
            {
              parts: [
                { text: createVisionPrompt() },
                {
                  inline_data: {
                    mime_type: mimeType,
                    data: base64Data
                  }
                }
              ]
            }
          ],
          generationConfig: {
            response_mime_type: 'application/json',
            temperature: 0.1
          }
        })
      });
      if (!response.ok) {
        let errMsg = `Gemini API 오류 (${response.status})`;
        try {
          const errData = await response.json();
          if (errData?.error?.message) errMsg += `: ${errData.error.message}`;
        } catch (_) {}
        throw new Error(errMsg);
      }
      const data = await response.json();
      const content = data.candidates?.[0]?.content?.parts?.[0]?.text;
      return parseJsonResponse(content);
    }
  };

  /**
   * 내장 기본 레시피 데이터베이스 (오프라인 / API 키 없을 때의 스마트 매칭용)
   */
  const BUILTIN_RECIPES = [
    {
      title: '고소한 치즈 계란말이',
      icon: '🍳',
      time: '10분',
      difficulty: '쉬움',
      keywords: ['달걀', '계란', '치즈', '우유'],
      extraIngredients: ['소금 약간', '식용유'],
      steps: [
        '달걀을 볼에 깨뜨려 넣고 소금 한 꼬집과 우유 1스푼을 섞어 곱게 풉니다.',
        '약불로 달군 팬에 식용유를 두르고 달걀물을 얇게 붓습니다.',
        '치즈를 가운데 올린 뒤 가장자리부터 조심스럽게 돌돌 말아줍니다.',
        '남은 달걀물을 이어 부어가며 두툼하게 말아 한 김 식힌 뒤 썹니다.'
      ]
    },
    {
      title: '매콤달콤 김치볶음밥',
      icon: '🍚',
      time: '15분',
      difficulty: '쉬움',
      keywords: ['김치', '반찬', '달걀', '곡물', '밥'],
      extraIngredients: ['참기름', '간장 1스푼', '고춧가루 약간'],
      steps: [
        '김치를 가위로 잘게 송송 썰어 준비합니다.',
        '팬에 기름을 두르고 썰어둔 김치와 간장을 넣어 달달 볶아줍니다.',
        '찬밥(곡물)을 넣고 주걱으로 고슬고슬하게 섞어가며 센 불에 볶습니다.',
        '참기름을 둘러 마무리하고 기호에 따라 계란후라이를 얹어 완성합니다.'
      ]
    },
    {
      title: '바삭 촉촉 냉동만두 그라탕',
      icon: '🥟',
      time: '12분',
      difficulty: '보통',
      keywords: ['만두', '냉동', '치즈'],
      extraIngredients: ['케첩 또는 토마토소스', '후추'],
      steps: [
        '냉동만두를 전자레인지에 2분간 살짝 돌려 해동합니다.',
        '오븐이나 전자레인지 용기에 만두를 담고 토마토소스를 고루 바릅니다.',
        '그 위에 치즈를 듬뿍 얹어 에어프라이어 180도 7분 또는 전자레인지 3분 돌립니다.'
      ]
    },
    {
      title: '시원하고 칼칼한 해물 라면/찌개',
      icon: '🍲',
      time: '10분',
      difficulty: '쉬움',
      keywords: ['수산물', '생선', '새우', '오징어', '냉동'],
      extraIngredients: ['라면 또는 된장/고추장', '대파', '다진마늘'],
      steps: [
        '냄비에 물 550ml와 다진 마늘을 넣고 끓입니다.',
        '보관 중인 수산물(새우, 조개 등)을 넣어 국물에 시원한 감칠맛을 우려냅니다.',
        '면과 스프를 넣고 4분간 보글보글 끓인 뒤 파를 얹어냅니다.'
      ]
    },
    {
      title: '달콤 촉촉 프렌치 토스트',
      icon: '🍞',
      time: '8분',
      difficulty: '쉬움',
      keywords: ['달걀', '우유', '유제품', '곡물'],
      extraIngredients: ['설탕 또는 메이플시럽', '버터'],
      steps: [
        '넓은 접시에 달걀 1개, 우유 50ml, 설탕 반 스푼을 넣고 잘 풉니다.',
        '식빵을 달걀물에 앞뒤로 듬뿍 적셔 촉촉하게 만듭니다.',
        '팬에 버터를 녹이고 약불에서 빵의 겉면이 노릇노릇해질 때까지 굽습니다.'
      ]
    }
  ];

  /**
   * 보유 식재료 기반 AI 레시피 추천
   * @param {Array<Object>} availableItems - 현재 보관 중인 식재료 목록
   * @returns {Promise<Array<Object>>} 추천 레시피 배열
   */
  const getRecipeRecommendations = async (availableItems) => {
    // 소진 완료되지 않은 식재료 이름 및 카테고리 추출
    const activeItems = (availableItems || []).filter(i => i.status !== 'COMPLETED');
    const ingredientNames = activeItems.map(i => i.name).filter(Boolean);

    if (ingredientNames.length === 0) {
      return [{
        title: '냉장고가 비어있어요!',
        icon: '🛒',
        time: '-',
        difficulty: '쉬움',
        usedIngredients: [],
        extraIngredients: ['식재료를 먼저 등록해 주세요'],
        steps: ['냉장고에 식재료를 추가하시면 보유한 재료로 요리할 수 있는 맞춤 레시피를 추천해 드립니다!']
      }];
    }

    const apiKey = getApiKey();

    // 1. API Key가 있는 경우 Gemini/OpenAI를 통한 맞춤 레시피 생성 시도
    if (apiKey) {
      try {
        const prompt = `당신은 스타 셰프이자 냉장고 파먹기 요리 전문가입니다.
사용자의 냉장고에 현재 남아있는 재료 목록: [${ingredientNames.join(', ')}]

위 재료를 중심으로 만들 수 있는 창의적이고 실용적인 레시피 2~3개를 추천해주세요.
반드시 마크다운 없이 순수 JSON 포맷으로만 응답해야 합니다:
{
  "recipes": [
    {
      "title": "요리명 (예: 초간단 감자 치즈 오믈렛)",
      "icon": "요리에 어울리는 음식 이모지 (예: 🍳, 🍲, 🥗, 🍛)",
      "time": "조리시간 (예: 15분)",
      "difficulty": "쉬움 | 보통 | 어려움",
      "usedIngredients": ["실제 사용된 보유 재료명들"],
      "extraIngredients": ["집에 흔히 있는 기본 양념이나 추가 재료"],
      "steps": [
        "1. 재료 손질 방법...",
        "2. 조리 순서...",
        "3. 마무리..."
      ]
    }
  ]
}`;

        let rawResponse = '';
        if (apiKey.startsWith('sk-')) {
          const res = await fetch('https://api.openai.com/v1/chat/completions', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${apiKey}`
            },
            body: JSON.stringify({
              model: 'gpt-4o-mini',
              messages: [{ role: 'user', content: prompt }],
              response_format: { type: 'json_object' }
            })
          });
          const data = await res.json();
          rawResponse = data.choices?.[0]?.message?.content;
        } else {
          const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${encodeURIComponent(apiKey)}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              contents: [{ parts: [{ text: prompt }] }],
              generationConfig: { response_mime_type: 'application/json' }
            })
          });
          const data = await res.json();
          rawResponse = data.candidates?.[0]?.content?.parts?.[0]?.text;
        }

        if (rawResponse) {
          const cleaned = rawResponse.trim().replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '').trim();
          const parsed = JSON.parse(cleaned);
          if (parsed && Array.isArray(parsed.recipes) && parsed.recipes.length > 0) {
            return parsed.recipes;
          }
        }
      } catch (err) {
        console.warn('[LLMService] Online recipe recommendation fallback to local DB:', err);
      }
    }

    // 2. 오프라인 / API 키 미등록 시 스마트 매칭 내장 레시피 반환
    const matched = BUILTIN_RECIPES.map(recipe => {
      const used = [];
      activeItems.forEach(item => {
        const matches = recipe.keywords.some(k => 
          item.name.toLowerCase().includes(k.toLowerCase()) || 
          item.category.toLowerCase().includes(k.toLowerCase())
        );
        if (matches && !used.includes(item.name)) {
          used.push(item.name);
        }
      });
      return {
        ...recipe,
        usedIngredients: used,
        matchScore: used.length
      };
    }).sort((a, b) => b.matchScore - a.matchScore);

    // 최소 2개 추천 보장
    return matched.slice(0, 3);
  };

  return {
    getApiKey,
    saveApiKey,
    encodeFileToBase64,
    parseJsonResponse,
    analyzeImage,
    getRecipeRecommendations,
    VALID_CATEGORIES
  };
})();

// 브라우저 및 CommonJS 호환
if (typeof window !== 'undefined') {
  window.LLMService = LLMService;
}
if (typeof module !== 'undefined' && module.exports) {
  module.exports = LLMService;
}
