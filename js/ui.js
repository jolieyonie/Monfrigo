/**
 * ui.js - UI 렌더링 및 인터랙션 모듈
 * 2도어 냉장고 시각화, 1줄 예산 바, 지출 통계, 레시피 모달, 식재료 리스트 관리
 */

const UIManager = (() => {
  // 카테고리별 아이콘 매핑
  const CATEGORY_ICONS = {
    '냉동': '❄️',
    '달걀': '🥚',
    '유제품': '🥛',
    '곡물': '🌾',
    '수산물': '🐟',
    '반찬': '🍱',
    '기타': '🍴'
  };

  // 보관 상태 라벨 매핑
  const STATUS_LABELS = {
    UNOPENED: '미개봉',
    OPENED: '개봉',
    COMPLETED: '소진 완료'
  };

  /**
   * 문자열 HTML 이스케이프 (XSS 방지)
   */
  const escapeHtml = (str) => {
    if (!str) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  };

  /**
   * 숫자를 천 단위 콤마 포맷으로 변환
   */
  const formatCurrency = (num) => {
    const val = parseInt(num, 10);
    return isNaN(val) ? '0' : val.toLocaleString('ko-KR');
  };

  /**
   * D-day 뱃지만 생성하는 헬퍼
   */
  const getDDayBadge = (dateStr) => {
    if (!dateStr) return '';

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const target = new Date(dateStr);
    target.setHours(0, 0, 0, 0);

    if (isNaN(target.getTime())) return '';

    const diffTime = target.getTime() - today.getTime();
    const diffDays = Math.round(diffTime / (1000 * 60 * 60 * 24));

    let badgeClass = 'dday-safe';
    let ddayText = `D-${diffDays}`;

    if (diffDays < 0) {
      badgeClass = 'dday-expired';
      ddayText = `D+${Math.abs(diffDays)} 지남`;
    } else if (diffDays === 0) {
      badgeClass = 'dday-today';
      ddayText = 'D-Day 오늘';
    } else if (diffDays <= 3) {
      badgeClass = 'dday-urgent';
      ddayText = `D-${diffDays} 임박`;
    }

    return `<span class="dday-badge ${badgeClass}">${ddayText}</span>`;
  };

  /**
   * 유통/소비기한 및 D-Day 통합 표기 (중복 완전 배제)
   */
  const renderUnifiedDate = (expiryDate, consumptionDate) => {
    const mainDate = consumptionDate || expiryDate;
    if (!mainDate) return '';

    const ddayBadge = getDDayBadge(mainDate);
    const formattedMain = escapeHtml(mainDate).replace(/-/g, '.');

    // 유통기한과 소비기한이 둘 다 있고 서로 다를 때만 유통기한을 작은 글씨로 보조 표시
    let extraNote = '';
    if (expiryDate && consumptionDate && expiryDate !== consumptionDate) {
      extraNote = `<span class="sub-expiry-note" title="유통(판매)기한">판매 ~${escapeHtml(expiryDate).replace(/-/g, '.')}</span>`;
    }

    return `
      <div class="card-date-clean">
        <span class="date-main-text">섭취 권장: <strong>${formattedMain}</strong></span>
        ${ddayBadge}
        ${extraNote}
      </div>
    `;
  };

  /**
   * 1. 2도어 냉장고 시각 UI 렌더링 (좌: 냉동고, 우: 냉장고, 하단: 7색 테마 피커)
   * @param {HTMLElement} container - 렌더링할 부모 요소
   * @param {Array<Object>} items - 전체 식재료 목록
   * @param {'ALL'|'FREEZER'|'FRIDGE'} activeCompartment - 현재 선택된 칸
   * @param {string} theme - 냉장고 테마 색상 ('black'|'white'|'sky'|'pink'|'yellow'|'purple'|'green')
   */
  const renderFridgeGraphic = (container, items, activeCompartment = 'ALL', theme = 'sky') => {
    if (!container) return;

    const freezerItems = items.filter(i => i.storageType === 'FREEZER' && i.status !== 'COMPLETED');
    const fridgeItems = items.filter(i => i.storageType === 'FRIDGE' && i.status !== 'COMPLETED');
    const allActiveItems = items.filter(i => i.status !== 'COMPLETED');

    const isFreezerActive = activeCompartment === 'FREEZER';
    const isFridgeActive = activeCompartment === 'FRIDGE';
    const isAllActive = activeCompartment === 'ALL';

    const themes = [
      { id: 'black', name: '검은색', class: 'chip-black' },
      { id: 'white', name: '하얀색', class: 'chip-white' },
      { id: 'sky', name: '하늘색', class: 'chip-sky' },
      { id: 'pink', name: '분홍색', class: 'chip-pink' },
      { id: 'yellow', name: '노란색', class: 'chip-yellow' },
      { id: 'purple', name: '보라색', class: 'chip-purple' },
      { id: 'green', name: '초록색', class: 'chip-green' }
    ];

    const themeChipsHtml = themes.map(t => `
      <button 
        type="button" 
        class="theme-chip ${t.class} ${theme === t.id ? 'active' : ''}" 
        data-theme="${t.id}" 
        title="${t.name}"
        aria-label="${t.name} 테마 선택"
      ></button>
    `).join('');

    container.innerHTML = `
      <div class="fridge-appliance-frame" data-fridge-theme="${theme}">
        <!-- 상단 냉장고 엠블럼 & 우측 상단 컬러 테마 이모지 드롭다운 -->
        <!-- 냉장고 상단 프레임 (브랜드 & 테마 선택기) -->
        <div class="fridge-top-brand">
          <div class="brand-left-group">
            <span class="brand-led"></span>
            <span class="brand-text">OUR HOME FRIDGE</span>
          </div>
          <div class="theme-palette-dropdown">
            <button 
              type="button" 
              class="btn-palette-trigger" 
              id="btn-palette-trigger" 
              title="냉장고 컬러 테마 변경"
              aria-label="냉장고 컬러 테마 선택"
              aria-expanded="false"
            >
              🎨
            </button>
            <div class="theme-palette-menu" id="theme-palette-menu" role="menu">
              <span class="palette-menu-title">냉장고 컬러 선택</span>
              <div class="theme-chips">
                ${themeChipsHtml}
              </div>
            </div>
          </div>
        </div>

        <!-- 2도어 냉장고 본체 -->
        <div class="fridge-doors-wrapper">
          <!-- 좌측 도어: 냉동고 (Freezer) -->
          <div 
            class="fridge-door freezer-door ${isFreezerActive ? 'door-open active-compartment' : ''}" 
            data-target-compartment="FREEZER"
            role="button"
            tabindex="0"
            aria-label="냉동고 열기 및 식재료 등록"
            title="냉동고를 클릭하면 식재료 등록 창이 열립니다"
          >
            <!-- 도어 표면 은은한 글래스 반사광 광택 -->
            <div class="door-glass-sheen"></div>

            <div class="door-inner">
              <div class="temp-display freezer-temp">
                <div class="temp-display-top">
                  <span class="temp-led">-18°C</span>
                  <span class="wifi-dot" title="스마트 연결"></span>
                </div>
                <span class="compartment-label">FREEZER</span>
              </div>
              <div class="door-status-badge">
                <span class="badge-title">❄️ 냉동고</span>
                <strong class="badge-count">${freezerItems.length}개 보관</strong>
              </div>
              <div class="door-add-hint">
                <span>➕ 식재료 등록</span>
              </div>
              <div class="door-panel-bottom-accent">
                <div class="panel-seam-line"></div>
              </div>
            </div>
            <!-- 도어 메탈릭 손잡이 (우측 배치) -->
            <div class="fridge-handle handle-right"></div>
          </div>

          <!-- 도어 중앙 틈새/개스킷 -->
          <div class="fridge-door-gap"></div>

          <!-- 우측 도어: 냉장실 (Fridge) -->
          <div 
            class="fridge-door fridge-main-door ${isFridgeActive ? 'door-open active-compartment' : ''}" 
            data-target-compartment="FRIDGE"
            role="button"
            tabindex="0"
            aria-label="냉장실 열기 및 식재료 등록"
            title="냉장실을 클릭하면 식재료 등록 창이 열립니다"
          >
            <!-- 도어 표면 은은한 글래스 반사광 광택 -->
            <div class="door-glass-sheen"></div>

            <div class="door-inner">
              <div class="temp-display fridge-temp">
                <div class="temp-display-top">
                  <span class="temp-led">3°C</span>
                  <span class="wifi-dot" title="스마트 연결"></span>
                </div>
                <span class="compartment-label">FRIDGE</span>
              </div>
              <div class="door-status-badge">
                <span class="badge-title">🥬 냉장실</span>
                <strong class="badge-count">${fridgeItems.length}개 보관</strong>
              </div>
              <div class="door-add-hint">
                <span>➕ 식재료 등록</span>
              </div>
              <div class="door-panel-bottom-accent">
                <div class="panel-seam-line"></div>
              </div>
            </div>
            <!-- 도어 메탈릭 손잡이 (좌측 배치) -->
            <div class="fridge-handle handle-left"></div>
          </div>
        </div>

        <!-- 보관 칸 필터 세그먼트 버튼 -->
        <div class="compartment-tabs">
          <button 
            type="button" 
            class="compartment-tab-btn ${isAllActive ? 'active' : ''}" 
            data-compartment="ALL"
          >
            🏠 전체 보기 (${allActiveItems.length})
          </button>
          <button 
            type="button" 
            class="compartment-tab-btn ${isFreezerActive ? 'active' : ''}" 
            data-compartment="FREEZER"
          >
            ❄️ 냉동고 (${freezerItems.length})
          </button>
          <button 
            type="button" 
            class="compartment-tab-btn ${isFridgeActive ? 'active' : ''}" 
            data-compartment="FRIDGE"
          >
            🥬 냉장실 (${fridgeItems.length})
          </button>
        </div>
      </div>
    `;
  };

  /**
   * 2. 예산 및 연/월/일 지출 통계 대시보드 렌더링
   * @param {HTMLElement} container
   * @param {Array<Object>} items
   * @param {number} monthlyBudget
   */
  const renderBudgetAndExpenses = (container, items, monthlyBudget = 400000) => {
    if (!container) return;

    const now = new Date();
    const todayStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
    const thisMonthPrefix = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    const thisYearPrefix = `${now.getFullYear()}`;

    let todaySpend = 0;
    let monthSpend = 0;
    let yearSpend = 0;

    items.forEach(item => {
      const price = item.price || 0;
      const pDate = item.purchaseDate || '';

      if (pDate.startsWith(todayStr)) {
        todaySpend += price;
      }
      if (pDate.startsWith(thisMonthPrefix)) {
        monthSpend += price;
      }
      if (pDate.startsWith(thisYearPrefix)) {
        yearSpend += price;
      }
    });

    const budget = monthlyBudget > 0 ? monthlyBudget : 400000;
    const ratio = Math.round((monthSpend / budget) * 100);
    const isExceeded = monthSpend > budget;
    const diffAmount = Math.abs(budget - monthSpend);
    const progressWidth = Math.min(ratio, 100);

    container.innerHTML = `
      <div class="financial-card">
        <!-- 1줄짜리 월 예산 소진율 바 헤더 -->
        <div class="budget-header-row">
          <div class="budget-title-group">
            <span class="budget-icon">💳</span>
            <span class="budget-title">이번 달 식비 예산 현황</span>
            <button type="button" id="btn-edit-budget" class="btn-text-edit" title="월 예산 설정">✏️ 수정</button>
          </div>
          <span class="budget-badge ${isExceeded ? 'budget-exceeded' : 'budget-safe'}">
            ${isExceeded ? `⚠️ ${formatCurrency(diffAmount)}원 초과!` : `잔여 ${formatCurrency(diffAmount)}원`}
          </span>
        </div>

        <!-- 1줄짜리 프로그레스 바 -->
        <div class="budget-bar-track" role="progressbar" aria-valuenow="${ratio}" aria-valuemin="0" aria-valuemax="100">
          <div 
            class="budget-bar-fill ${isExceeded ? 'fill-exceeded' : 'fill-safe'}" 
            style="width: ${progressWidth}%;"
          ></div>
        </div>

        <!-- 예산 수치 안내 텍스트 -->
        <div class="budget-summary-text">
          <span>이번 달 <strong>${formatCurrency(monthSpend)}원</strong> 사용</span>
          <span>목표 예산: <strong>${formatCurrency(budget)}원</strong> (${ratio}%)</span>
        </div>

        <!-- 연 / 월 / 일 단위 지출 칩스 -->
        <div class="expense-chips-grid">
          <div class="expense-chip">
            <span class="chip-label">오늘 지출</span>
            <span class="chip-value">${formatCurrency(todaySpend)}원</span>
          </div>
          <div class="expense-chip">
            <span class="chip-label">이번 달 지출</span>
            <span class="chip-value highlight">${formatCurrency(monthSpend)}원</span>
          </div>
          <div class="expense-chip">
            <span class="chip-label">올해 총 지출</span>
            <span class="chip-value">${formatCurrency(yearSpend)}원</span>
          </div>
        </div>
      </div>
    `;
  };

  /**
   * 3. 대시보드 소진률(Progress Bar) 렌더링
   */
  const renderDashboard = (container, items) => {
    if (!container) return;

    const totalCount = Array.isArray(items) ? items.length : 0;
    const completedCount = Array.isArray(items)
      ? items.filter((item) => item.status === 'COMPLETED').length
      : 0;

    // 개별 아이템들의 실제 소진률(consumptionProgress)을 가중 합산하여 세밀한 소진 현황 표기
    let totalProgressSum = 0;
    if (Array.isArray(items)) {
      items.forEach((item) => {
        const prog = typeof item.consumptionProgress === 'number' && !isNaN(item.consumptionProgress)
          ? item.consumptionProgress
          : (item.status === 'COMPLETED' ? 100 : (item.status === 'OPENED' ? 50 : 0));
        totalProgressSum += prog;
      });
    }

    const overallPercentage = totalCount > 0
      ? Math.round(totalProgressSum / totalCount)
      : 0;

    // 카테고리별 소진률 계산 (아이템 소진 진행률 합산)
    const categoryStats = Object.keys(CATEGORY_ICONS).map((cat) => {
      const catItems = items.filter((item) => (item.category || '기타') === cat);
      const catTotal = catItems.length;
      const catCompleted = catItems.filter((item) => item.status === 'COMPLETED').length;
      
      const catProgressSum = catItems.reduce((sum, it) => {
        const p = typeof it.consumptionProgress === 'number' && !isNaN(it.consumptionProgress)
          ? it.consumptionProgress
          : (it.status === 'COMPLETED' ? 100 : (it.status === 'OPENED' ? 50 : 0));
        return sum + p;
      }, 0);

      const percentage = catTotal > 0 ? Math.round(catProgressSum / catTotal) : 0;

      return {
        category: cat,
        icon: CATEGORY_ICONS[cat] || '🍴',
        total: catTotal,
        completed: catCompleted,
        percentage
      };
    }).filter((stat) => stat.total > 0);

    let categoryBarsHtml = '';
    if (categoryStats.length > 0) {
      categoryBarsHtml = categoryStats.map((stat) => `
        <div class="category-progress-item">
          <div class="category-progress-label">
            <span class="category-name">${stat.icon} ${escapeHtml(stat.category)}</span>
            <span class="category-fraction">
              ${stat.completed}/${stat.total}개 완료 (${stat.percentage}%)
            </span>
          </div>
          <div class="progress-track progress-bar-thin" role="progressbar" aria-valuenow="${stat.percentage}">
            <div class="progress-fill progress-fill-category" style="width: ${stat.percentage}%;"></div>
          </div>
        </div>
      `).join('');
    } else {
      categoryBarsHtml = `
        <div class="dashboard-category-empty">
          <small>식재료를 등록하면 카테고리별 소진 현황이 표시됩니다.</small>
        </div>
      `;
    }

    container.innerHTML = `
      <div class="dashboard-card">
        <div class="dashboard-header">
          <span class="dashboard-title">📊 식재료 소진율 현황</span>
          <span class="dashboard-count">${completedCount} / ${totalCount}개 소진 완료</span>
        </div>

        <div class="overall-progress-box">
          <div class="overall-progress-text-row">
            <span class="overall-label">전체 평균 소진률</span>
            <span class="overall-percentage">소진률 ${overallPercentage}%</span>
          </div>
          <div class="progress-track progress-bar-thick" role="progressbar" aria-valuenow="${overallPercentage}">
            <div class="progress-fill progress-fill-overall" style="width: ${overallPercentage}%;"></div>
          </div>
        </div>

        <div class="category-progress-section">
          <div class="category-section-title">카테고리별 소진률</div>
          <div class="category-progress-list">
            ${categoryBarsHtml}
          </div>
        </div>
      </div>
    `;

    // 대시보드가 접혀 있을 때도 헤더에서 확인할 수 있도록 요약 뱃지 동기화
    const summaryBadge = document.getElementById('dashboard-summary-badge');
    if (summaryBadge) {
      summaryBadge.textContent = `소진율 ${overallPercentage}%`;
    }
  };

  /**
   * 개별 식재료 카드 HTML 생성 헬퍼
   * @param {Object} item
   * @returns {string}
   */
  const renderCardHtml = (item) => {
    const safeId = escapeHtml(item.id);
    const safeName = escapeHtml(item.name);
    const category = item.category || '기타';
    const icon = CATEGORY_ICONS[category] || '🍴';

    // 카테고리 태그: 이름에 카테고리가 포함되지 않은 경우에만 깔끔하게 보조 표시
    const shouldShowCat = category !== '기타' && !safeName.includes(category);
    const catSubBadge = shouldShowCat 
      ? `<span class="category-sub-badge">${escapeHtml(category)}</span>` 
      : '';

    // 보관 위치 태그 (깔끔한 텍스트 뱃지)
    const isFreezer = item.storageType === 'FREEZER';
    const locationBadge = isFreezer
      ? `<span class="storage-tag storage-freezer">❄️ 냉동</span>`
      : `<span class="storage-tag storage-fridge">🥬 냉장</span>`;

    // 메타 정보 (용량, 가격, 1인분 권장량) -> 점(·) 구분자로 깔끔하게 한 줄 정리!
    const portionUnit = item.portionUnit || (typeof window !== 'undefined' && window.ExpiryHelper ? window.ExpiryHelper.getRecommendedServingUnit(item.name, item.category) : '1회분');
    const safePortionUnit = escapeHtml(portionUnit);

    const metaParts = [];
    if (item.capacity) metaParts.push(`<span>${escapeHtml(item.capacity)}</span>`);
    if (item.price > 0) metaParts.push(`<span>${formatCurrency(item.price)}원</span>`);
    if (safePortionUnit) metaParts.push(`<span class="meta-portion">1회 권장: <strong>${safePortionUnit}</strong></span>`);
    const metaLineHtml = metaParts.length > 0 
      ? `<div class="card-meta-line">${metaParts.join('<span class="meta-sep">·</span>')}</div>` 
      : '';

    // 날짜 한 줄 정리 (소비기한 + D-Day 뱃지, 중복 완전 배제)
    const dateLineHtml = renderUnifiedDate(item.expiryDate, item.consumptionDate);

    // 현재 소진율 (0 ~ 100%)
    const progress = Math.min(100, Math.max(0, typeof item.consumptionProgress === 'number' && !isNaN(item.consumptionProgress)
      ? item.consumptionProgress
      : (item.status === 'COMPLETED' ? 100 : (item.status === 'OPENED' ? 50 : 0))));

    const isFinished = progress >= 100 || item.status === 'COMPLETED';

    const currentStatus = isFinished
      ? 'COMPLETED'
      : progress > 0
      ? 'OPENED'
      : ['UNOPENED', 'OPENED', 'COMPLETED'].includes(item.status)
      ? item.status
      : 'UNOPENED';

    return `
      <article class="item-card item-status-${currentStatus}" data-id="${safeId}">
        <!-- 상단: 아이콘 + 물품명 + 보관칸 + 상태 + 삭제 -->
        <div class="card-top-header">
          <div class="card-title-group">
            <span class="card-food-icon">${icon}</span>
            <span class="item-name">${safeName}</span>
            ${catSubBadge}
            ${locationBadge}
          </div>
          <div class="card-action-group">
            <div class="status-select-wrapper">
              <select 
                class="status-select status-${currentStatus}" 
                data-id="${safeId}" 
                aria-label="${safeName} 상태 변경"
              >
                <option value="UNOPENED" ${currentStatus === 'UNOPENED' ? 'selected' : ''}>미개봉</option>
                <option value="OPENED" ${currentStatus === 'OPENED' ? 'selected' : ''}>개봉</option>
                <option value="COMPLETED" ${currentStatus === 'COMPLETED' ? 'selected' : ''}>소진 완료</option>
              </select>
            </div>
            <button 
              type="button" 
              class="btn-delete" 
              data-id="${safeId}" 
              title="${safeName} 삭제"
              aria-label="${safeName} 삭제"
            >
              🗑️
            </button>
          </div>
        </div>

        <!-- 중간: 용량 · 가격 · 1인분 권장량 (단정하고 깔끔한 텍스트) -->
        ${metaLineHtml}

        <!-- 날짜: 단일 섭취기한 + D-Day 뱃지 -->
        ${dateLineHtml}

        <!-- 하단: 미니 소진율 바 + 소진 버튼 -->
        <div class="item-consumption-bar-row">
          <div class="consumption-progress-wrapper">
            <div class="consumption-label-row">
              <span class="consumption-pct">소진 <strong>${progress}%</strong></span>
              ${isFinished ? '<span class="consumption-done-tag">🎉 소진 완료</span>' : ''}
            </div>
            <div class="item-progress-track" role="progressbar" aria-valuenow="${progress}" aria-valuemin="0" aria-valuemax="100">
              <div class="item-progress-fill ${isFinished ? 'fill-completed' : progress > 0 ? 'fill-opened' : 'fill-unopened'}" style="width: ${progress}%;"></div>
            </div>
          </div>
          <div class="consumption-btns">
            <button 
              type="button" 
              class="btn-consume-step ${isFinished ? 'disabled' : ''}" 
              data-id="${safeId}" 
              data-amount="25" 
              title="${safePortionUnit} 소진 (+25%)"
              ${isFinished ? 'disabled' : ''}
            >
              🥄 소진
            </button>
            ${progress > 0 ? `
              <button 
                type="button" 
                class="btn-consume-reset" 
                data-id="${safeId}" 
                title="소진 취소 (0%로 복원)"
                aria-label="소진 상태 복원"
              >
                ↩️
              </button>
            ` : ''}
          </div>
        </div>
      </article>
    `;
  };

  /**
   * 4. 식재료 목록 화면 렌더링 (보관 위치 필터링 및 카테고리별/소비기한순/구매일순 보기 지원)
   * @param {HTMLElement} container
   * @param {Array<Object>} items
   * @param {'ALL'|'FREEZER'|'FRIDGE'} activeCompartment
   * @param {'CATEGORY'|'EXPIRY'|'PURCHASE'} sortFilter
   */
  const renderList = (container, items, activeCompartment = 'ALL', sortFilter = 'CATEGORY') => {
    if (!container) return;

    // 칸 필터링 적용
    let displayItems = items;
    if (activeCompartment === 'FREEZER') {
      displayItems = items.filter(i => i.storageType === 'FREEZER');
    } else if (activeCompartment === 'FRIDGE') {
      displayItems = items.filter(i => i.storageType === 'FRIDGE');
    }

    // 카운트 뱃지 업데이트
    const countBadge = document.getElementById('item-count-badge');
    if (countBadge) {
      countBadge.textContent = `${displayItems.length}개`;
    }

    if (!displayItems || displayItems.length === 0) {
      const emptyMsg = activeCompartment === 'FREEZER'
        ? '냉동고에 보관 중인 식재료가 없습니다.'
        : activeCompartment === 'FRIDGE'
        ? '냉장실에 보관 중인 식재료가 없습니다.'
        : '등록된 식재료가 없습니다.';

      container.innerHTML = `
        <div class="empty-state">
          <span class="empty-state-icon">🥗</span>
          <p>${emptyMsg}</p>
          <small>아래 폼에서 새로운 식재료를 등록해 보세요!</small>
        </div>
      `;
      return;
    }

    // 1. 카테고리별 보기 (기본)
    if (sortFilter === 'CATEGORY') {
      const grouped = {};
      displayItems.forEach((item) => {
        const cat = item.category || '기타';
        if (!grouped[cat]) grouped[cat] = [];
        grouped[cat].push(item);
      });

      const standardOrder = Object.keys(CATEGORY_ICONS);
      const presentCategories = Object.keys(grouped).sort((a, b) => {
        const idxA = standardOrder.indexOf(a);
        const idxB = standardOrder.indexOf(b);
        if (idxA !== -1 && idxB !== -1) return idxA - idxB;
        if (idxA !== -1) return -1;
        if (idxB !== -1) return 1;
        return a.localeCompare(b, 'ko');
      });

      const groupsHtml = presentCategories.map((cat) => {
        const groupItems = grouped[cat];
        const icon = CATEGORY_ICONS[cat] || '🍴';
        return `
          <div class="category-group-block">
            <div class="category-group-header">
              <span class="cat-header-icon">${icon}</span>
              <span class="cat-header-title">${escapeHtml(cat)}</span>
              <span class="cat-header-count">${groupItems.length}개</span>
            </div>
            <div class="category-group-cards inventory-list">
              ${groupItems.map((item) => renderCardHtml(item)).join('')}
            </div>
          </div>
        `;
      }).join('');

      container.innerHTML = `<div class="inventory-list-grouped">${groupsHtml}</div>`;
      return;
    }

    // 2. 소비기한순 정렬
    if (sortFilter === 'EXPIRY') {
      const sortedItems = [...displayItems].sort((a, b) => {
        const dateA = a.consumptionDate || a.expiryDate || '9999-12-31';
        const dateB = b.consumptionDate || b.expiryDate || '9999-12-31';
        return dateA.localeCompare(dateB);
      });
      container.innerHTML = `<div class="inventory-list">${sortedItems.map((item) => renderCardHtml(item)).join('')}</div>`;
      return;
    }

    // 3. 구매일순 정렬 (최근 구매순)
    if (sortFilter === 'PURCHASE') {
      const sortedItems = [...displayItems].sort((a, b) => {
        const dateA = a.purchaseDate || '';
        const dateB = b.purchaseDate || '';
        if (dateA !== dateB) {
          return dateB.localeCompare(dateA);
        }
        return String(b.id || '').localeCompare(String(a.id || ''));
      });
      container.innerHTML = `<div class="inventory-list">${sortedItems.map((item) => renderCardHtml(item)).join('')}</div>`;
      return;
    }

    // Fallback 기본 렌더링
    container.innerHTML = `<div class="inventory-list">${displayItems.map((item) => renderCardHtml(item)).join('')}</div>`;
  };

  /**
   * 5. AI 레시피 추천 모달 렌더링
   * @param {HTMLElement} modalContainer
   * @param {Array<Object>} recipes
   */
  const renderRecipeModal = (modalContainer, recipes) => {
    if (!modalContainer) return;

    const recipesHtml = (recipes || []).map((recipe, idx) => {
      const usedTags = (recipe.usedIngredients || []).map(i => `<span class="ingredient-tag-used">✓ ${escapeHtml(i)}</span>`).join('');
      const extraTags = (recipe.extraIngredients || []).map(i => `<span class="ingredient-tag-extra">+ ${escapeHtml(i)}</span>`).join('');
      const stepsHtml = (recipe.steps || []).map((step, sIdx) => `<li><span class="step-num">${sIdx + 1}</span><span>${escapeHtml(step)}</span></li>`).join('');

      return `
        <div class="recipe-card">
          <div class="recipe-header">
            <span class="recipe-icon">${recipe.icon || '🍳'}</span>
            <div class="recipe-title-group">
              <h3 class="recipe-title">${escapeHtml(recipe.title)}</h3>
              <div class="recipe-meta-badges">
                <span class="meta-pill">⏱️ ${escapeHtml(recipe.time || '15분')}</span>
                <span class="meta-pill">난이도: ${escapeHtml(recipe.difficulty || '쉬움')}</span>
              </div>
            </div>
          </div>

          <div class="recipe-ingredients-box">
            <div class="ingredient-row">
              <strong class="ing-label">냉장고 보유 재료:</strong>
              <div class="ing-tags">${usedTags || '<span class="text-muted">없음</span>'}</div>
            </div>
            ${extraTags ? `
              <div class="ingredient-row extra-row">
                <strong class="ing-label">필요 양념/재료:</strong>
                <div class="ing-tags">${extraTags}</div>
              </div>
            ` : ''}
          </div>

          <div class="recipe-steps-box">
            <h4>조리 순서</h4>
            <ol class="recipe-steps-list">
              ${stepsHtml}
            </ol>
          </div>
        </div>
      `;
    }).join('');

    modalContainer.innerHTML = `
      <div class="recipe-modal-backdrop" id="recipe-modal-backdrop">
        <div class="recipe-modal-dialog">
          <div class="recipe-modal-header">
            <div class="recipe-modal-title">
              <span>👨‍🍳 냉장고 파먹기 AI 맞춤 레시피</span>
              <small>현재 보관 중인 재료로 만들 수 있는 추천 요리</small>
            </div>
            <button type="button" class="btn-modal-close" id="btn-close-recipe" aria-label="닫기">✕</button>
          </div>
          <div class="recipe-modal-body">
            ${recipesHtml}
          </div>
        </div>
      </div>
    `;
    modalContainer.classList.remove('hidden');
  };

  return {
    renderFridgeGraphic,
    renderBudgetAndExpenses,
    renderDashboard,
    renderList,
    renderRecipeModal,
    CATEGORY_ICONS,
    STATUS_LABELS,
    escapeHtml,
    formatCurrency
  };
})();

// 브라우저 및 CommonJS 호환
if (typeof window !== 'undefined') {
  window.UIManager = UIManager;
}
if (typeof module !== 'undefined' && module.exports) {
  module.exports = UIManager;
}
