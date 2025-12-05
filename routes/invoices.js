const express = require('express');
const authMiddleware = require('../middleware/auth');
const Invoice = require('../models/Invoice');
const router = express.Router();

// Apply auth middleware to all routes
router.use(authMiddleware);

// Get all invoices
router.get('/', async (req, res) => {
  try {
    const invoices = await Invoice.find().sort({ createdAt: -1 });
    res.json(invoices);
  } catch (error) {
    console.error('Get invoices error:', error);
    res.status(500).json({ 
      error: 'Failed to fetch invoices',
      details: error.message
    });
  }
});

// Get single invoice
router.get('/:id', async (req, res) => {
  try {
    const invoice = await Invoice.findById(req.params.id);
    if (!invoice) {
      return res.status(404).json({ 
        error: 'Invoice not found'
      });
    }
    res.json(invoice);
  } catch (error) {
    console.error('Get invoice error:', error);
    res.status(500).json({ 
      error: 'Failed to fetch invoice',
      details: error.message
    });
  }
});

// Create invoice
router.post('/', async (req, res) => {
  try {
    // Generate invoice number if not provided
    if (!req.body.invoiceNumber) {
      const date = new Date();
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const count = await Invoice.countDocuments({
        createdAt: {
          $gte: new Date(date.getFullYear(), date.getMonth(), 1),
          $lt: new Date(date.getFullYear(), date.getMonth() + 1, 1)
        }
      });
      req.body.invoiceNumber = `INV-${year}${month}-${String(count + 1).padStart(3, '0')}`;
    }
    
    const invoice = new Invoice(req.body);
    await invoice.save();
    
    res.status(201).json(invoice);
  } catch (error) {
    console.error('Create invoice error:', error);
    
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
    
    res.status(500).json({ 
      error: 'Failed to create invoice',
      details: error.message
    });
  }
});

// Update invoice
router.put('/:id', async (req, res) => {
  try {
    const invoice = await Invoice.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    );
    
    if (!invoice) {
      return res.status(404).json({ 
        error: 'Invoice not found'
      });
    }
    
    res.json(invoice);
  } catch (error) {
    console.error('Update invoice error:', error);
    
    if (error.name === 'ValidationError') {
      return res.status(400).json({ 
        error: 'Validation failed',
        details: Object.values(error.errors).map(err => err.message)
      });
    }
    
    res.status(500).json({ 
      error: 'Failed to update invoice',
      details: error.message
    });
  }
});

// Delete invoice
router.delete('/:id', async (req, res) => {
  try {
    const invoice = await Invoice.findByIdAndDelete(req.params.id);
    
    if (!invoice) {
      return res.status(404).json({ 
        error: 'Invoice not found'
      });
    }
    
    res.json({ 
      message: 'Invoice deleted successfully'
    });
  } catch (error) {
    console.error('Delete invoice error:', error);
    res.status(500).json({ 
      error: 'Failed to delete invoice',
      details: error.message
    });
  }
});

module.exports = router;