const express = require('express');
var router = express.Router();
const home_model = require('./home_model');
const common = require('../../../config/common');
const middleware = require('../../../middleware/validate');
const { default: localizify } = require('localizify');
const { t } = require('localizify');
const home = require('./home_model');
const { required } = require('../../../languages/en');

// APIs

// Home screen -> User details
router.get('/user_details', function (req, res) {
    home_model.user_details(req, function (code, message, data) {
        common.response(req, res, code, message, data);
    });
});

// Home screen -> New raaves
router.post('/raaves_listing', function (req, res) {
    var request = req.body;

    home_model.raaves_listing(req, request, function (code, message, data) {
        common.response(req, res, code, message, data);
    });
});

// Home screen -> Most raaved
router.get('/most_raaved', function (req, res) {
    home_model.most_raaved(req, function (code, message, data) {
        common.response(req, res, code, message, data);
    });
});

// Home screen -> Search
router.post('/search', function (req, res) {
    var request = req.body;

    var rules = {
        type: 'required|in:Places,User'
    }

    var messages = {
        required: t('required'),
        in: t('invalid')
    }

    if (middleware.checkValidation(res, request, rules, messages)) {
        home_model.search(req, request, function (code, message, data) {
            common.response(req, res, code, message, data);
        });
    }
});

// Contact us
router.post('/contact_us', function (req, res) {
    var request = req.body;

    var rules = {
        first_name: 'required',
        last_name: 'required',
        email: 'required|email',
        subject: 'required',
        description: 'required'
    }

    var messages = {
        required: t('required'),
        email: t('invalid')
    }

    if (middleware.checkValidation(res, request, rules, messages)) {
        home_model.contact_us(req, request, function (code, message, data) {
            common.response(req, res, code, message, data);
        });
    }
});

// Notifications
router.get('/notification', function (req, res) {
    home_model.notification(req, function (code, message, data) {
        common.response(req, res, code, message, data);
    });
});

// Favourite business
router.get('/favourite_business', function (req, res) {
    home_model.favourite_business(req, function (code, message, data) {
        common.response(req, res, code, message, data);
    });
});

// Business details
router.get('/business_details', function (req, res) {
    var request = req.body;

    home_model.business_details(req, request, function (code, message, data) {
        common.response(req, res, code, message, data);
    });
});

// Add review
router.post('/add_review', function (req, res) {
    var request = req.body;

    var rules = {
        liked_service: 'required',
        rating: 'required|numeric',
        review: 'required'
    }

    var messages = {
        required: t('required'),
        numeric: t('invalid')
    }

    if (middleware.checkValidation(res, request, rules, messages)) {
        home_model.add_review(req, request, function (code, message, data) {
            common.response(req, res, code, message, data);
        });
    }
});

// Report review
router.post('/report_review', function (req, res) {
    var request = req.body;

    var rules = {
        type: 'required',
        description: 'required'
    }

    var messages = {
        required: t('required')
    }

    if (middleware.checkValidation(res, request, rules, messages)) {
        home_model.report_review(req, request, function (code, message, data) {
            common.response(req, res, code, message, data);
        });
    }
});

// Edit review
router.put('/edit_review', function (req, res) {
    var request = req.body;

    var rules = {
        liked_service: 'required',
        rating: 'required|numeric',
        review: 'required'
    }

    var messages = {
        required: t('required'),
        numeric: t('invalid')
    }

    if (middleware.checkValidation(res, request, rules, messages)) {
        home_model.edit_review(req, request, function (code, message, data) {
            common.response(req, res, code, message, data);
        });
    }
});

// User profile
router.get('/other_profile', function (req, res) {
    var request = req.body;

    var rules = {
        user_id: 'required'
    }

    var messages = {
        required: t('required')
    }

    if (middleware.checkValidation(res, request, rules, messages)) {
        home_model.other_profile(req, request, function (code, message, data) {
            common.response(req, res, code, message, data);
        });
    }
});

// Following list
router.get('/following_list', function (req, res) {
    home_model.following_list(req, function (code, message, data) {
        common.response(req, res, code, message, data);
    });
});

// Follower list
router.get('/follower_list', function (req, res) {
    home_model.follower_list(req, function (code, message, data) {
        common.response(req, res, code, message, data);
    });
});

// Follow / Unfollow
router.post('/follow_unfollow', function (req, res) {
    var request = req.body;

    home_model.follow_unfollow(req, request, function (code, message, data) {
        common.response(req, res, code, message, data);
    });
});

// User profile
router.get('/profile', function (req, res) {
    home_model.profile(req, function (code, message, data) {
        common.response(req, res, code, message, data);
    });
});

// Like review
router.post('/like_review', function (req, res) {
    var request = req.body;

    var rules = {
        review_id: 'required'
    }

    var messages = {
        required: t('required')
    }

    if (middleware.checkValidation(res, request, rules, messages)) {
        home_model.like_review(req, request, function (code, message, data) {
            common.response(req, res, code, message, data);
        });
    }
});

// Like business
router.post('/like_business', function (req, res) {
    var request = req.body;

    var rules = {
        business_id: 'required'
    }

    var messages = {
        required: t('required')
    }

    if (middleware.checkValidation(res, request, rules, messages)) {
        home_model.like_business(req, request, function (code, message, data) {
            common.response(req, res, code, message, data);
        });
    }
});

// Block
router.post('/block', function (req, res) {
    var request = req.body;

    var rules = {
        user_id: 'required'
    }

    var messages = {
        required: t('required')
    }

    if(middleware.checkValidation(res, request, rules, messages)) {
        home_model.block(req, request, function (code, message, data) {
            common.response(req, res, code, message, data);
        });
    }
});


module.exports = router;