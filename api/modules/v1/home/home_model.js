const conn = require('../../../config/database');
const common = require('../../../config/common');
const constant = require('../../../config/constant');
const middleware = require('../../../middleware/validate');
const moment = require('moment');
const asyncLoop = require('node-async-loop');
const md5 = require('md5');
const { default: localizify } = require('localizify');
const { t } = require('localizify');

var home = {

    // Home screen -> User details
    user_details: function (req, callback) {
        common.getUserDetails(req.user_id, function (response) {
            callback('1', { keyword: 'welcome', content: { username: response.username } }, response);
        });
    },

    // Home screen -> New raaves
    raaves_listing: function (req, request, callback) {
        var my_raaves = request.my_raaves || 0;

        var myRaaves = ``
        if (my_raaves == 1) {
            var myRaaves = `AND r.user_id = '${req.user_id}'`
        }

        var raaves_listing = `SELECT r.*, DATE_FORMAT(r.created_at, '%a, %b %d') AS date, 
                            CONCAT(u.first_name, ' ', u.last_name) AS name, CONCAT('${constant.IMAGE}', u.profile_image) AS profile_image,
                            (SELECT COUNT(l.id) FROM tbl_review_like l WHERE l.review_id = r.id) AS like_count,
                            (SELECT CONCAT('${constant.IMAGE}', i.image) AS image FROM tbl_review_images i WHERE i.review_id = r.id LIMIT 1) AS review_image,
                            (SELECT b.name FROM tbl_business b WHERE b.id = r.business_id) AS restaurant,
                            IFNULL((
                                SELECT 
                                    IF(l.user_id, '1', '0')
                                FROM tbl_review_like l WHERE l.review_id = r.id AND l.user_id = '${req.user_id}'
                            ), '0') AS is_like
                        FROM tbl_review r JOIN tbl_user u ON r.user_id = u.id
                        WHERE r.is_active = 1 AND r.is_delete = 0 AND u.is_active = 1 AND u.is_delete = 0 ${myRaaves}
                        ORDER BY r.created_at;`

        conn.query(raaves_listing, function (error, raaves) {
            if (error) {
                callback('0', { keyword: 'error', content: { error: 'listing raaves' } }, {});
            } else {
                asyncLoop(raaves, function (item, next) {
                    var like_service = `SELECT id, name FROM tbl_liked_service WHERE id IN(${item.liked_service});`

                    conn.query(like_service, function (error, result) {
                        item.liked_service = result;
                        next();
                    });
                }, (error) => {
                    if (error) {
                        callback('0', { keyword: 'error', content: { error: 'listing raaves' } }, {});
                    } else {
                        callback('1', { keyword: 'raaves_success', content: '' }, raaves);
                    }
                });
            }
        });
    },

    // Home screen -> Most raaved
    most_raaved: function (req, callback) {
        var business = `SELECT b.*, 
                            (SELECT COUNT(r.id) FROM tbl_review r WHERE r.business_id = b.id AND 
                                r.is_active = 1 AND r.is_delete = 0) AS review_count, 
                            (SELECT ROUND(AVG(r.rating),2) FROM tbl_review r WHERE r.business_id = b.id 
                                AND r.is_active = 1 AND r.is_delete = 0) AS avg_rating 
                        FROM tbl_business b WHERE b.is_active = 1 AND b.is_delete = 0
                        ORDER BY review_count DESC;`

        conn.query(business, function (error, business) {
            if (error) {
                callback('0', { keyword: 'error', content: { error: 'listing most raaved businesses' } }, {});
            } else {
                asyncLoop(business, function (item, next) {
                    item.photo = constant.IMAGE.concat(item.photo);
                    item.cover_photo = constant.IMAGE.concat(item.cover_photo);
                    next();
                }, (error) => {
                    if (error) {
                        callback('0', { keyword: 'error', content: { error: 'listing most raaved businesses' } }, {});
                    } else {
                        callback('1', { keyword: 'most_raaved_success', content: '' }, business);
                    }
                });
            }
        });
    },

    // Home screen -> Search
    search: function (req, request, callback) {
        var type = request.type || 'Places';
        var search = ``

        if (type == 'Places') {
            search = `SELECT id, name, CONCAT('${constant.IMAGE}', photo) AS photo FROM tbl_business WHERE name LIKE '%${request.search}%' AND is_active = 1 AND is_delete = 0;`
        } else {
            search = `SELECT id, username, CONCAT('${constant.IMAGE}', profile_image) AS profile_image FROM tbl_user WHERE username LIKE '%${request.search}%' AND is_active = 1 AND is_delete = 0;`
        }

        conn.query(search, function (error, result) {
            if (error) {
                callback('0', { keyword: 'error', content: { error: 'searching' } }, {});
            } else {
                if (result.length > 0)
                    callback('1', { keyword: 'search_success', content: '' }, result);
                else {
                    callback('1', { keyword: 'no_search_result', content: '' }, {});
                }
            }
        });
    },

    // Contact us
    contact_us: function (req, request, callback) {
        var get_subjectID = `SELECT id FROM tbl_contact_subject WHERE title = '${request.subject}';`

        conn.query(get_subjectID, function (error, subjectResult) {
            if (error) {
                callback('0', { keyword: 'error', content: { error: 'contact' } }, {});
            } else {
                var subject_id = subjectResult[0].id;

                var contact_us = `INSERT INTO tbl_contact SET ?;`

                var contactData = {
                    "user_id": req.user_id,
                    "first_name": request.first_name,
                    "last_name": request.last_name,
                    "email": request.email,
                    "subject_id": subject_id,
                    "message": request.description
                }

                conn.query(contact_us, contactData, function (error, result) {
                    if (error) {
                        callback('0', { keyword: 'error', content: { error: 'contact' } }, {});
                    } else {
                        common.getContactUsInfo(result.insertId, function (info) {
                            callback('1', { keyword: 'contact_success', content: '' }, info);
                        });
                    }
                });
            }
        });
    },

    // Notification
    notification: function (req, callback) {
        var notification = `SELECT * FROM tbl_notification WHERE user_id = '${req.user_id}' ORDER BY created_at DESC;`

        conn.query(notification, function (error, notifications) {
            if (!error && notifications.length > 0) {
                asyncLoop(notifications, function (item, next) {
                    item.created_at = moment(item.created_at, 'YYYY-MM-DD HH:mm:ss').format('MMMM DD, YYYY h:mm A');
                    next();
                }, (error) => {
                    if (error) {
                        callback('0', { keyword: 'error', content: { error: 'listing notifications' } }, {});
                    } else {
                        callback('1', { keyword: 'notification_success', content: '' }, notifications);
                    }
                });
            } else if (!error) {
                callback('1', { keyword: 'no_notification', content: '' }, {});
            } else {
                callback('0', { keyword: 'error', content: { error: 'listing notifications' } }, {});
            }
        });
    },

    // Favourite business
    favourite_business: function (req, callback) {
        var favourite = `SELECT b.*, 
                            (SELECT ROUND(AVG(r.rating),2) FROM tbl_review r WHERE r.business_id = b.id 
                                AND r.is_active = 1 AND r.is_delete = 0) AS avg_rating, 
                            (SELECT COUNT(r.id) FROM tbl_review r WHERE r.business_id = b.id AND 
                                r.is_active = 1 AND r.is_delete = 0) AS review_count 
                        FROM tbl_business b JOIN tbl_business_like l ON b.id = l.business_id 
                        WHERE l.user_id = '${req.user_id}' AND b.is_active = 1 AND b.is_delete = 0;`

        conn.query(favourite, function (error, favourites) {
            if (!error && favourites.length > 0) {
                asyncLoop(favourites, function (item, next) {
                    item.photo = constant.IMAGE.concat(item.photo);
                    item.cover_photo = constant.IMAGE.concat(item.cover_photo);
                    next();
                }, (error) => {
                    if (error) {
                        callback('0', { keyword: 'error', content: { error: 'listing favourite businesses' } }, {});
                    } else {
                        callback('1', { keyword: 'favourite_success', content: '' }, favourites);
                    }
                });
            } else if (!error) {
                callback('1', { keyword: 'no_favourite', content: '' }, {});
            } else {
                callback('0', { keyword: 'error', content: { error: 'listing favourite businesses' } }, {});
            }
        });
    },

    // Business details
    business_details: function (req, request, callback) {
        var business = `SELECT b.*, 
                            (SELECT ROUND(AVG(r.rating),2) FROM tbl_review r WHERE r.business_id = b.id 
                                AND r.is_active = 1 AND r.is_delete = 0) AS avg_rating, 
                            (SELECT COUNT(r.id) FROM tbl_review r WHERE r.business_id = b.id AND 
                                r.is_active = 1 AND r.is_delete = 0) AS review_count, 
                            IFNULL((
                                SELECT 
                                    IF(l.user_id, '1', '0')
                                FROM tbl_business_like l WHERE l.business_id = b.id AND l.user_id = '${req.user_id}'
                            ), '0') AS is_like, 
                            IFNULL((
                                SELECT 
                                    IF(r.user_id, '1', '0')
                                FROM tbl_review r WHERE r.business_id = b.id AND r.user_id = '${req.user_id}'
                            ), '0') AS is_reviewed 
                        FROM tbl_business b WHERE b.id = '${request.business_id}';
                        SELECT i.* FROM tbl_business_images i JOIN tbl_business b ON i.business_id = b.id WHERE i.business_id = '${request.business_id}';
                        SELECT r.*, u.id, CONCAT(u.first_name, ' ', u.last_name) AS name, u.profile_image,
                            CASE 
                                WHEN CURRENT_DATE = DATE(r.created_at) THEN CONCAT(TIMEDIFF(CURRENT_TIMESTAMP, r.created_at), ' ago') 
                                ELSE CONCAT(DATEDIFF(CURRENT_TIMESTAMP, r.created_at), ' Days ago')
                            END AS time_ago
                        FROM tbl_review r JOIN tbl_user u ON r.user_id = u.id WHERE r.business_id = '${request.business_id}';
                        SELECT i.* FROM tbl_review_images i JOIN tbl_review r ON i.review_id = r.id`

        conn.query(business, function (error, businessDetails) {
            if (error) {
                callback('0', { keyword: 'error', content: { error: 'fetching business details' } }, {});
            } else {
                businessDetails[0].photo = constant.IMAGE.concat(businessDetails[0].photo);
                businessDetails[0].cover_photo = constant.IMAGE.concat(businessDetails[0].cover_photo);
                asyncLoop(businessDetails[1], function (item, next) {
                    item.photo = constant.IMAGE.concat(item.photo);
                    next();
                }, (error) => {
                    if (error) {
                        callback('0', { keyword: 'error', content: { error: 'listing business details' } }, {});
                    } else {
                        asyncLoop(businessDetails[2], function (item, next) {
                            var liked_service = `SELECT * FROM tbl_liked_service WHERE id IN(${item.liked_service});`
                            conn.query(liked_service, function (error, likedServices) {
                                item.liked_service = likedServices;
                                next();
                            });
                        }, (error) => {
                            if (error) {
                                callback('0', { keyword: 'error', content: { error: 'lisitng business details' } }, {});
                            } else {
                                asyncLoop(businessDetails[3], function (item, next) {
                                    item.photo = constant.IMAGE.concat(item.photo);
                                    next();
                                }, (error) => {
                                    if (error) {
                                        callback('0', { keyword: 'error', content: { error: 'listing business details' } }, {});
                                    } else {
                                        var businessData = {
                                            ...businessDetails[0][0],
                                            images: businessDetails[1],
                                            reviews: businessDetails[2],
                                            reviewImages: businessDetails[3]
                                        }

                                        callback('1', { keyword: 'business_details_success', content: '' }, businessData);
                                    }
                                });
                            }
                        });
                    }
                });
            }
        });
    },

    // Add review
    add_review: function (req, request, callback) {
        var reviewData = {
            "user_id": req.user_id,
            "business_id": request.business_id,
            "liked_service": request.liked_service,
            "rating": request.rating,
            "review": request.review
        }

        var addReview = `INSERT INTO tbl_review SET ?`;

        common.checkReview(reviewData.user_id, reviewData.business_id, function (response) {
            if (response == true) {
                conn.query(addReview, [reviewData], function (error, result) {
                    if (!error) {
                        common.getRatingResult(result.insertId, function (ratingResult) {
                            callback('1', { keyword: 'review_added_success', content: '' }, ratingResult);
                        });
                    } else {
                        callback('0', { keyword: 'error', content: { error: 'in giving review' } }, {});
                    }
                });
            } else {
                callback('0', { keyword: 'already_rated', content: '' }, {});
            }
        });
    },

    // Report review
    report_review: function (req, request, callback) {
        var reportData = {
            "user_id": req.user_id,
            "review_id": request.review_id,
            "type_id": request.type,
            "description": request.description
        }

        var reportReview = `INSERT INTO tbl_report_review SET ?;`

        conn.query(reportReview, [reportData], function (error, result) {
            if (error) {
                callback('1', { keyword: 'error', content: { error: 'reporting review' } }, {});
            } else {
                common.getReport(result.insertId, function (reportData) {
                    callback('0', { keyword: 'review_reported_success', content: '' }, reportData);
                });
            }
        });
    },

    // Edit review
    edit_review: function (req, request, callback) {
        var editReview = `UPDATE tbl_review SET liked_service = ?, rating = ?, review = ? WHERE id = ?;`

        var condition = [request.liked_service, request.rating, request.review, request.review_id];

        conn.query(editReview, condition, function (error, result) {
            if (error) {
                callback('0', { keyword: 'error', content: { error: 'editing review' } }, {});
            } else {
                common.getRatingResult(request.review_id, function (response) {
                    callback('1', { keyword: 'review_edited_success', content: '' }, response);
                });
            }
        });
    },

    // Other user profile
    other_profile: function (req, request, callback) {
        if (request.user_id != req.user_id) {
            var info = `SELECT IFNULL(IF(f.id, '1','0'), '0') AS is_follow FROM tbl_follow f JOIN tbl_user u ON 
                            f.user_id = u.id WHERE f.user_id = '${req.user_id}' AND f.follow_id = ${request.user_id};
                    SELECT r.*, DATE_FORMAT(r.created_at, '%a, %b %d') AS date,
                        (SELECT COUNT(l.id) FROM tbl_review_like l WHERE l.review_id = r.id) AS like_count,
                        (SELECT CONCAT('${constant.IMAGE}', i.image) AS image FROM tbl_review_images i WHERE i.review_id = r.id LIMIT 1) AS review_image,
                        (SELECT b.name FROM tbl_business b WHERE b.id = r.business_id) AS restaurant,
                        IFNULL((
                            SELECT 
                                IF(l.user_id, '1', '0')
                            FROM tbl_review_like l WHERE l.review_id = r.id AND l.user_id = '${req.user_id}'
                        ), '0') AS is_like
                    FROM tbl_review r JOIN tbl_user u ON r.user_id = u.id
                    WHERE r.is_active = 1 AND r.is_delete = 0 AND u.is_active = 1 AND u.is_delete = 0 AND r.user_id = '${request.user_id}'
                    ORDER BY r.created_at;
                    SELECT COUNT(id) AS total_reviews FROM tbl_review WHERE user_id = '${request.user_id}' AND is_active = 1 AND is_delete = 0;
                    SELECT COUNT(id) AS following FROM tbl_follow WHERE user_id = '${request.user_id}';
                    SELECT COUNT(id) AS followers FROM tbl_follow WHERE follow_id = '${request.user_id}';`
            common.getUserDetails(request.user_id, function (userDetails) {
                conn.query(info, function (error, info) {
                    if (error) {
                        callback('0', { keyword: 'error', content: { error: 'fetching user profile details' } }, {});
                    } else {
                        if (info.length > 0) {
                            var userData = {
                                ...userDetails,
                                is_follow: info[0][0].is_follow,
                                total_reviews: info[2][0].total_reviews,
                                following: info[3][0].following,
                                followers: info[4][0].followers,
                                reviews: info[1]
                            }
                            callback('1', { keyword: 'user_details_fetched', content: '' }, userData);
                        } else {
                            callback('0', { keyword: 'error', content: { error: 'fetching user profile details' } }, userData);
                        }
                    }
                });
            });
        } else {
            callback('0', { keyword: 'own_profile', content: '' }, {});
        }
    },

    // Following list
    following_list: function (req, callback) {
        var listing = `SELECT u.id, u.username, CONCAT('${constant.IMAGE}', u.profile_image) AS profile_image,
                            CONCAT(u.first_name, ' ', u.last_name) AS name 
                        FROM tbl_follow f JOIN tbl_user u ON f.follow_id = u.id WHERE u.is_active = 1 AND 
                            u.is_delete = 0 AND f.user_id = '${req.user_id}';`

        conn.query(listing, function (error, result) {
            if (error) {
                callback('0', { keyword: 'error', content: { error: 'fetching following list' } }, {});
            } else {
                callback('1', { keyword: 'following_list_fetched', content: '' }, result);
            }
        });
    },

    // Follower list
    follower_list: function (req, callback) {
        var listing = `SELECT u.id, u.username, CONCAT('${constant.IMAGE}', u.profile_image) AS profile_image,
                            CONCAT(u.first_name, ' ', u.last_name) AS name,
                            IFNULL((
                                SELECT IF(ff.follow_id, '1', '0') FROM tbl_follow ff    
                                    WHERE ff.follow_id = f.user_id AND ff.user_id = 1),
                            '0') AS is_follow
                        FROM tbl_follow f JOIN tbl_user u ON f.user_id = u.id WHERE u.is_active = 1 AND
                            u.is_delete = 0 AND f.follow_id = '${req.user_id}'; `

        conn.query(listing, function (error, result) {
            if (error) {
                callback('0', { keyword: 'error', content: { error: 'fetching follower list' } }, {});
            } else {
                callback('1', { keyword: 'follower_list_fetched', content: '' }, result);
            }
        });
    },

    // Follow / Unfollow
    follow_unfollow: function (req, request, callback) {
        var check_status = `SELECT id FROM tbl_follow WHERE user_id = ? AND follow_id = ?; `
        var follow = `INSERT INTO tbl_follow(user_id, follow_id) VALUES(?,?); `
        var unfollow = `DELETE FROM tbl_follow WHERE id = ?; `

        var condition = [req.user_id, request.user_id];

        conn.query(check_status, condition, function (error, status) {
            if (error) {
                callback('0', { keyword: 'error', content: { error: 'checking following status' } }, {});
            } else {
                if (status.length > 0) {
                    conn.query(unfollow, status[0].id, function (error, unfollow) {
                        if (error) {
                            callback('0', { keyword: 'error', content: { error: 'unfollowing' } }, {});
                        } else {
                            common.getUserDetails(request.user_id, function (response) {
                                callback('1', { keyword: 'unfollow_success', content: '' }, response);
                            });
                        }
                    });
                } else {
                    conn.query(follow, condition, function (error, follow) {
                        if (error) {
                            callback('0', { keyword: 'error', content: { error: 'following' } }, {});
                        } else {
                            common.getUserDetails(request.user_id, function (response) {
                                callback('1', { keyword: 'follow_success', content: '' }, response);
                            });
                        }
                    });
                }
            }
        });
    },

    // User Profile
    profile: function (req, callback) {
        var info = `SELECT r.*, DATE_FORMAT(r.created_at, '%a, %b %d') AS date,
                        (SELECT COUNT(l.id) FROM tbl_review_like l WHERE l.review_id = r.id) AS like_count,
                        (SELECT CONCAT('${constant.IMAGE}', i.image) AS image FROM tbl_review_images i WHERE i.review_id = r.id LIMIT 1) AS review_image,
                        (SELECT b.name FROM tbl_business b WHERE b.id = r.business_id) AS restaurant,
                        IFNULL((
                            SELECT 
                                IF(l.user_id, '1', '0')
                            FROM tbl_review_like l WHERE l.review_id = r.id AND l.user_id = '${req.user_id}'
                        ), '0') AS is_like
                    FROM tbl_review r JOIN tbl_user u ON r.user_id = u.id
                    WHERE r.is_active = 1 AND r.is_delete = 0 AND u.is_active = 1 AND u.is_delete = 0 AND r.user_id = '${req.user_id}'
                    ORDER BY r.created_at;
                    SELECT COUNT(id) AS total_reviews FROM tbl_review WHERE user_id = '${req.user_id}' AND is_active = 1 AND is_delete = 0;
                    SELECT COUNT(id) AS following FROM tbl_follow WHERE user_id = '${req.user_id}';
                    SELECT COUNT(id) AS followers FROM tbl_follow WHERE follow_id = '${req.user_id}';`
        common.getUserDetails(req.user_id, function (userDetails) {
            conn.query(info, function (error, info) {
                if (error) {
                    callback('0', { keyword: 'error', content: { error: 'fetching user profile details' } }, {});
                } else {
                    if (info.length > 0) {
                        var userData = {
                            ...userDetails,
                            total_reviews: info[1][0].total_reviews,
                            following: info[2][0].following,
                            followers: info[3][0].followers,
                            reviews: info[0]
                        }
                        callback('1', { keyword: 'user_details_fetched', content: '' }, userData);
                    } else {
                        callback('0', { keyword: 'error', content: { error: 'fetching user profile details' } }, userData);
                    }
                }
            });
        });
    },

    // Like review
    like_review: function (req, request, callback) {
        var is_like = `SELECT * FROM tbl_review_like WHERE user_id = '${req.user_id}' AND review_id = '${request.review_id}';`
        var remove_like = `DELETE FROM tbl_review_like WHERE id = ?;`
        var add_like = `INSERT INTO tbl_review_like(user_id, review_id) VALUES (?,?);`

        conn.query(is_like, function (error, status) {
            if (!error && status.length > 0) {
                conn.query(remove_like, [status[0].id], function (error, result) {
                    if (!error) {
                        common.getReview(request.review_id, function (response) {
                            callback('1', { keyword: 'like_remove', content: '' }, response);
                        });
                    } else {
                        callback('0', { keyword: 'error', content: { error: 'removing like from review' } }, {});
                    }
                });
            } else {
                if (!error) {
                    conn.query(add_like, [req.user_id, request.review_id], function (error, result) {
                        if (!error) {
                            common.getReview(request.review_id, function (response) {
                                callback('1', { keyword: 'like_add', content: '' }, response);
                            });
                        } else {
                            callback('0', { keyword: 'error', content: { error: 'adding like to review' } }, {});
                        }
                    });
                }
            }
        });
    },

    // Like business
    like_business: function (req, request, callback) {
        var is_like = `SELECT * FROM tbl_business_like WHERE user_id = '${req.user_id}' AND business_id = '${request.business_id}';`
        var remove_like = `DELETE FROM tbl_business_like WHERE id = ?;`
        var add_like = `INSERT INTO tbl_business_like(user_id, business_id) VALUES (?,?);`

        conn.query(is_like, function (error, status) {
            if (!error && status.length > 0) {
                conn.query(remove_like, [status[0].id], function (error, result) {
                    if (!error) {
                        common.getBusiness(request.business_id, function (response) {
                            callback('1', { keyword: 'like_remove', content: '' }, response);
                        });
                    } else {
                        callback('0', { keyword: 'error', content: { error: 'removing like from business' } }, {});
                    }
                });
            } else {
                if (!error) {
                    conn.query(add_like, [req.user_id, request.business_id], function (error, result) {
                        if (!error) {
                            common.getBusiness(request.business_id, function (response) {
                                callback('1', { keyword: 'like_add', content: '' }, response);
                            });
                        } else {
                            callback('0', { keyword: 'error', content: { error: 'adding like to business' } }, {});
                        }
                    });
                }
            }
        });
    },

    // Block
    block: function (req, request, callback) {
        if (req.user_id != request.user_id) {
            var status = `SELECT * FROM tbl_block WHERE user_id = '${req.user_id}' AND block_id = '${request.user_id}';`
            var unblock = `DELETE FROM tbl_block WHERE id = ?;`
            var block = `INSERT INTO tbl_block (user_id, block_id) VALUES (?, ?);`

            conn.query(status, function (error, status) {
                if (!error && status.length > 0) {
                    conn.query(unblock, [status[0].id], function (error, result) {
                        if (error) {
                            callback('0', { keyword: 'error', content: 'unblocking user' }, {});
                        } else {
                            common.getUserDetails(request.user_id, function (response) {
                                callback('1', { keyword: 'unblock_success', content: '' }, response);
                            });
                        }
                    });
                } else {
                    if (!error) {
                        conn.query(block, [req.user_id, request.user_id], function (error, result) {
                            if (error) {
                                callback('0', { keyword: 'error', content: { error: 'blocking user' } }, {});
                            } else {
                                common.getUserDetails(request.user_id, function (response) {
                                    callback('1', { keyword: 'block_success', content: '' }, response);
                                });
                            }
                        });
                    } else {
                        callback('0', { keyword: 'error', content: { error: 'checking block status' } }, {});
                    }
                }
            });
        } else {
            callback('0', { keyword: 'self_block', content: '' }, {});
        }
    }

}


module.exports = home;