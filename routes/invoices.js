const express = require('express');
const auth = require('../middleware/auth');
const Invoice = require('../models/Invoice');
const router = express.Router();

// Get all invoices
router.get('/', auth, async (req, res) => {
  try {
    const invoices = await Invoice.find().sort({ date: -1 });
    res.json(invoices);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get single invoice
router.get('/:id', auth, async (req, res) => {
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

// Create invoice
router.post('/', auth, async (req, res) => {
  try {
    console.log('Creating invoice with data:', req.body);
    
    const invoice = new Invoice(req.body);
    await invoice.save();
    
    console.log('Invoice created successfully:', invoice._id);
    res.status(201).json(invoice);
  } catch (error) {
    console.error('Create invoice error:', error);
    res.status(400).json({ error: error.message });
  }
});

// Update invoice
router.put('/:id', auth, async (req, res) => {
  try {
    console.log('Updating invoice:', req.params.id);
    console.log('Update data:', req.body);

    const invoice = await Invoice.findByIdAndUpdate(
      req.params.id,
      { $set: req.body },
      { 
        new: true,
        runValidators: true,
        context: 'query'
      }
    );
    
    if (!invoice) {
      return res.status(404).json({ error: 'Invoice not found' });
    }
    
    console.log('Invoice updated successfully:', invoice._id);
    res.json(invoice);
  } catch (error) {
    console.error('Update invoice error:', error);
    
    if (error.name === 'ValidationError') {
      const errors = Object.values(error.errors).map(err => err.message);
      return res.status(400).json({ error: errors.join(', ') });
    }
    
    if (error.code === 11000) {
      return res.status(400).json({ error: 'Invoice number already exists' });
    }
    
    res.status(400).json({ error: error.message });
  }
});

// Delete invoice
router.delete('/:id', auth, async (req, res) => {
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