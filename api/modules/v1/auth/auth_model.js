const conn = require('../../../config/database');
const common = require('../../../config/common');
const constant = require('../../../config/constant');
const middleware = require('../../../middleware/validate');
const md5 = require('md5');
const { default: localizify } = require('localizify');
const { t } = require('localizify');

var auth = {

    // Login
    login: function (request, callback) {
        var is_email = middleware.validateEmail(request.emailphone);

        var field = is_email ? 'email' : 'mobile_number';

        if (request.login_type == 'S' || request.login_type == '' || request.login_type == undefined) {
            var login = `SELECT * FROM tbl_user WHERE ${field} = ? AND password = ? AND login_type = 'S' 
                            AND is_active = 1 AND is_delete = 0;`

            var condition = [request.emailphone, md5(request.password)];
        } else {
            var login = `SELECT * FROM tbl_user WHERE social_id = ? AND login_type = ? AND is_active = 1 
                            AND is_delete = 0;`

            var condition = [request.social_id, request.login_type];
        }

        conn.query(login, condition, function (error, userinfo) {
            if (error) {
                callback('0', { keyword: 'error', content: { error: 'login' } }, error);
            } else {
                if (userinfo.length > 0) {
                    var user = userinfo[0];

                    if (user.step_completed == 3) {
                        common.device_details(request, user.id, function (response) {
                            if (response == true) {
                                common.getUserDetails(user.id, function (response) {
                                    callback('1', { keyword: 'login_success', content: '' }, response);
                                });
                            } else {
                                callback('0', { keyword: 'error', content: { error: 'login' } }, {});
                            }
                        });
                    } else {
                        if (user.step_completed == 2) {
                            common.device_details(request, user.id, function (response) {
                                if (response == true) {
                                    common.getUserDetails(user.id, function (response) {
                                        callback('5', { keyword: 'personal_info_pending', content: '' }, response);
                                    });
                                } else {
                                    callback('0', { keyword: 'error', content: { error: 'login' } }, {});
                                }
                            });
                        } else {
                            common.device_details(request, user.id, function (response) {
                                if (response == true) {
                                    common.getUserDetails(user.id, function (response) {
                                        var otp = common.generateOTP();
                                        var checkOTP = `SELECT * FROM tbl_otp WHERE field = ?;`
                                        conn.query(checkOTP, [request.emailphone], function (error, otpCheck) {
                                            if (!error && otpCheck.length > 0) {
                                                var id = otpCheck[0].id;
                                                var updateOTP = `UPDATE tbl_otp SET otp = ${otp}, type = ${field}, is_verified = 0 WHERE id = ${id};`
                                                conn.query(updateOTP, function (error, otpUpdate) {
                                                    if (!error && otpUpdate.affectedRows > 0) {
                                                        callback('1', { keyword: 'account_not_verified', content: '' }, response);
                                                    } else {
                                                        callback('4', { keyword: 'account_not_verified_otp_failed', content: '' }, response);
                                                    }
                                                });
                                            } else if (!error && otpCheck.length == 0) {
                                                var otpData = {
                                                    'type': field,
                                                    'field': request.emailphone,
                                                    'otp': otp
                                                }
                                                var sendOTP = `INSERT INTO tbl_otp SET ?;`
                                                conn.query(sendOTP, [otpData], function (error, otpSend) {
                                                    if (!error) {
                                                        callback('1', { keyword: 'account_not_verified', content: '' }, response);
                                                    } else {
                                                        callback('4', { keyword: 'account_not_verified_otp_failed', content: '' }, response);
                                                    }
                                                });
                                            }
                                        });
                                    });
                                } else {
                                    callback('0', { keyword: 'error', content: { error: 'login' } }, {});
                                }
                            });
                        }
                    }
                } else {
                    callback('0', { keyword: 'invalid_credentials', content: '' }, userinfo);
                }
            }
        });
    },

    // Signup
    signup: function (request, callback) {
        var register = `INSERT INTO tbl_user SET ?;`
        var otpSend = `INSERT INTO tbl_otp SET ?;`

        var verification = `0`;
        var step = `1`;
        var otp = common.generateOTP();

        if (request.login_type != 'S' && request.login_type != '' && request.login_type != undefined) {
            verification = `1`;
            step = `2`;
            otp = null;
        }

        var queryData = {
            "social_id": request.social_id || null,
            "country_code": request.country_code || null,
            "mobile_number": request.mobile_number || null,
            "email": request.email || null,
            "password": (request.password != undefined && request.password != '') ? md5(request.password) : null,
            "profile_image": "default.jpg",
            "cover_image": "default.jpg",
            "login_type": request.login_type || 'S',
            "is_verified": verification,
            "step_completed": step
        }

        var otpData = {
            type: 'email',
            field: request.email,
            otp: otp
        }

        var condition = [queryData];
        var conditionOTP = [otpData];

        if (request.login_type != 'S' && request.login_type != undefined && request.login_type != '') {
            common.checkSocialID(request.social_id, function (response, data) {
                if (response == false) {
                    callback('0', { keyword: 'social_registered', content: '' }, {});
                } else {
                    common.checkEmail(request.email, function (response, data) {
                        if (response == false) {
                            callback('0', { keyword: 'email_exists', content: '' }, {});
                        } else {
                            common.checkMobile(request.mobile_number, function (response, data) {
                                if (response == false) {
                                    callback('0', { keyword: 'mobile_exists', content: '' }, {});
                                } else {
                                    conn.query(register, condition, function (error, userinfo) {
                                        if (error || userinfo.affectedRows == 0) {
                                            callback('0', { keyword: 'error', content: { error: 'signup' } }, error);
                                        } else {
                                            common.device_details(request, userinfo.insertId, function (response) {
                                                if (response == true) {
                                                    common.getUserDetails(userinfo.insertId, function (response) {
                                                        callback('5', { keyword: 'signup_success', content: '' }, response);
                                                    });
                                                } else {
                                                    callback('5', { keyword: 'signup_success_device_failed', content: '' }, {});
                                                }
                                            });
                                        }
                                    });
                                }
                            });
                        }
                    });
                }
            });
        } else {
            common.checkEmail(request.email, function (response, data) {
                if (response == false) {
                    callback('0', { keyword: 'email_exists', content: '' }, {});
                } else {
                    common.checkMobile(request.mobile_number, function (response, data) {
                        if (response == false) {
                            callback('0', { keyword: 'mobile_exists', content: '' }, {});
                        } else {
                            conn.query(otpSend, conditionOTP, function (error, userinfo) {
                                if (error) {
                                    callback('0', { keyword: 'error', content: { error: 'sending otp' } }, error);
                                } else {
                                    conn.query(register, condition, function (error, userinfo) {
                                        if (error || userinfo.affectedRows == 0) {
                                            callback('0', { keyword: 'error', content: { error: 'signup' } }, error);
                                        } else {
                                            common.getUserDetails(userinfo.insertId, function (response) {
                                                callback('4', { keyword: 'signup_success', content: '' }, response);
                                            });
                                        }
                                    });
                                }
                            });
                        }
                    });
                }
            });
        }
    },

    // OTP Verification
    verifyOTP: function (request, callback) {
        common.checkStep(request.emailphone, function (response) {
            if (response == 'false') {
                callback('0', { keyword: 'invalid_email_mobile', content: '' }, {});
            } else if (response == null) {
                callback('0', { keyword: 'error', content: { error: 'verifying OTP' } }, {});
            } else {
                var step = response.step_completed;
                var id = response.id;
                var login_type = response.login_type;

                if (step == 1) {
                    step = 2;
                }

                if (login_type == 'S') {
                    var is_email = middleware.validateEmail(request.emailphone);

                    var field = is_email ? 'email' : 'mobile_number';

                    var otp_verify = `UPDATE tbl_otp SET is_verified = 1, otp = null WHERE field = ? AND otp = ?;`
                    var conditionOTP = [request.emailphone, request.otp];

                    var otp_verified = `UPDATE tbl_user SET is_verified = 1, step_completed = ${step}
                                    WHERE ${field} = ? AND login_type = 'S';`

                    var condition = [request.emailphone];

                    conn.query(otp_verify, conditionOTP, function (error, verification) {
                        if (error) {
                            callback('0', { keyword: 'error', content: { error: 'verifying OTP' } }, {});
                        } else {
                            if (verification.affectedRows > 0) {
                                conn.query(otp_verified, condition, function (error, verification) {
                                    if (error) {
                                        callback('0', { keyword: 'error', content: { error: 'verifying OTP' } }, {});
                                    } else {
                                        if (verification.affectedRows > 0) {
                                            common.device_details(request, id, function (response) {
                                                if (response == true) {
                                                    common.getUserDetails(id, function (response) {
                                                        callback('1', { keyword: 'otp_success', content: '' }, response);
                                                    });
                                                } else {
                                                    callback('1', { keyword: 'otp_success_device_failed', content: '' }, {});
                                                }
                                            });
                                        } else {
                                            callback('0', { keyword: 'error', content: { error: 'verifying otp' } }, {});
                                        }
                                    }
                                });
                            } else {
                                callback('0', { keyword: 'invalid_otp', content: '' }, {});
                            }
                        }
                    });
                } else {
                    callback('0', { keyword: 'social_registration', content: '' }, {});
                }
            }
        });
    },

    // Resend OTP
    resendOTP: function (request, callback) {
        var is_email = middleware.validateEmail(request.emailphone);

        var field = is_email ? 'email' : 'mobile_number';

        if (field == 'email') {
            common.checkEmail(request.emailphone, function (response, data) {
                if (response == true) {
                    callback('0', { keyword: 'invalid_email', content: '' }, {});
                } else {
                    var newOTP = common.generateOTP();

                    var resendOTP = `UPDATE tbl_otp SET otp = ? WHERE field = ?;`
                    var condition = [newOTP, request.emailphone];

                    conn.query(resendOTP, condition, function (error, resend) {
                        if (error) {
                            callback('0', { keyword: 'error', content: { error: 'sending the OTP' } }, {});
                        } else {
                            callback('1', { keyword: 'otp_send_success', content: '' }, {});
                        }
                    });
                }
            });
        } else {
            common.checkMobile(request.emailphone, function (response, data) {
                if (response == true) {
                    callback('0', { keyword: 'invalid_mobile', content: '' }, {});
                } else {
                    var newOTP = common.generateOTP();

                    var resendOTP = `UPDATE tbl_user SET otp = ? WHERE ${field} = ?;`
                    var condition = [newOTP, request.emailphone];

                    conn.query(resendOTP, condition, function (error, resend) {
                        if (error) {
                            callback('0', { keyword: 'error', content: { error: 'sending the OTP' } }, {});
                        } else {
                            callback('1', { keyword: 'otp_send_success', content: '' }, {});
                        }
                    });
                }
            });
        }
    },

    // Add personal info
    set_profile: function (req, request, callback) {
        var setProfile = `UPDATE tbl_user SET ? WHERE id = ?;`

        var profileData = {
            "first_name": request.first_name,
            "last_name": request.last_name,
            "username": request.username,
            "dob": request.dob,
            "profile_image": request.profile_image || 'default.jpg',
            "cover_image": request.cover_image || 'default.jpg',
            "step_completed": "3"
        }

        common.checkUsername(request.username, req.user_id, function (response) {
            if (response == true) {
                conn.query(setProfile, [profileData, req.user_id], function (error, profile) {
                    if (error) {
                        callback('0', { keyword: 'error', content: { error: 'setting the profile' } }, {});
                    } else {
                        common.getUserDetails(req.user_id, function (response) {
                            callback('1', { keyword: 'profile_success', content: '' }, response);
                        });
                    }
                });
            } else {
                callback('0', { keyword: 'username_exists', content: '' }, {});
            }
        });
    },

    // Forget password
    forget_password: function (request, callback) {
        var is_email = middleware.validateEmail(request.emailphone);

        var field = is_email ? 'email' : 'mobile_number';

        if (field == 'email') {
            common.checkEmail(request.emailphone, function (response, data) {
                if (response == true) {
                    callback('0', { keyword: 'invalid_email', content: '' }, {});
                } else {
                    var id = data.id;
                    var login_type = data.login_type;

                    if (login_type == 'S') {
                        var findOTP = `SELECT * FROM tbl_otp WHERE field = '${request.emailphone}';`

                        conn.query(findOTP, function (error, result) {
                            if (!error && result.length > 0) {
                                var sendOTP = `UPDATE tbl_otp SET otp = ?, is_verified = 0 WHERE id = ?;`
                                var condition = [common.generateOTP(), result[0].id];

                                conn.query(sendOTP, condition, function (error, sentOTP) {
                                    if (!error && sentOTP.affectedRows > 0) {
                                        callback('1', { keyword: 'otp_send_success', content: '' }, {});
                                    }
                                    else {
                                        callback('0', { keyword: 'error', content: { error: 'sending the OTP' } }, {});
                                    }
                                });
                            } else if (!error && result.length == 0) {
                                var sendOTP = `INSERT INTO tbl_otp SET ?;`
                                var otpData = {
                                    "type": field,
                                    "field": request.emailphone,
                                    "otp": common.generateOTP(),
                                    "is_verified": '0'
                                }

                                conn.query(sendOTP, [otpData], function (error, sentOTP) {
                                    if (!error) {
                                        callback('1', { keyword: 'otp_send_success', content: '' }, {});
                                    }
                                    else {
                                        callback('0', { keyword: 'error', content: { error: 'sending the OTP' } }, {});
                                    }
                                });
                            } else {
                                callback('0', { keyword: 'error', content: { error: 'sending the OTP' } }, {});
                            }
                        });
                    } else {
                        callback('1', { keyword: 'social_registration', content: '' }, {});
                    }
                }
            });
        } else {
            common.checkMobile(request.emailphone, function (response, data) {
                if (response == true) {
                    callback('0', { keyword: 'invalid_mobile', content: '' }, {});
                } else {
                    var id = data.id;
                    var login_type = data.login_type;

                    if (login_type = 'S') {
                        var findOTP = `SELECT * FROM tbl_otp WHERE field = '${request.emailphone}';`

                        conn.query(findOTP, function (error, result) {
                            if (!error && result.length > 0) {
                                var sendOTP = `UPDATE tbl_user SET otp = ?, is_verified = 0 WHERE id = ?;`
                                var condition = [common.generateOTP(), data.id];

                                conn.query(sendOTP, condition, function (error, sentOTP) {
                                    if (!error && sentOTP.affectedRows > 0) {
                                        callback('1', { keyword: 'otp_send_success', content: '' }, {});
                                    }
                                    else {
                                        callback('0', { keyword: 'error', content: { error: 'sending the OTP' } }, {});
                                    }
                                });
                            } else if (!error && result.length == 0) {
                                var sendOTP = `INSERT INTO tbl_otp SET ?;`
                                var otpData = {
                                    "type": field,
                                    "field": request.emailphone,
                                    "otp": common.generateOTP(),
                                    "is_verified": '0'
                                }

                                conn.query(sendOTP, [otpData], function (error, sentOTP) {
                                    if (!error) {
                                        callback('1', { keyword: 'otp_send_success', content: '' }, {});
                                    }
                                    else {
                                        callback('0', { keyword: 'error', content: { error: 'sending the OTP' } }, {});
                                    }
                                });
                            } else {
                                callback('0', { keyword: 'error', content: { error: 'sending the OTP' } }, {});
                            }
                        });
                    } else {
                        callback('1', { keyword: 'social_registration', content: '' }, {});
                    }
                }
            });
        }
    },

    // Set new password
    set_password: function (req, request, callback) {
        var setPassword = `UPDATE tbl_user SET password = ? WHERE id = ?;`
        var condition = [md5(request.password), req.user_id];

        conn.query(setPassword, condition, function (error, newPassword) {
            if (!error && newPassword.affectedRows > 0) {
                var setPassword = `UPDATE tbl_user_device SET token = null WHERE user_id = ${req.user_id};`

                conn.query(setPassword, function (error, setPassword) {
                    if (!error) {
                        common.getUserDetails(req.user_id, function (response) {
                            callback('1', { keyword: 'password_change_success', content: '' }, response);
                        });
                    } else {
                        callback('1', { keyword: 'password_change_success_device_failed', content: '' }, {});
                    }
                });
            } else {
                callback('0', { keyword: 'error', content: {error: 'changing the password'} }, {});
            }
        });
    },

    // Change password
    change_password: function (req, request, callback) {
        var change_password = `UPDATE tbl_user SET password = ? WHERE id = ?;`

        var condition = [md5(request.new_password), req.user_id];

        common.matchPassword(md5(request.password), req.user_id, function (response) {
            if (response == true) {
                if (request.password == request.new_password) {
                    callback('0', { keyword: 'oldpass_same_newpass', content: '' }, {});
                } else {
                    conn.query(change_password, condition, function (error, password) {
                        if (error) {
                            callback('0', { keyword: 'error', content: {error: 'changing the password'} }, {});
                        } else {
                            common.device_details(request, req.user_id, function (response) {
                                if (response == true) {
                                    common.getUserDetails(req.user_id, function (response) {
                                        callback('1', { keyword: 'password_change_success', content: '' }, response);
                                    });
                                } else {
                                    callback('1', { keyword: 'password_change_success_device_failed', content: '' }, {});
                                }
                            });
                        }
                    });
                }
            } else {
                callback('0', { keyword: 'current_incorrect', content: '' }, {});
            }
        });
    },

    // Logout
    logout: function (req, callback) {
        var logout = `UPDATE tbl_user_device SET token = null WHERE user_id = ${req.user_id};`

        conn.query(logout, function (error, logout) {
            if (!error && logout.affectedRows > 0) {
                callback('1', { keyword: 'logout_success', content: '' }, {});
            } else {
                callback('0', { keyword: 'logout_failed', content: '' }, {});
            }
        });
    }

}


module.exports = auth;