/**
 * 儿童生长发育评估计算工具
 * 基于首都儿科研究所《中国0~18岁儿童、青少年身高、体重的标准化生长曲线》
 */

const growthData = require('../data/growth-data.js');
const bpData = require('../data/blood-pressure-data.js');

/**
 * 将年龄转换为月龄
 */
function ageToMonth(age, month = 0) {
  return age * 12 + month;
}

/**
 * 评估儿童生长发育
 * @param {object} params - 评估参数
 * @param {string} params.gender - 'boy' 或 'girl'
 * @param {number} params.ageYear - 年龄（岁）
 * @param {number} params.ageMonth - 不足一月的部分（月）
 * @param {number} params.height - 身高(cm)
 * @param {number} params.weight - 体重(kg)
 * @param {number} params.systolic - 收缩压(mmHg)，可选
 * @param {number} params.diastolic - 舒张压(mmHg)，可选
 * @returns {object} - 完整评估结果
 */
function assessGrowth(params) {
  const { gender, ageYear, ageMonth = 0, height, weight, systolic, diastolic } = params;
  const monthAge = ageToMonth(ageYear, ageMonth);
  
  // 计算身高百分位
  const heightResult = growthData.calculatePercentile(gender, monthAge, height, 'height');
  
  // 计算体重百分位
  const weightResult = growthData.calculatePercentile(gender, monthAge, weight, 'weight');
  
  // 计算BMI
  const heightM = height / 100;
  const bmi = weight / (heightM * heightM);
  
  // BMI评估（简化版，使用体重百分位逻辑）
  let bmiGrade = '正常';
  let bmiAdvice = '';
  
  // 身高体重百分位差距
  const weightPercentile = parseFloat(weightResult.interpolated);
  const heightPercentile = parseFloat(heightResult.interpolated);
  const percentileDiff = weightPercentile - heightPercentile;
  
  if (percentileDiff > 15) {
    bmiGrade = '超重';
    bmiAdvice = '体重增长较快，建议控制饮食，增加运动';
  } else if (percentileDiff > 25) {
    bmiGrade = '肥胖';
    bmiAdvice = '建议咨询医生，制定减重计划';
  } else if (percentileDiff < -15) {
    bmiGrade = '消瘦';
    bmiAdvice = '体重偏低，建议加强营养';
  } else if (percentileDiff < -25) {
    bmiGrade = '营养不良';
    bmiAdvice = '建议咨询医生，评估营养状况';
  } else {
    if (heightPercentile < 25) {
      bmiGrade = '偏低';
      bmiAdvice = '身高偏矮，需关注生长发育';
    } else if (heightPercentile > 75) {
      bmiGrade = '偏高';
      bmiAdvice = '身高较好，继续保持';
    } else {
      bmiGrade = '正常';
      bmiAdvice = '生长发育良好';
    }
  }
  
  const result = {
    basicInfo: {
      gender: gender === 'boy' ? '男孩' : '女孩',
      age: `${ageYear}岁${ageMonth > 0 ? ageMonth + '月' : ''}`,
      monthAge,
      height,
      weight,
      bmi: bmi.toFixed(1)
    },
    height: heightResult,
    weight: weightResult,
    bmi: {
      value: bmi.toFixed(1),
      grade: bmiGrade,
      advice: bmiAdvice,
      percentileDiff: percentileDiff.toFixed(1)
    },
    bloodPressure: null
  };
  
  // 血压评估（如果有输入）
  if (systolic && diastolic) {
    result.bloodPressure = bpData.assessBloodPressure(systolic, diastolic, ageYear, gender);
  }
  
  return result;
}

/**
 * 生成评估报告文本
 */
function generateReport(assessment) {
  let report = `${assessment.basicInfo.gender}，${assessment.basicInfo.age}\n`;
  report += `身高 ${assessment.basicInfo.height}cm → ${assessment.height.percentile} (${assessment.height.grade})\n`;
  report += `体重 ${assessment.basicInfo.weight}kg → ${assessment.weight.percentile} (${assessment.weight.grade})\n`;
  report += `BMI ${assessment.basicInfo.bmi} → ${assessment.bmi.grade}\n`;
  
  if (assessment.bloodPressure) {
    const bp = assessment.bloodPressure;
    report += `\n血压 ${bp.systolic.value}/${bp.diastolic.value}mmHg → ${bp.statusText}\n`;
    report += `收缩压参考范围: ${bp.reference.assessment.normal.split('且')[0]}\n`;
    report += `舒张压参考范围: ${bp.reference.assessment.normal.split('且')[1] || '见上'}\n`;
  }
  
  return report;
}

module.exports = {
  assessGrowth,
  generateReport,
  ageToMonth,
  getBloodPressureTable: bpData.getBloodPressureTable
};
