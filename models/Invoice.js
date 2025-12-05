const mongoose = require('mongoose');

const invoiceSchema = new mongoose.Schema({
  invoiceNumber: {
    type: String,
    required: true,
    unique: true
  },
  date: {
    type: Date,
    default: Date.now
  },
  dueDate: {
    type: Date,
    default: function() {
      const dueDate = new Date(this.date);
      dueDate.setDate(dueDate.getDate() + 15);
      return dueDate;
    }
  },
  customerName: {
    type: String,
    required: true
  },
  customerEmail: String,
  customerAddress: String,
  customerPhone: String,
  paymentStatus: {
    type: String,
    enum: ['pending', 'paid', 'overdue'],
    default: 'pending'
  },
  items: [{
    srNo: Number,
    productName: {
      type: String,
      required: true
    },
    measurement: {
      type: String,
      enum: ['CFT', 'PCS', 'SFT', 'KG', 'LTR'],
      default: 'CFT'
    },
    quantity: {
      type: Number,
      required: true,
      min: 0
    },
    price: {
      type: Number,
      required: true,
      min: 0
    },
    total: {
      type: Number,
      required: true,
      min: 0
    }
  }],
  subtotal: {
    type: Number,
    required: true,
    min: 0
  },
  serviceCharge: {
    amount: {
      type: Number,
      default: 0,
      min: 0
    },
    type: {
      type: String,
      enum: ['percentage', 'fixed'],
      default: 'fixed'
    },
    value: {
      type: Number,
      default: 0,
      min: 0
    }
  },
  vat: {
    amount: {
      type: Number,
      default: 0,
      min: 0
    },
    type: {
      type: String,
      enum: ['percentage', 'fixed'],
      default: 'fixed'
    },
    value: {
      type: Number,
      default: 0,
      min: 0
    }
  },
  specialDiscount: {
    type: Number,
    default: 0,
    min: 0
  },
  grandTotal: {
    type: Number,
    required: true,
    min: 0
  },
  netTotal: {
    type: Number,
    required: true,
    min: 0
  },
  notes: String
}, {
  timestamps: true
});

module.exports = mongoose.model('Invoice', invoiceSchema);