const express = require('express');
var router = express.Router();
const auth_model = require('./auth_model');
const common = require('../../../config/common');
const middleware = require('../../../middleware/validate');
const { default: localizify }  = require('localizify');
const { t } = require('localizify');
 
// APIs

// Login
router.get('/login', function (req, res) {
    var request = req.body;

    if (request.login_type == 'S' || request.login_type == '' || request.login_type == undefined) {
        var rules = {
            emailphone: 'required',
            password: 'required'
        }
    } else {
        var rules = {
            social_id: 'required',
            login_type: 'required'
        }
    }

    var messages = {
        required: t('required')
    }

    if (middleware.checkValidation(res, request, rules, messages)) {
        auth_model.login(request, function (code, message, data) {
            common.response(req, res, code, message, data);
        });
    }
});

// Signup
router.post('/signup', function (req, res) {
    var request = req.body;

    if (request.login_type == 'S' || request.login_type == '' || request.login_type == undefined) {
        var rules = {
            country_code: 'required',
            mobile_number: 'required|digits:10',
            email: 'required|email',
            password: 'required|min:6'
        }
    } else {
        var rules = {
            social_id: 'required',
            login_type: 'required'
        }
    }

    var messages = {
        required: t('required'),
        digits: t('invalid'),
        email: t('invalid'),
        min: t('invalid')
    }

    if (middleware.checkValidation(res, request, rules, messages)) {
        auth_model.signup(request, function (code, message, data) {
            common.response(req, res, code, message, data);
        });
    }
});

// Verify OTP
router.post('/verifyOTP', function (req, res) {
    var request = req.body;

    var rules = {
        emailphone: 'required',
        otp: 'required|digits:4'
    }

    var messages = {
        required: t('required'),
        digits: t('invalid')
    }

    if (middleware.checkValidation(res, request, rules, messages)) {
        auth_model.verifyOTP(request, function (code, message, data) {
            common.response(req, res, code, message, data);
        });
    }
});

// Resend OTP
router.post('/resendOTP', function (req, res) {
    var request = req.body;

    var rules = {
        emailphone: 'required'
    }

    var messages = {
        required: t('required')
    }

    if (middleware.checkValidation(res, request, rules, messages)) {
        auth_model.resendOTP(request, function (code, message, data) {
            common.response(req, res, code, message, data);
        });
    }
});

// Add personal info
router.post('/set_profile', function (req, res) {
    var request = req.body;

    var rules = {
        first_name: 'required|min:2',
        last_name: 'required|min:2',
        username: 'required',
        dob: 'required'
    }

    var messages = {
        required: t('required'),
        min: t('invalid')
    }

    if (middleware.checkValidation(res, request, rules, messages)) {
        if (middleware.validateDate(request.dob)) {
            auth_model.set_profile(req, request, function (code, message, data) {
                common.response(req, res, code, message, data);
            });
        } else {
            var response = {
                code: 0,
                message: t('invalid')
            };

            middleware.encryption(response, function(response) {
                res.status(400).send(response);
            });
        }
    }
});

// Forget password
router.post('/forget_password', function (req, res) {
    var request = req.body;

    var rules = {
        emailphone: 'required'
    }

    var messages = {
        required: ':attr is required'
    }

    if (middleware.checkValidation(res, request, rules, messages)) {
        auth_model.forget_password(request, function (code, message, data) {
            common.response(req, res, code, message, data);
        });
    }
});

// Set new password
router.put('/set_password', function (req, res) {
    var request = req.body;

    var rules = {
        password: 'required|min:6',
        confirm_password: 'required|same:password'
    }

    var messages = {
        required: t('required'),
        min: t('invalid'),
        same: t('confirm_password_error')
    }

    if (middleware.checkValidation(res, request, rules, messages)) {
        auth_model.set_password(req, request, function (code, message, data) {
            common.response(req, res, code, message, data);
        });
    }
});

// Change password
router.patch('/change_password', function (req, res) {
    var request = req.body;

    var rules = {
        password: 'required',
        new_password: 'required|min:6',
        confirm_password: 'required|same:new_password'
    }

    var messages = {
        required: t('required'),
        min: t('invalid'),
        same: t('confirm_password_error')
    }

    if (middleware.checkValidation(res, request, rules, messages)) {
        auth_model.change_password(req, request, function (code, message, data) {
            common.response(req, res, code, message, data);
        });
    }
});

// Logout
router.put('/logout', function (req, res) {
    auth_model.logout(req, function (code, message, data) {
        common.response(req, res, code, message, data)
    });
});


module.exports = router;