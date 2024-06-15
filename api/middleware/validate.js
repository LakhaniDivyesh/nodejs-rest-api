const Validator = require('Validator');
const conn = require('../config/database');
var bypass = new Array('login', 'signup', 'verifyOTP', 'resendOTP', 'forget_password');
const { default: localizify } = require('localizify');
var en = require('../languages/en');
var hi = require('../languages/hi');
const { t } = require('localizify');
const cryptolib = require('cryptlib');
const shaKey = cryptolib.getHashSha256(process.env.KEY, 32);
const lodash = require('lodash');

var middleware = {

    // Check validation rules
    checkValidation: function (res, request, rules, messages) {
        const v = Validator.make(request, rules, messages);

        if (v.fails()) {
            const errors = v.getErrors();

            var error;

            for (var key in errors) {
                error = errors[key][0];
                break;
            }

            var response = {
                code: 0,
                message: error
            };

            middleware.encryption(response, function (response) {
                res.status(400).send(response);
            });

            return false;
        } else {
            return true;
        }
    },

    // Validate date
    validateDate: function (date) {
        var regex = /(\d{4})-(\d{2})-(\d{2})/
        return regex.test(date);
    },

    // Validate email
    validateEmail: function (email) {
        var regex = /^(([^<>()\[\]\\.,;:\s@"]+(\.[^<>()\[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/;
        return regex.test(email);
    },

    // Validate API-KEY
    validateApiKey: function (req, res, callback) {
        var apiKey = req.headers['api_key'] || '';

        if (apiKey != '') {
            try {
                var decKey = cryptolib.decrypt(apiKey, shaKey, process.env.IV);
                if (decKey != '' && decKey == process.env.API_KEY) {
                    callback();
                } else {
                    var response = {
                        code: '-1',
                        message: t('invalid_key')
                    };

                    middleware.encryption(response, function (response) {
                        res.status(401).send(response);
                    });
                }
            } catch (error) {
                var response = {
                    code: '-1',
                    message: t('invalid_key')
                };

                middleware.encryption(response, function (response) {
                    res.status(401).send(response);
                });
            }
        } else {
            var response = {
                code: '-1',
                message: t('invalid_key')
            };

            middleware.encryption(response, function (response) {
                res.status(401).send(response);
            });
        }
    },

    // Validate Header Token
    validateHeaderToken: function (req, res, callback) {
        var headerToken = req.headers['token'] || '';

        var path_data = req.path.split('/');

        if (bypass.indexOf(path_data[4]) === -1) {
            if (headerToken != '') {
                var decToken = cryptolib.decrypt(headerToken, shaKey, process.env.IV);
                if (decToken != '') {
                    try {
                        var findToken = `SELECT * FROM tbl_user_device WHERE token = ?`

                        conn.query(findToken, [decToken], function (error, token) {
                            if (!error && token.length > 0) {
                                req.user_id = token[0].user_id;
                                callback();
                            } else {
                                var response = {
                                    code: '-1',
                                    message: t('invalid_token')
                                };

                                middleware.encryption(response, function (response) {
                                    res.status(401).send(response);
                                });
                            }
                        });
                    } catch (error) {
                        var response = {
                            code: '-1',
                            message: t('invalid_token')
                        };

                        middleware.encryption(response, function (response) {
                            res.status(401).send(response);
                        });
                    }
                } else {
                    var response = {
                        code: '-1',
                        message: t('invalid_token')
                    };

                    middleware.encryption(response, function (response) {
                        res.status(401).send(response);
                    });
                }
            } else {
                var response = {
                    code: '-1',
                    message: t('invalid_token')
                };

                middleware.encryption(response, function (response) {
                    res.status(401).send(response);
                });
            }
        } else {
            callback();
        }
    },

    // Extracting language
    extractHeaderLanguage: function (req, res, callback) {
        var header_lang = (req.headers['accept_language'] != undefined && req.headers['accept_language'] != '') ? req.headers['accept_language'] : 'en';
        req.lang = header_lang;
        req.language = (header_lang == 'en') ? en : hi;

        localizify
            .add('en', en)
            .add('hi', hi)
            .setLocale(header_lang);

        callback();
    },

    // Convert language
    getMessage: function (language, message, callback) {
        callback(t(message.keyword, message.content));
    },

    // Decrypt req.body
    decryption: function (req, res, callback) {
        if (!lodash.isEmpty(req.body) && typeof req.body != undefined) {
            try {
                req.body = JSON.parse(cryptolib.decrypt(req.body, shaKey, process.env.IV));
                callback();
            } catch (error) {
                var response = {
                    code: '0',
                    message: t('decrypt_error')
                };
                middleware.encryption(response, function (response) {
                    res.status(200).send(response);
                });
            }
        } else {
            callback();
        }
    },

    // Encrypt the content
    encryption: function (data, callback) {
        var encryptedData = cryptolib.encrypt(JSON.stringify(data), shaKey, process.env.IV);
        callback(encryptedData);
    }

}


module.exports = middleware;