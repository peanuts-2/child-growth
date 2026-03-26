/**
 * 儿童生长发育评估核心逻辑
 * 使用线性插值法计算精确百分位
 * 百分位最大值显示为 ">P97"，不超过此上限
 */

const Assessment = {

    // 百分位对应数组（用于身高、体重）
    PERCENTILE_KEYS: ['p3', 'p10', 'p25', 'p50', 'p75', 'p90', 'p97'],
    PERCENTILE_VALUES: [3, 10, 25, 50, 75, 90, 97],

    // BMI专用百分位数组（诸福棠表2-19/2-20：P3,P5,P10,P15,P50,P85,P90,P95,P97）
    BMI_PERCENTILE_KEYS: ['p3', 'p5', 'p10', 'p15', 'p50', 'p85', 'p90', 'p95', 'p97'],
    BMI_PERCENTILE_VALUES: [3, 5, 10, 15, 50, 85, 90, 95, 97],

    /**
     * 根据年龄（岁或月龄）和性别获取生长数据
     * @param {string} type - 'height' | 'weight'
     * @param {string} gender - 'male' | 'female'
     * @param {number} ageMonths - 月龄（0-215）
     * @returns {Object} 该月龄/年龄的百分位数据
     */
    getDataForAge(type, gender, ageMonths) {
        if (ageMonths < 84) {
            // 0-83月（7岁以下）：使用月龄数据
            const dataObj = type === 'height'
                ? (gender === 'male' ? GrowthData.heightMale : GrowthData.heightFemale)
                : (gender === 'male' ? GrowthData.weightMale : GrowthData.weightFemale);

            const floorMonth = Math.floor(ageMonths);
            const ceilMonth  = Math.ceil(ageMonths);

            if (dataObj[floorMonth] && floorMonth === ceilMonth) {
                return dataObj[floorMonth];
            }

            // 在相邻月龄之间线性插值
            const lowerData = dataObj[floorMonth];
            const upperData = dataObj[ceilMonth];

            if (!lowerData || !upperData) {
                return lowerData || upperData;
            }

            const ratio = ageMonths - floorMonth;
            const interpolated = {};
            for (const key of this.PERCENTILE_KEYS) {
                interpolated[key] = lowerData[key] + (upperData[key] - lowerData[key]) * ratio;
                interpolated[key] = Math.round(interpolated[key] * 10) / 10;
            }
            return interpolated;

        } else {
            // 7岁及以上：使用整岁数据
            const ageYears = ageMonths / 12;
            const dataObj = type === 'height'
                ? (gender === 'male' ? GrowthData.heightMaleYear : GrowthData.heightFemaleYear)
                : (gender === 'male' ? GrowthData.weightMaleYear : GrowthData.weightFemaleYear);

            const floorYear = Math.min(18, Math.max(7, Math.floor(ageYears)));
            const ceilYear  = Math.min(18, Math.ceil(ageYears));

            if (floorYear === ceilYear || !dataObj[ceilYear]) {
                return dataObj[floorYear];
            }

            const ratio = ageYears - floorYear;
            const lowerData = dataObj[floorYear];
            const upperData = dataObj[ceilYear];
            const interpolated = {};
            for (const key of this.PERCENTILE_KEYS) {
                interpolated[key] = lowerData[key] + (upperData[key] - lowerData[key]) * ratio;
                interpolated[key] = Math.round(interpolated[key] * 10) / 10;
            }
            return interpolated;
        }
    },

    /**
     * 线性插值计算精确百分位
     * @param {number} value - 测量值
     * @param {Object} data - 该年龄段的参考数据
     * @returns {Object} { percentile, display, class, isBelow3, isAbove97 }
     */
    calcPercentile(value, data) {
        const pKeys = this.PERCENTILE_KEYS;
        const pVals = this.PERCENTILE_VALUES;

        // 低于 P3
        if (value < data.p3) {
            return {
                display: '<P3',
                numeric: null,
                isBelow3: true,
                isAbove97: false,
            };
        }

        // 高于 P97
        if (value > data.p97) {
            return {
                display: '>P97',
                numeric: null,
                isBelow3: false,
                isAbove97: true,
            };
        }

        // 在 P3-P97 之间，线性插值
        for (let i = 0; i < pKeys.length - 1; i++) {
            const lowerVal = data[pKeys[i]];
            const upperVal = data[pKeys[i + 1]];

            if (value >= lowerVal && value <= upperVal) {
                const range = upperVal - lowerVal;
                const position = range === 0 ? 0 : (value - lowerVal) / range;
                const percentile = pVals[i] + (pVals[i + 1] - pVals[i]) * position;
                const rounded = Math.round(percentile);

                return {
                    display: `P${rounded}`,
                    numeric: rounded,
                    isBelow3: false,
                    isAbove97: false,
                };
            }
        }

        // 恰好等于某个百分位
        for (let i = 0; i < pKeys.length; i++) {
            if (value === data[pKeys[i]]) {
                return {
                    display: `P${pVals[i]}`,
                    numeric: pVals[i],
                    isBelow3: false,
                    isAbove97: false,
                };
            }
        }

        return { display: '--', numeric: null, isBelow3: false, isAbove97: false };
    },

    /**
     * BMI专用百分位计算（使用9百分位：P3,P5,P10,P15,P50,P85,P90,P95,P97）
     * @param {number} bmi - 计算得出的BMI值
     * @param {Object} data - 该年龄段的BMI参考数据
     * @returns {Object} { percentile, display, isBelow3, isAbove97 }
     */
    calcBMIPercentile(bmi, data) {
        const pKeys = this.BMI_PERCENTILE_KEYS;
        const pVals = this.BMI_PERCENTILE_VALUES;

        // 低于 P3
        if (bmi < data.p3) {
            return { display: '<P3', numeric: null, isBelow3: true, isAbove97: false };
        }

        // 高于 P97
        if (bmi > data.p97) {
            return { display: '>P97', numeric: null, isBelow3: false, isAbove97: true };
        }

        // 在 P3-P97 之间，线性插值
        for (let i = 0; i < pKeys.length - 1; i++) {
            const lowerVal = data[pKeys[i]];
            const upperVal = data[pKeys[i + 1]];

            if (bmi >= lowerVal && bmi <= upperVal) {
                const range = upperVal - lowerVal;
                const position = range === 0 ? 0 : (bmi - lowerVal) / range;
                const percentile = pVals[i] + (pVals[i + 1] - pVals[i]) * position;
                const rounded = Math.round(percentile);

                return {
                    display: `P${rounded}`,
                    numeric: rounded,
                    isBelow3: false,
                    isAbove97: false,
                };
            }
        }

        // 恰好等于某个百分位
        for (let i = 0; i < pKeys.length; i++) {
            if (bmi === data[pKeys[i]]) {
                return {
                    display: `P${pVals[i]}`,
                    numeric: pVals[i],
                    isBelow3: false,
                    isAbove97: false,
                };
            }
        }

        return { display: '--', numeric: null, isBelow3: false, isAbove97: false };
    },

    /**
     * 评估身高
     */
    assessHeight(height, ageMonths, gender) {
        const data = this.getDataForAge('height', gender, ageMonths);
        if (!data) return null;

        const result = this.calcPercentile(height, data);
        result.evaluation = this.getHeightEvaluation(result);
        result.range = `参考范围：${data.p3} ~ ${data.p97} cm（P3-P97）`;
        result.data = data;
        return result;
    },

    /**
     * 评估体重
     */
    assessWeight(weight, ageMonths, gender) {
        const data = this.getDataForAge('weight', gender, ageMonths);
        if (!data) return null;

        const result = this.calcPercentile(weight, data);
        result.evaluation = this.getWeightEvaluation(result);
        result.range = `参考范围：${data.p3} ~ ${data.p97} kg（P3-P97）`;
        result.data = data;
        return result;
    },

    /**
     * 评估BMI（使用诸福棠儿科学BMI百分位数据）
     * @param {number} height - 身高(cm)
     * @param {number} weight - 体重(kg)
     * @param {number} ageMonths - 月龄
     * @param {string} gender - 'male' | 'female'
     * @returns {Object} BMI值、百分位、评估等级
     */
    assessBMI(height, weight, ageMonths, gender) {
        const heightM = height / 100;
        const bmi = weight / (heightM * heightM);
        const bmiRounded = Math.round(bmi * 10) / 10;

        const ageYears = Math.floor(Math.min(18, Math.max(2, ageMonths / 12)));
        const standard = BMIData[gender][ageYears] || BMIData[gender][5];

        // 使用BMI专用9百分位计算函数（诸福棠表2-19/2-20）
        const result = this.calcBMIPercentile(bmi, standard);

        // 评估等级（基于百分位）
        let evaluation, level;
        if (result.numeric === null) {
            if (result.isBelow3) {
                evaluation = '偏瘦';
                level = 'low';
            } else {
                evaluation = '肥胖';
                level = 'high';
            }
        } else {
            const p = result.numeric;
            if (p < 3) {
                evaluation = '偏瘦';
                level = 'low';
            } else if (p < 85) {
                evaluation = '正常';
                level = 'normal';
            } else if (p < 95) {
                evaluation = '超重';
                level = 'warning';
            } else {
                evaluation = '肥胖';
                level = 'high';
            }
        }

        return { bmi: bmiRounded, percentile: result.numeric, display: result.display, evaluation, level, standard };
    },

    /**
     * 根据身高确定身高百分位组（对应血压表的8列：<P5,≥P5,≥P10,≥P25,≥P50,≥P75,≥P90,≥P95）
     * @returns {number} 0-7 对应数组索引
     */
    getHeightGroupForBP(height, ageYears, gender) {
        const refKey = gender === 'male' ? 'heightReferenceForBP_male' : 'heightReferenceForBP_female';
        const ref = GrowthData[refKey][ageYears];
        if (!ref) return 3; // 无数据时默认P50组

        if (height >= ref.p95) return 7;
        if (height >= ref.p90) return 6;
        if (height >= ref.p75) return 5;
        if (height >= ref.p50) return 4;
        if (height >= ref.p25) return 3;
        if (height >= ref.p10) return 2;
        if (height >= ref.p5)  return 1;
        return 0; // <P5
    },

    /**
     * 评估血压（身高+年龄双维度，WS/T 610-2018）
     *
     * @param {number} systolic  - 收缩压（mmHg）
     * @param {number} diastolic - 舒张压（mmHg）
     * @param {number} ageMonths - 月龄
     * @param {string} gender    - 'male' | 'female'
     * @param {number|null} height - 身高（cm），有则精确评估；无则按P50身高组
     */
    assessBloodPressure(systolic, diastolic, ageMonths, gender, height) {
        const ageYears = Math.round(ageMonths / 12); // 四舍五入到整岁（WS/T 610-2018 §4.1.1）
        const ageYearsClamped = Math.min(17, Math.max(3, ageYears));

        // ≥ 18岁：成人标准
        if (ageYears >= 18) {
            let status, evaluation;
            if (systolic >= 140 || diastolic >= 90) {
                status = 'high';
                evaluation = '血压偏高，建议就医评估';
            } else if (systolic >= 120 || diastolic >= 80) {
                status = 'elevated';
                evaluation = '血压处于正常高值，建议监测';
            } else {
                status = 'normal';
                evaluation = '血压正常';
            }
            return {
                status, evaluation,
                sbpP90: 120, sbpP95: 140, dbpP90: 80, dbpP95: 90,
                ageNote: `${ageYears}岁（成人标准）`,
                heightNote: '—',
                standard: '成人标准'
            };
        }

        // 3-17岁：使用WS/T 610-2018表格标准
        if (ageYearsClamped >= 7) {
            const bpTableKey = gender === 'male'
                ? 'bloodPressureByHeight_male'
                : 'bloodPressureByHeight_female';
            const bpTable = GrowthData[bpTableKey][ageYearsClamped];

            // 确定身高组（有身高则精确，无身高则取P50组=索引4）
            let hGroup = 4; // 默认P50组
            let heightNote = '（未填身高，按P50估算）';
            const HGroupLabels = ['<P5','P5~P10','P10~P25','P25~P50','P50~P75','P75~P90','P90~P95','≥P95'];

            if (height && height > 0) {
                hGroup = this.getHeightGroupForBP(height, ageYearsClamped, gender);
                heightNote = `身高组：${HGroupLabels[hGroup]}`;
            }

            const sbpP90 = bpTable.p90.sbp[hGroup];
            const dbpP90 = bpTable.p90.dbp[hGroup];
            const sbpP95 = bpTable.p95.sbp[hGroup];
            const dbpP95 = bpTable.p95.dbp[hGroup];

            let status, evaluation;
            if (systolic >= sbpP95 || diastolic >= dbpP95) {
                status = 'high';
                evaluation = '血压偏高（≥P95），建议就医进一步评估';
            } else if (systolic >= sbpP90 || diastolic >= dbpP90 || systolic >= 120 || diastolic >= 80) {
                status = 'elevated';
                evaluation = '正常高值血压（P90~P95），建议定期监测';
            } else {
                status = 'normal';
                evaluation = '血压正常（<P90）';
            }

            return {
                status, evaluation,
                sbpP90, sbpP95, dbpP90, dbpP95,
                ageNote: `${ageYearsClamped}岁`,
                heightNote,
                standard: 'WS/T 610-2018'
            };

        } else {
            // 3-6岁：使用简化公式（2018高血压防治指南 表11）
            // 男：SBP_P95 = 100+2×Age，DBP_P95 = 65+Age
            // 女：SBP_P95 = 100+1.5×Age，DBP_P95 = 65+Age
            // P90 ≈ P95 - 4
            const age = Math.max(3, ageYearsClamped);
            let sbpP95, dbpP95;
            if (gender === 'male') {
                sbpP95 = 100 + 2 * age;
                dbpP95 = 65 + age;
            } else {
                sbpP95 = 100 + 1.5 * age;
                dbpP95 = 65 + age;
            }
            const sbpP90 = sbpP95 - 4;
            const dbpP90 = dbpP95 - 4;

            let status, evaluation;
            if (systolic >= sbpP95 || diastolic >= dbpP95) {
                status = 'high';
                evaluation = '血压偏高（≥P95），建议就医进一步评估';
            } else if (systolic >= sbpP90 || diastolic >= dbpP90) {
                status = 'elevated';
                evaluation = '正常高值血压（P90~P95），建议定期监测';
            } else {
                status = 'normal';
                evaluation = '血压正常（<P90）';
            }

            return {
                status, evaluation,
                sbpP90, sbpP95, dbpP90, dbpP95,
                ageNote: `${age}岁`,
                heightNote: '（3-6岁使用简化公式）',
                standard: '中国高血压防治指南2018'
            };
        }
    },

    /**
     * 根据百分位获取身高评价
     */
    getHeightEvaluation(result) {
        if (result.isAbove97) return '身材高大（>P97）';
        if (result.isBelow3)  return '身材矮小（<P3），建议就诊';
        const p = result.numeric;
        if (p >= 90) return '身材较高（P90-P97）';
        if (p >= 75) return '中等偏上（P75-P90）';
        if (p >= 25) return '身高正常（P25-P75）';
        if (p >= 10) return '中等偏下（P10-P25）';
        return '身材偏矮（P3-P10），建议关注';
    },

    /**
     * 根据百分位获取体重评价
     */
    getWeightEvaluation(result) {
        if (result.isAbove97) return '体重过重（>P97），建议就诊';
        if (result.isBelow3)  return '体重过轻（<P3），建议就诊';
        const p = result.numeric;
        if (p >= 90) return '体重偏重（P90-P97），注意饮食';
        if (p >= 75) return '体重较重（P75-P90）';
        if (p >= 25) return '体重正常（P25-P75）';
        if (p >= 10) return '体重较轻（P10-P25）';
        return '体重偏轻（P3-P10），建议关注';
    },

    /**
     * 获取百分位对应的颜色 CSS class
     */
    getEvalClass(result) {
        if (!result) return 'normal';
        if (result.isAbove97) return 'high';
        if (result.isBelow3)  return 'danger';
        const p = result.numeric;
        if (p >= 90) return 'warning';
        if (p >= 10) return 'normal';
        return 'warning';
    },

    /**
     * 计算百分位在进度条上的百分比位置（P3=5%, P97=95%，线性映射）
     */
    getBarPosition(result) {
        if (!result || result.isBelow3) return 2;
        if (result.isAbove97) return 98;
        const p = result.numeric;
        if (p === null) return 50;
        // 映射 P3(3) -> 5%, P97(97) -> 95%
        return 5 + (p - 3) / (97 - 3) * 90;
    }
};
