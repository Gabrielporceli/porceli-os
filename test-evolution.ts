const evolutionUrl = 'https://api.gabrielporceli.com.br';
const evolutionApiKey = '36C25CBB501B-4ED2-8982-74BF3DAEC624';
const evolutionInstance = 'Agencia';
const target_number = '556581099630';

console.log(`Testing Evolution API for instance: ${evolutionInstance}`);

try {
  const response = await fetch(`${evolutionUrl}/message/sendText/${evolutionInstance}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'apikey': evolutionApiKey
    },
    body: JSON.stringify({
      number: target_number,
      text: 'Teste via script local Deno',
      delay: 100
    })
  });

  const result = await response.json();
  console.log('Status:', response.status);
  console.log('Result:', JSON.stringify(result, null, 2));

} catch (error) {
  console.error('Error:', error);
}
