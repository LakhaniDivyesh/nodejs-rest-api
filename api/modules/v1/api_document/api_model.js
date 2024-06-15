var con = require('../../../config/database');
var GLOBALS = require('../../../config/constant');

var API = {

    /**
     * Function to get api users list
     * 04-06-2021
     * @param {Function} callback 
     */
    apiuserList: function (callback) {

        con.query("SELECT u.*,ut.* FROM tbl_user u LEFT JOIN tbl_user_device as ut ON u.id = ut.user_id WHERE u.is_active = 1  AND u.is_delete='0' GROUP BY u.id", function (err, result, fields) {
            if (!err) {
                callback(result);
            } else {
                callback(null, err);
            }
        });
    },
}

module.exports = API;