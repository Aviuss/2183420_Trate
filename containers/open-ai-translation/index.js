import * as amqplib from 'amqplib'
const amqpUrl = process.env.AMQP_URL;

import pg from 'pg';

const pool = new pg.Pool({
    connectionString: process.env.DATABASE_URL,
});

import OpenAI from "openai";

const openai = new OpenAI({
    apiKey: process.env.OPEN_AI_API_KEY
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
        values: [req.id, req.uid, req.original_text, req.original_lang, translation, req.translated_lang, "gpt-4o"],
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


(async () => {
    const connection = await amqplib.connect(amqpUrl, "heartbeat=60");
    const channel = await connection.createChannel();
    channel.prefetch(1);
    const exchange = "process-translation";
    const queue = 'gpt-4o';

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



async function translate(phrase, original_language, target_language) {
    const completion = await openai.chat.completions.create({
        model: "gpt-4o",
        messages: [{ role: "developer", content: `You translate ${original_language} sentence to language ${target_language} in JSON format.` },
        {
            role: "user",
            content: `Translate:
                ${phrase}`,
        },],
        response_format: {
            type: "json_schema",
            json_schema: {
                name: "translation_schema",
                schema: {
                    type: "object",
                    properties: {
                        translation: {
                            description: "The translation of the sentences in language " + target_language,
                            type: "string"
                        }
                    },
                    additionalProperties: false
                }
            }
        }
    });
    return JSON.parse(completion.choices[0].message.content)?.translation || "";
}
