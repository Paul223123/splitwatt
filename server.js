const express = require('express');
const cors = require('cors');
const path = require('path');
require('dotenv').config();

const app = express();
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

const VULTR_API_KEY = process.env.VULTR_API_KEY;
const VULTR_BASE_URL = process.env.LLM_BASE_URL || 'https://api.vultrinference.com/v1';

// ── ESTIMATE USAGE FROM NATURAL LANGUAGE ──
app.post('/api/estimate', async (req, res) => {
  const { description, days } = req.body;
  if (!description) return res.status(400).json({ error: 'No description provided' });

  const prompt = `You are an electricity usage estimator. A person describes their daily appliance usage in a shared room. Estimate their total electricity consumption in kWh for the period.

Common appliance wattages for reference:
- Fan: 75W
- Phone charger: 10W
- Laptop: 65W
- LED bulb: 10W
- Iron: 1000W
- Electric kettle: 1500W
- Water heater/geyser: 2000W
- Mini fridge: 150W
- TV: 100W
- Gaming console: 300W
- Hair dryer: 1200W
- Electric cooker: 1500W

Person's description: "${description}"
Number of days: ${days || 30}

Calculate the estimated total kWh consumption. Reply ONLY with a JSON object in this exact format, nothing else:
{"estimated_kwh": <number>, "breakdown": "<one sentence explaining the main usage items you identified>", "confidence": "<low|medium|high>"}`;

  try {
    const response = await fetch(`${VULTR_BASE_URL}/chat/completions`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${VULTR_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: 'llama2-13b-chat-Q5_K_M',
        messages: [{ role: 'user', content: prompt }],
        max_tokens: 200,
        temperature: 0.1
      })
    });

    const data = await response.json();
    const text = data.choices?.[0]?.message?.content || '';
    const clean = text.replace(/```json|```/g, '').trim();
    const parsed = JSON.parse(clean);
    res.json(parsed);
  } catch (err) {
    console.error('Inference error:', err);
    res.status(500).json({ error: 'Could not estimate usage. Please try again.' });
  }
});

// ── INVESTIGATE MISSING UNITS ──
app.post('/api/investigate', async (req, res) => {
  const { description, days, loaded_kwh } = req.body;
  if (!description || !loaded_kwh) return res.status(400).json({ error: 'Missing required fields' });

  const prompt = `You are an electricity usage investigator. Someone loaded ${loaded_kwh} kWh of electricity. They describe their own usage over ${days || 30} days. Estimate how much kWh they personally used, then calculate the unaccounted electricity.

Common appliance wattages:
- Fan: 75W, Phone charger: 10W, Laptop: 65W, LED bulb: 10W
- Iron: 1000W, Kettle: 1500W, Water heater: 2000W, Mini fridge: 150W
- TV: 100W, Gaming console: 300W, Hair dryer: 1200W

Person's usage description: "${description}"
Days: ${days || 30}
Total loaded: ${loaded_kwh} kWh

Reply ONLY with a JSON object in this exact format, nothing else:
{"your_estimated_kwh": <number>, "unaccounted_kwh": <number>, "verdict": "<one clear sentence verdict: fair|suspicious|very suspicious>", "explanation": "<2 sentences explaining the finding>", "recommendation": "<one practical next step>"}`;

  try {
    const response = await fetch(`${VULTR_BASE_URL}/chat/completions`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${VULTR_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: 'llama2-13b-chat-Q5_K_M',
        messages: [{ role: 'user', content: prompt }],
        max_tokens: 300,
        temperature: 0.1
      })
    });

    const data = await response.json();
    const text = data.choices?.[0]?.message?.content || '';
    const clean = text.replace(/```json|```/g, '').trim();
    const parsed = JSON.parse(clean);
    // ensure unaccounted is calculated correctly
    parsed.unaccounted_kwh = Math.max(0, loaded_kwh - parsed.your_estimated_kwh);
    res.json(parsed);
  } catch (err) {
    console.error('Inference error:', err);
    res.status(500).json({ error: 'Investigation failed. Please try again.' });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`SplitWatt running on port ${PORT}`));
