/**
 * 中国儿童血压参考标准
 * 数据来源：《中国儿童青少年血压参考标准》
 * 采用简化评估公式：收缩压 = 80 + (年龄 × 2)，舒张压 ≈ 收缩压的2/3
 * 高血压诊断标准：收缩压或舒张压 ≥ 同龄同性别 P95
 */

/**
 * 获取儿童血压正常参考值
 * @param {number} age - 年龄（岁）
 * @param {string} gender - 'boy' 或 'girl'
 * @returns {object} - {systolic, diastolic, unit: 'mmHg'}
 */
function getBloodPressureReference(age, gender) {
  // 基础公式计算
  const systolicBase = 80 + (age * 2);
  
  // 根据年龄调整的系数
  let ratio;
  if (age < 1) {
    ratio = 0.5; // 婴儿期，舒张压约为收缩压的1/2
  } else if (age < 10) {
    ratio = 2/3; // 儿童期
  } else {
    ratio = 3/5; // 青少年期，接近成人
  }
  
  const diastolicBase = Math.round(systolicBase * ratio);
  
  // P90和P95阈值（简化计算）
  const systolicP90 = systolicBase + 10;
  const systolicP95 = systolicBase + 15;
  const diastolicP90 = diastolicBase + 5;
  const diastolicP95 = diastolicBase + 10;
  
  return {
    systolic: {
      normal: systolicBase,
      normalHigh: systolicP90,
      hypertension: systolicP95,
      unit: 'mmHg'
    },
    diastolic: {
      normal: diastolicBase,
      normalHigh: diastolicP90,
      hypertension: diastolicP95,
      unit: 'mmHg'
    },
    assessment: {
      normal: `收缩压 < ${systolicP90} mmHg 且 舒张压 < ${diastolicP90} mmHg`,
      normalHigh: `收缩压 ${systolicP90}-${systolicP95} mmHg 或 舒张压 ${diastolicP90}-${diastolicP95} mmHg`,
      hypertension: `收缩压 ≥ ${systolicP95} mmHg 或 舒张压 ≥ ${diastolicP95} mmHg`
    }
  };
}

/**
 * 评估血压是否正常
 * @param {number} systolic - 收缩压实测值
 * @param {number} diastolic - 舒张压实测值
 * @param {number} age - 年龄（岁）
 * @param {string} gender - 'boy' 或 'girl'
 * @returns {object} - 评估结果
 */
function assessBloodPressure(systolic, diastolic, age, gender) {
  const ref = getBloodPressureReference(age, gender);
  
  let systolicStatus = 'normal';
  let diastolicStatus = 'normal';
  
  if (systolic >= ref.systolic.hypertension) {
    systolicStatus = 'hypertension';
  } else if (systolic >= ref.systolic.normalHigh) {
    systolicStatus = 'normalHigh';
  }
  
  if (diastolic >= ref.diastolic.hypertension) {
    diastolicStatus = 'hypertension';
  } else if (diastolic >= ref.diastolic.normalHigh) {
    diastolicStatus = 'normalHigh';
  }
  
  let overallStatus = 'normal';
  if (systolicStatus === 'hypertension' || diastolicStatus === 'hypertension') {
    overallStatus = 'hypertension';
  } else if (systolicStatus === 'normalHigh' || diastolicStatus === 'normalHigh') {
    overallStatus = 'normalHigh';
  }
  
  let statusText = '';
  let statusColor = '#52c41a';
  let advice = '';
  
  switch (overallStatus) {
    case 'normal':
      statusText = '正常';
      statusColor = '#52c41a';
      advice = '血压在正常范围内';
      break;
    case 'normalHigh':
      statusText = '正常高值';
      statusColor = '#faad14';
      advice = '建议改善生活方式，定期监测';
      break;
    case 'hypertension':
      statusText = '偏高';
      statusColor = '#ff4d4f';
      advice = '建议咨询医生，进行进一步检查';
      break;
  }
  
  return {
    overallStatus,
    statusText,
    statusColor,
    systolic: {
      value: systolic,
      status: systolicStatus,
      ref: ref.systolic
    },
    diastolic: {
      value: diastolic,
      status: diastolicStatus,
      ref: ref.diastolic
    },
    reference: ref,
    advice
  };
}

/**
 * 获取血压对照表（简化版）
 */
function getBloodPressureTable() {
  const table = [];
  for (let age = 3; age <= 18; age++) {
    const ref = getBloodPressureReference(age, 'boy');
    table.push({
      age,
      boy: {
        systolic: `${ref.systolic.normal}/${ref.systolic.normalHigh}/${ref.systolic.hypertension}`,
        diastolic: `${ref.diastolic.normal}/${ref.diastolic.normalHigh}/${ref.diastolic.hypertension}`
      }
    });
  }
  return table;
}

module.exports = {
  getBloodPressureReference,
  assessBloodPressure,
  getBloodPressureTable
};
