const express = require('express');
const app = express();
const pg = require('pg');
var randomstring = require("randomstring");
const { sha256 } = require('js-sha256');
const cors = require('cors');

app.use(cors({
    origin: '*',
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE',
    allowedHeaders: '*',
}));

app.use(express.json());

const pool = new pg.Pool({
    connectionString: process.env.DATABASE_URL,
});


app.get('/healthcheck', async (req, res) => {
    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');
    res.setHeader('Surrogate-Control', 'no-store');
    res.json("Auth is working");
});



app.post('/register', async (req, res) => {
    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');
    res.setHeader('Surrogate-Control', 'no-store');
    if ("email" in req.body && "password" in req.body && req.body.email.lenght >= 3 && req.body.email.lenght >= 3) {
        res.status(400).json({ error: "Error: absent email or password or too short" })
        return;
    }

    let salt = randomstring.generate(100);
    let hash = sha256(req.body.password + salt);

    const uid = randomstring.generate(100);
    const query = {
        text: 'INSERT INTO user_credentials(email, hash_password, salt, uid) VALUES($1, $2, $3, $4)',
        values: [req.body.email, hash, salt, uid],
    };

    const client = await pool.connect();
    try {
        await client.query(query);

        let authorization_token = randomstring.generate(300);
        try {
            await client.query({
                text: 'INSERT INTO authorization_tokens(uid, authorization_token) VALUES($1, $2)',
                values: [uid, authorization_token],
            });

            res.json({
                "uid": uid,
                "authorization_token": authorization_token
            });
        } catch (err) {
            console.log(err);
            res.status(400).json({ error: err });
        }



    } catch (err) {
        console.log(err);
        res.status(400).json({ error: err });
    } finally {
        client.release();
    }
});

app.post('/login', async (req, res) => {
    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');
    res.setHeader('Surrogate-Control', 'no-store');
    if ("email" in req.body && "password" in req.body && req.body.email.lenght >= 3 && req.body.email.lenght >= 3) {
        res.status(400).json({ error: "Error: absent email or password or too short" })
        return;
    }


    const query = {
        text: 'SELECT * FROM user_credentials WHERE email=$1',
        values: [req.body.email],
    };

    const client = await pool.connect();
    try {
        let result = await client.query(query);
        result = result.rows[0];
        if (!result) {
            res.json({
                "valid_credentials": false,
                "uid": "",
                "authorization_token": "",
            });
        } else {

            let hash = sha256(req.body.password + result.salt);

            if (hash !== result.hash_password) {
                res.json({
                    "valid_credentials": hash === result.hash_password,
                    "uid": "",
                    "authorization_token": "",
                });
            } else {
                let authorization_token = randomstring.generate(300);
                const query = {
                    text: 'INSERT INTO authorization_tokens(uid, authorization_token) VALUES($1, $2)',
                    values: [result.uid, authorization_token],
                };
                try {
                    await client.query(query);

                    res.json({
                        "valid_credentials": hash === result.hash_password,
                        "uid": result.uid,
                        "authorization_token": authorization_token,
                    });
                } catch (err) {
                    console.log(err);
                    res.status(400).json({ error: err });
                }

            }

        }

    } catch (err) {
        console.log(err);
        res.status(400).json({ error: err });
    } finally {
        client.release();
    }
});

app.post("/uid/valid", async (req, res) => {
    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');
    res.setHeader('Surrogate-Control', 'no-store');
    if ("uid" in req.body && "authorization_token" in req.body && req.body.uid.lenght >= 3 && req.body.authorization_token.lenght >= 3) {
        res.status(400).json("Error: absent values")
        return;
    }
    console.log(req.body, req.body.uid)

    const query = {
        text: 'SELECT * FROM authorization_tokens WHERE uid=$1 AND authorization_token=$2',
        values: [req.body.uid, req.body.authorization_token],
    };

    const client = await pool.connect();
    try {
        let result = await client.query(query);
        result = result.rows[0];
        if (result) {
            res.json({
                "valid": true,
            })
        } else {
            res.json({
                "valid": false,
            })
        }


    } catch (err) {
        console.log(err);
        res.status(400).json({ error: err });
    } finally {
        client.release();
    }

})






app.listen(3000, () => {
    console.log('Server is running');
});