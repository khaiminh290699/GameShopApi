const mailer = require("nodemailer");

const transport = mailer.createTransport({
	service:"gmail",
	auth:{
		user: process.env.EMAIL,
		pass: process.env.EMAIL_PASS
	}
});

const sendMail = async (to, subject, html) => {
  return  new Promise((resolve, reject) => {
    transport.sendMail({
      from: process.env.EMAIL,
      to,
      subject,
      html,
    }, (err, data) => { 
      if (err) return reject(err);
      return resolve(data)
    });
      
  })
}

module.exports = sendMail