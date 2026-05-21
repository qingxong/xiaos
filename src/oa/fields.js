/** OA 提单表单字段别名（见《提单的API文档》） */
const F = {
  customerName: "_widget_1766738248133",
  customerPhone: "_widget_1766738248151",
  customerType: "_widget_1766738248511",
  salesOwner: "_widget_1766738249103",
  company: "_widget_1766738249415",
  groupName: "_widget_1766738249340",
  enterprise: "_widget_1766738249375",
  taskList: "_widget_1766738249550",
  businessName: "_widget_1766739104754",
  taskRemark: "_widget_1766739105091",
};

const REQUIRED_LABELS = [
  ["customerName", "客户姓名"],
  ["customerPhone", "客户电话"],
  ["enterprise", "标的企业"],
  ["businessName", "业务名称"],
];

module.exports = { F, REQUIRED_LABELS };
