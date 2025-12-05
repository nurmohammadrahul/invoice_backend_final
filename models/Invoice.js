const mongoose = require('mongoose');

const invoiceSchema = new mongoose.Schema({
  invoiceNumber: {
    type: String,
    required: [true, 'Invoice number is required'],
    unique: true,
    trim: true,
    uppercase: true
  },
  date: {
    type: Date,
    required: [true, 'Invoice date is required'],
    default: Date.now
  },
  dueDate: {
    type: Date,
    required: [true, 'Due date is required'],
    default: function() {
      const date = new Date(this.date || Date.now());
      date.setDate(date.getDate() + 15);
      return date;
    }
  },
  customerName: {
    type: String,
    required: [true, 'Customer name is required'],
    trim: true
  },
  customerEmail: {
    type: String,
    trim: true,
    lowercase: true
  },
  customerAddress: String,
  customerPhone: String,
  paymentStatus: {
    type: String,
    enum: ['pending', 'paid', 'overdue'],
    default: 'pending'
  },
  items: [{
    srNo: {
      type: Number,
      required: true,
      min: 1
    },
    productName: {
      type: String,
      required: [true, 'Product name is required'],
      trim: true
    },
    measurement: {
      type: String,
      enum: ['CFT', 'PCS', 'SFT', 'KG', 'LTR', 'M', 'CM', 'MM'],
      default: 'PCS'
    },
    quantity: {
      type: Number,
      required: [true, 'Quantity is required'],
      min: [0.01, 'Quantity must be greater than 0']
    },
    price: {
      type: Number,
      required: [true, 'Price is required'],
      min: [0, 'Price cannot be negative']
    },
    total: {
      type: Number,
      required: true,
      min: [0, 'Total cannot be negative']
    }
  }],
  subtotal: {
    type: Number,
    required: true,
    min: [0, 'Subtotal cannot be negative']
  },
  serviceCharge: {
    amount: {
      type: Number,
      default: 0,
      min: [0, 'Service charge cannot be negative']
    },
    type: {
      type: String,
      enum: ['percentage', 'fixed'],
      default: 'fixed'
    },
    value: {
      type: Number,
      default: 0,
      min: [0, 'Service charge value cannot be negative']
    }
  },
  vat: {
    amount: {
      type: Number,
      default: 0,
      min: [0, 'VAT cannot be negative']
    },
    type: {
      type: String,
      enum: ['percentage', 'fixed'],
      default: 'fixed'
    },
    value: {
      type: Number,
      default: 0,
      min: [0, 'VAT value cannot be negative']
    }
  },
  specialDiscount: {
    type: Number,
    default: 0,
    min: [0, 'Discount cannot be negative']
  },
  grandTotal: {
    type: Number,
    required: true,
    min: [0, 'Grand total cannot be negative']
  },
  netTotal: {
    type: Number,
    required: true,
    min: [0, 'Net total cannot be negative']
  },
  notes: String
}, {
  timestamps: true
});

// Auto-calculate totals before saving
invoiceSchema.pre('save', function(next) {
  // Calculate item totals
  this.items.forEach(item => {
    item.total = item.quantity * item.price;
  });
  
  // Calculate subtotal
  this.subtotal = this.items.reduce((sum, item) => sum + item.total, 0);
  
  // Calculate service charge
  let serviceChargeAmount = 0;
  if (this.serviceCharge.type === 'percentage') {
    serviceChargeAmount = (this.subtotal * this.serviceCharge.value) / 100;
  } else {
    serviceChargeAmount = this.serviceCharge.value;
  }
  this.serviceCharge.amount = serviceChargeAmount;
  
  // Calculate VAT
  let vatAmount = 0;
  if (this.vat.type === 'percentage') {
    vatAmount = (this.subtotal * this.vat.value) / 100;
  } else {
    vatAmount = this.vat.value;
  }
  this.vat.amount = vatAmount;
  
  // Calculate totals
  this.grandTotal = this.subtotal + serviceChargeAmount + vatAmount;
  this.netTotal = this.grandTotal - this.specialDiscount;
  
  next();
});

module.exports = mongoose.model('Invoice', invoiceSchema);