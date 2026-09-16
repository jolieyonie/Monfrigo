/**
 * expiryHelper.js - 유통기한 및 소비기한(식약처 기준 섭취가능기한) 자동 추천 엔진
 */

const ExpiryHelper = (() => {
  /**
   * 식재료명, 카테고리, 보관 위치(냉동/냉장)를 분석하여 유통기한 및 소비기한 추천치 산출
   * @param {string} name - 식재료명
   * @param {string} category - 카테고리
   * @param {'FREEZER'|'FRIDGE'} storageType - 보관 위치
   * @returns {{expiryDays: number, expiryDateStr: string, consumptionDays: number, consumptionDateStr: string, reason: string, guidance: string}}
   */
  const getRecommendation = (name = '', category = '', storageType = 'FRIDGE') => {
    const cleanName = (name || '').toLowerCase().trim();
    const isFreezer = storageType === 'FREEZER' || category === '냉동';

    let expiryDays = 14;       // 유통기한 (판매 권장 기한)
    let consumptionDays = 21;  // 소비기한 (실제 안전 섭취 가능 기한)
    let reason = '일반 식품 권장 기준';
    let guidance = '냉장 보관 시 유통기한 경과 후에도 약 7일간 섭취 가능합니다.';

    if (isFreezer) {
      // ----------------- 냉동실 보관 기준 -----------------
      if (cleanName.includes('만두') || cleanName.includes('피자') || cleanName.includes('너겟') || category === '냉동') {
        expiryDays = 180;
        consumptionDays = 270;
        reason = '냉동 가공식품 기준';
        guidance = '영하 18℃ 이하 보관 시 유통기한 이후 약 3개월까지 안전하게 섭취 가능합니다.';
      } else if (cleanName.includes('고기') || cleanName.includes('소고기') || cleanName.includes('돼지') || cleanName.includes('닭') || category === '육류') {
        expiryDays = 120;
        consumptionDays = 180;
        reason = '냉동 육류 보관 기준';
        guidance = '밀봉 냉동 보관 시 최대 6개월까지 섭취 가능합니다.';
      } else if (cleanName.includes('생선') || cleanName.includes('새우') || cleanName.includes('오징어') || category === '수산물') {
        expiryDays = 90;
        consumptionDays = 120;
        reason = '냉동 수산물 기준';
        guidance = '수산물은 산패를 막기 위해 3~4개월 이내 소비를 권장합니다.';
      } else if (cleanName.includes('떡') || cleanName.includes('빵') || category === '곡물') {
        expiryDays = 90;
        consumptionDays = 150;
        reason = '냉동 제과/곡물 기준';
        guidance = '냉동 시 수분 증발을 막아 약 5개월간 보관 가능합니다.';
      } else {
        expiryDays = 90;
        consumptionDays = 150;
        reason = '냉동 일반 보관 기준';
        guidance = '냉동 보관 시 미생물 번식이 억제되어 장기 보관이 가능합니다.';
      }
    } else {
      // ----------------- 냉장실 보관 기준 (식약처 가이드라인 반영) -----------------
      if (category === '달걀' || cleanName.includes('계란') || cleanName.includes('달걀')) {
        expiryDays = 25;
        consumptionDays = 45; // 달걀은 유통기한 +25일
        reason = '달걀 (식약처 소비기한 가이드)';
        guidance = '냉장 보관(0~10℃) 시 유통기한 만료 후 약 25일까지 섭취 가능합니다.';
      } else if (category === '유제품') {
        if (cleanName.includes('우유')) {
          expiryDays = 10;
          consumptionDays = 50; // 우유는 미개봉 냉장 시 유통기한 +최대 50일
          reason = '우유 신선 소비 기준';
          guidance = '미개봉 냉장 보관 시 유통기한 경과 후 최대 45~50일간 안전합니다. (개봉 후엔 3~5일 이내 섭취)';
        } else if (cleanName.includes('치즈')) {
          expiryDays = 30;
          consumptionDays = 70;
          reason = '가공 치즈류 기준';
          guidance = '미개봉 치즈는 유통기한 이후 약 70일까지 보관 및 섭취가 가능합니다.';
        } else if (cleanName.includes('요거트') || cleanName.includes('요플레')) {
          expiryDays = 10;
          consumptionDays = 25;
          reason = '발효유 소비 기준';
          guidance = '발효유류는 유통기한 이후 약 10~15일간 안전하게 섭취 가능합니다.';
        } else {
          expiryDays = 14;
          consumptionDays = 30;
          reason = '유제품 일반 기준';
          guidance = '미개봉 상태 유지 시 유통기한보다 약 2주 더 보관 가능합니다.';
        }
      } else if (cleanName.includes('두부')) {
        expiryDays = 14;
        consumptionDays = 90; // 두부 소비기한 약 90일
        reason = '두부 (식약처 소비기한 가이드)';
        guidance = '미개봉 냉장(0~5℃) 상태인 경우 유통기한 이후 최대 90일까지 섭취 가능합니다.';
      } else if (category === '수산물' || cleanName.includes('생선') || cleanName.includes('회')) {
        expiryDays = 2;
        consumptionDays = 3;
        reason = '신선 어패류 기준';
        guidance = '수산물은 쉽게 변질되므로 2~3일 이내에 조리해 드시는 것을 권장합니다.';
      } else if (cleanName.includes('고기') || cleanName.includes('소고기') || cleanName.includes('돼지') || cleanName.includes('닭고기')) {
        expiryDays = 3;
        consumptionDays = 5;
        reason = '신선 생육 기준';
        guidance = '냉장 생육은 3~5일 이내 섭취하거나 장기 보관 시 냉동실로 옮겨주세요.';
      } else if (category === '반찬') {
        if (cleanName.includes('김치')) {
          expiryDays = 30;
          consumptionDays = 180;
          reason = '발효 김치류 기준';
          guidance = '김치는 발효 식품으로 냉장 보관 시 6개월 이상 섭취 가능합니다.';
        } else if (cleanName.includes('찌개') || cleanName.includes('국')) {
          expiryDays = 3;
          consumptionDays = 4;
          reason = '조리 국/찌개 기준';
          guidance = '조리된 국은 3~4일 이내 섭취하시고 매일 한 번씩 끓여 보관하세요.';
        } else {
          expiryDays = 7;
          consumptionDays = 10;
          reason = '일반 밑반찬 기준';
          guidance = '침이나 이물질이 닿지 않도록 덜어서 드시면 10일까지 신선합니다.';
        }
      } else if (cleanName.includes('상추') || cleanName.includes('시금치') || cleanName.includes('샐러드')) {
        expiryDays = 4;
        consumptionDays = 6;
        reason = '잎채소류 신선 기준';
        guidance = '수분 증발을 막아 밀폐 보관 시 약 5~7일간 신선도가 유지됩니다.';
      } else if (category === '곡물') {
        expiryDays = 60;
        consumptionDays = 90;
        reason = '곡물류 보관 기준';
        guidance = '밀폐 용기에 냉장 보관 시 3개월간 품질이 유지됩니다.';
      }
    }

    // 날짜 계산 (YYYY-MM-DD)
    const computeDateStr = (dayOffset) => {
      const d = new Date();
      d.setDate(d.getDate() + dayOffset);
      const yyyy = d.getFullYear();
      const mm = String(d.getMonth() + 1).padStart(2, '0');
      const dd = String(d.getDate()).padStart(2, '0');
      return `${yyyy}-${mm}-${dd}`;
    };

    return {
      expiryDays,
      expiryDateStr: computeDateStr(expiryDays),
      consumptionDays,
      consumptionDateStr: computeDateStr(consumptionDays),
      reason,
      guidance
    };
  };

  /**
   * 물품명 기반 실시간 AI 스마트 카테고리 & 보관 위치 자동 분류 엔진
   * @param {string} name
   * @returns {{category: string, storageType: 'FREEZER'|'FRIDGE', matchedKeyword: string, isAiClassified: boolean}}
   */
  const classifyCategory = (name = '') => {
    const clean = (name || '').toLowerCase().trim();
    if (!clean) {
      return { category: '기타', storageType: 'FRIDGE', matchedKeyword: '', isAiClassified: false };
    }

    // 1. 냉동 식품 키워드 (보관위치도 FREEZER로 연동)
    const freezerKeywords = [
      '만두', '피자', '너겟', '핫도그', '볶음밥', '돈까스', '치킨', '감자튀김', 
      '아이스크림', '냉동', '얼음', '빙과', '떡갈비', '동그랑땡', '와플', '츄러스'
    ];
    for (const kw of freezerKeywords) {
      if (clean.includes(kw)) {
        return { category: '냉동', storageType: 'FREEZER', matchedKeyword: kw, isAiClassified: true };
      }
    }

    // 2. 달걀/계란류
    const eggKeywords = ['계란', '달걀', '메추리알', '유정란', '신선란', '구운란', '반숙란', '난황', '난백'];
    for (const kw of eggKeywords) {
      if (clean.includes(kw)) {
        return { category: '달걀', storageType: 'FRIDGE', matchedKeyword: kw, isAiClassified: true };
      }
    }

    // 3. 유제품류
    const dairyKeywords = [
      '우유', '치즈', '요거트', '요플레', '버터', '생크림', '요구르트', '두유', 
      '리코타', '모짜렐라', '마스카포네', '크림치즈', '연유', '유청'
    ];
    for (const kw of dairyKeywords) {
      if (clean.includes(kw)) {
        return { category: '유제품', storageType: 'FRIDGE', matchedKeyword: kw, isAiClassified: true };
      }
    }

    // 4. 곡물 및 제과/면류
    const grainKeywords = [
      '쌀', '현미', '보리', '찹쌀', '밀가루', '부침가루', '튀김가루', '시리얼', 
      '오트밀', '파스타', '국수', '소면', '라면', '당면', '식빵', '빵', '베이글', 
      '바게트', '떡', '가래떡', '누룽지', '통밀'
    ];
    for (const kw of grainKeywords) {
      if (clean.includes(kw)) {
        return { category: '곡물', storageType: 'FRIDGE', matchedKeyword: kw, isAiClassified: true };
      }
    }

    // 5. 수산물류
    const seafoodKeywords = [
      '생선', '고등어', '삼치', '갈치', '연어', '참치', '광어', '우럭', '새우', 
      '오징어', '문어', '낙지', '쭈꾸미', '게', '꽃게', '조개', '바지락', '굴', 
      '홍합', '미역', '다시마', '멸치', '어묵', '해물', '골뱅이', '전복'
    ];
    for (const kw of seafoodKeywords) {
      if (clean.includes(kw)) {
        return { category: '수산물', storageType: 'FRIDGE', matchedKeyword: kw, isAiClassified: true };
      }
    }

    // 6. 반찬류
    const banchanKeywords = [
      '김치', '깍두기', '겉절이', '찌개', '국', '탕', '나물', '시금치', '콩나물', 
      '조림', '장조림', '무침', '두부', '순두부', '연두부', '젓갈', '피클', '단무지', 
      '샐러드', '장아찌', '진미채', '깻잎', '멸치볶음', '오뎅', '쌈장', '고추장', '된장'
    ];
    for (const kw of banchanKeywords) {
      if (clean.includes(kw)) {
        return { category: '반찬', storageType: 'FRIDGE', matchedKeyword: kw, isAiClassified: true };
      }
    }

    return { category: '기타', storageType: 'FRIDGE', matchedKeyword: '', isAiClassified: false };
  };

  /**
   * 품목별 1인분 권장 소진 단위 산출 엔진
   * @param {string} name
   * @param {string} category
   * @returns {string} 예: '1컵 (200ml)', '1~2개', '200g (1인분)'
   */
  const getRecommendedServingUnit = (name = '', category = '') => {
    const clean = (name || '').toLowerCase().trim();

    if (clean.includes('우유') || clean.includes('두유') || clean.includes('주스') || clean.includes('음료')) {
      return '1컵 (200ml)';
    }
    if (clean.includes('계란') || clean.includes('달걀') || category === '달걀') {
      return '1~2개';
    }
    if (clean.includes('고기') || clean.includes('소고기') || clean.includes('돼지') || clean.includes('삼겹살') || clean.includes('닭') || clean.includes('한우') || clean.includes('등심') || clean.includes('안심') || clean.includes('목살') || clean.includes('갈비') || clean.includes('양지') || clean.includes('차돌') || clean.includes('육류')) {
      return '200g (1인분)';
    }
    if (clean.includes('생선') || clean.includes('고등어') || clean.includes('갈치') || clean.includes('연어') || clean.includes('삼치')) {
      return '1토막 (120g)';
    }
    if (clean.includes('새우') || clean.includes('조개')) {
      return '5~6마리';
    }
    if (clean.includes('두부') || clean.includes('순두부')) {
      return '1/2모 (150g)';
    }
    if (clean.includes('만두')) {
      return '4~5개';
    }
    if (clean.includes('피자')) {
      return '1~2조각';
    }
    if (clean.includes('너겟')) {
      return '5~6개';
    }
    if (clean.includes('김치') || clean.includes('깍두기')) {
      return '1접시 (50g)';
    }
    if (clean.includes('찌개') || clean.includes('국') || clean.includes('탕')) {
      return '1대접 (250ml)';
    }
    if (clean.includes('쌀') || clean.includes('밥')) {
      return '1공기 (200g)';
    }
    if (clean.includes('식빵') || clean.includes('빵')) {
      return '1~2장';
    }
    if (clean.includes('치즈')) {
      return '1장 (20g)';
    }
    if (clean.includes('라면') || clean.includes('국수') || clean.includes('파스타')) {
      return '1인분 (100g)';
    }

    // 기본 카테고리별 단위 매핑
    switch (category) {
      case '달걀': return '1~2개';
      case '유제품': return '1회분 (약 150ml)';
      case '냉동': return '1인분 (적당량)';
      case '곡물': return '1공기 (200g)';
      case '수산물': return '1인분 (100g)';
      case '반찬': return '1접시 (약 40g)';
      default: return '1회분 (적당량)';
    }
  };

  return {
    getRecommendation,
    classifyCategory,
    getRecommendedServingUnit
  };
})();

// 브라우저 및 CommonJS 호환
if (typeof window !== 'undefined') {
  window.ExpiryHelper = ExpiryHelper;
}
if (typeof module !== 'undefined' && module.exports) {
  module.exports = ExpiryHelper;
}
