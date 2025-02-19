import * as amqplib from 'amqplib'

import express from 'express';
const app = express();


app.post('/', async (req, res) => {
    const amqpUrl = process.env.AMQP_URL
    const connection = await amqplib.connect(amqpUrl, 'heartbeat=60')
    const channel = await connection.createConfirmChannel()

    await channel.assertExchange("ex", 'fanout', { durable: true });
    await channel.assertQueue("task_queue", { durable: true });
    await channel.bindQueue("task_queue", "ex", '');
    await channel.assertQueue("task_queue2", { durable: true });
    await channel.bindQueue("task_queue2", "ex", '');
    await channel.assertQueue("task_queue3", { durable: true });
    await channel.bindQueue("task_queue3", "ex", '');
    await channel.assertQueue("task_queue4", { durable: true });
    await channel.bindQueue("task_queue4", "ex", '');


    const message = 'Hello RabbitMQ!';

    channel.publish("ex", ' ', Buffer.from(message), { persistent: true });

    await channel.waitForConfirms();
    await channel.close();
    await connection.close();


    res.json({
        "message": "added"
    })
});

app.listen(5002, () => {
    console.log('Server is running');
});