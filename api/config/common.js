const asyncLoop = require('node-async-loop');
const conn = require('./database');
const constant = require('./constant');
const middleware = require('../middleware/validate');

var common = {

    // Response
    response: function (req, res, code, message, data) {
        middleware.getMessage(req.lang, message, function (translated_message) {
            var response = {
                code: code,
                message: translated_message,
                data: data
            };

            if (code == 0) {
                middleware.encryption(response, function (response) {
                    res.status(401).send(response);
                });
            } else {
                middleware.encryption(response, function (response) {
                    res.status(200).send(response);
                });
            }
        });
    },

    // Check email already exists
    checkEmail: function (email, callback) {
        if (email != undefined) {
            var check_email = `SELECT id, login_type FROM tbl_user WHERE email = ? AND is_active = 1 AND is_delete = 0;`

            conn.query(check_email, email, function (error, email_check) {
                if (!error && email_check.length == 0) {
                    callback(true, null);
                } else {
                    callback(false, email_check[0]);
                }
            });
        } else {
            callback(true, null);
        }
    },

    // Check mobile number already exists
    checkMobile: function (mobile, callback) {
        if (mobile != undefined) {
            var check_mobile = `SELECT id, login_type FROM tbl_user WHERE mobile_number = ? AND is_active = 1 AND 
            is_delete = 0;`

            conn.query(check_mobile, mobile, function (error, mobile_check) {
                if (!error && mobile_check.length == 0) {
                    callback(true, null);
                } else {
                    callback(false, mobile_check[0]);
                }
            });
        } else {
            callback(true, null);
        }
    },

    // Check username already taken
    checkUsername: function (username, id, callback) {
        var check_username = `SELECT id FROM tbl_user WHERE id != ? AND username = ? AND is_active = 1 AND is_delete = 0;`

        conn.query(check_username, [id, username], function (error, username_check) {
            if (!error && username_check.length == 0) {
                callback(true);
            } else {
                callback(false);
            }
        });
    },

    // Get user details
    getUserDetails: function (id, callback) {
        var user_details = `SELECT * FROM tbl_user WHERE id = ?;
                            SELECT * FROM tbl_user_device WHERE user_id = ?;`

        conn.query(user_details, [id, id], function (error, user_details) {
            if (!error && user_details.length > 0) {
                user_details[0][0].profile_image = constant.IMAGE.concat(user_details[0][0].profile_image);
                user_details[0][0].cover_image = constant.IMAGE.concat(user_details[0][0].cover_image);

                var user_data = {
                    ...user_details[0][0],
                    device: user_details[1][0]
                };

                callback(user_data);
            } else {
                callback(null);
            }
        });
    },

    // Manage device details
    device_details: function (request, id, callback) {
        var device_data = {
            "user_id": id,
            "token": common.generateToken(),
            "device_type": request.device_type,
            "device_token": request.device_token,
            "uuid": request.uuid || null,
            "os_version": request.os_version,
            "device_name": request.device_name,
            "model_name": request.model_name,
            "ip": request.ip
        }

        var device_details = `SELECT * FROM tbl_user_device WHERE user_id = ? AND is_active = 1 AND is_delete = 0;`

        var condition = [device_data.user_id];

        conn.query(device_details, condition, function (error, deviceData) {
            if (!error && deviceData.length > 0) {
                var update_details = `UPDATE tbl_user_device SET ? WHERE id = ?;`
                var condition = [device_data, deviceData[0].id];

                conn.query(update_details, condition, function (error, device_details) {
                    if (!error) {
                        callback(true);
                    } else {
                        callback(false);
                    }
                });
            } else {
                if (!error && deviceData.length == 0) {
                    var insert_details = `INSERT INTO tbl_user_device SET ?;`
                    var condition = [device_data];

                    conn.query(insert_details, condition, function (error, device_details) {
                        if (!error) {
                            callback(true);
                        } else {
                            callback(false);
                        }
                    });
                } else {
                    callback(false);
                }
            }
        });
    },

    // Check social id already exists
    checkSocialID: function (socialId, callback) {
        var check_social = `SELECT id, login_type FROM tbl_user WHERE social_id = ? AND is_active = 1 AND is_delete = 0;`
        var socialID = [socialId];

        conn.query(check_social, socialID, function (error, social_check) {
            if (!error && social_check.length == 0) {
                callback(true, null);
            } else {
                callback(false, social_check[0]);
            }
        });
    },

    // Generate OTP
    generateOTP: function () {
        return Math.floor(1000 + Math.random() * 9000);
    },

    // Generate Token
    generateToken: function (length = 15) {
        var possible = `ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789`;
        var text = ``;

        for (var i = 0; i < length; i++) {
            text += possible.charAt(Math.floor(Math.random() * possible.length));
        }

        return text;
    },

    // Check step completed
    checkStep: function (emailphone, callback) {
        var is_email = middleware.validateEmail(emailphone);

        var field = is_email ? 'email' : 'mobile_number';

        var check = `SELECT id, step_completed, login_type FROM tbl_user WHERE ${field} = '${emailphone}';`

        conn.query(check, function (error, response) {
            if (!error && response.length > 0) {
                callback(response[0]);
            } else {
                if (!error) {
                    callback('false');
                } else {
                    callback(null);
                }
            }
        });
    },

    // Match current password
    matchPassword: function (password, id, callback) {
        var match_password = `SELECT id FROM tbl_user WHERE password = ? AND id = ?;`

        var condition = [password, id];

        conn.query(match_password, condition, function (error, password) {
            if (!error && password.length > 0) {
                callback(true);
            } else {
                callback(false);
            }
        });
    },

    // Get contact us info
    getContactUsInfo: function (id, callback) {
        var get_info = `SELECT * FROM tbl_contact WHERE id = ?;`

        var condition = [id];

        conn.query(get_info, condition, function (error, contact_info) {
            if (!error && contact_info.length > 0) {
                callback(contact_info[0]);
            } else {
                callback(null);
            }
        });
    },

    // Check user already reviewed the business
    checkReview: function (user_id, business_id, callback) {
        var check_review = `SELECT id FROM tbl_review WHERE user_id = ? AND business_id = ? AND is_active = 1 AND
                            is_delete = 0;`

        var condition = [user_id, business_id];

        conn.query(check_review, condition, function (error, review_check) {
            if (!error && review_check.length == 0) {
                callback(true);
            } else {
                callback(false);
            }
        });
    },

    // Get rating result
    getRatingResult: function (id, callback) {
        var get_rating = `SELECT * FROM tbl_review WHERE id = ?`

        var condition = [id];

        conn.query(get_rating, condition, function (error, rating) {
            if (!error && rating.length > 0) {
                callback(rating[0]);
            } else {
                callback(0);
            }
        });
    },

    // Get report data
    getReport: function (id, callback) {
        var report = `SELECT * FROM tbl_report_review WHERE id = ?`;

        conn.query(report, [id], function (error, result) {
            if (!error && result.length > 0) {
                callback(result[0]);
            } else {
                callback(null);
            }
        });
    },

    // Get review data
    getReview: function (id, callback) {
        var getData = `SELECT * FROM tbl_review WHERE id = '${id}';`

        conn.query(getData, function (error, result) {
            if (!error) {
                callback(result);
            } else {
                callback(null);
            }
        });
    },

    // Get business data
    getBusiness: function (id, callback) {
        var getData = `SELECT * FROM tbl_business WHERE id = '${id}';`

        conn.query(getData, function (error, result) {
            if (!error) {
                callback(result);
            } else {
                callback(null);
            }
        });
    }

}


module.exports = common;