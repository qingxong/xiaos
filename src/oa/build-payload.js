const { F } = require("./fields");

/**
 * 将解析结果转为 data_create 的 data 对象
 */
function buildOaData(order, defaults = {}) {
  const data = {};

  if (order.customerName) data[F.customerName] = order.customerName;
  if (order.customerPhone) data[F.customerPhone] = order.customerPhone;
  if (order.customerType || defaults.customerType) {
    data[F.customerType] = order.customerType || defaults.customerType;
  }
  if (order.company || defaults.company) {
    data[F.company] = order.company || defaults.company;
  }
  if (order.groupName) data[F.groupName] = order.groupName;
  if (order.enterprise) data[F.enterprise] = order.enterprise;

  const salesOwner = order.salesOwner || defaults.salesOwner;
  if (salesOwner) data[F.salesOwner] = salesOwner;

  const taskRow = {};
  if (order.businessName) taskRow[F.businessName] = order.businessName;
  if (order.taskRemark) taskRow[F.taskRemark] = order.taskRemark;
  if (Object.keys(taskRow).length) {
    data[F.taskList] = [taskRow];
  }

  return data;
}

module.exports = { buildOaData };
