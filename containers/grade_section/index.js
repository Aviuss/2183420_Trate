const express = require('express');
const app = express();
const pg = require('pg');
var randomstring = require("randomstring");
const { sha256 } = require('js-sha256');

app.use(express.json());

const pool = new pg.Pool({
    connectionString: process.env.DATABASE_URL,
});



app.get('/healthcheck', async (req, res) => {
    res.json("Auth is working");
});



app.post('/', async (req, res) => {
    /*if ("email" in req.body && "password" in req.body && req.body.email.lenght >= 3 && req.body.email.lenght >= 3) {
        res.status(400).json("Error: absent email or password or too short")
        return;
    }*/


    const query = {
        text: 'SELECT * FROM translations',
        values: [],
    };

    const client = await pool.connect();
    try {
        let results = await client.query(query);

        res.json(results)


    } catch (err) {
        console.log(err);
        res.json("error");
    } finally {
        client.release();
    }
});





app.listen(5010, () => {
    console.log('Server is running');
});