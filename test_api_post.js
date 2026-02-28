import fetch from 'node-fetch';

async function test() {
    const result = await fetch('http://localhost:3000/api/whatsapp/send-notification', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            registrationId: 'c90a16b9-4a19-4118-9e5f-53945e3a67ad', // Example ID from previous test
            status: 'rejected'
        })
    });
    const text = await result.text();
    console.log(result.status, text);
}
test();
