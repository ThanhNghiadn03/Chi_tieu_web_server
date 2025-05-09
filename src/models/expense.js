const mongoose = require('mongoose');

const expenseSchema = new mongoose.Schema({
  user_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  date: {
    type: String,
    required: true,
  },
  item_name: {
    type: String,
    required: true,
  },
  unit_price: {
    type: Number,
    required: true,
  },
  quantity: {
    type: Number,
    required: true,
  },
  total_price: {
    type: Number,
    default: 0,
  },
});

expenseSchema.pre('save', function (next) {
  this.total_price = this.unit_price * this.quantity;
  next();
});

expenseSchema.pre(['updateOne', 'findOneAndUpdate'], function (next) {
  const update = this.getUpdate();
  if (update.unit_price != null && update.quantity != null) {
    update.total_price = update.unit_price * update.quantity;
    this.setUpdate(update);
  }
  next();
});

module.exports = mongoose.model('Expense', expenseSchema);
