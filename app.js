// State
let currentModel = 'claude';

// Chip toggle
document.querySelectorAll('.chip').forEach(chip => {
  chip.addEventListener('click', () => chip.classList.toggle('selected'));
});

// Model switcher
function switchModel(model) {
  currentModel = model;
  document.querySelectorAll('.model-btn').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.model === model);
  });
  document.getElementById('claude-key-field').style.display = model === 'claude' ? 'block' : 'none';
  document.getElementById('openai-key-field').style.display = model === 'openai' ? 'block' : 'none';
}

function getFormats() {
  return [...document.querySelectorAll('.chip.selected')]
    .map(c => c.querySelector('input').value);
}

function setLoading(on) {
  document.getElementById('gen-btn').disabled = on;
  document.getElementById('spinner').style.display = on ? 'block' : 'none';
  document.getElementById('btn-label').textContent = on ? 'Generating...' : 'Generate 7 Lead Magnet Ideas';
}

function showError(msg) {
  const el = document.getElementById('error-box');
  el.textContent = msg;
  el.style.display = 'block';
}

function hideError() {
  document.getElementById('error-box').style.display = 'none';
}

async function generate() {
  const apiKey = currentModel === 'claude'
    ? document.getElementById('claude-api-key').value.trim()
    : document.getElementById('openai-api-key').value.trim();

  if (!apiKey) {
    showError(`Please enter your ${currentModel === 'claude' ? 'Anthropic' : 'OpenAI'} API key.`);
    return;
  }

  const niche   = document.getElementById('niche').value.trim();
  const icp     = document.getElementById('icp').value.trim();
  const pain    = document.getElementById('pain').value.trim();
  const outcome = document.getElementById('outcome').value.trim();
  const funnel  = document.getElementById('funnel').value;
  const formats = getFormats();

  if (!niche || !icp) { showError('Please fill in at least Niche and Target Audience.'); return; }

  hideError();
  setLoading(true);

  const funnelMap = {
    top: 'top of funnel (cold — not yet aware of your solution, focus on problem awareness and quick wins)',
    mid: 'middle of funnel (aware of the problem, actively looking for solutions)',
    bottom: 'bottom of funnel (evaluating options, close to a decision)'
  };

  const formatNote = formats.length > 0
    ? `Preferred formats to prioritize: ${formats.join(', ')}. You may suggest others if clearly a better fit.`
    : 'Use a variety — mix templates, swipe files, email courses, calculators with checklists and guides.';

  const systemPrompt = `You are an expert growth marketer and funnel strategist who specializes in creating lead magnets that actually convert. You understand the psychology of what makes someone give up their email address, and you know the difference between a lead magnet that sits on a landing page and one that people actually share and talk about.

Your job is to generate lead magnet ideas that are:
- Specific enough to feel like they were made for this exact person
- Immediately actionable — the reader gets a win fast
- Titled with a clear, specific promise (numbers and specificity outperform vague titles)
- Matched to the funnel stage so they attract the right buyer, not just anyone

Return ONLY valid JSON. No markdown, no explanation, no backticks. Just the raw JSON object.`;

  const userPrompt = `Generate exactly 7 lead magnet ideas for the following:

Niche/Industry: ${niche}
Target Audience (ICP): ${icp}
Main Pain Point: ${pain || 'Not specified'}
Desired Outcome: ${outcome || 'Not specified'}
Funnel Stage: ${funnelMap[funnel]}
${formatNote}

Return this exact JSON structure:
{
  "ideas": [
    {
      "title": "Exact title — specific, punchy, benefit-driven",
      "format": "Format type (Checklist, PDF Guide, Email Course, Template, Swipe File, Calculator, Quiz, Video Training)",
      "hook": "1-2 sentence delivery hook — the ONE promise that makes someone give their email. Write like ad copy.",
      "why_it_converts": "1 sentence on the psychological reason this works for this audience at this funnel stage.",
      "implementation_note": "1 quick sentence on how to actually deliver this and what tool makes it easy to create"
    }
  ]
}`;

  try {
    let data;

    if (currentModel === 'claude') {
      const res = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': apiKey,
          'anthropic-version': '2023-06-01',
          'anthropic-dangerous-client-side-api-key-flag': 'true'
        },
        body: JSON.stringify({
          model: 'claude-sonnet-4-5',
          max_tokens: 2800,
          system: systemPrompt,
          messages: [{ role: 'user', content: userPrompt }]
        })
      });

      data = await res.json();
      if (!res.ok) throw new Error(data.error?.message || `Error ${res.status}`);

      const raw = data.content[0].text.trim();
      const clean = raw.replace(/^```json|^```|```$/gm, '').trim();
      const parsed = JSON.parse(clean);
      renderResults(parsed.ideas);

    } else {
      const res = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`
        },
        body: JSON.stringify({
          model: 'gpt-4o',
          max_tokens: 2800,
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: userPrompt }
          ]
        })
      });

      data = await res.json();
      if (!res.ok) throw new Error(data.error?.message || `Error ${res.status}`);

      const raw = data.choices[0].message.content.trim();
      const clean = raw.replace(/^```json|^```|```$/gm, '').trim();
      const parsed = JSON.parse(clean);
      renderResults(parsed.ideas);
    }

  } catch (e) {
    showError('Error: ' + e.message);
  } finally {
    setLoading(false);
  }
}

function renderResults(ideas) {
  const grid = document.getElementById('ideas-grid');
  const section = document.getElementById('results');
  grid.innerHTML = '';

  ideas.forEach((idea, i) => {
    const card = document.createElement('div');
    card.className = 'idea-card';
    card.style.animationDelay = `${i * 0.07}s`;
    card.innerHTML = `
      <div class="idea-actions">
        <button class="btn-icon" title="Copy" onclick="copyCard(this, ${i})">⎘</button>
      </div>
      <div class="idea-num">IDEA ${String(i+1).padStart(2,'0')}</div>
      <div class="idea-title">${escHtml(idea.title)}</div>
      <div class="idea-format">${escHtml(idea.format)}</div>
      <div class="idea-hook">${escHtml(idea.hook)}</div>
      <div class="idea-why"><strong>Why it converts:</strong> ${escHtml(idea.why_it_converts)}<br/><strong>Build it:</strong> ${escHtml(idea.implementation_note)}</div>
    `;
    grid.appendChild(card);
  });

  section.style.display = 'block';
  section.scrollIntoView({ behavior: 'smooth', block: 'start' });
  window._ideas = ideas;
}

function escHtml(str) {
  return String(str || '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

function copyCard(btn, i) {
  const idea = window._ideas[i];
  const text = `${idea.title}\nFormat: ${idea.format}\n\n${idea.hook}\n\nWhy it converts: ${idea.why_it_converts}\nBuild it: ${idea.implementation_note}`;
  navigator.clipboard.writeText(text).then(() => {
    btn.textContent = '✓';
    setTimeout(() => btn.textContent = '⎘', 1500);
  });
}

function copyAll() {
  if (!window._ideas) return;
  const text = window._ideas.map((idea, i) =>
    `--- IDEA ${i+1} ---\n${idea.title}\nFormat: ${idea.format}\n\n${idea.hook}\n\nWhy it converts: ${idea.why_it_converts}\nBuild it: ${idea.implementation_note}`
  ).join('\n\n');
  navigator.clipboard.writeText(text).then(() => {
    const btn = document.querySelector('.btn-copy-all');
    btn.textContent = '✓ Copied';
    setTimeout(() => btn.textContent = 'Copy All', 2000);
  });
}