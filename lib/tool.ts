/**
 * 生成5位随机数，第一位不为0
 * @returns {number} 返回5位随机数
 * @example
 * generateRandomDigits() // 返回类似: 23456
 */
export const generateRandomDigits = (): number => {
  const digits: number[] = [];

  // 第一位不能为0，所以从1-9中随机选择
  digits.push(Math.floor(Math.random() * 9) + 1);

  // 生成后面4位数字，可以是0-9
  for (let i: number = 0; i < 4; i++) {
    digits.push(Math.floor(Math.random() * 10));
  }

  // 将数组转换为字符串后解析为整数
  return parseInt(digits.join(''), 10);
};

/**
 * 生成收益
 * @param apy 年化收益率（如 10% 输入 0.1）
 * @param amount 本金
 * @param startTime 创建时间
 * @param endTime 结束时间（T+1）
 * @returns {number} 收益金额
 * @example
 * generateEarnings(0.1, 1000, new Date('2024-02-20 00:00:00'), new Date('2025-02-20 00:00:00'))
 */
export const generateEarnings = (apy: number, amount: number, startTime: Date, endTime: Date): number => {
  // 计算实际开始计息时间（创建时间的第二天）
  const actualStartTime = new Date(startTime);
  actualStartTime.setDate(actualStartTime.getDate());

  // 确保 endTime 是 T+1
  const targetEndTime = new Date(endTime);
  // targetEndTime.setDate(targetEndTime.getDate() + 1);

  // 计算时间差（毫秒）
  const timeDiff = targetEndTime.getTime() - actualStartTime.getTime();

  // 转换为天数，精确到分钟
  const days = timeDiff / (24 * 60 * 60 * 1000);
  const earnings = (amount * apy * days) / 365;

  // 返回保留4位小数的结果（向上取整），如果小于0则返回0
  return Math.max(Number((Math.ceil(earnings * 10000) / 10000).toFixed(4)), 0);
};

/**
 * 将数字格式化为最多4位小数，不进行四舍五入，只截断超过的小数位
 * @param value 需要格式化的数字
 * @returns 格式化后的数字，最多4位小数
 */
export function formatToFourDecimals(value: number): number {
  if (isNaN(value)) return 0;

  // 将数字转换为字符串，按4位小数截断
  const valueString = value.toString();
  const decimalIndex = valueString.indexOf('.');

  if (decimalIndex === -1) return value; // 没有小数点

  // 截取整数部分和最多4位小数
  const integerPart = valueString.slice(0, decimalIndex);
  const decimalPart = valueString.slice(decimalIndex + 1, decimalIndex + 5);

  // 重组数字
  return parseFloat(`${integerPart}.${decimalPart}`);
}
