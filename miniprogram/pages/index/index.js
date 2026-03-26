const assessment = require('../../utils/assessment.js');

Page({
  data: {
    gender: '',      // 'boy' 或 'girl'
    ageYear: '',     // 年龄（岁）
    ageMonth: '',    // 月龄
    height: '',      // 身高(cm)
    weight: '',      // 体重(kg)
    systolic: '',    // 收缩压
    diastolic: '',   // 舒张压
    canAssess: false
  },

  // 选择性别
  selectGender(e) {
    const gender = e.currentTarget.dataset.gender;
    this.setData({ gender });
    this.checkCanAssess();
  },

  // 输入年龄（岁）
  onAgeYearInput(e) {
    this.setData({ ageYear: e.detail.value });
    this.checkCanAssess();
  },

  // 输入月龄
  onAgeMonthInput(e) {
    this.setData({ ageMonth: e.detail.value });
    this.checkCanAssess();
  },

  // 输入身高
  onHeightInput(e) {
    this.setData({ height: e.detail.value });
    this.checkCanAssess();
  },

  // 输入体重
  onWeightInput(e) {
    this.setData({ weight: e.detail.value });
    this.checkCanAssess();
  },

  // 输入收缩压
  onSystolicInput(e) {
    this.setData({ systolic: e.detail.value });
  },

  // 输入舒张压
  onDiastolicInput(e) {
    this.setData({ diastolic: e.detail.value });
  },

  // 检查是否可以评估
  checkCanAssess() {
    const { gender, ageYear, height, weight } = this.data;
    const canAssess = gender && ageYear && height && weight;
    this.setData({ canAssess: !!canAssess });
  },

  // 执行评估
  doAssess() {
    const { gender, ageYear, ageMonth, height, weight, systolic, diastolic } = this.data;
    
    // 参数验证
    if (!gender || !ageYear || !height || !weight) {
      wx.showToast({
        title: '请填写完整信息',
        icon: 'none'
      });
      return;
    }

    const ageYearNum = parseFloat(ageYear);
    const ageMonthNum = parseFloat(ageMonth) || 0;
    const heightNum = parseFloat(height);
    const weightNum = parseFloat(weight);

    if (ageYearNum < 0 || ageYearNum > 18) {
      wx.showToast({
        title: '年龄需在0-18岁之间',
        icon: 'none'
      });
      return;
    }

    if (heightNum < 30 || heightNum > 220) {
      wx.showToast({
        title: '请输入合理的身高',
        icon: 'none'
      });
      return;
    }

    if (weightNum < 1 || weightNum > 200) {
      wx.showToast({
        title: '请输入合理的体重',
        icon: 'none'
      });
      return;
    }

    // 执行评估
    const result = assessment.assessGrowth({
      gender,
      ageYear: ageYearNum,
      ageMonth: ageMonthNum,
      height: heightNum,
      weight: weightNum,
      systolic: systolic ? parseFloat(systolic) : null,
      diastolic: diastolic ? parseFloat(diastolic) : null
    });

    // 跳转到结果页
    wx.navigateTo({
      url: '../result/result',
      success: function(res) {
        // 通过事件传递结果
        res.eventChannel.emit('assessmentResult', result);
      }
    });
  }
});
