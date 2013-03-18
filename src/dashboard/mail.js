var nodemailer = require("nodemailer");

var transport = nodemailer.createTransport("Sendmail", "/usr/sbin/sendmail");

module.exports = function mail(mailOptions, callback) {
    // send mail with defined transport object
    transport.sendMail(mailOptions, callback );
};

