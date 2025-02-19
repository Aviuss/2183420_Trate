import * as amqplib from 'amqplib'
const amqpUrl = process.env.AMQP_URL;

import pg from 'pg';
import randomstring from 'randomstring';

const pool = new pg.Pool({
    connectionString: process.env.DATABASE_URL,
});



async function processMessage(msg) {
    console.log(msg.content.toString(), 'Call email API here');
    const req = JSON.parse(msg.content.toString());

    const id = randomstring.generate(500);
    const query = {
        text: 'INSERT INTO translations(id, submituid, original_text, original_lang, translated_text, translated_lang, who_translated) VALUES($1, $2, $3, $4, $5, $6, $7)',
        values: [id, req.uid, req.original_text, req.original_lang, req.translated_text, req.translated_lang, "ai-processing-1"],
    };

    const client = await pool.connect();
    try {
        await client.query(query);
    } catch (err) {
        console.log(err);
        res.json("database error");
    } finally {
        client.release();
    }
}

(async () => {
    const connection = await amqplib.connect(amqpUrl, "heartbeat=60");
    const channel = await connection.createChannel();
    channel.prefetch(1);
    const exchange = "process-translation";
    const queue = 'ai-processing-1';

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


/*import OpenAI from "openai";

const openai = new OpenAI({
    apiKey: process.env.OPEN_AI_API_KEY
});


async function translate(phrase, original_language, target_language) {
    const completion = await openai.chat.completions.create({
        model: "gpt-4o",
        messages: [
            { role: "developer", content: "You translate sentences into JSON data." },
            {
                role: "user",
                content: `Translate sentences from ${original_language} to ${target_language}:
                
                ${phrase}`,
            },
        ],
        response_format: {
            type: "json_schema",
            json_schema: {
                name: "translation_schema",
                schema: {
                    type: "object",
                    properties: {
                        translation: {
                            description: "The translation of the sentences provided in input",
                            type: "string"
                        }
                    },
                    additionalProperties: false
                }
            }
        },
        store: true,
    });

    return completion.choices[0].message.content;
}

import express from 'express';
const app = express();


app.get('/', async (req, res) => {
    res.json(await translate(`Jake rushed to catch the last train, but just as he reached the platform, the doors slid shut. He sighed in frustration, only to hear a soft voice behind him say, "Looks like we’re both stuck here." Turning around, he met the warm smile of a stranger, and suddenly, missing the train didn’t seem so bad.`, "english", "czech"))
});

app.listen(5001, () => {
    console.log('Server is running');
});
*/