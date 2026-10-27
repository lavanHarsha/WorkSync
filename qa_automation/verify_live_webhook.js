const API_BASE = 'https://worksync-fobf.onrender.com/api';

async function run() {
  console.log('1. Logging in as sundayleftmebroken99@gmail.com...');
  const loginRes = await fetch(`${API_BASE}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'sundayleftmebroken99@gmail.com', password: '123456' }),
  }).then((r) => r.json());

  const token = loginRes.token;
  console.log('   Logged in! Token received.');

  // Create active webhook workflow
  console.log('2. Creating active webhook workflow in MongoDB...');
  const createRes = await fetch(`${API_BASE}/workflows`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify({
      name: 'Order Ingestion Live Alert',
      description: 'Public Webhook Trigger -> HTTP POST',
      enabled: true,
      trigger: {
        app: 'webhook',
        event: 'catch_hook',
        parameters: { eventName: 'order.created' },
      },
      conditions: [{ field: 'trigger.amount', operator: 'greater_than', value: '100' }],
      action: {
        app: 'webhook',
        action: 'send_request',
        parameters: {
          url: 'https://httpbin.org/post',
          method: 'POST',
          body: JSON.stringify({ order: '{{trigger.orderId}}', total: '{{trigger.amount}}' }),
        },
      },
    }),
  }).then((r) => r.json());

  const wf = createRes.workflow;
  const webhookId = wf.trigger.webhookId;
  const webhookSecret = wf.webhookSecret;
  console.log(`   Workflow Created: ${createRes.success}`);
  console.log(`   Workflow ID:     ${wf._id}`);
  console.log(`   Webhook ID:      ${webhookId}`);
  console.log(`   Webhook Secret:  ${webhookSecret ? webhookSecret.slice(0, 15) + '...' : 'none'}`);

  // Send external webhook POST with X-WorkSync-Secret
  const whUrl = `${API_BASE}/workflows/webhook/${webhookId}`;
  console.log(`3. Sending POST request to live webhook: ${whUrl}...`);
  const whRes = await fetch(whUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-WorkSync-Secret': webhookSecret,
    },
    body: JSON.stringify({ amount: 250, orderId: 'ORD-LIVE-EXEC-101' }),
  });
  const whJson = await whRes.json();
  console.log(`   Inbound HTTP Status: ${whRes.status}`);
  console.log('   Response Body:', JSON.stringify(whJson));

  // Test simulation: Pass condition (score 150 > 100)
  console.log('4. Testing Workflow Simulation (Condition Met: amount=150)...');
  const simPassRes = await fetch(`${API_BASE}/workflows/${wf._id}/test`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify({
      customTriggerData: { amount: 150, orderId: 'ORD-SIM-PASS' },
    }),
  }).then((r) => r.json());
  console.log(`   Simulation Pass Status: ${simPassRes.success}, Execution Status: ${simPassRes.execution?.status}, Duration: ${simPassRes.execution?.duration}ms`);

  // Test simulation: Fail condition (score 50 < 100)
  console.log('5. Testing Workflow Simulation (Condition Fails: amount=50)...');
  const simFailRes = await fetch(`${API_BASE}/workflows/${wf._id}/test`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify({
      customTriggerData: { amount: 50, orderId: 'ORD-SIM-FAIL' },
    }),
  }).then((r) => r.json());
  console.log(`   Simulation Fail Handled: ${simFailRes.success}, Execution Status: ${simFailRes.execution?.status}`);
  const condStep = simFailRes.execution?.logs?.find((l) => l.step === 'condition' && l.status === 'skipped');
  console.log(`   Condition Step: status=${condStep?.status}, title="${condStep?.title}", message="${condStep?.message}"`);

  // Inspect History
  console.log('6. Verifying Task History (/history)...');
  await new Promise((r) => setTimeout(r, 2000));
  const histRes = await fetch(`${API_BASE}/history?limit=10`, {
    headers: { Authorization: `Bearer ${token}` },
  }).then((r) => r.json());
  console.log(`   Total Executions in History: ${histRes.total}`);
  histRes.executions.slice(0, 3).forEach((ex, idx) => {
    console.log(`   [Run ${idx + 1}] ID: ${ex._id}, Status: ${ex.status}, Duration: ${ex.duration}ms, Logs: ${ex.logs?.length} steps`);
  });
}

run();
