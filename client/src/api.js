export async function fetchChatReply({ topic, history, message, model, profile, subtopic, material }) {
  const res = await fetch('/api/chat', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ topic, history, message, model, profile, subtopic, material }),
  });
  if (!res.ok) throw new Error('chat request failed');
  const data = await res.json();
  return data.reply;
}

export async function fetchQuiz({ topic, model, profile, subtopic, material }) {
  const res = await fetch('/api/quiz', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ topic, model, profile, subtopic, material }),
  });
  if (!res.ok) throw new Error('quiz request failed');
  return res.json();
}

export async function fetchDegreeSuggestions({ university, level }) {
  const res = await fetch('/api/degrees', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ university, level }),
  });
  if (!res.ok) throw new Error('degree suggestions request failed');
  const data = await res.json();
  return data.degrees;
}
