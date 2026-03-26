const assessment = require('../../utils/assessment.js');

Page({
  data: {
    result: null,
    heightPosition: 50,
    weightPosition: 50
  },

  onLoad(options) {
    // 获取评估结果
    const eventChannel = this.getOpenerEventChannel();
    eventChannel.on('assessmentResult', (result) => {
      this.setData({ result });
      
      // 计算百分位在图上的位置（0-100%）
      const heightP = parseFloat(result.height.interpolated) || 50;
      const weightP = parseFloat(result.weight.interpolated) || 50;
      
      // 转换百分位到位置（3%=0%, 97%=100%）
      const heightPosition = Math.min(100, Math.max(0, ((heightP - 3) / 94) * 100));
      const weightPosition = Math.min(100, Math.max(0, ((weightP - 3) / 94) * 100));
      
      this.setData({
        heightPosition: heightPosition.toFixed(1),
        weightPosition: weightPosition.toFixed(1)
      });
    });
  },

  onAgain() {
    wx.navigateBack();
  }
});
