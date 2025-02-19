import * as amqplib from 'amqplib'
const amqpUrl = process.env.AMQP_URL;

import pg from 'pg';

import { z } from 'zod';
import { zodToJsonSchema } from 'zod-to-json-schema';

const TranslationObj = z.object({
    translated: z.string(),
});

const pool = new pg.Pool({
    connectionString: process.env.DATABASE_URL,
});


async function processMessage(msg) {
    const req = JSON.parse(msg.content.toString());
    let translation = await translate(req.original_text, req.original_lang, req.translated_lang);
    if (translation.length < 3) {
        console.error("coś poszło nie tak po stronie open-ai");
        return;
    }
    console.log(translation)

    const query = {
        text: 'INSERT INTO translations(id, submituid, original_text, original_lang, translated_text, translated_lang, who_translated) VALUES($1, $2, $3, $4, $5, $6, $7)',
        values: [req.id, req.uid, req.original_text, req.original_lang, translation, req.translated_lang, "llama3.2:1b"],
    };

    const client = await pool.connect();
    try {
        await client.query(query);
    } catch (err) {
        console.log(err);
        console.error("database error");
    } finally {
        client.release();
    }
}

const ollama = new Ollama({ host: 'http://ollama:11434' })

console.log('Pulling model...');
await ollama.pull({ model: 'llama3.2:1b' });
console.log('Model pulled successfully!');



import { Ollama } from 'ollama'

async function translate(phrase, original_language, target_language) {
    const response = await ollama.chat({
        model: 'llama3.2:1b',
        messages: [
            {
                role: "user",
                content: `Translate ${original_language} sentence to language ${target_language}:
                
                "${phrase}"`,
            },],
        format: zodToJsonSchema(TranslationObj),
    })
    console.log(response.message.content)
    const translationObj = TranslationObj.parse(JSON.parse(response.message.content));
    console.log(translationObj);
    return translationObj?.translated || "";
}



(async () => {
    const connection = await amqplib.connect(amqpUrl, "heartbeat=60");
    const channel = await connection.createChannel();
    channel.prefetch(1);
    const exchange = "process-translation";
    const queue = 'llama3.2:1b';

    await channel.assertExchange(exchange, 'fanout', { durable: true });
    await channel.assertQueue(queue, { durable: true });
    await channel.bindQueue(queue, exchange, '');

    process.once('SIGINT', async () => {
        await channel.close();
        await connection.close();
        process.exit(0);
    });

    await channel.consume(queue, async (msg) => {
        console.log('processing messages');
        await processMessage(msg);
        channel.ack(msg);
    },
        {
            noAck: false,
        });
    console.log(" [*] Waiting for messages. To exit press CTRL+C");
})();

