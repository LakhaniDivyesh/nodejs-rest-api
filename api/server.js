require('dotenv').config();

const express = require('express');
const conn = require('./config/database');

let app = express();

app.use(express.text());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

const api_document = require('./modules/v1/api_document/index');
app.use('/v1/api_document', api_document);

const auth = require('./modules/v1/auth/route');
const home = require('./modules/v1/home/route');


app.use('/', require('./middleware/validate').extractHeaderLanguage);
app.use('/', require('./middleware/validate').validateApiKey);
app.use('/', require('./middleware/validate').validateHeaderToken);
app.use('/', require('./middleware/validate').decryption);

app.use('/api/v1/auth', auth);
app.use('/api/v1/home', home);



try {
    app.listen(process.env.PORT);
    console.log('server : ' + process.env.PORT);
} catch (error) {
    console.log('failed' + error);
}