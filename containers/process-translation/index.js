import * as amqplib from 'amqplib';
import pg from 'pg';
import randomstring from 'randomstring';
import express from 'express';
const app = express();

app.use(express.json());


const pool = new pg.Pool({
    connectionString: process.env.DATABASE_URL,
});

function checkRequestBody(body) {
    if (Object.is(body)) { return false }
    let invalid = false;
    invalid = invalid || "uid" in body == false;
    invalid = invalid || "original_text" in body == false;
    invalid = invalid || "original_lang" in body == false;
    invalid = invalid || "translated_text" in body == false;
    invalid = invalid || "translated_lang" in body == false;
    return !invalid;
}

app.post('/', async (req, res) => {
    if (checkRequestBody(req.body) === false) {
        res.status(400).json({
            "error": "invalid request body",
        })
        return;
    }

    const id = randomstring.generate(500);
    const query = {
        text: 'INSERT INTO translations(id, submituid, original_text, original_lang, translated_text, translated_lang, who_translated) VALUES($1, $2, $3, $4, $5, $6, $7)',
        values: [id, req.body.uid, req.body.original_text, req.body.original_lang, req.body.translated_text, req.body.translated_lang, req.body.uid],
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


    const amqpUrl = process.env.AMQP_URL
    const connection = await amqplib.connect(amqpUrl, 'heartbeat=60')
    const channel = await connection.createConfirmChannel()
    await channel.assertExchange("process-translation", 'fanout', { durable: true });

    req.body.id = id;
    channel.publish("process-translation", ' ', Buffer.from(JSON.stringify(req.body)), { persistent: true });
    await channel.waitForConfirms();
    await channel.close();
    await connection.close();


    res.json({
        "message": "added to queue"
    })
});

app.listen(5002, () => {
    console.log('Server is running');
});