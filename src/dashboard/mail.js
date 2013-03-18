var nodemailer = require("nodemailer");

// create reusable transport method (opens pool of SMTP connections)
var smtpTransport = nodemailer.createTransport("SMTP",{
    host: 'mail.asial.co.jp',
    port: '26'
});

module.exports = function mail(mailOptions, callback) {
    // send mail with defined transport object
    smtpTransport.sendMail(mailOptions, callback );

};

