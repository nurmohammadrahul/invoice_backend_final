const express = require('express');
const authMiddleware = require('../middleware/auth');
const Invoice = require('../models/Invoice');
const router = express.Router();

// Get all invoices - PROTECTED
router.get('/', authMiddleware, async (req, res) => {
  try {
    console.log('📋 Fetching all invoices for user:', req.user.userId);
    const invoices = await Invoice.find().sort({ createdAt: -1 });
    console.log(`✅ Found ${invoices.length} invoices`);
    
    res.json(invoices);
  } catch (error) {
    console.error('❌ Error fetching invoices:', error);
    res.status(500).json({ 
      error: 'Failed to fetch invoices',
      message: error.message
    });
  }
});

// Get single invoice - PROTECTED
router.get('/:id', authMiddleware, async (req, res) => {
  try {
    const invoice = await Invoice.findById(req.params.id);
    if (!invoice) {
      return res.status(404).json({ error: 'Invoice not found' });
    }
    res.json(invoice);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Create invoice - PROTECTED
router.post('/', authMiddleware, async (req, res) => {
  try {
    console.log('📝 Creating new invoice for user:', req.user.userId);
    console.log('Invoice data:', JSON.stringify(req.body, null, 2));
    
    const invoice = new Invoice(req.body);
    
    // Calculate totals if not provided
    if (!invoice.subtotal) {
      invoice.subtotal = invoice.items.reduce((sum, item) => sum + (item.total || 0), 0);
    }
    
    if (!invoice.grandTotal) {
      const serviceCharge = invoice.serviceCharge?.amount || 0;
      const vat = invoice.vat?.amount || 0;
      invoice.grandTotal = invoice.subtotal + serviceCharge + vat;
    }
    
    if (!invoice.netTotal) {
      invoice.netTotal = invoice.grandTotal - (invoice.specialDiscount || 0);
    }
    
    await invoice.save();
    
    console.log('✅ Invoice created successfully:', invoice._id);
    res.status(201).json(invoice);
    
  } catch (error) {
    console.error('❌ Create invoice error:', error);
    
    if (error.name === 'ValidationError') {
      const errors = Object.values(error.errors).map(err => err.message);
      return res.status(400).json({ 
        error: 'Validation failed',
        details: errors 
      });
    }
    
    if (error.code === 11000) {
      return res.status(400).json({ 
        error: 'Invoice number already exists' 
      });
    }
    
    res.status(400).json({ 
      error: 'Failed to create invoice',
      message: error.message 
    });
  }
});

// Update invoice - PROTECTED
router.put('/:id', authMiddleware, async (req, res) => {
  try {
    console.log('✏️ Updating invoice:', req.params.id);
    
    const invoice = await Invoice.findByIdAndUpdate(
      req.params.id,
      req.body,
      { 
        new: true,
        runValidators: true 
      }
    );
    
    if (!invoice) {
      return res.status(404).json({ error: 'Invoice not found' });
    }
    
    console.log('✅ Invoice updated successfully');
    res.json(invoice);
    
  } catch (error) {
    console.error('❌ Update invoice error:', error);
    
    if (error.name === 'ValidationError') {
      return res.status(400).json({ 
        error: 'Validation failed',
        details: Object.values(error.errors).map(err => err.message)
      });
    }
    
    res.status(400).json({ 
      error: 'Failed to update invoice',
      message: error.message 
    });
  }
});

// Delete invoice - PROTECTED
router.delete('/:id', authMiddleware, async (req, res) => {
  try {
    const invoice = await Invoice.findByIdAndDelete(req.params.id);
    if (!invoice) {
      return res.status(404).json({ error: 'Invoice not found' });
    }
    res.json({ message: 'Invoice deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;