const client = require('prom-client');
const express = require('express');

const metricExporter = require('./metrics');

const app = express();

// Initialize metrics
const registry = new client.Registry();
metricExporter(registry);

// Report Prometheus metrics on /metrics
app.get('/metrics', async (req, res, next) => {
  res.set('Content-Type', registry.contentType);
  res.end(registry.metrics());
  
  next();
});


// Run the server
app.listen(9200, '0.0.0.0', () => console.log('App started!'));
