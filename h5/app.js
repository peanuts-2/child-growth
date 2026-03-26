/**
 * 儿童生长发育评估 - 主交互逻辑
 */

document.addEventListener('DOMContentLoaded', function () {

    // ---- DOM 引用 ----
    const genderBtns    = document.querySelectorAll('.gender-btn');
    const ageTabs       = document.querySelectorAll('.age-tab');
    const monthInput    = document.getElementById('monthInput');
    const yearInput     = document.getElementById('yearInput');
    const ageMonthEl    = document.getElementById('ageMonth');
    const ageYearEl     = document.getElementById('ageYear');
    const heightInput   = document.getElementById('height');
    const weightInput   = document.getElementById('weight');
    const systolicInput = document.getElementById('systolic');
    const diastolicInput= document.getElementById('diastolic');
    const assessBtn     = document.getElementById('assessBtn');
    const reAssessBtn   = document.getElementById('reAssessBtn');
    const inputSection  = document.getElementById('inputSection');
    const resultSection = document.getElementById('resultSection');
    const errorBox      = document.getElementById('errorBox');
    const heightHint    = document.getElementById('heightHint');

    // ---- 状态 ----
    let selectedGender  = null;
    let ageInputMode    = 'month';  // 'month' | 'year'

    // ---- 性别切换 ----
    genderBtns.forEach(btn => {
        btn.addEventListener('click', function () {
            genderBtns.forEach(b => b.classList.remove('active'));
            this.classList.add('active');
            selectedGender = this.dataset.gender;
        });
    });

    // ---- 年龄模式切换 ----
    ageTabs.forEach(tab => {
        tab.addEventListener('click', function () {
            ageTabs.forEach(t => t.classList.remove('active'));
            this.classList.add('active');
            ageInputMode = this.dataset.mode;
            if (ageInputMode === 'month') {
                monthInput.style.display = '';
                yearInput.style.display  = 'none';
            } else {
                monthInput.style.display = 'none';
                yearInput.style.display  = '';
            }
        });
    });

    // ---- 月龄自动更新身高提示 ----
    ageMonthEl.addEventListener('input', updateHeightHint);
    ageYearEl.addEventListener('input', updateHeightHint);

    function updateHeightHint() {
        const months = getAgeMonths();
        if (months !== null && months < 24) {
            heightHint.textContent = '2岁以下请测量仰卧身长';
        } else {
            heightHint.textContent = '2岁及以上测量站立身高';
        }
    }

    // ---- 获取月龄 ----
    function getAgeMonths() {
        if (ageInputMode === 'month') {
            const m = parseInt(ageMonthEl.value, 10);
            return isNaN(m) ? null : m;
        } else {
            const y = parseFloat(ageYearEl.value);
            return isNaN(y) ? null : Math.round(y * 12);
        }
    }

    // ---- 表单验证 ----
    function validateForm() {
        if (!selectedGender) return '请选择孩子的性别';

        const ageMonths = getAgeMonths();
        if (ageMonths === null) return '请填写年龄';
        if (ageInputMode === 'month' && (ageMonths < 0 || ageMonths > 35)) {
            return '月龄请填写 0-35 个月（3岁以下使用月龄）';
        }
        if (ageInputMode === 'year') {
            const y = parseFloat(ageYearEl.value);
            if (isNaN(y) || y < 3 || y > 18) return '岁龄请填写 3-18 岁';
        }

        const heightVal = heightInput.value.trim();
        const weightVal = weightInput.value.trim();

        // 身高：填了就验证；不填时只有血压模式才允许
        if (heightVal !== '') {
            const height = parseFloat(heightVal);
            if (isNaN(height) || height < 30 || height > 220) return '请输入有效的身高（30-220 cm）';
        }

        // 体重：可选，但填了就必须合法
        if (weightVal !== '') {
            const weight = parseFloat(weightVal);
            if (isNaN(weight) || weight < 1 || weight > 200) return '请输入有效的体重（1-200 kg）';
        }

        // 至少要有身高或血压之一
        const heightOk = heightVal !== '' && !isNaN(parseFloat(heightVal));
        const systolicVal = systolicInput.value.trim();
        const diastolicVal = diastolicInput.value.trim();
        const bpOk = systolicVal !== '' && diastolicVal !== '';
        if (!heightOk && !bpOk) return '请至少填写身高（用于生长评估）或血压（用于血压评估）';

        return null; // 无错误
    }

    // ---- 显示错误 ----
    function showError(msg) {
        errorBox.textContent = msg;
        errorBox.style.display = 'block';
        setTimeout(() => { errorBox.style.display = 'none'; }, 3500);
    }

    // ---- 评估按钮 ----
    assessBtn.addEventListener('click', runAssessment);
    [ageMonthEl, ageYearEl, heightInput, weightInput, systolicInput, diastolicInput].forEach(el => {
        if (el) el.addEventListener('keypress', e => { if (e.key === 'Enter') runAssessment(); });
    });

    function runAssessment() {
        const err = validateForm();
        if (err) { showError(err); return; }

        const ageMonths = getAgeMonths();
        const gender    = selectedGender;
        const height    = parseFloat(heightInput.value) || null;
        const weight    = parseFloat(weightInput.value) || null;
        const systolic  = parseFloat(systolicInput.value);
        const diastolic = parseFloat(diastolicInput.value);

        // 只有身高和体重都有时才能计算身高/体重/BMI
        const heightResult = (height !== null)
            ? Assessment.assessHeight(height, ageMonths, gender) : null;
        const weightResult = (weight !== null)
            ? Assessment.assessWeight(weight, ageMonths, gender) : null;
        const bmiResult = (height !== null && weight !== null)
            ? Assessment.assessBMI(height, weight, ageMonths, gender) : null;

        // 血压评估：需要年龄+性别，身高可选（有则精确）
        const bpResult = (!isNaN(systolic) && !isNaN(diastolic) && systolic > 0 && diastolic > 0)
            ? Assessment.assessBloodPressure(systolic, diastolic, ageMonths, gender, height)
            : null;

        renderResults({
            ageMonths, gender, height, weight, systolic, diastolic,
            heightResult, weightResult, bmiResult, bpResult
        });

        inputSection.style.display  = 'none';
        resultSection.style.display = 'block';
        window.scrollTo({ top: 0, behavior: 'smooth' });
    }

    // ---- 重新评估 ----
    reAssessBtn.addEventListener('click', () => {
        resultSection.style.display = 'none';
        inputSection.style.display  = 'block';
        window.scrollTo({ top: 0, behavior: 'smooth' });
    });

    // ==================================================
    // 渲染结果
    // ==================================================
    function renderResults(data) {
        const { ageMonths, gender, height, weight, systolic, diastolic,
                heightResult, weightResult, bmiResult, bpResult } = data;

        // 副标题
        const genderLabel = gender === 'male' ? '男孩' : '女孩';
        const ageLabel = ageMonths < 36
            ? `${ageMonths}个月`
            : `${(ageMonths / 12).toFixed(1)}岁`;
        let subtitleParts = [genderLabel, ageLabel];
        if (height) subtitleParts.push(`身高 ${height}cm`);
        if (weight) subtitleParts.push(`体重 ${weight}kg`);
        document.getElementById('resultSubtitle').textContent = subtitleParts.join(' · ');

        // 身高
        if (heightResult) {
            document.getElementById('heightResultBlock').style.display = '';
            renderPercentileItem('height', heightResult, height + ' cm');
        } else {
            document.getElementById('heightResultBlock').style.display = 'none';
        }

        // 体重
        if (weightResult) {
            document.getElementById('weightResultBlock').style.display = '';
            renderPercentileItem('weight', weightResult, weight + ' kg');
        } else {
            document.getElementById('weightResultBlock').style.display = 'none';
        }

        // BMI
        const bmiBlock = document.getElementById('bmiResultBlock');
        if (bmiResult) {
            bmiBlock.style.display = '';
            const bmiValueEl = document.getElementById('bmiValue');
            const bmiCalcEl  = document.getElementById('bmiCalc');
            const bmiEvalEl  = document.getElementById('bmiEval');

            bmiValueEl.textContent = bmiResult.bmi;
            bmiCalcEl.textContent  = `${weight}kg ÷ (${(height/100).toFixed(2)}m)² = ${bmiResult.bmi} kg/m²`;
            bmiEvalEl.textContent  = bmiResult.evaluation;
            bmiEvalEl.className    = `result-evaluation eval-${bmiResult.level}`;

            // 添加BMI百分位显示（诸福棠儿科学）
            const bmiPercentileEl = document.getElementById('bmiPercentile');
            if (bmiPercentileEl) {
                const pText = bmiResult.percentile > 97 ? '>P97' :
                              bmiResult.percentile < 3 ? '<P3' :
                              `P${Math.round(bmiResult.percentile)}`;
                bmiPercentileEl.textContent = pText;
            }
        } else {
            bmiBlock.style.display = 'none';
        }

        // 血压
        if (bpResult) {
            document.getElementById('bpResult').style.display = '';
            document.getElementById('bpSystolic').textContent  = systolic;
            document.getElementById('bpDiastolic').textContent = diastolic;

            // 更新血压参考范围说明
            const bpRangeEl = document.getElementById('bpRange');
            bpRangeEl.innerHTML =
                `P90参考上限：收缩压 <b>${bpResult.sbpP90}</b> / 舒张压 <b>${bpResult.dbpP90}</b> mmHg ` +
                `&nbsp;|&nbsp; P95高血压线：收缩压 <b>${bpResult.sbpP95}</b> / 舒张压 <b>${bpResult.dbpP95}</b> mmHg` +
                `<br><span style="font-size:0.8em;color:#999">${bpResult.ageNote} &nbsp;${bpResult.heightNote} &nbsp;依据：${bpResult.standard}</span>`;

            const bpEvalEl = document.getElementById('bpEval');
            bpEvalEl.textContent = bpResult.evaluation;
            bpEvalEl.className = 'result-evaluation eval-' + (
                bpResult.status === 'normal' ? 'normal' :
                bpResult.status === 'elevated' ? 'warning' : 'high'
            );
        } else {
            document.getElementById('bpResult').style.display = 'none';
        }
    }

    // ---- 渲染百分位结果 ----
    function renderPercentileItem(type, result, valueLabel) {
        const percentileEl = document.getElementById(`${type}Percentile`);
        const barEl        = document.getElementById(`${type}Bar`);
        const evalEl       = document.getElementById(`${type}Eval`);
        const rangeEl      = document.getElementById(`${type}Range`);

        if (!result) {
            percentileEl.textContent = '--';
            evalEl.textContent       = '数据不足';
            return;
        }

        // 百分位显示
        percentileEl.textContent = result.display;

        // 进度条小圆点
        const barPos = Assessment.getBarPosition(result);
        barEl.style.display = '';
        barEl.style.left    = barPos + '%';

        // 颜色
        const evalClass = Assessment.getEvalClass(result);
        evalEl.textContent = result.evaluation;
        evalEl.className   = `result-evaluation eval-${evalClass}`;

        // 参考范围
        rangeEl.textContent = result.range || '';
    }
});
